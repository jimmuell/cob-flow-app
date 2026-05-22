import { z } from 'zod';
import { unlockItemSchema } from './course';

export const moduleFormSchema = z.object({
  title:             z.string().min(1, 'Title is required').max(300),
  slug:              z.string().min(1, 'Slug is required').max(100).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
  description:       z.string().optional(),
  unlock_definition: z.array(unlockItemSchema).optional(),
});

export type ModuleFormInput = z.infer<typeof moduleFormSchema>;
