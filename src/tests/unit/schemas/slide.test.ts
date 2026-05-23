import { describe, it, expect } from 'vitest';
import { slidesArraySchema, slideSchema } from '@/features/content-manager/schemas/slide';

describe('slideSchema (discriminated union)', () => {
  it('accepts a valid text slide', () => {
    const result = slideSchema.safeParse({ order: 1, type: 'text', heading: 'Hello', body_markdown: 'World' });
    expect(result.success).toBe(true);
  });

  it('accepts a valid image slide with optional body_markdown', () => {
    const result = slideSchema.safeParse({
      order: 1, type: 'image', image_url: 'https://cdn.example.com/img.png', caption: 'Figure 1', body_markdown: 'Optional text',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid image slide without body_markdown', () => {
    const result = slideSchema.safeParse({ order: 1, type: 'image', image_url: 'x', caption: 'y' });
    expect(result.success).toBe(true);
  });

  it('accepts a valid imported slide with all optional fields', () => {
    const result = slideSchema.safeParse({
      order: 2, type: 'imported', image_url: 'x', caption: 'p.1', source_pdf: 'doc.pdf', source_page: 1,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid imported slide without optional fields', () => {
    const result = slideSchema.safeParse({ order: 1, type: 'imported', image_url: '', caption: '' });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown slide type', () => {
    const result = slideSchema.safeParse({ order: 1, type: 'video', url: 'x' });
    expect(result.success).toBe(false);
  });

  it('rejects text slide missing body_markdown', () => {
    const result = slideSchema.safeParse({ order: 1, type: 'text', heading: 'Hello' });
    expect(result.success).toBe(false);
  });

  it('rejects slide with order < 1', () => {
    const result = slideSchema.safeParse({ order: 0, type: 'text', heading: 'x', body_markdown: 'y' });
    expect(result.success).toBe(false);
  });
});

describe('slidesArraySchema', () => {
  it('accepts an empty array', () => {
    expect(slidesArraySchema.safeParse([]).success).toBe(true);
  });

  it('accepts a mixed-type array', () => {
    const result = slidesArraySchema.safeParse([
      { order: 1, type: 'text', heading: 'H', body_markdown: 'B' },
      { order: 2, type: 'image', image_url: 'u', caption: 'c' },
      { order: 3, type: 'imported', image_url: 'u', caption: 'c', source_pdf: 'f.pdf', source_page: 3 },
    ]);
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(3);
  });

  it('rejects array containing an invalid slide', () => {
    const result = slidesArraySchema.safeParse([
      { order: 1, type: 'text', heading: 'H', body_markdown: 'B' },
      { order: 2, type: 'video' },
    ]);
    expect(result.success).toBe(false);
  });
});
