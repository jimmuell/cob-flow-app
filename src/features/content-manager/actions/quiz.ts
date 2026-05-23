'use server';

import { revalidatePath } from 'next/cache';
import { eq, count } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/session';
import { withCurrentSession } from '@/lib/db/client';
import { quizzes } from '@/lib/db/schema/content';
import { quizAttempts } from '@/lib/db/schema/learner';
import { auditLog } from '@/lib/audit/log';
import { canPerform } from '@/lib/authority/can-perform';
import { isAdmin } from '@/lib/authority/roles';
type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

// ─── Actions ───────────────────────────────────────────────────────────────────

export async function createModuleQuiz(
  moduleId: string,
  input: { title: string; description?: string; pass_threshold?: number },
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'CREATE_QUIZ' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  try {
    const result = await withCurrentSession(async (tx) => {
      const [quiz] = await tx
        .insert(quizzes)
        .values({
          module_id:      moduleId,
          course_id:      null,
          title:          input.title,
          description:    input.description,
          quiz_type:      'multiple_choice',
          pass_threshold: input.pass_threshold ?? 80,
          status:         'draft',
        })
        .returning({ id: quizzes.id, title: quizzes.title });

      await auditLog.record({
        actor:     user.id,
        action:    'quiz_created',
        target:    quiz.id,
        timestamp: new Date().toISOString(),
        category:  'CONFIG',
        tenantId:  user.tenantId,
        metadata:  { quiz_id: quiz.id, title: quiz.title, module_id: moduleId },
      });

      return quiz;
    });

    revalidatePath(`/admin/content/modules/${moduleId}`);
    return { ok: true, data: { id: result.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to create quiz' };
  }
}

export async function createCourseQuiz(
  courseId: string,
  input: { title: string; quiz_type: 'multiple_choice' | 'free_response'; description?: string; pass_threshold?: number },
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'CREATE_QUIZ' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  try {
    const result = await withCurrentSession(async (tx) => {
      const [quiz] = await tx
        .insert(quizzes)
        .values({
          module_id:      null,
          course_id:      courseId,
          title:          input.title,
          description:    input.description,
          quiz_type:      input.quiz_type,
          pass_threshold: input.pass_threshold ?? 80,
          status:         'draft',
        })
        .returning({ id: quizzes.id, title: quizzes.title });

      await auditLog.record({
        actor:     user.id,
        action:    'quiz_created',
        target:    quiz.id,
        timestamp: new Date().toISOString(),
        category:  'CONFIG',
        tenantId:  user.tenantId,
        metadata:  { quiz_id: quiz.id, title: quiz.title, course_id: courseId },
      });

      return quiz;
    });

    revalidatePath(`/admin/content/courses/${courseId}`);
    return { ok: true, data: { id: result.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to create quiz' };
  }
}

export async function deleteQuiz(id: string): Promise<ActionResult<void>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!isAdmin(user)) return { ok: false, error: 'Only Admins can permanently delete content' };

  try {
    return await withCurrentSession(async (tx) => {
      const [quiz] = await tx
        .select({ id: quizzes.id, title: quizzes.title, status: quizzes.status, moduleId: quizzes.module_id, courseId: quizzes.course_id })
        .from(quizzes)
        .where(eq(quizzes.id, id));

      if (!quiz) return { ok: false as const, error: 'Quiz not found' };
      if (quiz.status !== 'archived') {
        return { ok: false as const, error: 'Content must be archived before it can be permanently deleted' };
      }

      const [{ n: qa }] = await tx.select({ n: count() }).from(quizAttempts).where(eq(quizAttempts.quiz_id, id));
      const learnerCount = Number(qa);

      if (learnerCount > 0) {
        return { ok: false as const, error: `Cannot delete — ${learnerCount} learner record${learnerCount === 1 ? '' : 's'} exist. Archive preserves data; delete is permanent and only available for content with no learner interaction.` };
      }

      await auditLog.record({
        actor: user.id, action: 'quiz_deleted', target: id,
        timestamp: new Date().toISOString(), category: 'CONFIG', tenantId: user.tenantId,
        metadata: { quiz_id: id, title: quiz.title, module_id: quiz.moduleId, course_id: quiz.courseId },
      });

      // CASCADE: quiz_questions are deleted by Postgres FK on delete cascade
      await tx.delete(quizzes).where(eq(quizzes.id, id));
      if (quiz.moduleId) revalidatePath(`/admin/content/modules/${quiz.moduleId}`);
      if (quiz.courseId) revalidatePath(`/admin/content/courses/${quiz.courseId}`);
      revalidatePath('/admin/content');
      return { ok: true as const, data: undefined };
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to delete quiz' };
  }
}
