'use server';

import { revalidatePath } from 'next/cache';
import { eq, and, ne, count } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/session';
import { withCurrentSession } from '@/lib/db/client';
import { courseSequences, courses, modules, lessons, quizzes } from '@/lib/db/schema/content';
import { courseEnrollments, courseCompletions, lessonCompletions, quizAttempts } from '@/lib/db/schema/learner';
import { authorityUnlocks } from '@/lib/db/schema/authority';
import { auditLog } from '@/lib/audit/log';
import { canPerform } from '@/lib/authority/can-perform';
import { isAdmin } from '@/lib/authority/roles';
import { getDbUserId } from '@/lib/auth/db-user-id';
import { sequenceFormSchema } from '../schemas/sequence';
import type { SequenceFormInput } from '../schemas/sequence';

// ─── Result type ──────────────────────────────────────────────────────────────

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function createSequence(
  input: SequenceFormInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'CREATE_SEQUENCE' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  const validated = sequenceFormSchema.safeParse(input);
  if (!validated.success) {
    return { ok: false, error: validated.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const authorDbId = getDbUserId(user.id);
    const result = await withCurrentSession(async (tx) => {
      const [seq] = await tx
        .insert(courseSequences)
        .values({
          ...validated.data,
          content_type: 'platform',
          tenant_id:    null,
          status:       'draft',
          author_id:    authorDbId,
        })
        .returning({ id: courseSequences.id, name: courseSequences.name });

      await auditLog.record({
        actor:     user.id,
        action:    'sequence_created',
        target:    seq.id,
        timestamp: new Date().toISOString(),
        category:  'CONFIG',
        tenantId:  user.tenantId,
        metadata:  { sequence_id: seq.id, name: seq.name, content_type: 'platform' },
      });

      return seq;
    });

    revalidatePath('/admin/content');
    return { ok: true, data: { id: result.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to create sequence' };
  }
}

export async function updateSequence(
  id: string,
  input: SequenceFormInput,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'UPDATE_SEQUENCE' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  const validated = sequenceFormSchema.safeParse(input);
  if (!validated.success) {
    return { ok: false, error: validated.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    await withCurrentSession(async (tx) => {
      await tx
        .update(courseSequences)
        .set({ ...validated.data, updated_at: new Date() })
        .where(eq(courseSequences.id, id));
    });
    revalidatePath('/admin/content');
    revalidatePath(`/admin/content/sequences/${id}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to update sequence' };
  }
}

export async function publishSequence(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'PUBLISH_SEQUENCE' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  try {
    await withCurrentSession(async (tx) => {
      const [seq] = await tx
        .update(courseSequences)
        .set({ status: 'published', updated_at: new Date() })
        .where(eq(courseSequences.id, id))
        .returning({ name: courseSequences.name });

      await auditLog.record({
        actor:     user.id,
        action:    'sequence_published',
        target:    id,
        timestamp: new Date().toISOString(),
        category:  'CONFIG',
        tenantId:  user.tenantId,
        metadata:  { sequence_id: id, name: seq.name },
      });
    });

    revalidatePath('/admin/content');
    revalidatePath(`/admin/content/sequences/${id}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to publish sequence' };
  }
}

export async function archiveSequence(
  id: string,
  justification: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'ARCHIVE_SEQUENCE' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  if (!justification || justification.trim().length < 10) {
    return { ok: false, error: 'Justification must be at least 10 characters' };
  }

  try {
    await withCurrentSession(async (tx) => {
      const [seq] = await tx
        .update(courseSequences)
        .set({ status: 'archived', updated_at: new Date() })
        .where(eq(courseSequences.id, id))
        .returning({ name: courseSequences.name });

      await auditLog.record({
        actor:         user.id,
        action:        'sequence_archived',
        target:        id,
        timestamp:     new Date().toISOString(),
        category:      'CONFIG',
        tenantId:      user.tenantId,
        justification,
        metadata:      { sequence_id: id, name: seq.name, justification },
      });

      // Cascade: archive non-archived courses in this sequence
      const seqCourses = await tx
        .select({ id: courses.id, title: courses.title })
        .from(courses)
        .where(and(eq(courses.sequence_id, id), ne(courses.status, 'archived')));

      for (const course of seqCourses) {
        await tx.update(courses).set({ status: 'archived', updated_at: new Date() }).where(eq(courses.id, course.id));
        await auditLog.record({
          actor: user.id, action: 'course_archived', target: course.id,
          timestamp: new Date().toISOString(), category: 'CONFIG', tenantId: user.tenantId,
          justification, metadata: { course_id: course.id, title: course.title, justification, cascade: true },
        });

        // Cascade: archive course-level quizzes
        const courseQuizzes = await tx
          .select({ id: quizzes.id, title: quizzes.title })
          .from(quizzes)
          .where(and(eq(quizzes.course_id, course.id), ne(quizzes.status, 'archived')));
        for (const quiz of courseQuizzes) {
          await tx.update(quizzes).set({ status: 'archived', updated_at: new Date() }).where(eq(quizzes.id, quiz.id));
          await auditLog.record({
            actor: user.id, action: 'quiz_archived', target: quiz.id,
            timestamp: new Date().toISOString(), category: 'CONFIG', tenantId: user.tenantId,
            justification, metadata: { quiz_id: quiz.id, title: quiz.title, course_id: course.id, justification, cascade: true },
          });
        }

        // Cascade: archive modules and their quizzes
        const courseModules = await tx
          .select({ id: modules.id, title: modules.title })
          .from(modules)
          .where(and(eq(modules.course_id, course.id), ne(modules.status, 'archived')));
        for (const mod of courseModules) {
          await tx.update(modules).set({ status: 'archived', updated_at: new Date() }).where(eq(modules.id, mod.id));
          await auditLog.record({
            actor: user.id, action: 'module_archived', target: mod.id,
            timestamp: new Date().toISOString(), category: 'CONFIG', tenantId: user.tenantId,
            justification, metadata: { module_id: mod.id, title: mod.title, course_id: course.id, justification, cascade: true },
          });
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
      }
    });

    revalidatePath('/admin/content');
    revalidatePath(`/admin/content/sequences/${id}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to archive sequence' };
  }
}

export async function deleteSequence(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!isAdmin(user)) return { ok: false, error: 'Only Admins can permanently delete content' };

  try {
    return await withCurrentSession(async (tx) => {
      const [seq] = await tx
        .select({ id: courseSequences.id, name: courseSequences.name, status: courseSequences.status })
        .from(courseSequences)
        .where(eq(courseSequences.id, id));

      if (!seq) return { ok: false as const, error: 'Learning path not found' };
      if (seq.status !== 'archived') {
        return { ok: false as const, error: 'Content must be archived before it can be permanently deleted' };
      }

      // Count learner records across all courses in this learning path
      const seqCourses = await tx.select({ id: courses.id }).from(courses).where(eq(courses.sequence_id, id));

      let learnerCount = 0;
      for (const course of seqCourses) {
        const [{ n: enroll }]    = await tx.select({ n: count() }).from(courseEnrollments).where(eq(courseEnrollments.course_id, course.id));
        const [{ n: complete }]  = await tx.select({ n: count() }).from(courseCompletions).where(eq(courseCompletions.course_id, course.id));
        const [{ n: unlock }]    = await tx.select({ n: count() }).from(authorityUnlocks).where(eq(authorityUnlocks.course_id, course.id));
        learnerCount += Number(enroll) + Number(complete) + Number(unlock);

        const courseModules = await tx.select({ id: modules.id }).from(modules).where(eq(modules.course_id, course.id));
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
        const courseQuizzes = await tx.select({ id: quizzes.id }).from(quizzes).where(eq(quizzes.course_id, course.id));
        for (const quiz of courseQuizzes) {
          const [{ n: qa }] = await tx.select({ n: count() }).from(quizAttempts).where(eq(quizAttempts.quiz_id, quiz.id));
          learnerCount += Number(qa);
        }
      }

      if (learnerCount > 0) {
        return { ok: false as const, error: `Cannot delete — ${learnerCount} learner record${learnerCount === 1 ? '' : 's'} exist. Archive preserves data; delete is permanent and only available for content with no learner interaction.` };
      }

      await auditLog.record({
        actor: user.id, action: 'sequence_deleted', target: id,
        timestamp: new Date().toISOString(), category: 'CONFIG', tenantId: user.tenantId,
        metadata: { sequence_id: id, name: seq.name },
      });

      // Note: courses.sequence_id FK is SET NULL (not CASCADE DELETE).
      // Deleting the sequence orphans courses (sequence_id → null) but does not delete them.
      await tx.delete(courseSequences).where(eq(courseSequences.id, id));
      revalidatePath('/admin/content');
      return { ok: true as const, data: undefined };
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to delete learning path' };
  }
}
