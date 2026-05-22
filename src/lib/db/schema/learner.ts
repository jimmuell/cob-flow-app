import {
  pgTable, uuid, text, numeric, boolean, jsonb, timestamp, check, unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants, users } from './core';
import { courses, lessons, quizzes } from './content';

// ---------------------------------------------------------------------------
// course_enrollments
// ---------------------------------------------------------------------------

export const courseEnrollments = pgTable('course_enrollments', {
  id:          uuid('id').primaryKey().defaultRandom(),
  user_id:     uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  course_id:   uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  tenant_id:   uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  status:      text('status').notNull().default('enrolled'), // 'enrolled' | 'completed' | 'dropped'
  enrolled_at: timestamp('enrolled_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:  timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueEnrollment: unique().on(t.user_id, t.course_id),
  statusCheck: check(
    'course_enrollments_status',
    sql`status IN ('enrolled', 'completed', 'dropped')`
  ),
}));

// ---------------------------------------------------------------------------
// lesson_completions
// ---------------------------------------------------------------------------

export const lessonCompletions = pgTable('lesson_completions', {
  id:           uuid('id').primaryKey().defaultRandom(),
  user_id:      uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lesson_id:    uuid('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  completed_at: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueCompletion: unique().on(t.user_id, t.lesson_id),
}));

// ---------------------------------------------------------------------------
// quiz_attempts
// Multiple attempts are allowed per user/quiz — no unique constraint.
// ---------------------------------------------------------------------------

export const quizAttempts = pgTable('quiz_attempts', {
  id:            uuid('id').primaryKey().defaultRandom(),
  user_id:       uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  quiz_id:       uuid('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  tenant_id:     uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  score_percent: numeric('score_percent', { precision: 5, scale: 2 }),
  passed:        boolean('passed'),
  responses:     jsonb('responses'),  // QuizResponse[] — per-question responses
  attempted_at:  timestamp('attempted_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// course_completions
// ---------------------------------------------------------------------------

export const courseCompletions = pgTable('course_completions', {
  id:                uuid('id').primaryKey().defaultRandom(),
  user_id:           uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  course_id:         uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  final_quiz_attempt_id: uuid('final_quiz_attempt_id').references(() => quizAttempts.id, { onDelete: 'set null' }),
  completed_at:      timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueCompletion: unique().on(t.user_id, t.course_id),
}));
