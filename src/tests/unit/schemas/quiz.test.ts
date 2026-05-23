import { describe, it, expect } from 'vitest';
import {
  questionMcSchema,
  questionFrSchema,
  questionSchema,
  quizSaveSchema,
} from '@/features/content-manager/schemas/quiz';

describe('questionMcSchema', () => {
  const validMc = {
    question_type:     'multiple_choice' as const,
    stem_markdown:     'What is 2+2?',
    mc_options:        ['1', '2', '3', '4'] as [string, string, string, string],
    mc_correct_option: 'c' as const,
  };

  it('accepts a valid MC question', () => {
    expect(questionMcSchema.safeParse(validMc).success).toBe(true);
  });

  it('accepts optional topic and explanation', () => {
    const result = questionMcSchema.safeParse({
      ...validMc,
      topic:                   'Math',
      mc_explanation_markdown: 'Because 2+2=4',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty stem', () => {
    const result = questionMcSchema.safeParse({ ...validMc, stem_markdown: '' });
    expect(result.success).toBe(false);
  });

  it('rejects mc_options with only 3 elements', () => {
    const result = questionMcSchema.safeParse({ ...validMc, mc_options: ['1', '2', '3'] });
    expect(result.success).toBe(false);
  });

  it('rejects invalid mc_correct_option', () => {
    const result = questionMcSchema.safeParse({ ...validMc, mc_correct_option: 'e' });
    expect(result.success).toBe(false);
  });
});

describe('questionFrSchema', () => {
  const validFr = {
    question_type:              'free_response' as const,
    stem_markdown:              'Explain COB primacy.',
    fr_model_answer_markdown:   'Primary payer pays first…',
    fr_grading_rubric_markdown: '1pt: mentions primary payer',
  };

  it('accepts a valid FR question', () => {
    expect(questionFrSchema.safeParse(validFr).success).toBe(true);
  });

  it('rejects empty model answer', () => {
    const result = questionFrSchema.safeParse({ ...validFr, fr_model_answer_markdown: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty rubric', () => {
    const result = questionFrSchema.safeParse({ ...validFr, fr_grading_rubric_markdown: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty stem', () => {
    const result = questionFrSchema.safeParse({ ...validFr, stem_markdown: '' });
    expect(result.success).toBe(false);
  });
});

describe('questionSchema (discriminated union)', () => {
  it('selects MC branch for multiple_choice', () => {
    const result = questionSchema.safeParse({
      question_type:     'multiple_choice',
      stem_markdown:     'Q?',
      mc_options:        ['a', 'b', 'c', 'd'],
      mc_correct_option: 'a',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.question_type).toBe('multiple_choice');
  });

  it('selects FR branch for free_response', () => {
    const result = questionSchema.safeParse({
      question_type:              'free_response',
      stem_markdown:              'Q?',
      fr_model_answer_markdown:   'A',
      fr_grading_rubric_markdown: 'R',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.question_type).toBe('free_response');
  });

  it('rejects unknown question_type', () => {
    const result = questionSchema.safeParse({ question_type: 'essay', stem_markdown: 'Q?' });
    expect(result.success).toBe(false);
  });
});

describe('quizSaveSchema', () => {
  const validSave = {
    pass_threshold:        75,
    questions:             [],
    last_known_updated_at: new Date().toISOString(),
  };

  it('accepts a valid save payload with no questions', () => {
    expect(quizSaveSchema.safeParse(validSave).success).toBe(true);
  });

  it('accepts a payload with MC and FR questions', () => {
    const result = quizSaveSchema.safeParse({
      ...validSave,
      questions: [
        {
          question_type:     'multiple_choice',
          stem_markdown:     'Q1?',
          mc_options:        ['a', 'b', 'c', 'd'],
          mc_correct_option: 'b',
        },
        {
          question_type:              'free_response',
          stem_markdown:              'Q2?',
          fr_model_answer_markdown:   'A',
          fr_grading_rubric_markdown: 'R',
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.questions).toHaveLength(2);
  });

  it('rejects pass_threshold > 100', () => {
    expect(quizSaveSchema.safeParse({ ...validSave, pass_threshold: 101 }).success).toBe(false);
  });

  it('rejects pass_threshold < 0', () => {
    expect(quizSaveSchema.safeParse({ ...validSave, pass_threshold: -1 }).success).toBe(false);
  });

  it('rejects missing last_known_updated_at', () => {
    const { last_known_updated_at: _, ...rest } = validSave;
    expect(quizSaveSchema.safeParse(rest).success).toBe(false);
  });
});
