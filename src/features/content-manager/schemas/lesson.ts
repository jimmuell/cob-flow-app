import { z } from 'zod';

export const lessonCreateSchema = z.object({
  title:       z.string().min(1, 'Title is required').max(300),
  slug:        z.string().min(1, 'Slug is required').max(100).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
  lesson_type: z.enum(['overview', 'reading-guide', 'summary', 'worked-example']),
});

export type LessonCreateInput = z.infer<typeof lessonCreateSchema>;
