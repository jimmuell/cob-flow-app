# Content Manager Spec

**Status:** draft for design review  
**Prepared by:** cob-flow-app Claude Code agent from Cowork design-review session  
**Reviewed by:** Jim (open questions resolved 2026-05-22; corrective pass applied)  
**Target branch:** main

A future engineer reading this spec must be able to build the Content Manager without access to any prior Cowork session. All design decisions are locked; all open questions from the initial draft have been resolved.

---

## §1 — Overview

The Content Manager (CM) is a feature module within `cob-flow-app` located at `src/features/content-manager/`. It is not a separate commercial product; it is a first-class area of the existing COB Flow application, built as a self-contained module directory to preserve future-extract optionality without forcing premature separation.

The CM provides a three-level learning hierarchy — Course → Module → Lesson — plus two quiz modes: module-level multiple-choice self-checks and course-level free-response capstone scenarios. Its two halves are (1) an authoring surface for Admins, Managers, and Supervisors, and (2) a learner surface for all signed-in users.

**Purpose and outputs.** Published courses are consumed by learners in the learner surface. On completion, courses and modules grant authority unlocks that are stored in `authority_unlocks` and will feed `canPerform()` in Phase 2 (see `src/lib/authority/can-perform.ts`). In Pass 1 and the CM v1 buildout, `canPerform()` continues to return `allow` for all signed-in users; the unlock records are written and accumulate but are not yet consulted.

**Content scoping.** Content has a `content_type` of either `'platform'` or `'customer'`. Platform content is authored by Admins and is visible to all tenants. Customer content is authored by Managers or Supervisors and is scoped to their tenant. The `tenant_id` column is populated for customer content and NULL for platform content.

**User roles.** Consult `src/lib/authority/roles.ts` and `src/lib/types/role.ts` for the canonical four-role model (`ANALYST | SUPERVISOR | MANAGER | ADMIN`). Authoring permissions by role:

- Admin: create, edit, publish, archive platform content and all customer content.
- Manager: create, edit, publish, archive customer content scoped to their tenant.
- Supervisor: create, edit, publish, archive customer content scoped to their tenant.
- Analyst: no authoring access; learner access only.

All signed-in users are learners. There is no separate learner role. Enrollment is unconditional with respect to role — anyone can enroll in any course regardless of their role or the course's audience label.

**Per-tenant feature flag.** The `tenants` table gains a `features` JSONB column. The key `content_manager: boolean` controls whether the CM is exposed in the nav for that tenant. Customers who run in-house training programs disable the CM; their Analysts gain authority via manager-grant only (see §6). The flag gates the learner surface, the authoring surface, and the sidebar nav item. The Admin-authored platform route `/admin/content/*` is not gated by this flag.

**Module terminology.** "Module" replaces "Chapter" at the schema, UI, and future source-content level throughout this spec. The existing `content/courses/auto-cob-wisconsin/` directory structure uses `chapter-NN-name/` naming; a follow-up agent prompt will rename those directories and update `content/courses/auto-cob-wisconsin/README.md` and `content/courses/auto-cob-wisconsin/conventions.md`. This spec uses "Module" exclusively. Citation helpers in the slide editor emit Module-based citations (e.g., `[Module 6 § Plan Document Classification]`); the existing `conventions.md` citation style is updated to match at chapter→module rename time.

---

## §2 — Domain Model

### Entities

**CourseSequence.** An ordered collection of courses that must be taken in sequence. Optional — standalone courses exist outside any sequence. Named and ordered by the author; no fixed "stage" enum. Content-scoped (platform or customer).

**Course.** The primary unit of instruction. Belongs to a CourseSequence or stands alone. Contains an ordered list of Modules and zero or more course-level Quizzes. Carries an optional `unlock_definition` granting authority on completion. Content-scoped.

**Module.** A thematic block within a Course. Contains an ordered list of Lessons and optionally one module-level multiple-choice Quiz. Carries an optional `unlock_definition`. Inherits content scope from its parent Course via app-layer enforcement (no redundant scope columns on modules).

**Lesson.** A single instructional unit within a Module. Contains an ordered list of Slides stored as JSONB. Has a `lesson_type` that corresponds to the authoring conventions in `content/courses/auto-cob-wisconsin/conventions.md` (`overview`, `reading-guide`, `summary`, `worked-example`).

**Quiz.** Attached to either a Module (always multiple-choice) or a Course (multiple-choice or free-response). Holds an ordered list of QuizQuestions. Module-level quizzes are self-checks; course-level free-response quizzes are capstone scenarios.

**QuizQuestion.** A single question within a Quiz. Type is either `multiple_choice` (four options A–D, one correct answer, explanation) or `free_response` (model answer walkthrough, grading rubric, self-attestation).

**CourseEnrollment.** Links a user to a course. Created on first enrollment action. Status tracks `in_progress` → `completed`; can be revoked by a Manager or Admin.

**LessonCompletion.** Recorded when a user reaches the last slide of a lesson.

**QuizAttempt.** One attempt by a user at a quiz. Per-user per-quiz attempt counter. Stores responses as JSONB; MC score is computed and persisted on submission so historical records do not drift if quiz definitions change.

**CourseCompletion.** Recorded when all lessons and modules in a course are complete and the course-level capstone quiz (if any) has been self-attested. Links to the capstone attempt if applicable.

**AuthorityUnlock.** A granted authority ceiling for a user along one of the six unlock dimensions. Created by course or module completion (system-granted) or by a Manager directly (manager-grant). Soft-revocable. See §6 for the full model.

**LearningNotification.** Generated by the system on module or course completion. Addressed to the learner's Supervisor (or Manager if the learner is a Supervisor). Informational only in v1.

**PdfImportJob.** Tracks asynchronous PDF-to-slide import progress. Associated with a Lesson. See §8 for size tiers.

**PlatformAuthorityCeiling.** Admin-managed table of per-unlock-type maximum values. Clamps customer-defined `unlock_definition` entries at insert time.

### Relationship Diagram

```
CourseSequence (0..1) ──< Course (1..N) ──< Module (N) ──< Lesson (N)
                             │                │                └── Slides[] (JSONB)
                             │                └── Quiz (0..1, MC only)
                             │                        └── QuizQuestion (N)
                             └── Quiz (0..N, MC or FR)
                                     └── QuizQuestion (N)

User ──< CourseEnrollment ──< Course
User ──< LessonCompletion ──< Lesson
User ──< QuizAttempt ──< Quiz
User ──< CourseCompletion ──< Course
User ──< AuthorityUnlock
```

### Terminology

The Customer/Analyst/Self depth markers in the existing source files at `content/courses/auto-cob-wisconsin/` are removed during the ingestion-prep pass before any chapter content is ingested. v1 content is single-audience per course (course-level `audience` column); there is no per-section, per-slide, or per-question depth metadata in the schema or in the going-forward authoring conventions.

