import {
  pgTable, uuid, text, integer, jsonb, timestamp, check, unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './core';
import { users } from './core';

// ---------------------------------------------------------------------------
// course_sequences
// ---------------------------------------------------------------------------

export const courseSequences = pgTable('course_sequences', {
  id:           uuid('id').primaryKey().defaultRandom(),
  content_type: text('content_type').notNull(), // 'platform' | 'customer'
  tenant_id:    uuid('tenant_id').references(() => tenants.id, { onDelete: 'restrict' }),
  audience:     text('audience').notNull(),      // 'analyst' in v1
  slug:         text('slug').notNull(),
  name:         text('name').notNull(),
  description:  text('description'),
  status:       text('status').notNull().default('draft'), // 'draft' | 'published' | 'archived'
  author_id:    uuid('author_id').notNull().references(() => users.id),
  created_at:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  platformScopeCheck: check(
    'course_sequences_platform_scope',
    sql`(content_type = 'platform' AND tenant_id IS NULL) OR (content_type = 'customer' AND tenant_id IS NOT NULL)`
  ),
  statusCheck: check(
    'course_sequences_status',
    sql`status IN ('draft', 'published', 'archived')`
  ),
  audienceCheck: check(
    'course_sequences_audience',
    sql`audience IN ('analyst')`
  ),
  uniqueSlug: unique().on(t.content_type, t.tenant_id, t.slug),
}));

// ---------------------------------------------------------------------------
// courses
// ---------------------------------------------------------------------------

export const courses = pgTable('courses', {
  id:                uuid('id').primaryKey().defaultRandom(),
  content_type:      text('content_type').notNull(),
  tenant_id:         uuid('tenant_id').references(() => tenants.id, { onDelete: 'restrict' }),
  audience:          text('audience').notNull(),
  slug:              text('slug').notNull(),
  title:             text('title').notNull(),
  description:       text('description'),
  estimated_hours:   integer('estimated_hours'),
  sequence_id:       uuid('sequence_id').references(() => courseSequences.id, { onDelete: 'set null' }),
  sequence_order:    integer('sequence_order'),
  unlock_definition: jsonb('unlock_definition'),  // UnlockDefinition[] — see spec §6
  status:            text('status').notNull().default('draft'),
  author_id:         uuid('author_id').notNull().references(() => users.id),
  created_at:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:        timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  platformScopeCheck: check(
    'courses_platform_scope',
    sql`(content_type = 'platform' AND tenant_id IS NULL) OR (content_type = 'customer' AND tenant_id IS NOT NULL)`
  ),
  sequenceOrderPairedCheck: check(
    'courses_sequence_order_paired',
    sql`(sequence_id IS NULL AND sequence_order IS NULL) OR (sequence_id IS NOT NULL AND sequence_order IS NOT NULL)`
  ),
  statusCheck: check(
    'courses_status',
    sql`status IN ('draft', 'published', 'archived')`
  ),
  uniqueSlug: unique().on(t.content_type, t.tenant_id, t.slug),
}));
// Partial unique index enforced in raw SQL migration:
//   CREATE UNIQUE INDEX courses_sequence_order_uniq
//   ON courses(sequence_id, sequence_order)
//   WHERE sequence_id IS NOT NULL;

// ---------------------------------------------------------------------------
// modules
// ---------------------------------------------------------------------------

export const modules = pgTable('modules', {
  id:                uuid('id').primaryKey().defaultRandom(),
  course_id:         uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  module_order:      integer('module_order').notNull(),
  slug:              text('slug').notNull(),
  title:             text('title').notNull(),
  description:       text('description'),
  unlock_definition: jsonb('unlock_definition'),  // UnlockDefinition[] — see spec §6
  status:            text('status').notNull().default('draft'),
  created_at:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:        timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueOrder: unique().on(t.course_id, t.module_order),
  statusCheck: check('modules_status', sql`status IN ('draft', 'published', 'archived')`),
}));
// Content scope is inherited from parent course via app-layer enforcement.
// No redundant content_type / tenant_id columns on this table.

// ---------------------------------------------------------------------------
// lessons
// ---------------------------------------------------------------------------

