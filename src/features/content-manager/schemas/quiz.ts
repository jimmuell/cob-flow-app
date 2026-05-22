import { z } from 'zod';

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