- "Module" = instructional block within a course. Not "Chapter" (deprecated), not "Unit".
- "Audience" = the role a course is designed for (`'analyst'` in v1). Not "track" (ambiguous), not "tier" (reserved — see below).
- "Authority unlock" = a granted ceiling along one dimension. Not "permission" (that's role-based access control), not "certification" (Phase 2).

---

## §3 — Database Schema (DDL + Drizzle)

All tables live in the default `public` schema. Drizzle table definitions below are prescriptive; exact import paths and `sql` helper calls may require minor adjustment during implementation.

### table: `course_sequences`

```typescript
import { pgTable, uuid, text, timestamp, check, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const courseSequences = pgTable('course_sequences', {
  id:           uuid('id').primaryKey().defaultRandom(),
  content_type: text('content_type').notNull(), // 'platform' | 'customer'
  tenant_id:    uuid('tenant_id').references(() => tenants.id, { onDelete: 'restrict' }),
  audience:     text('audience').notNull(),     // 'analyst' in v1
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
```

### table: `courses`

```typescript
import { pgTable, uuid, text, integer, jsonb, timestamp, check, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const courses = pgTable('courses', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  content_type:       text('content_type').notNull(),
  tenant_id:          uuid('tenant_id').references(() => tenants.id, { onDelete: 'restrict' }),
  audience:           text('audience').notNull(),
  slug:               text('slug').notNull(),
  title:              text('title').notNull(),
  description:        text('description'),
  estimated_hours:    integer('estimated_hours'),
  sequence_id:        uuid('sequence_id').references(() => courseSequences.id, { onDelete: 'set null' }),
  sequence_order:     integer('sequence_order'),
  unlock_definition:  jsonb('unlock_definition'),  // UnlockDefinition[] — see §6
  status:             text('status').notNull().default('draft'),
  author_id:          uuid('author_id').notNull().references(() => users.id),
  created_at:         timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:         timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
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
// Note: the (sequence_id, sequence_order) uniqueness when not null is enforced by a
// partial unique index:
//   CREATE UNIQUE INDEX courses_sequence_order_uniq
//   ON courses(sequence_id, sequence_order)
//   WHERE sequence_id IS NOT NULL;
```

### table: `modules`

```typescript
export const modules = pgTable('modules', {
  id:                uuid('id').primaryKey().defaultRandom(),
  course_id:         uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  module_order:      integer('module_order').notNull(),
  slug:              text('slug').notNull(),
  title:             text('title').notNull(),
  description:       text('description'),
  unlock_definition: jsonb('unlock_definition'),  // UnlockDefinition[] — see §6
  status:            text('status').notNull().default('draft'),
  created_at:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:        timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueOrder: unique().on(t.course_id, t.module_order),
  statusCheck: check('modules_status', sql`status IN ('draft', 'published', 'archived')`),
}));
// Content scope is inherited from parent course via app-layer enforcement.
// No redundant content_type / tenant_id columns on this table.
```

### table: `lessons`

```typescript
export const lessons = pgTable('lessons', {
  id:           uuid('id').primaryKey().defaultRandom(),
  module_id:    uuid('module_id').notNull().references(() => modules.id, { onDelete: 'cascade' }),
  lesson_order: integer('lesson_order').notNull(),
  lesson_type:  text('lesson_type').notNull(), // 'overview' | 'reading-guide' | 'summary' | 'worked-example'
  slug:         text('slug').notNull(),
  title:        text('title').notNull(),
  slides:       jsonb('slides').notNull().default(sql`'[]'::jsonb`), // Slide[] — see JSONB shapes below
  created_at:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueOrder: unique().on(t.module_id, t.lesson_order),
  lessonTypeCheck: check(
    'lessons_lesson_type',
    sql`lesson_type IN ('overview', 'reading-guide', 'summary', 'worked-example')`
  ),
}));
```

### table: `quizzes`

```typescript
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
}, (t) => ({
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
// Quiz has exactly one parent: either a module (MC self-check) or a course (capstone, MC or FR).
// Database-enforced referential integrity and cascade-on-delete via two nullable FKs + XOR CHECK.
```

### table: `quiz_questions`

```typescript
export const quizQuestions = pgTable('quiz_questions', {
  id:                      uuid('id').primaryKey().defaultRandom(),
  quiz_id:                 uuid('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  question_order:          integer('question_order').notNull(),
  question_type:           text('question_type').notNull(),  // 'multiple_choice' | 'free_response'
  topic:                   text('topic'),
  stem_markdown:           text('stem_markdown').notNull(),
  mc_options:              jsonb('mc_options'),              // string[4] — options A, B, C, D
  mc_correct_option:       text('mc_correct_option'),        // 'a' | 'b' | 'c' | 'd'
  mc_explanation_markdown: text('mc_explanation_markdown'),
  fr_model_answer_markdown: text('fr_model_answer_markdown'),
  fr_grading_rubric_markdown: text('fr_grading_rubric_markdown'),
  created_at:              timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
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
```

### table: `course_enrollments`

```typescript
export const courseEnrollments = pgTable('course_enrollments', {
  id:               uuid('id').primaryKey().defaultRandom(),
  user_id:          uuid('user_id').notNull().references(() => users.id),
  course_id:        uuid('course_id').notNull().references(() => courses.id),
  tenant_id:        uuid('tenant_id').notNull().references(() => tenants.id), // denormalized for RLS
  enrolled_at:      timestamp('enrolled_at', { withTimezone: true }).notNull().defaultNow(),
  last_activity_at: timestamp('last_activity_at', { withTimezone: true }),
  status:           text('status').notNull().default('in_progress'), // 'in_progress' | 'completed' | 'revoked'
}, (t) => ({
  uniqueEnrollment: unique().on(t.user_id, t.course_id),
  statusCheck: check(
    'course_enrollments_status',
    sql`status IN ('in_progress', 'completed', 'revoked')`
  ),
}));
```

### table: `lesson_completions`

```typescript
export const lessonCompletions = pgTable('lesson_completions', {
  id:           uuid('id').primaryKey().defaultRandom(),
  user_id:      uuid('user_id').notNull().references(() => users.id),
  lesson_id:    uuid('lesson_id').notNull().references(() => lessons.id),
  completed_at: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueCompletion: unique().on(t.user_id, t.lesson_id),
}));
```

### table: `quiz_attempts`

```typescript
export const quizAttempts = pgTable('quiz_attempts', {
  id:                uuid('id').primaryKey().defaultRandom(),
  user_id:           uuid('user_id').notNull().references(() => users.id),
  quiz_id:           uuid('quiz_id').notNull().references(() => quizzes.id),
  attempt_number:    integer('attempt_number').notNull(),  // per-user-per-quiz counter
  tenant_id:         uuid('tenant_id').notNull().references(() => tenants.id),
  started_at:        timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  submitted_at:      timestamp('submitted_at', { withTimezone: true }),
  self_attested_at:  timestamp('self_attested_at', { withTimezone: true }), // FR only
  responses:         jsonb('responses').notNull().default(sql`'[]'::jsonb`), // QuizAttemptResponses — see JSONB shapes
  score_percent:     numeric('score_percent', { precision: 5, scale: 2 }),   // MC only; null for FR
  passed:            boolean('passed'),                                        // MC only; null for FR
});
// attempt_number is assigned by the server action as MAX(attempt_number)+1 for (user_id, quiz_id).
```

### table: `course_completions`

```typescript
export const courseCompletions = pgTable('course_completions', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  user_id:             uuid('user_id').notNull().references(() => users.id),
  course_id:           uuid('course_id').notNull().references(() => courses.id),
  completed_at:        timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
  capstone_attempt_id: uuid('capstone_attempt_id').references(() => quizAttempts.id),
}, (t) => ({
  uniqueCompletion: unique().on(t.user_id, t.course_id),
}));
```

### table: `authority_unlocks`

```typescript
export const authorityUnlocks = pgTable('authority_unlocks', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  user_id:             uuid('user_id').notNull().references(() => users.id),
  tenant_id:           uuid('tenant_id').notNull().references(() => tenants.id),
  unlock_type:         text('unlock_type').notNull(),
  unlock_value:        numeric('unlock_value', { precision: 15, scale: 2 }).notNull(),
  source:              text('source').notNull(), // 'course_completion' | 'module_completion' | 'manager_grant'
  source_id:           uuid('source_id'),        // course_completions.id (for source='course_completion'), modules.id (for source='module_completion'), NULL (for source='manager_grant')
  granted_by_user_id:  uuid('granted_by_user_id').references(() => users.id), // null for system-granted
  granted_at:          timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
  revoked_at:          timestamp('revoked_at', { withTimezone: true }),
  revoked_by_user_id:  uuid('revoked_by_user_id').references(() => users.id),
  revoked_reason:      text('revoked_reason'),
}, (t) => ({
  unlockTypeCheck: check(
    'authority_unlocks_type',
    sql`unlock_type IN ('settlement', 'demand', 'lien_reduction', 'closure', 'letter_override', 'template_publication')`
  ),
  sourceCheck: check(
    'authority_unlocks_source',
    sql`source IN ('course_completion', 'module_completion', 'manager_grant')`
  ),
  revocationIntegrityCheck: check(
    'authority_unlocks_revocation_integrity',
    sql`(revoked_at IS NULL) = (revoked_by_user_id IS NULL)`
  ),
}));
```

There is intentionally no `module_completions` table. Module completion is derived state — a module is considered complete when (a) every lesson in the module has a `lesson_completions` row for the user, AND (b) the module's quiz (if any) has a `quiz_attempts` row for the user with `passed = true`. The module itself is the stable reference for `source_id` when `source = 'module_completion'`.

### table: `learning_notifications`

```typescript
export const learningNotifications = pgTable('learning_notifications', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  tenant_id:          uuid('tenant_id').notNull().references(() => tenants.id),
  recipient_user_id:  uuid('recipient_user_id').references(() => users.id),
  subject_user_id:    uuid('subject_user_id').notNull().references(() => users.id),
  notification_type:  text('notification_type').notNull(), // 'course_completed' | 'module_completed' | 'quiz_flagged'
  course_id:          uuid('course_id').references(() => courses.id),
  module_id:          uuid('module_id').references(() => modules.id),
  payload:            jsonb('payload').notNull().default(sql`'{}'::jsonb`),
  acknowledged_at:    timestamp('acknowledged_at', { withTimezone: true }),
  created_at:         timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  notificationTypeCheck: check(
    'learning_notifications_type',
    sql`notification_type IN ('course_completed', 'module_completed', 'quiz_flagged')`
  ),
}));
```

### table: `pdf_import_jobs`

```typescript
export const pdfImportJobs = pgTable('pdf_import_jobs', {
  id:              uuid('id').primaryKey().defaultRandom(),
  lesson_id:       uuid('lesson_id').notNull().references(() => lessons.id),
  source_filename: text('source_filename').notNull(),
  total_pages:     integer('total_pages').notNull(),
  completed_pages: integer('completed_pages').notNull().default(0),
  status:          text('status').notNull().default('pending'), // 'pending' | 'processing' | 'complete' | 'failed'
  error_message:   text('error_message'),
  created_at:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completed_at:    timestamp('completed_at', { withTimezone: true }),
}, (t) => ({
  statusCheck: check(
    'pdf_import_jobs_status',
    sql`status IN ('pending', 'processing', 'complete', 'failed')`
  ),
}));
```

### table: `platform_authority_ceilings`

```typescript
export const platformAuthorityCeilings = pgTable('platform_authority_ceilings', {
  id:          uuid('id').primaryKey().defaultRandom(),
  unlock_type: text('unlock_type').notNull().unique(),
  max_value:   numeric('max_value', { precision: 15, scale: 2 }).notNull(),
  updated_at:  timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updated_by:  uuid('updated_by').references(() => users.id),
}, (t) => ({
  unlockTypeCheck: check(
    'platform_authority_ceilings_type',
    sql`unlock_type IN ('settlement', 'demand', 'lien_reduction', 'closure', 'letter_override', 'template_publication')`
  ),
}));
// Six rows — one per unlock dimension. Seeded at bootstrap.
```

### Extending: `tenants` table

The existing `tenants` table (`src/lib/mock/tenants.ts`) gains a `features` JSONB column. Drizzle column: `features: jsonb('features').notNull().default(sql`'{"content_manager": true}'::jsonb`)`. TypeScript type addition: `features: { content_manager: boolean }`.

### Extending: `AuthorityBands` in `src/lib/types/role.ts`

Add `letterOverride: number` and `templatePublication: number` to the existing four-field interface. Existing call sites are unaffected (additive change).

### Recommended Indexes

```sql
CREATE INDEX courses_sequence_id_idx ON courses(sequence_id);
CREATE INDEX courses_author_id_idx ON courses(author_id);
CREATE INDEX modules_course_id_idx ON modules(course_id);
CREATE INDEX lessons_module_id_idx ON lessons(module_id);
CREATE INDEX quiz_questions_quiz_id_idx ON quiz_questions(quiz_id);
CREATE INDEX quizzes_module_id_idx ON quizzes(module_id) WHERE module_id IS NOT NULL;
CREATE INDEX quizzes_course_id_idx ON quizzes(course_id) WHERE course_id IS NOT NULL;
CREATE INDEX course_enrollments_user_id_idx ON course_enrollments(user_id);
CREATE INDEX course_enrollments_course_id_idx ON course_enrollments(course_id);
CREATE INDEX quiz_attempts_user_id_quiz_id_idx ON quiz_attempts(user_id, quiz_id);
CREATE INDEX authority_unlocks_user_id_idx ON authority_unlocks(user_id);
CREATE INDEX learning_notifications_recipient_idx ON learning_notifications(recipient_user_id, acknowledged_at);
CREATE INDEX courses_status_audience_idx ON courses(status, audience);
CREATE INDEX course_sequences_status_audience_idx ON course_sequences(status, audience);
CREATE INDEX course_enrollments_user_status_idx ON course_enrollments(user_id, status);
-- Partial indexes:
CREATE UNIQUE INDEX courses_sequence_order_uniq ON courses(sequence_id, sequence_order) WHERE sequence_id IS NOT NULL;
CREATE INDEX authority_unlocks_active_idx ON authority_unlocks(user_id, unlock_type) WHERE revoked_at IS NULL;
```

### JSONB Shape Definitions

#### Slide (inside `lessons.slides`)

```typescript
type Slide =
  | { order: number; type: "text";     heading: string; body_markdown: string }
  | { order: number; type: "image";    image_url: string; caption: string; body_markdown?: string }
  | { order: number; type: "imported"; image_url: string; caption: string; source_pdf?: string; source_page?: number };
```

#### UnlockDefinition (inside `courses.unlock_definition` and `modules.unlock_definition`)

```typescript
type UnlockDefinition = Array<{
  unlock_type: "settlement" | "demand" | "lien_reduction" | "closure" | "letter_override" | "template_publication";
  unlock_value: number;
}>;
```

#### QuizAttemptResponses (inside `quiz_attempts.responses`)

```typescript
// MC: array of selected options per question
type McAttemptResponses = Array<{ question_id: string; selected_option: "a" | "b" | "c" | "d" }>;
// FR: single answer text
type FrAttemptResponse = { answer_markdown: string };
type QuizAttemptResponses = McAttemptResponses | FrAttemptResponse;
```

---

## §4 — Authorization Model (RLS + Helpers)

### Session-Context Plumbing

Every Supabase database connection must set three session-local configuration variables before executing any query. This plumbing lives in the Drizzle connection wrapper, adjacent to `src/lib/auth/session.ts`:

```sql
SET LOCAL app.current_user_id  = '<uuid>';
SET LOCAL app.current_tenant_id = '<uuid>';
SET LOCAL app.current_role      = 'ANALYST' | 'SUPERVISOR' | 'MANAGER' | 'ADMIN';
```

These are set from the result of `getCurrentUser()` in `src/lib/auth/session.ts`. RLS policies and helper functions read these settings rather than any application-level JWT claims.

### Helper Functions

```sql
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
  SELECT current_setting('app.current_role', true) = 'ADMIN';
$$ LANGUAGE sql STABLE SECURITY DEFINER;
CREATE OR REPLACE FUNCTION is_manager() RETURNS boolean AS $$
  SELECT current_setting('app.current_role', true) = 'MANAGER';
$$ LANGUAGE sql STABLE SECURITY DEFINER;
CREATE OR REPLACE FUNCTION is_supervisor() RETURNS boolean AS $$
  SELECT current_setting('app.current_role', true) = 'SUPERVISOR';
$$ LANGUAGE sql STABLE SECURITY DEFINER;
CREATE OR REPLACE FUNCTION is_analyst() RETURNS boolean AS $$
  SELECT current_setting('app.current_role', true) = 'ANALYST';
$$ LANGUAGE sql STABLE SECURITY DEFINER;
CREATE OR REPLACE FUNCTION is_tenant_member(target_tenant_id uuid) RETURNS boolean AS $$
  SELECT current_setting('app.current_tenant_id', true)::uuid = target_tenant_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
CREATE OR REPLACE FUNCTION student_is_enrolled_in_course(target_course_id uuid) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM course_enrollments
    WHERE user_id   = current_setting('app.current_user_id', true)::uuid
      AND course_id = target_course_id
      AND status   != 'revoked'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
-- Returns { unlock_type: max_unlock_value } for all active unlocks. Used by canPerform() in Phase 2.
CREATE OR REPLACE FUNCTION effective_authority(target_user_id uuid) RETURNS jsonb AS $$
  SELECT jsonb_object_agg(unlock_type, max_value)
  FROM (
    SELECT unlock_type, MAX(unlock_value) AS max_value
    FROM authority_unlocks
    WHERE user_id = target_user_id AND revoked_at IS NULL
    GROUP BY unlock_type
  ) sub;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
-- System-triggered unlock writes (from course/module completion flows) call this function.
-- SECURITY DEFINER means it runs with the function owner's privileges, bypassing RLS on
-- authority_unlocks. Manager-grant inserts continue to flow through the RLS-checked path.
CREATE OR REPLACE FUNCTION grant_unlock_from_completion(
  target_user_id    uuid,
  target_tenant_id  uuid,
  p_unlock_type     text,
  p_unlock_value    numeric,
  p_source          text,  -- 'course_completion' or 'module_completion'
  p_source_id       uuid
) RETURNS uuid AS $$
  INSERT INTO authority_unlocks (
    user_id, tenant_id, unlock_type, unlock_value, source, source_id, granted_by_user_id
  ) VALUES (
    target_user_id, target_tenant_id, p_unlock_type, p_unlock_value, p_source, p_source_id, NULL
  )
  RETURNING id;
$$ LANGUAGE sql VOLATILE SECURITY DEFINER;
```

### RLS Policies

Enable RLS on all CM tables. The policies below use the helper functions defined above.

#### `course_sequences` and `courses` — content tables

```sql
CREATE POLICY content_read ON courses FOR SELECT USING (
  content_type = 'platform'
  OR (content_type = 'customer' AND is_tenant_member(tenant_id))
);
CREATE POLICY content_write ON courses FOR INSERT WITH CHECK (
  (content_type = 'platform' AND is_admin())
  OR (content_type = 'customer' AND (is_manager() OR is_supervisor()) AND is_tenant_member(tenant_id))
);
CREATE POLICY content_update ON courses FOR UPDATE USING (
  (content_type = 'platform' AND is_admin())
  OR (content_type = 'customer' AND (is_manager() OR is_supervisor()) AND is_tenant_member(tenant_id))
);
-- No hard DELETE. Apply identical policies to course_sequences.
```

#### `modules` and `lessons` — inherit from parent

```sql
CREATE POLICY modules_read ON modules FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM courses c
    WHERE c.id = modules.course_id
      AND (c.content_type = 'platform' OR is_tenant_member(c.tenant_id))
  )
);
CREATE POLICY modules_write ON modules FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM courses c
    WHERE c.id = modules.course_id
      AND (
        (c.content_type = 'platform' AND is_admin())
        OR (c.content_type = 'customer' AND (is_manager() OR is_supervisor()) AND is_tenant_member(c.tenant_id))
      )
  )
);
-- Apply same pattern to lessons (join via modules.course_id).
```

#### `quizzes` and `quiz_questions` — same scope chain

```sql
CREATE POLICY quizzes_read ON quizzes FOR SELECT USING (
  (module_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM modules m JOIN courses c ON c.id = m.course_id
    WHERE m.id = quizzes.module_id
      AND (c.content_type = 'platform' OR is_tenant_member(c.tenant_id))
  ))
  OR
  (course_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM courses c
    WHERE c.id = quizzes.course_id
      AND (c.content_type = 'platform' OR is_tenant_member(c.tenant_id))
  ))
);
```

#### Learner records — owned by learner, visible to supervisory chain

```sql
CREATE POLICY enrollments_read ON course_enrollments FOR SELECT USING (
  user_id = current_setting('app.current_user_id', true)::uuid
  OR is_tenant_member(tenant_id) AND (is_manager() OR is_supervisor())
  OR is_admin()
);
CREATE POLICY enrollments_insert ON course_enrollments FOR INSERT WITH CHECK (
  user_id = current_setting('app.current_user_id', true)::uuid
  OR is_manager() OR is_admin()
);
-- lesson_completions, quiz_attempts, course_completions: same pattern. Supervisor team-filter is app-layer.
CREATE POLICY learner_record_read ON lesson_completions FOR SELECT USING (
  user_id = current_setting('app.current_user_id', true)::uuid
  OR is_manager() OR is_admin()
);
```

#### `authority_unlocks`

```sql
CREATE POLICY authority_unlocks_read ON authority_unlocks FOR SELECT USING (
  user_id = current_setting('app.current_user_id', true)::uuid
  OR (is_tenant_member(tenant_id) AND (is_manager() OR is_supervisor()))
  OR is_admin()
);

CREATE POLICY authority_unlocks_insert ON authority_unlocks FOR INSERT WITH CHECK (
  is_manager() OR is_admin()
);
```

System-triggered unlock writes (from `completeModule()` and `completeCourse()` server actions, triggered when a learner — typically an Analyst — completes their last requirement) do NOT flow through this RLS policy. They go through `grant_unlock_from_completion()`, which is `SECURITY DEFINER` and runs with the function owner's privileges. This is the standard Postgres pattern for system-triggered writes that should not be subject to caller RLS. Manager-grant inserts (initiated by a Manager from the Management workspace) continue to flow through this policy.

#### `learning_notifications`

```sql
CREATE POLICY notifications_read ON learning_notifications FOR SELECT USING (
  recipient_user_id = current_setting('app.current_user_id', true)::uuid
  OR subject_user_id = current_setting('app.current_user_id', true)::uuid
  OR (is_tenant_member(tenant_id) AND (is_manager() OR is_admin()))
);
```

---

## §5 — Audience, Sequences, and Ordering

### Audience

The `audience` column on `course_sequences` and `courses` uses the value `'analyst'` for v1. It is an informational label used for catalog filtering and navigation defaults; it does not gate access. Any signed-in user can enroll in any course regardless of the course's audience.

Extending the enum to `'supervisor'` or `'manager'` is a near-instant operation: Postgres briefly locks the table during the `ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT` cycle to validate existing rows, which at our scale (catalog tables in the hundreds of rows at most) is millisecond-order. Existing RLS policies and catalog queries require no change when audience values are added.

The learner-facing catalog defaults its audience filter to the current user's role. A "View all" toggle shows courses from other audiences, supporting pre-promotion training. An Analyst who completes Supervisor-audience content accumulates supervisor-domain unlocks; those unlocks sit dormant in `effective_authority()` until the Analyst's role is promoted.

### Sequences and Enrollment Gating

Courses in a sequence (`sequence_id IS NOT NULL`) gate enrollment by prior completion: to enroll in course at `sequence_order = N`, the user must have a row in `course_completions` for the course at `sequence_order = N - 1` in the same sequence. Standalone courses (`sequence_id IS NULL`) enroll unconditionally.

Gating is checked in the enroll server action; the catalog UI shows "Complete [prior course title] to unlock" on locked sequenced courses.

### Order Maintenance

Three numeric-order fields are maintained via shift-on-insert stored procedures called from server actions, not SQL triggers (to keep side effects visible in server action logs):

- `modules.module_order` within a course
- `lessons.lesson_order` within a module
- `quiz_questions.question_order` within a quiz

Slide order lives in JSONB (`slides[].order`) and is updated atomically with the full JSONB value on slide reorder.

Shift-on-insert logic: when inserting at position N, increment all existing rows with `module_order >= N` before inserting the new row. Deletes shift down similarly. These procedures are idempotent and safe to retry.

### Module-to-Directory Mapping (Source Content)

The existing `content/courses/auto-cob-wisconsin/` directory uses `chapter-NN-name/` directory naming. At ingestion time, `module_order` is derived from the `NN` prefix. The follow-up rename prompt will rename those directories from `chapter-NN-*` to `module-NN-*` and update `README.md` and `conventions.md`. Until that rename ships, the ingestion script reads the two-digit numeric prefix regardless of the "chapter" or "module" directory label.

---

## §6 — Authority Unlock Model

### Six Unlock Dimensions

The six unlock dimensions extend `AuthorityBands` in `src/lib/types/role.ts` from four to six fields (see §3 schema extension). Database snake_case names map to TypeScript camelCase names as follows:

| DB column (`unlock_type`) | TypeScript field       | Description |
|---------------------------|------------------------|-------------|
| `settlement`              | `settlement`           | Maximum settlement acceptance dollar value |
| `demand`                  | `demand`               | Maximum demand letter dollar value |
| `lien_reduction`          | `lienReduction`        | Maximum lien reduction approval |
| `closure`                 | `closure`              | Maximum recovery closure dollar value |
| `letter_override`         | `letterOverride`       | Authority to override template letter selections |
| `template_publication`    | `templatePublication`  | Authority to publish new letter templates |

### Unlock Definition on Courses and Modules

Each Course and each Module may carry an `unlock_definition` JSONB array (see §3 JSONB shapes). On completion of a Module, the server action reads `modules.unlock_definition`; on completion of a Course, it reads `courses.unlock_definition`. For each entry in the definition, it inserts a row into `authority_unlocks` if and only if the new `unlock_value` exceeds any existing active unlock of the same type for that user (no-op rule).

### Composition: MAX per Dimension

`effective_authority(user_id)` returns the MAX `unlock_value` per `unlock_type` across all non-revoked rows for that user. Completing a course that grants less than the user already holds is a no-op at the grant level — the insert is skipped, not inserted-and-overridden. This preserves a clean audit trail (one row per grant event, no redundant small grants polluting history).

### Role-Aware Activation (Phase 2)

Unlocks are written unconditionally on completion regardless of the learner's current role. In Phase 2, `canPerform()` will read `effective_authority()` alongside the user's current role. A Supervisor-domain unlock earned by an Analyst is stored but dormant; `canPerform()` will activate it when the user's role changes to Supervisor. No migration is needed at promotion time.

### Manager-Grant

A Manager (or Admin) can grant authority directly via the Management workspace, bypassing course completion. The grant requires justification text entered in a dialog; this text is stored in the audit event metadata (category `AUTHORITY`, action `authority_granted`). The `authority_unlocks` row has `source = 'manager_grant'`, `granted_by_user_id` set, and `source_id` NULL.

### Platform Ceilings

`platform_authority_ceilings` contains one row per unlock type with a `max_value`. When an author sets an `unlock_definition` value that exceeds the ceiling, the author UI displays "Capped at $X by platform policy" and the server action clamps the value at insert time. Customer-tenant Managers cannot define unlocks that exceed the platform ceiling.

### Revocation

An unlock is soft-revoked by setting `revoked_at`, `revoked_by_user_id`, and `revoked_reason`. Revocation can be performed by a Manager or Admin from the learner's authority profile. Revocation requires justification text. The audit event has category `AUTHORITY`, action `authority_revoked`, metadata includes `{ revoked_unlock_id, unlock_type, unlock_value, reason }`.

`effective_authority()` excludes rows where `revoked_at IS NOT NULL`. After revocation, the user's effective ceiling for that dimension drops to the MAX of their remaining active unlocks (or zero if none remain).

### Edge Cases

- **Content changes after completion.** Course edits do not retroactively alter past unlocks. Unlocks are snapshotted at the time of grant with the `unlock_value` stored on the row.
- **Tenant transfer.** A user moved to a new tenant starts with no unlocks at the new tenant (authority is per-user-per-tenant). Prior unlocks at the old tenant are not revoked; they simply no longer match the session tenant.
- **Role change.** Unlocks are preserved across role changes. Activation changes (dormant → effective) are a query-time concern in `effective_authority()`, not a write concern.
- **Archived courses.** Archiving a course preserves existing `course_completions` and `authority_unlocks`. Learners who have completed the archived course retain their unlocks.

---

## §7 — UI Surface — Route Map and Screens

### Route Map

```
/admin/content/                         Admin authoring root
  sequences/                            Platform sequence list
    new/                                Create sequence
    [sequenceId]/                       Sequence detail + course list
      edit/                             Edit sequence metadata
  courses/                              Platform course list (includes standalone)
    new/                                Create course
    [courseId]/                         Course detail: modules list + quizzes
      edit/                             Edit course metadata
      modules/[moduleId]/               Module detail: lessons + quiz
        edit/                           Edit module metadata
        lessons/[lessonId]/             Lesson slide editor
        quiz/                           Module quiz editor
          new/
          [quizId]/
      course-quizzes/[quizId]/          Course-level quiz editor

/management/content/                    Management authoring root (Customer content)
  sequences/                            [mirrors /admin/content/sequences/ structure]
  courses/                              [mirrors /admin/content/courses/ structure]

/management/learning/                   Supervisor/Manager oversight
  notifications/                        Notification list
  learners/[userId]/                    Learner profile: enrollment history, quiz attempts
    quizzes/[attemptId]/                Quiz attempt review (model answers + learner answers)
    authority/                          Authority unlock history; revoke button

/learn/                                 Learner root
  catalog/                              Course catalog (filtered by audience; View All toggle)
  sequences/[sequenceId]/               Sequence overview + course list
  courses/[courseId]/                   Course landing (modules list, progress, enroll/resume)
    modules/[moduleId]/                 Module landing (lessons list, progress)
      lessons/[lessonId]/               Lesson player (slide carousel)
      quiz/                             Module MC quiz attempt
        [attemptId]/result/             MC result page
    course-quiz/[quizId]/               Course-level quiz attempt
      [attemptId]/result/               FR result page (model answer + rubric + self-attest)
  history/                              All enrollments and completions for current user
```

> **Note:** lesson, module-quiz, and course-quiz routes use `page.tsx` directly as the editor (no `/edit/` subroute). The CP4-era decision retained the `AdminDeleteSection` on the same page rather than splitting into a dedicated edit view. See CP4 commits for rationale.

### Admin Authoring Screens

**Sequence list (`/admin/content/sequences/`).**  
Role gate: ADMIN. Displays all platform sequences in a TanStack Table with columns: name, audience, status, course count, last updated. Row actions: edit, archive (with justification dialog). Top action: "New Sequence".

**Sequence detail (`/admin/content/sequences/[sequenceId]/`).**  
Breadcrumb: Content / Sequences / [name]. Shows sequence metadata header (name, audience, status chip) plus a reorderable list of associated courses. Drag handles on courses adjust `sequence_order`. "Add Course" opens a picker from existing standalone platform courses.

**Course detail (`/admin/content/courses/[courseId]/`).**  
Breadcrumb: Content / Courses / [title]. Metadata header: title, audience, status chip, estimated hours, sequence badge. Three tabs: Modules, Course Quizzes, Settings. Modules tab lists modules with drag-reorder and per-module status chips. "Add Module" opens a create-inline form.

**Lesson slide editor** and **Quiz editor**: routes as listed in §7 route map. See §8 for full editor detail. Both are desktop-only.

### Management Authoring Screens

Identical structure to Admin authoring at `/management/content/*` but scoped to `content_type = 'customer'` and the session tenant. Role gate: MANAGER or SUPERVISOR.

Managers and Supervisors have equal CRUD rights on Customer content scoped to their tenant: both can create, edit, publish, and archive. This matches the §4 RLS matrix and avoids inventing a publish-approval workflow before the Management workspace exists. The revocation mechanism is the v1 safety net: a Manager (or Admin) can revoke any authority unlock earned through customer content via the `/management/learning/learners/[userId]/authority/` surface, with required justification, audit-logged under category `AUTHORITY`. Phase 2 may introduce a per-content `requires_supervisor_review` flag analogous to the per-quiz flag in §9; this is accommodated by the existing `tenants.features` JSONB without schema migration.

### Learner Screens

**Catalog (`/learn/catalog/`).**  
Audience filter defaults to `audience = current_role.toLowerCase()` (e.g., ANALYST → 'analyst'). "View all" toggle removes the filter. Course cards show: title, module count, estimated hours, completion status badge if enrolled, lock icon if sequenced and prior course not complete. Clicking a locked course shows a tooltip: "Complete [prior course title] to unlock."

**Sequence overview (`/learn/sequences/[sequenceId]/`).**  
Shows sequence name, description, and an ordered list of courses with completion status per course.

**Course landing (`/learn/courses/[courseId]/`).**  
Module list with per-module completion status, total progress bar (lessons completed / total lessons), estimated hours remaining, enrollment CTA or "Resume" button. Enrolled courses show a "Resume" button that deep-links to the first incomplete lesson.

**Lesson player (`/learn/courses/[courseId]/modules/[moduleId]/lessons/[lessonId]/`).**  
Slide carousel: one slide visible at a time. Bottom navigation: Previous / Next. Progress indicator: "Slide N of M". Reaching the last slide triggers a `lesson_completions` insert (idempotent — upsert on conflict do nothing). Navigation header shows breadcrumb: Course title → Module title → Lesson title.

**Module MC quiz (`/learn/courses/[courseId]/modules/[moduleId]/quiz/`).**  
All questions rendered on one page. Radio buttons for options A–D per question. Single "Submit" button at the bottom. Submission is final; creates a `quiz_attempts` row with `submitted_at` and computed `score_percent`/`passed`. Navigates to the result page on submit.

**MC quiz result page (`/learn/.../quiz/[attemptId]/result/`).**  
Shows score percent, pass/fail badge, per-question breakdown (correct option highlighted green, selected wrong option highlighted red, explanation shown). "Retake" button creates a new attempt row. No cooldown in v1.

**FR quiz attempt (`/learn/courses/[courseId]/course-quiz/[quizId]/`).**  
Stem + single `<textarea>` answer field. Submit reveals model answer, grading rubric, and a self-attestation button. Self-attestation sets `self_attested_at` and triggers course completion + authority unlock grant.

**FR quiz result page (`/learn/.../course-quiz/[quizId]/[attemptId]/result/`).**  
Learner's answer alongside model answer and rubric. Unattempted attestation surfaced here. "Course Complete" banner appears after attestation with unlocks earned.

**History (`/learn/history/`).**  
Always visible regardless of current role. Shows all `course_enrollments` for the session user with status, completion date, and authority unlocks earned. Past history is preserved across role changes.

### Shared Patterns

- Breadcrumbs are derived from the route hierarchy; each segment is a link.
- Save actions are explicit (no autosave) in the slide and quiz editors.
- Publish and Archive are separate actions from Save. Archive requires justification text via a dialog.
- Optimistic concurrency: all content tables carry `updated_at`. On save, the server action includes `WHERE updated_at = $last_known_updated_at`; a conflict returns a 409 with "Someone else modified this content." The author must reload.
- No hard DELETE is exposed in any authoring UI. Status transitions: `draft → published → archived`. Archived content is hidden from learners but visible in the authoring surface with a grey status chip.

---

## §8 — Editors

### Slide Editor

The slide editor lives at the lesson edit route and is desktop-only (see §7). It uses a three-pane layout:

- **Left rail (240px fixed).** Ordered list of slides, each shown as a thumbnail chip with type icon (text/image/imported) and the heading or caption truncated to ~40 chars. Drag handles for reorder. "Add Slide" menu at the bottom with three options: Text, Image, PDF import.
- **Main editor pane (flexible).** Varies by slide type; see below.
- **Preview toggle.** Button in the top-right of the main pane toggles between edit mode and preview mode. Preview renders the slide using the same component used by the learner player (`react-markdown` + `remark-gfm`).

**Text slide editor fields:**
- Heading (single-line text input)
- Body (markdown textarea; full-width, ~20 rows)
- Citation helper bar: buttons that insert pre-formatted citation snippets matching the citation style in `content/courses/auto-cob-wisconsin/conventions.md`. Buttons: Internal, Syllabus, Spec, WI Admin Code, WI Statute, Case Law, FH Training, FH Handbook, CMS.

**Image slide editor fields:**
- Image upload (Supabase Storage; see path below)
- Caption (single-line)
- Optional body markdown

**Image upload path:** `content-assets/{content_type}/{course_slug}/{module_slug}/{lesson_slug}/{uuid}.{ext}` in the `content-assets` Supabase Storage bucket.

**Imported slide (from PDF):**
- Created by the PDF import flow; not manually authored.
- Read-only in the editor: shows the source PDF filename, page number, and the rendered PNG.
- Caption is editable.

**PDF import flow by page count:**

| Page count | Flow |
|---|---|
| 1–50 | Synchronous: render all pages client-side via `pdf-to-img`, upload PNGs to Storage, insert slides array, return. |
| 51–200 | Asynchronous: create `pdf_import_jobs` row with `status='pending'`, return the job ID to the client, client polls `GET /api/cm/pdf-import/[jobId]` every 2s for progress, slides appear in the list as pages complete. |
| > 200 | Rejected at file selection with: "PDF exceeds the 200-page import limit." |

**Save behavior.** The editor maintains local state. An "Unsaved changes" banner appears after any edit. Explicit "Save" button writes the full `slides` JSONB to the database. The slide list thumbnail updates on save. If the user navigates away with unsaved changes, a browser `beforeunload` confirmation fires.

### Quiz Editor

The quiz editor is a single-page form shared between the module quiz route and the course quiz route. Its visual mode adapts to `quiz_type`.

**Pass threshold.** Integer input 0–100, default 80. For `free_response` quizzes, the field is replaced by a static label "Completion-based (self-attestation)".

**MC question editor:**
- Stem (markdown textarea)
- Option A, B, C, D (four text inputs)
- Correct answer radio (A / B / C / D)
- Explanation (markdown textarea; shown to learner after submission)
- Topic (single-line; used for analytics in Phase 2)
- Preview toggle: renders stem and options as the learner will see them.

**FR question editor:**
- Stem (markdown textarea)
- Model answer walkthrough (markdown textarea)
- Grading rubric (markdown textarea)
- Topic (single-line)
- Preview toggle: renders stem only (model answer is hidden until the learner submits).

**Scoring formula (MC):**

```
score_percent = (count_correct_answers / count_total_questions) * 100
passed = score_percent >= pass_threshold
```

Both values are computed by the server action on quiz submission and persisted on the `quiz_attempts` row.

**Question reorder.** Drag handles on each question row adjust `question_order`. The `shift_question_order` stored procedure (called from the server action) maintains contiguous integers.

**Question preview toggle.** Per-question toggle collapses the editor fields and shows the rendered question as the learner will see it. The full-quiz preview button at the top renders all questions in learner mode.

---

## §9 — Supervisor Oversight Model

### Notification Routing

On course completion and module completion, the system creates a `learning_notifications` row:

- `subject_user_id` = the learner who completed
- `recipient_user_id` = the learner's direct Supervisor, resolved via `users.teamId` → team's supervisor
- If the learner is a Supervisor, route to the team's Manager
- Manager-level completions produce no automatic notification

If no supervisor is resolvable for the learner's team, the notification row is created with `recipient_user_id = NULL` for audit purposes. Such rows do not appear in the Supervisor or Manager notification UI but remain queryable by Admins for compliance review and surface in a compliance audit report (Phase 2 feature).

### Self-Attestation Is Not Gated

Self-attesting an FR capstone quiz immediately triggers the course completion flow and authority unlock grant. Supervisor notification is informational only in v1; the supervisor cannot block or reverse the attestation after the fact (only revoke the resulting unlock via the authority surface).

### Supervisor Oversight Surface (`/management/learning/`)

Role gate: SUPERVISOR or MANAGER.

**Notification list.** TanStack Table showing: learner name, course title, completion date, attestation status (for FR quizzes), acknowledged/unacknowledged status. Clicking a row navigates to the learner's quiz attempt review.

**Quiz attempt review (`/management/learning/learners/[userId]/quizzes/[attemptId]/`).**  
Reuses the learner result page component. Displays the learner's submitted answer (FR) or selected options (MC) alongside the model answers. For FR, shows the grading rubric. The supervisor can add a coaching note here (stored in a separate coaching_notes store, not the audit log — see CLAUDE.md: "Audit log ≠ coaching notes").

**Authority surface (`/management/learning/learners/[userId]/authority/`).**  
Lists all `authority_unlocks` for the learner: unlock type, value, source (course/module/manager-grant), granted date, revoked status. "Revoke" button on each active row opens a dialog requiring justification text. On confirm, sets `revoked_at`/`revoked_by_user_id`/`revoked_reason` and writes an audit event (category `AUTHORITY`, action `authority_revoked`).

### Phase 2 Gate Hook

The `quizzes` table will gain a `requires_supervisor_review` boolean column in Phase 2. When true, course completion is gated until the supervisor reviews and approves the attempt via the existing approval-queue infrastructure (`ApprovalQueueType` in `src/lib/authority/can-perform.ts`). This column does not exist in v1 and no approval-queue integration is built; the column is noted here to document the Phase 2 hook point.

---

## §10 — Audit Log Integration

### New Category

The `AuditEvent.category` union in `src/lib/audit/log.ts` must be extended to include `'LEARNING'`:

```typescript
// Current (in src/lib/audit/log.ts):
category: "WORKFLOW" | "CONFIG" | "INGEST" | "AUTH" | "AUTHORITY";

// After extension:
category: "WORKFLOW" | "CONFIG" | "INGEST" | "AUTH" | "AUTHORITY" | "LEARNING";
```

This is an additive one-line change. Do not modify `log.ts` in this spec write-up; the bootstrap checklist (§12, Step 10) is where the implementation occurs.

### Event Catalog

All audit events are written from server actions, never from client components. The append-only guarantee in `src/lib/audit/log.ts` applies: no existing entries are mutated.

#### Category: CONFIG — Authoring lifecycle events

| Action | Trigger | Metadata |
|---|---|---|
| `sequence_created` | CourseSequence row inserted | `{ sequence_id, name, content_type, tenant_id? }` |
| `sequence_published` | Status → 'published' | `{ sequence_id, name }` |
| `sequence_archived` | Status → 'archived' | `{ sequence_id, name, justification }` |
| `course_created` | Course row inserted | `{ course_id, title, content_type, tenant_id? }` |
| `course_published` | Status → 'published' | `{ course_id, title }` |
| `course_archived` | Status → 'archived' | `{ course_id, title, justification }` |
| `module_created` | Module row inserted | `{ module_id, course_id, title }` |
| `module_published` | Status → 'published' | `{ module_id, title }` |
| `module_archived` | Status → 'archived' | `{ module_id, title, justification }` |
| `lesson_created` | Lesson row inserted | `{ lesson_id, module_id, title, lesson_type }` |
| `lesson_updated` | Lesson slides saved | `{ lesson_id, slide_count }` |
| `quiz_created` | Quiz row inserted | `{ quiz_id, module_id?, course_id?, quiz_type }` |
| `quiz_published` | Status → 'published' | `{ quiz_id }` |
| `quiz_archived` | Status → 'archived' | `{ quiz_id, justification }` |
| `pdf_imported` | PdfImportJob reaches 'complete' | `{ job_id, lesson_id, source_filename, page_count }` |

#### Category: LEARNING — Learner activity and notifications

| Action | Trigger | Metadata |
|---|---|---|
| `course_enrolled` | CourseEnrollment inserted | `{ enrollment_id, user_id, course_id }` |
| `course_started` | First LessonCompletion for a course | `{ user_id, course_id }` |
| `lesson_completed` | LessonCompletion inserted | `{ lesson_id, user_id }` |
| `quiz_attempted` | QuizAttempt submitted_at set | `{ attempt_id, quiz_id, user_id, quiz_type, score_percent?, passed? }` |
| `quiz_self_attested` | QuizAttempt self_attested_at set | `{ attempt_id, quiz_id, user_id }` |
| `module_completed` | All lessons in module complete + module quiz passed (if present) | `{ module_id, user_id, unlocks_granted: UnlockDefinition }` |
| `course_completed` | CourseCompletion inserted | `{ course_id, user_id, capstone_attempt_id?, unlocks_granted: UnlockDefinition }` |
| `learning_notification_sent` | LearningNotification inserted | `{ notification_id, recipient_user_id, subject_user_id, notification_type }` |
| `learning_notification_acknowledged` | LearningNotification acknowledged_at set | `{ notification_id, recipient_user_id }` |

#### Category: AUTHORITY — Unlock grants and revocations

| Action | Trigger | Metadata |
|---|---|---|
| `authority_granted` | AuthorityUnlock inserted | `{ unlock_id, user_id, unlock_type, unlock_value, source, source_id?, justification? (for manager_grant) }` |
| `authority_revoked` | AuthorityUnlock revoked_at set | `{ unlock_id, user_id, unlock_type, unlock_value, revoked_by, reason }` |

---

## §11 — Tech Assumptions

### Locked Stack (from `package.json` + CM additions)

- Next.js 15 (App Router, Turbopack dev) · React 19 · TypeScript strict
- Tailwind CSS v4 · shadcn/ui (Radix primitives) · lucide-react · `class-variance-authority` · `clsx` · `tailwind-merge`
- Drizzle ORM · Drizzle Kit · Supabase (Auth + Postgres + Storage) — local Docker for dev, hosted for production
- React Hook Form + `@hookform/resolvers` + Zod · TanStack Table
- `react-markdown` + `remark-gfm` — slide and quiz preview rendering
- `pdf-to-img` — PDF page rendering to PNG (150 DPI)
- Vitest unit tests · Playwright E2E tests; integration tests gated to local + CI-with-Docker runs
- Node 24.x · ESLint + Prettier
- Vercel + hosted Supabase for production deploy

### New Dependencies to Install at Bootstrap

```
drizzle-orm
drizzle-kit
@supabase/ssr
@supabase/supabase-js
react-hook-form
@hookform/resolvers
zod
@tanstack/react-table
react-markdown
remark-gfm
pdf-to-img
```

Verify before installing: some of these may already be present in `package.json` if prior work installed them. Run `npm ls <package>` to check.

### Environment Variables

All already present in `.env.local` (gitignored):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
```

### Supabase Storage

One new bucket: `content-assets`. Access: private (not public). RLS policy mirrors content read access — platform assets readable by any authenticated user; customer assets readable only by same-tenant users.

---

## §12 — Bootstrap Checklist

This checklist is the sequence of work a follow-up implementation plan will split into checkpoints. Every step is numbered and in dependency order. Verification commands are at the end.

1. **Install new dependencies.** Run `npm install drizzle-orm drizzle-kit @supabase/ssr @supabase/supabase-js react-hook-form @hookform/resolvers zod @tanstack/react-table react-markdown remark-gfm pdf-to-img`. Skip any already present. Verify: `npm ls drizzle-orm`.

2. **Verify Supabase is running.** Run `supabase start` (or `supabase status` if already running). Confirm local URL `http://127.0.0.1:54321` and Postgres at `127.0.0.1:54322`.

3. **Write Drizzle schemas.** Create `src/lib/db/schema/` with files: `content.ts`, `learner.ts`, `authority.ts`, `notifications.ts`, `jobs.ts` (table groupings follow §3). Extend the existing tenants schema file to add `features`.

4. **Generate initial migration.** Run `npm run db:generate`. Confirm a new migration file appears under `drizzle/` with all CM table DDL.

5. **Write RLS + helper functions SQL migration.** Author a Drizzle `sql` migration containing the helper function definitions and `CREATE POLICY` statements from §4. Drizzle does not generate RLS automatically.

6. **Apply migrations.** Run `npm run db:migrate`. Confirm zero errors. Run `npm run db:studio` to verify all tables appear in Drizzle Studio.

7. **Build session-context plumbing.** Create `src/lib/db/client.ts`. On every query, set `app.current_user_id`, `app.current_tenant_id`, `app.current_role` from `getCurrentUser()` in `src/lib/auth/session.ts`.

8. **Create `content-assets` Supabase Storage bucket.** Via `supabase` CLI or Supabase Studio: create bucket `content-assets`, set to private, apply RLS policy matching content read access from §4.

9. **Scaffold `src/features/content-manager/`.** Create the directory with `index.ts`, `components/`, `hooks/`, `actions/`, and `types.ts`. No logic yet; just the directory boundary.

10. **Extend `AuditEvent.category` to include `'LEARNING'`.** Edit `src/lib/audit/log.ts`. One-line change to the `category` union. Run `npm run typecheck` to verify no regressions.

11. **Extend `AuthorityBands` to six dimensions.** Edit `src/lib/types/role.ts` to add `letterOverride` and `templatePublication` fields. Run `npm run typecheck`.

12. **Build admin authoring routes.** Implement the `/admin/content/*` route tree from §7. Include sequence CRUD, course CRUD, module CRUD, and lesson/quiz stubs (no editor yet). Role-gate all routes to `ADMIN`.

13. **Build management authoring routes.** Implement `/management/content/*` mirroring the admin tree but scoped to `content_type = 'customer'`. Role-gate to `MANAGER | SUPERVISOR`.

14. **Build learner routes.** Implement `/learn/*` route tree from §7. Include catalog, sequence overview, course landing, module landing, lesson player (static slide renderer only for now), and history.

15. **Build slide editor.** Implement the three-pane slide editor from §8 at the lesson edit routes. Include text/image slide types, markdown preview, citation helper buttons, image upload to `content-assets`, and explicit save with "unsaved changes" indicator. Desktop-only guard. PDF import in the next step.

16. **Build quiz editor.** Implement the quiz editor from §8 at the module quiz and course quiz edit routes. Include both MC and FR modes, pass threshold input, per-question preview, and drag-reorder.

17. **Wire course completion → unlocks + notifications + audit.** Implement server actions `completeLesson()`, `submitQuizAttempt()`, `selfAttestQuiz()`, `completeModule()`, `completeCourse()`, each writing learner records, unlock grants, notifications, and audit events per §10.

18. **Build PDF import flow.** Implement `pdf-to-img` rendering, synchronous path (≤50 pages), asynchronous path (51–200 pages) with `pdf_import_jobs` tracking, polling endpoint at `GET /api/cm/pdf-import/[jobId]`, and the > 200 page rejection.

19. **Build `/management/learning/` oversight surface.** Notification list, learner quiz attempt review, and authority unlock surface with revoke action. Role-gate to `SUPERVISOR | MANAGER`.

20. **Wire tenant feature flag layout gate.** Read `tenant.features.content_manager` from the session in the layout for `/learn/*` and `/management/content/*`. If false, render a "Learning Management is not enabled for your organization" page. The `/admin/content/*` routes are not gated.

21. **Ingest Auto COB Wisconsin Chapter 1 as seed platform course.** After the marker-strip follow-up prompt, run the ingestion script against `content/courses/auto-cob-wisconsin/chapter-01-foundations/`. Verify the module appears in the admin catalog and is playable in the learner.

### Verification Commands (run after all steps complete)

```bash
npm run typecheck     # zero errors
npm run lint          # zero warnings or errors
npm run test          # all Vitest unit tests pass
npm run test:e2e      # all Playwright E2E tests pass
npm run build         # clean production build; no type errors in output
supabase db diff      # no pending schema drift
```

---

## §13 — Out of Scope (v1)

The following items are explicitly excluded from the Content Manager v1 build:

- Real `canPerform()` activation reading `effective_authority()`. The authority records are written; `canPerform()` reads them in Phase 2 alongside the Management workspace.
- Synchronous supervisor approval of capstone quizzes. Post-completion review is informational only in v1. The Phase 2 gate hook point is documented in §9.
- LLM-assisted grading of free-response answers.
- Cross-tenant content sharing. Platform content is shared by definition; sharing customer content between tenants is out of scope.
- Course versioning. Edits mutate published courses in-place. Historical unlock records are protected because `unlock_value` is stored on the `authority_unlocks` row at grant time, not derived from the current course definition.
- Comments, discussion threads, learner notes, and bookmarks.
- Printable completion certificates. The data to generate them is in `course_completions`; rendering is a Phase 2 concern.
- Time-spent tracking and analytics dashboards.
- Mobile authoring. The slide editor and quiz editor redirect to a "Switch to desktop" screen on mobile viewports. Learner consumption is fully mobile-responsive.
- Full-text search of course content.
- Asynchronous PDF import beyond 200 pages. Files over 200 pages are rejected at upload.
- Per-tenant authority ceiling overlays. Only the platform ceiling exists in v1.

---

## §14 — Phase 2 Evolution Notes

The v1 schema and data model are designed so Phase 2 work is logic and configuration, not migrations.

**`canPerform()` integration.** `canPerform()` in `src/lib/authority/can-perform.ts` reads `effective_authority(user_id)` and compares `dollarAmount`/`percentage` in `AuthorityContext`. No schema changes; the Postgres function is defined in v1.

**Per-quiz supervisor review gate.** Add `requires_supervisor_review boolean DEFAULT false` to `quizzes`. When true, `completeCourse()` creates an approval-queue entry (queue type `CAPSTONE_REVIEW`) before writing the `course_completions` row. Supervisor approves via the existing `/management/learning/` surface.

**Per-tenant authority ceiling overlays.** A `tenant_authority_ceilings` table (mirroring `platform_authority_ceilings`) allows tenant-specific ceilings lower than the platform ceiling. Effective ceiling = `MIN(platform_ceiling, tenant_ceiling)`.

**Per-tenant feature flags beyond `content_manager`.** `tenants.features` JSONB accepts additional keys (`advanced_analytics`, `letter_automation`, `bulk_import`, etc.) with no schema migration — extend the TypeScript type and add the layout gate.

**Completion certificates.** `course_completions` has `completed_at` and `capstone_attempt_id`. Phase 2 generates a PDF certificate from this row using tenant branding. No migration required.

**Postgres full-text search.** Add `tsvector` generated columns + `GIN` indexes on `courses.title`/`description`. Catalog search becomes server-side FTS; no data migration.

**Audience expansion.** Adding `'supervisor'` or `'manager'` to the `audience` CHECK constraint requires a near-instant `ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT` cycle; existing queries and RLS policies require no changes.

**Pre-promotion training workflow.** Supervisor-domain unlocks earned by an Analyst sit dormant; Phase 2 surfaces them as "Pending activation" and activates on role promotion via a query-time change in `effective_authority()`.

**Coaching notes store.** Separate from the audit log; the coaching notes table and UI are Phase 2 additions. The v1 `/management/learning/` route structure provides the navigation anchor.
