import { z } from 'zod';

// ─── Create schemas (CP4) ─────────────────────────────────────────────────────

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

// ─── Question schemas (CP6) ────────────────────────────────────────────────────

export const questionMcSchema = z.object({
  question_type:           z.literal('multiple_choice'),
  topic:                   z.string().optional(),
  stem_markdown:           z.string().min(1, 'Stem is required'),
  mc_options:              z.tuple([z.string(), z.string(), z.string(), z.string()]),
  mc_correct_option:       z.enum(['a', 'b', 'c', 'd']),
  mc_explanation_markdown: z.string().optional(),
});

export const questionFrSchema = z.object({
  question_type:              z.literal('free_response'),
  topic:                      z.string().optional(),
  stem_markdown:              z.string().min(1, 'Stem is required'),
  fr_model_answer_markdown:   z.string().min(1, 'Model answer is required'),
  fr_grading_rubric_markdown: z.string().min(1, 'Grading rubric is required'),
});

export const questionSchema = z.discriminatedUnion('question_type', [
  questionMcSchema,
  questionFrSchema,
]);

export const quizSaveSchema = z.object({
  pass_threshold:        z.number().int().min(0).max(100),
  questions:             z.array(questionSchema),
  last_known_updated_at: z.string().min(1, 'Updated-at timestamp is required'),
});

export type QuestionMc = z.infer<typeof questionMcSchema>;
export type QuestionFr = z.infer<typeof questionFrSchema>;
export type Question   = z.infer<typeof questionSchema>;
export type QuizSaveInput = z.infer<typeof quizSaveSchema>;
