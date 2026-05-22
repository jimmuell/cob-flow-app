import { z } from 'zod';

export const unlockItemSchema = z.object({
  unlock_type:  z.enum(['settlement', 'demand', 'lien_reduction', 'closure', 'letter_override', 'template_publication']),
  unlock_value: z.number().positive(),
});

export const courseFormSchema = z.object({
  title:             z.string().min(1, 'Title is required').max(300),
  slug:              z.string().min(1, 'Slug is required').max(100).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
  description:       z.string().optional(),
  audience:          z.literal('analyst'),
  estimated_hours:   z.number().int().positive().optional(),
  sequence_id:       z.string().uuid().optional(),
  sequence_order:    z.number().int().positive().optional(),
  unlock_definition: z.array(unlockItemSchema).optional(),
});

export type CourseFormInput = z.infer<typeof courseFormSchema>;
export type UnlockItem = z.infer<typeof unlockItemSchema>;