export const lessons = pgTable('lessons', {
  id:           uuid('id').primaryKey().defaultRandom(),
  module_id:    uuid('module_id').notNull().references(() => modules.id, { onDelete: 'cascade' }),
  lesson_order: integer('lesson_order').notNull(),
  lesson_type:  text('lesson_type').notNull(), // 'overview' | 'reading-guide' | 'summary' | 'worked-example'
  slug:         text('slug').notNull(),
  title:        text('title').notNull(),
  slides:       jsonb('slides').notNull().default(sql`'[]'::jsonb`), // Slide[] — see spec §3 JSONB shapes
  created_at:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueOrder: unique().on(t.module_id, t.lesson_order),
  lessonTypeCheck: check(
    'lessons_lesson_type',
    sql`lesson_type IN ('overview', 'reading-guide', 'summary', 'worked-example')`
  ),
}));

// ---------------------------------------------------------------------------
// quizzes
// Quiz has exactly one parent: either a module (MC self-check) or a course (capstone, MC or FR).
// XOR enforced by CHECK constraint; both FKs nullable with cascade-on-delete.
// ---------------------------------------------------------------------------

export const quizzes = pgTable('quizzes', {
  id:             uuid('id').primaryKey().defaultRandom(),
  module_id:      uuid('module_id').references(() => modules.id, { onDelete: 'cascade' }),
  course_id:      uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }),
  title:          text('title').notNull(),
  description:    text('description'),
  pass_threshold: integer('pass_threshold').notNull().default(80), // 0–100
  quiz_type:      text('quiz_type').notNull(), // 'multiple_choice' | 'free_response'
  status:         text('status').notNull().default('draft'),
  created_at:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:     timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (_t) => ({
  exactlyOneParentCheck: check(
    'quizzes_exactly_one_parent',
    sql`(module_id IS NOT NULL AND course_id IS NULL) OR (module_id IS NULL AND course_id IS NOT NULL)`
  ),
  moduleQuizMustBeMcCheck: check(
    'quizzes_module_must_be_mc',
    sql`module_id IS NULL OR quiz_type = 'multiple_choice'`
  ),
  quizTypeCheck: check(
    'quizzes_quiz_type',
    sql`quiz_type IN ('multiple_choice', 'free_response')`
  ),
  statusCheck: check('quizzes_status', sql`status IN ('draft', 'published', 'archived')`),
}));

// ---------------------------------------------------------------------------
// quiz_questions
// ---------------------------------------------------------------------------

export const quizQuestions = pgTable('quiz_questions', {
  id:                         uuid('id').primaryKey().defaultRandom(),
  quiz_id:                    uuid('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  question_order:             integer('question_order').notNull(),
  question_type:              text('question_type').notNull(),  // 'multiple_choice' | 'free_response'
  topic:                      text('topic'),
  stem_markdown:              text('stem_markdown').notNull(),
  mc_options:                 jsonb('mc_options'),               // string[4] — options A, B, C, D
  mc_correct_option:          text('mc_correct_option'),         // 'a' | 'b' | 'c' | 'd'
  mc_explanation_markdown:    text('mc_explanation_markdown'),
  fr_model_answer_markdown:   text('fr_model_answer_markdown'),
  fr_grading_rubric_markdown: text('fr_grading_rubric_markdown'),
  created_at:                 timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueOrder: unique().on(t.quiz_id, t.question_order),
  questionTypeCheck: check(
    'quiz_questions_type',
    sql`question_type IN ('multiple_choice', 'free_response')`
  ),
  mcFieldsCheck: check(
    'quiz_questions_mc_fields',
    sql`
      (question_type = 'multiple_choice' AND mc_options IS NOT NULL AND mc_correct_option IS NOT NULL)
      OR
      (question_type = 'free_response' AND mc_options IS NULL AND mc_correct_option IS NULL)
    `
  ),
  mcCorrectOptionCheck: check(
    'quiz_questions_mc_correct_option',
    sql`mc_correct_option IS NULL OR mc_correct_option IN ('a', 'b', 'c', 'd')`
  ),
  frFieldsCheck: check(
    'quiz_questions_fr_fields',
    sql`
      (question_type = 'free_response' AND fr_model_answer_markdown IS NOT NULL AND fr_grading_rubric_markdown IS NOT NULL)
      OR question_type = 'multiple_choice'
    `
  ),
}));
