import { z } from 'zod';

export const unlockItemSchema = z.object({
  unlock_type:  z.enum(['settlement', 'demand', 'lien_reduction', 'closure', 'letter_override', 'template_publication']),
  unlock_value: z.number().positive(),
});

// RHF valueAsNumber emits NaN for empty inputs; coerce NaN → undefined so the
// optional check passes. Cast preserves the inferred output type for RHF resolver.
const nanToUndefined = (v: unknown) =>
  typeof v === 'number' && isNaN(v) ? undefined : v;

const optionalPosInt = z.preprocess(
  nanToUndefined,
  z.number().int().positive().optional(),
) as unknown as z.ZodOptional<z.ZodNumber>;

export const courseFormSchema = z.object({
  title:             z.string().min(1, 'Title is required').max(300),
  slug:              z.string().min(1, 'Slug is required').max(100).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
  description:       z.string().optional(),
  audience:          z.literal('analyst'),
  estimated_hours:   optionalPosInt,
  sequence_id:       z.string().uuid().optional(),
  sequence_order:    optionalPosInt,
  unlock_definition: z.array(unlockItemSchema).optional(),
});

export type CourseFormInput = z.infer<typeof courseFormSchema>;
export type UnlockItem = z.infer<typeof unlockItemSchema>;
