'use server';

import { revalidatePath } from 'next/cache';
import { eq, sql, and, ne, count } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/session';
import { withCurrentSession } from '@/lib/db/client';
import { courses, modules, lessons, quizzes } from '@/lib/db/schema/content';
import { courseEnrollments, courseCompletions, lessonCompletions, quizAttempts } from '@/lib/db/schema/learner';
import { authorityUnlocks } from '@/lib/db/schema/authority';
import { isAdmin } from '@/lib/authority/roles';
import { platformAuthorityCeilings } from '@/lib/db/schema/authority';
import { auditLog } from '@/lib/audit/log';
import { canPerform } from '@/lib/authority/can-perform';
import { getDbUserId } from '@/lib/auth/db-user-id';
import { courseFormSchema } from '../schemas/course';
import type { CourseFormInput, UnlockItem } from '../schemas/course';

// ─── Result type ──────────────────────────────────────────────────────────────

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ─── Ceiling clamp helper ─────────────────────────────────────────────────────

async function clampUnlockDefinition(
  items: UnlockItem[],
  tx: Parameters<Parameters<typeof withCurrentSession>[0]>[0],
): Promise<UnlockItem[]> {
  if (items.length === 0) return items;
  const ceilings = await tx.select().from(platformAuthorityCeilings);
  const ceilingMap = new Map(ceilings.map((c) => [c.unlock_type, Number(c.ceiling_value)]));
  return items.map((item) => {
    const ceiling = ceilingMap.get(item.unlock_type);
    return ceiling != null && item.unlock_value > ceiling
      ? { ...item, unlock_value: ceiling }
      : item;
  });
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function createCourse(
  input: CourseFormInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'CREATE_COURSE' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  // Normalize empty-string sequence_id (from unselected <select>) to undefined before validation
  const normalizedInput = { ...input, sequence_id: input.sequence_id === '' ? undefined : input.sequence_id };
  const validated = courseFormSchema.safeParse(normalizedInput);
  if (!validated.success) {
    return { ok: false, error: validated.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const authorDbId = getDbUserId(user.id);
    const result = await withCurrentSession(async (tx) => {
      const sanitized = {
        ...validated.data,
        description:       !validated.data.description || validated.data.description === '' ? null : validated.data.description,
        unlock_definition: !validated.data.unlock_definition || validated.data.unlock_definition.length === 0 ? null : validated.data.unlock_definition,
      };

      if (sanitized.sequence_id && sanitized.sequence_order == null) {
        const execResult = await tx.execute(sql`
          SELECT COALESCE(MAX(sequence_order), 0) AS max_order
          FROM courses
          WHERE sequence_id = ${sanitized.sequence_id}
        `);
        const rows = execResult as unknown as Array<Record<string, unknown>>;
        sanitized.sequence_order = Number(rows[0]?.max_order ?? 0) + 1;
      }

      const unlockDef = sanitized.unlock_definition?.length
        ? await clampUnlockDefinition(sanitized.unlock_definition, tx)
        : null;

      const [course] = await tx
        .insert(courses)
        .values({
          title:             sanitized.title,
          slug:              sanitized.slug,
          description:       sanitized.description,
          audience:          sanitized.audience,
          estimated_hours:   sanitized.estimated_hours,
          sequence_id:       sanitized.sequence_id,
          sequence_order:    sanitized.sequence_order,
          unlock_definition: unlockDef,
          content_type:      'platform',
          tenant_id:         null,
          status:            'draft',
          author_id:         authorDbId,
        })
        .returning({ id: courses.id, title: courses.title });

      await auditLog.record({
        actor:     user.id,
        action:    'course_created',
        target:    course.id,
        timestamp: new Date().toISOString(),
        category:  'CONFIG',
        tenantId:  user.tenantId,
        metadata:  { course_id: course.id, title: course.title, content_type: 'platform' },
      });

      return course;
    });

    revalidatePath('/admin/content');
    return { ok: true, data: { id: result.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to create course' };
  }
}

export async function updateCourse(
  id: string,
  input: CourseFormInput,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'UPDATE_COURSE' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  const normalizedInput = { ...input, sequence_id: input.sequence_id === '' ? undefined : input.sequence_id };
  const validated = courseFormSchema.safeParse(normalizedInput);
  if (!validated.success) {
    return { ok: false, error: validated.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    await withCurrentSession(async (tx) => {
      const sanitized = {
        ...validated.data,
        description:       !validated.data.description || validated.data.description === '' ? null : validated.data.description,
        unlock_definition: !validated.data.unlock_definition || validated.data.unlock_definition.length === 0 ? null : validated.data.unlock_definition,
      };

      if (sanitized.sequence_id && sanitized.sequence_order == null) {
        const execResult = await tx.execute(sql`
          SELECT COALESCE(MAX(sequence_order), 0) AS max_order
          FROM courses
          WHERE sequence_id = ${sanitized.sequence_id} AND id != ${id}
        `);
        const rows = execResult as unknown as Array<Record<string, unknown>>;
        sanitized.sequence_order = Number(rows[0]?.max_order ?? 0) + 1;
      }

      const unlockDef = sanitized.unlock_definition?.length
        ? await clampUnlockDefinition(sanitized.unlock_definition, tx)
        : null;

      await tx
        .update(courses)
        .set({
          title:             sanitized.title,
          slug:              sanitized.slug,
          description:       sanitized.description,
          estimated_hours:   sanitized.estimated_hours,
          sequence_id:       sanitized.sequence_id,
          sequence_order:    sanitized.sequence_order,
          unlock_definition: unlockDef,
          updated_at:        new Date(),
        })
        .where(eq(courses.id, id));
    });

    revalidatePath('/admin/content');
    revalidatePath(`/admin/content/courses/${id}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to update course' };
  }
}

export async function publishCourse(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'PUBLISH_COURSE' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  try {
    await withCurrentSession(async (tx) => {
      const [course] = await tx
        .update(courses)
        .set({ status: 'published', updated_at: new Date() })
        .where(eq(courses.id, id))
        .returning({ title: courses.title });

      await auditLog.record({
        actor:     user.id,
        action:    'course_published',
        target:    id,
        timestamp: new Date().toISOString(),
        category:  'CONFIG',
        tenantId:  user.tenantId,
        metadata:  { course_id: id, title: course.title },
      });
    });

    revalidatePath('/admin/content');
    revalidatePath(`/admin/content/courses/${id}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to publish course' };
  }
}

export async function moveCourse(
  courseId: string,
  direction: 'up' | 'down',
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'UPDATE_COURSE' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  try {
    let sequenceId: string | null = null;

    await withCurrentSession(async (tx) => {
      const [current] = await tx
        .select({
          id:             courses.id,
          sequence_order: courses.sequence_order,
          sequence_id:    courses.sequence_id,
          title:          courses.title,
        })
        .from(courses)
        .where(eq(courses.id, courseId));

      if (!current?.sequence_id || current.sequence_order == null) return;
      sequenceId = current.sequence_id;

      const neighborOrder = direction === 'up'
        ? current.sequence_order - 1
        : current.sequence_order + 1;

      const [neighbor] = await tx
        .select({ id: courses.id, sequence_order: courses.sequence_order })
        .from(courses)
        .where(and(
          eq(courses.sequence_id, current.sequence_id),
          eq(courses.sequence_order, neighborOrder),
        ));

      if (!neighbor) return;

      // Three-step sentinel swap: -1 is out-of-range for all real sequence_order
      // values (always >= 1). Setting sequence_order = -1 (NOT NULL) is valid
      // under the courses_sequence_order_paired CHECK which only requires the
      // field to be non-null when sequence_id is non-null.
      const SENTINEL = -1;
      await tx.update(courses).set({ sequence_order: SENTINEL }).where(eq(courses.id, current.id));
      await tx.update(courses).set({ sequence_order: current.sequence_order }).where(eq(courses.id, neighbor.id));
      await tx.update(courses).set({ sequence_order: neighbor.sequence_order }).where(eq(courses.id, current.id));

      await auditLog.record({
        actor:     user.id,
        action:    'course_reordered',
        target:    courseId,
        timestamp: new Date().toISOString(),
        category:  'CONFIG',
        tenantId:  user.tenantId,
        metadata:  {
          course_id:  courseId,
          title:      current.title,
          direction,
          from_order: current.sequence_order,
          to_order:   neighbor.sequence_order,
        },
      });
    });

    revalidatePath('/admin/content');
    if (sequenceId) revalidatePath(`/admin/content/sequences/${sequenceId}`);
    return { ok: true, data: undefined };
  } catch (e) {
    const base = e instanceof Error ? e.message : 'Failed to reorder course';
    const errObj = e as { query?: string; params?: unknown };
    const detail = errObj.query
      ? ` (Query: ${String(errObj.query).slice(0, 120)} | Params: ${JSON.stringify(errObj.params)})`
      : '';
    console.error('moveCourse failure:', base, e);
    return { ok: false, error: `${base}${detail}` };
  }
}

export async function archiveCourse(
  id: string,
  justification: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'ARCHIVE_COURSE' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  if (!justification || justification.trim().length < 10) {
    return { ok: false, error: 'Justification must be at least 10 characters' };
  }

  try {
    await withCurrentSession(async (tx) => {
      const [course] = await tx
        .update(courses)
        .set({ status: 'archived', updated_at: new Date() })
        .where(eq(courses.id, id))
        .returning({ title: courses.title });

      await auditLog.record({
        actor:         user.id,
        action:        'course_archived',
        target:        id,
        timestamp:     new Date().toISOString(),
        category:      'CONFIG',
        tenantId:      user.tenantId,
        justification,
        metadata:      { course_id: id, title: course.title, justification },
      });

      // Cascade: archive non-archived course-level quizzes
      const courseQuizzes = await tx
        .select({ id: quizzes.id, title: quizzes.title })
        .from(quizzes)
        .where(and(eq(quizzes.course_id, id), ne(quizzes.status, 'archived')));
      for (const quiz of courseQuizzes) {
        await tx.update(quizzes).set({ status: 'archived', updated_at: new Date() }).where(eq(quizzes.id, quiz.id));
        await auditLog.record({
          actor: user.id, action: 'quiz_archived', target: quiz.id,
          timestamp: new Date().toISOString(), category: 'CONFIG', tenantId: user.tenantId,
          justification, metadata: { quiz_id: quiz.id, title: quiz.title, course_id: id, justification, cascade: true },
        });
      }

      // Cascade: archive non-archived modules and their quizzes
      const courseModules = await tx
        .select({ id: modules.id, title: modules.title })
        .from(modules)
        .where(and(eq(modules.course_id, id), ne(modules.status, 'archived')));
      for (const mod of courseModules) {
        await tx.update(modules).set({ status: 'archived', updated_at: new Date() }).where(eq(modules.id, mod.id));
        await auditLog.record({
          actor: user.id, action: 'module_archived', target: mod.id,
          timestamp: new Date().toISOString(), category: 'CONFIG', tenantId: user.tenantId,
          justification, metadata: { module_id: mod.id, title: mod.title, course_id: id, justification, cascade: true },
        });
        // Cascade: archive quizzes for this module
        const modQuizzes = await tx
          .select({ id: quizzes.id, title: quizzes.title })
          .from(quizzes)
          .where(and(eq(quizzes.module_id, mod.id), ne(quizzes.status, 'archived')));
        for (const quiz of modQuizzes) {
          await tx.update(quizzes).set({ status: 'archived', updated_at: new Date() }).where(eq(quizzes.id, quiz.id));
          await auditLog.record({
            actor: user.id, action: 'quiz_archived', target: quiz.id,
            timestamp: new Date().toISOString(), category: 'CONFIG', tenantId: user.tenantId,
            justification, metadata: { quiz_id: quiz.id, title: quiz.title, module_id: mod.id, justification, cascade: true },
          });
        }
      }
    });

    revalidatePath('/admin/content');
    revalidatePath(`/admin/content/courses/${id}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to archive course' };
  }
}

export async function deleteCourse(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!isAdmin(user)) return { ok: false, error: 'Only Admins can permanently delete content' };

  try {
    return await withCurrentSession(async (tx) => {
      const [course] = await tx
        .select({ id: courses.id, title: courses.title, status: courses.status })
        .from(courses)
        .where(eq(courses.id, id));

      if (!course) return { ok: false as const, error: 'Course not found' };
      if (course.status !== 'archived') {
        return { ok: false as const, error: 'Content must be archived before it can be permanently deleted' };
      }

      let learnerCount = 0;
      const [{ n: enroll }]   = await tx.select({ n: count() }).from(courseEnrollments).where(eq(courseEnrollments.course_id, id));
      const [{ n: complete }] = await tx.select({ n: count() }).from(courseCompletions).where(eq(courseCompletions.course_id, id));
      const [{ n: unlock }]   = await tx.select({ n: count() }).from(authorityUnlocks).where(eq(authorityUnlocks.course_id, id));
      learnerCount += Number(enroll) + Number(complete) + Number(unlock);

      const courseModules = await tx.select({ id: modules.id }).from(modules).where(eq(modules.course_id, id));
      for (const mod of courseModules) {
        const modLessons = await tx.select({ id: lessons.id }).from(lessons).where(eq(lessons.module_id, mod.id));
        for (const lesson of modLessons) {
          const [{ n: lc }] = await tx.select({ n: count() }).from(lessonCompletions).where(eq(lessonCompletions.lesson_id, lesson.id));
          learnerCount += Number(lc);
        }
        const modQuizzes = await tx.select({ id: quizzes.id }).from(quizzes).where(eq(quizzes.module_id, mod.id));
        for (const quiz of modQuizzes) {
          const [{ n: qa }] = await tx.select({ n: count() }).from(quizAttempts).where(eq(quizAttempts.quiz_id, quiz.id));
          learnerCount += Number(qa);
        }
      }
      const courseQuizzes = await tx.select({ id: quizzes.id }).from(quizzes).where(eq(quizzes.course_id, id));
      for (const quiz of courseQuizzes) {
        const [{ n: qa }] = await tx.select({ n: count() }).from(quizAttempts).where(eq(quizAttempts.quiz_id, quiz.id));
        learnerCount += Number(qa);
      }

      if (learnerCount > 0) {
        return { ok: false as const, error: `Cannot delete — ${learnerCount} learner record${learnerCount === 1 ? '' : 's'} exist. Archive preserves data; delete is permanent and only available for content with no learner interaction.` };
      }

      await auditLog.record({
        actor: user.id, action: 'course_deleted', target: id,
        timestamp: new Date().toISOString(), category: 'CONFIG', tenantId: user.tenantId,
        metadata: { course_id: id, title: course.title },
      });

      // CASCADE: modules → lessons, quizzes are deleted by Postgres FK on delete cascade
      await tx.delete(courses).where(eq(courses.id, id));
      revalidatePath('/admin/content');
      return { ok: true as const, data: undefined };
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to delete course' };
  }
}
