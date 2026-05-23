'use server';

import { revalidatePath } from 'next/cache';
import { eq, max, and, count } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/session';
import { withCurrentSession } from '@/lib/db/client';
import { lessons } from '@/lib/db/schema/content';
import { lessonCompletions } from '@/lib/db/schema/learner';
import { isAdmin } from '@/lib/authority/roles';
import { auditLog } from '@/lib/audit/log';
import { canPerform } from '@/lib/authority/can-perform';
import { lessonCreateSchema } from '../schemas/lesson';
import type { LessonCreateInput } from '../schemas/lesson';

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

// ─── Actions ────────────────────────────────────────────────────────────────────

export async function createLesson(
  moduleId: string,
  input: LessonCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'CREATE_LESSON' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  const validated = lessonCreateSchema.safeParse(input);
  if (!validated.success) {
    return { ok: false, error: validated.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const result = await withCurrentSession(async (tx) => {
      const [{ maxOrder }] = await tx
        .select({ maxOrder: max(lessons.lesson_order) })
        .from(lessons)
        .where(eq(lessons.module_id, moduleId));

      const insertOrder = (maxOrder ?? 0) + 1;

      const [lesson] = await tx
        .insert(lessons)
        .values({
          module_id:    moduleId,
          lesson_order: insertOrder,
          lesson_type:  validated.data.lesson_type,
          title:        validated.data.title,
          slug:         validated.data.slug,
          slides:       [],
        })
        .returning({ id: lessons.id, title: lessons.title });

      await auditLog.record({
        actor:     user.id,
        action:    'lesson_created',
        target:    lesson.id,
        timestamp: new Date().toISOString(),
        category:  'CONFIG',
        tenantId:  user.tenantId,
        metadata:  { lesson_id: lesson.id, title: lesson.title, module_id: moduleId },
      });

      return lesson;
    });

    revalidatePath(`/admin/content/modules/${moduleId}`);
    return { ok: true, data: { id: result.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to create lesson' };
  }
}

export async function moveLesson(
  lessonId: string,
  direction: 'up' | 'down',
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'UPDATE_LESSON' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  try {
    let moduleId: string | null = null;

    await withCurrentSession(async (tx) => {
      const [current] = await tx
        .select({
          id:           lessons.id,
          lesson_order: lessons.lesson_order,
          module_id:    lessons.module_id,
          title:        lessons.title,
        })
        .from(lessons)
        .where(eq(lessons.id, lessonId));

      if (!current) return;
      moduleId = current.module_id;

      const neighborOrder = direction === 'up'
        ? current.lesson_order - 1
        : current.lesson_order + 1;

      const [neighbor] = await tx
        .select({ id: lessons.id, lesson_order: lessons.lesson_order })
        .from(lessons)
        .where(and(
          eq(lessons.module_id, current.module_id),
          eq(lessons.lesson_order, neighborOrder),
        ));

      if (!neighbor) return;

      // Three-step sentinel swap: -1 is out-of-range for all real lesson_order
      // values (always >= 1), so each step satisfies the unique constraint
      // individually rather than relying on end-of-statement deferral.
      const SENTINEL = -1;
      await tx.update(lessons).set({ lesson_order: SENTINEL }).where(eq(lessons.id, current.id));
      await tx.update(lessons).set({ lesson_order: current.lesson_order }).where(eq(lessons.id, neighbor.id));
      await tx.update(lessons).set({ lesson_order: neighbor.lesson_order }).where(eq(lessons.id, current.id));

      await auditLog.record({
        actor:     user.id,
        action:    'lesson_reordered',
        target:    lessonId,
        timestamp: new Date().toISOString(),
        category:  'CONFIG',
        tenantId:  user.tenantId,
        metadata:  {
          lesson_id:  lessonId,
          title:      current.title,
          direction,
          from_order: current.lesson_order,
          to_order:   neighbor.lesson_order,
        },
      });
    });

    if (moduleId) revalidatePath(`/admin/content/modules/${moduleId}`);
    return { ok: true, data: undefined };
  } catch (e) {
    const base = e instanceof Error ? e.message : 'Failed to reorder lesson';
    const errObj = e as { query?: string; params?: unknown };
    const detail = errObj.query
      ? ` (Query: ${String(errObj.query).slice(0, 120)} | Params: ${JSON.stringify(errObj.params)})`
      : '';
    console.error('moveLesson failure:', base, e);
    return { ok: false, error: `${base}${detail}` };
  }
}

export async function deleteLesson(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!isAdmin(user)) return { ok: false, error: 'Only Admins can permanently delete content' };

  try {
    return await withCurrentSession(async (tx) => {
      const [lesson] = await tx
        .select({ id: lessons.id, title: lessons.title, moduleId: lessons.module_id })
        .from(lessons)
        .where(eq(lessons.id, id));

      if (!lesson) return { ok: false as const, error: 'Lesson not found' };

      const [{ n: lc }] = await tx.select({ n: count() }).from(lessonCompletions).where(eq(lessonCompletions.lesson_id, id));
      const learnerCount = Number(lc);

      if (learnerCount > 0) {
        return { ok: false as const, error: `Cannot delete — ${learnerCount} learner record${learnerCount === 1 ? '' : 's'} exist. Archive preserves data; delete is permanent and only available for content with no learner interaction.` };
      }

      await auditLog.record({
        actor: user.id, action: 'lesson_deleted', target: id,
        timestamp: new Date().toISOString(), category: 'CONFIG', tenantId: user.tenantId,
        metadata: { lesson_id: id, title: lesson.title, module_id: lesson.moduleId },
      });

      await tx.delete(lessons).where(eq(lessons.id, id));
      revalidatePath(`/admin/content/modules/${lesson.moduleId}`);
      return { ok: true as const, data: undefined };
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to delete lesson' };
  }
}
