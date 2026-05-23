import { z } from 'zod';

const textSlideSchema = z.object({
  order:         z.number().int().min(1),
  type:          z.literal('text'),
  heading:       z.string(),
  body_markdown: z.string(),
});

const imageSlideSchema = z.object({
  order:         z.number().int().min(1),
  type:          z.literal('image'),
  image_url:     z.string(),
  caption:       z.string(),
  body_markdown: z.string().optional(),
});

const importedSlideSchema = z.object({
  order:       z.number().int().min(1),
  type:        z.literal('imported'),
  image_url:   z.string(),
  caption:     z.string(),
  source_pdf:  z.string().optional(),
  source_page: z.number().int().min(1).optional(),
});

export const slideSchema = z.discriminatedUnion('type', [
  textSlideSchema,
  imageSlideSchema,
  importedSlideSchema,
]);

export const slidesArraySchema = z.array(slideSchema);

export type TextSlide     = z.infer<typeof textSlideSchema>;
export type ImageSlide    = z.infer<typeof imageSlideSchema>;
export type ImportedSlide = z.infer<typeof importedSlideSchema>;
export type Slide         = z.infer<typeof slideSchema>;
