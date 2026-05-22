import { z } from 'zod';

export const sequenceFormSchema = z.object({
  name:        z.string().min(1, 'Name is required').max(200),
  slug:        z.string().min(1, 'Slug is required').max(100).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
  description: z.string().optional(),
  audience:    z.literal('analyst'),
});

export type SequenceFormInput = z.infer<typeof sequenceFormSchema>;
