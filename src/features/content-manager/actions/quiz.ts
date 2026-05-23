'use server';

import { revalidatePath } from 'next/cache';
import { eq, count } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/session';
import { withCurrentSession } from '@/lib/db/client';
import { quizzes, quizQuestions } from '@/lib/db/schema/content';
import { quizAttempts } from '@/lib/db/schema/learner';
import { auditLog } from '@/lib/audit/log';
import { canPerform } from '@/lib/authority/can-perform';
import { isAdmin } from '@/lib/authority/roles';
import { quizSaveSchema } from '../schemas/quiz';
import type { QuizSaveInput } from '../schemas/quiz';

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

// ─── createModuleQuiz ──────────────────────────────────────────────────────────

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

// ─── createCourseQuiz ─────────────────────────────────────────────────────────

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

// ─── updateQuiz ───────────────────────────────────────────────────────────────

export async function updateQuiz(
  quizId: string,
  input: QuizSaveInput,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'UPDATE_QUIZ' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  const validated = quizSaveSchema.safeParse(input);
  if (!validated.success) {
    return { ok: false, error: validated.error.issues[0]?.message ?? 'Invalid quiz data' };
  }

  try {
    return await withCurrentSession(async (tx) => {
      const [current] = await tx
        .select({
          id:        quizzes.id,
          updatedAt: quizzes.updated_at,
          moduleId:  quizzes.module_id,
          courseId:  quizzes.course_id,
        })
        .from(quizzes)
        .where(eq(quizzes.id, quizId));

      if (!current) return { ok: false as const, error: 'Quiz not found' };

      // Optimistic concurrency: truncate to seconds to handle JS vs Postgres precision.
      const serverSec = Math.floor(current.updatedAt.getTime() / 1000);
      const clientSec = Math.floor(new Date(validated.data.last_known_updated_at).getTime() / 1000);
      if (serverSec !== clientSec) {
        return { ok: false as const, error: 'CONFLICT: Someone else modified this quiz. Please reload.' };
      }

      await tx
        .update(quizzes)
        .set({ pass_threshold: validated.data.pass_threshold, updated_at: new Date() })
        .where(eq(quizzes.id, quizId));

      await tx.delete(quizQuestions).where(eq(quizQuestions.quiz_id, quizId));

      if (validated.data.questions.length > 0) {
        await tx.insert(quizQuestions).values(
          validated.data.questions.map((q, i) => ({
            quiz_id:                    quizId,
            question_order:             i + 1,
            question_type:              q.question_type,
            topic:                      q.topic ?? null,
            stem_markdown:              q.stem_markdown,
            mc_options:                 q.question_type === 'multiple_choice' ? q.mc_options : null,
            mc_correct_option:          q.question_type === 'multiple_choice' ? q.mc_correct_option : null,
            mc_explanation_markdown:    q.question_type === 'multiple_choice' ? (q.mc_explanation_markdown ?? null) : null,
            fr_model_answer_markdown:   q.question_type === 'free_response'   ? q.fr_model_answer_markdown   : null,
            fr_grading_rubric_markdown: q.question_type === 'free_response'   ? q.fr_grading_rubric_markdown : null,
          })),
        );
      }

      await auditLog.record({
        actor:     user.id,
        action:    'quiz_updated',
        target:    quizId,
        timestamp: new Date().toISOString(),
        category:  'CONFIG',
        tenantId:  user.tenantId,
        metadata:  { quiz_id: quizId, question_count: validated.data.questions.length },
      });

      if (current.moduleId) revalidatePath(`/admin/content/modules/${current.moduleId}/quizzes/${quizId}`);
      if (current.courseId) revalidatePath(`/admin/content/courses/${current.courseId}/course-quizzes/${quizId}`);

      return { ok: true as const, data: undefined };
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to save quiz' };
  }
}

// ─── publishQuiz ──────────────────────────────────────────────────────────────

export async function publishQuiz(quizId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'PUBLISH_QUIZ' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  try {
    return await withCurrentSession(async (tx) => {
      const [quiz] = await tx
        .select({ id: quizzes.id, status: quizzes.status, title: quizzes.title, moduleId: quizzes.module_id, courseId: quizzes.course_id })
        .from(quizzes)
        .where(eq(quizzes.id, quizId));

      if (!quiz) return { ok: false as const, error: 'Quiz not found' };
      if (quiz.status !== 'draft') return { ok: false as const, error: 'Only draft content can be published' };

      await tx
        .update(quizzes)
        .set({ status: 'published', updated_at: new Date() })
        .where(eq(quizzes.id, quizId));

      await auditLog.record({
        actor:     user.id,
        action:    'quiz_published',
        target:    quizId,
        timestamp: new Date().toISOString(),
        category:  'CONFIG',
        tenantId:  user.tenantId,
        metadata:  { quiz_id: quizId, title: quiz.title },
      });

      if (quiz.moduleId) revalidatePath(`/admin/content/modules/${quiz.moduleId}/quizzes/${quizId}`);
      if (quiz.courseId) revalidatePath(`/admin/content/courses/${quiz.courseId}/course-quizzes/${quizId}`);

      return { ok: true as const, data: undefined };
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to publish quiz' };
  }
}

// ─── archiveQuiz ──────────────────────────────────────────────────────────────

export async function archiveQuiz(quizId: string, justification: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const perm = canPerform({ user, action: 'ARCHIVE_QUIZ' });
  if (perm.decision === 'deny') return { ok: false, error: perm.reason };

  try {
    return await withCurrentSession(async (tx) => {
      const [quiz] = await tx
        .select({ id: quizzes.id, status: quizzes.status, title: quizzes.title, moduleId: quizzes.module_id, courseId: quizzes.course_id })
        .from(quizzes)
        .where(eq(quizzes.id, quizId));

      if (!quiz) return { ok: false as const, error: 'Quiz not found' };
      if (quiz.status === 'archived') return { ok: false as const, error: 'Already archived' };

      await tx
        .update(quizzes)
        .set({ status: 'archived', updated_at: new Date() })
        .where(eq(quizzes.id, quizId));

      await auditLog.record({
        actor:     user.id,
        action:    'quiz_archived',
        target:    quizId,
        timestamp: new Date().toISOString(),
        category:  'CONFIG',
        tenantId:  user.tenantId,
        metadata:  { quiz_id: quizId, title: quiz.title, justification },
      });

      if (quiz.moduleId) revalidatePath(`/admin/content/modules/${quiz.moduleId}/quizzes/${quizId}`);
      if (quiz.courseId) revalidatePath(`/admin/content/courses/${quiz.courseId}/course-quizzes/${quizId}`);

      return { ok: true as const, data: undefined };
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to archive quiz' };
  }
}

// ─── deleteQuiz ───────────────────────────────────────────────────────────────

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

      // CASCADE: quiz_questions deleted by Postgres FK on delete cascade
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
