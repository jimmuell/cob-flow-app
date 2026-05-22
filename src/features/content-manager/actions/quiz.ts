'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { withCurrentSession } from '@/lib/db/client';
import { quizzes } from '@/lib/db/schema/content';
import { auditLog } from '@/lib/audit/log';
import { canPerform } from '@/lib/authority/can-perform';

// ─── Schema ────────────────────────────────────────────────────────────────────

export const quizCreateSchema = z.object({
  title:          z.string().min(1, 'Title is required').max(300),
  quiz_type:      z.enum(['multiple_choice', 'free_response']),
  pass_threshold: z.number().int().min(0).max(100).optional(),
  description:    z.string().optional(),
}).refine(
  (d) => d.quiz_type !== 'free_response',
  { message: 'Module quizzes must be multiple_choice', path: ['quiz_type'] },
);

export const courseQuizCreateSchema = z.object({
  title:          z.string().min(1, 'Title is required').max(300),
  quiz_type:      z.enum(['multiple_choice', 'free_response']),
  pass_threshold: z.number().int().min(0).max(100).optional(),
  description:    z.string().optional(),
});

export type QuizCreateInput = z.infer<typeof quizCreateSchema>;

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
