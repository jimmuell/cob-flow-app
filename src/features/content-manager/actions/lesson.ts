'use server';

import { revalidatePath } from 'next/cache';
import { eq, max } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/session';
import { withCurrentSession } from '@/lib/db/client';
import { lessons } from '@/lib/db/schema/content';
import { auditLog } from '@/lib/audit/log';
import { canPerform } from '@/lib/authority/can-perform';
import { lessonCreateSchema } from '../schemas/lesson';
import type { LessonCreateInput } from '../schemas/lesson';

export type { LessonCreateInput };

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

// ─── Action ────────────────────────────────────────────────────────────────────

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
