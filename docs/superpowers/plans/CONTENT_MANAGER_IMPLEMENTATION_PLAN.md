# Content Manager Implementation Plan

**Document type:** Execution plan  
**Status:** Ready for CP1 execution  
**Authored:** 2026-05-22  
**Plan covers:** CP1 through CP11 (full Content Manager build)

---

## §1 — Overview

This plan operationalizes the Content Manager feature module defined in
`docs/superpowers/specs/CONTENT_MANAGER_SPEC.md` (commit `532dd85`). It is the
execution roadmap — not the design. The spec is the authoritative source for what
to build; this plan defines how to build it and in what order. A future agent
executing any single CP needs only this plan and the spec to proceed.

Working norms inherited from prior phases: small focused commits per checkpoint
(multiple readable commits beat one giant commit); push to `origin/main` at the
end of every CP with the remote HEAD hash in the CP summary; PR-style summaries at
end of phase (what landed, decisions made, what's open, what the next phase
inherits); spec to `docs/superpowers/specs/` and plan to
`docs/superpowers/plans/` before any execution starts; section-by-section design
review for new features before writing specs (already complete for the Content
Manager — the Cowork design-review session is the record, all open questions
resolved as of `532dd85`); Cowork drafts course content from source materials as
SME-reviewable drafts before any content is committed.

Reference base for every CP agent: spec at
`docs/superpowers/specs/CONTENT_MANAGER_SPEC.md`, visual prototype reference at
`docs/COB_Flow_MVP.html` (CM components landed through commit `389dae7`),
`CLAUDE.md` at repo root for stack guardrails and lib/ boundary rules, and
`DIVISION_OF_LABOR.md` at repo root for working-model rules. When the prototype
and the spec conflict on behavior, the spec wins. When they conflict on
look-and-feel or layout, the prototype wins.

---

## §2 — Current State (as of plan authoring)

### What is done

**Phase B — Auth + App Shell** (`79cc377`): sign-in page with demo-account picker,
cookie-backed mock session, four-state role toggle via Server Action, tenant
dropdown, sticky top bar, role-gated sidebar nav, boundary error pages, 26 unit
tests, 8 Playwright E2E tests, clean build/typecheck/lint.

**Phase B.1 — Scaffolding recovery** (`aace942`): `.gitignore`, `next.config.ts`,
`tsconfig.json`, `postcss.config.mjs`, `src/lib/` boundaries (`auth/session.ts`,
`authority/can-perform.ts`, `authority/roles.ts`, `audit/log.ts`,
`engine/primacy.ts`, `lib/mock/` with 18 fixture files), `supabase/config.toml`,
source spec and prototype docs all committed. Repo now builds from a clean clone.

**Content Manager spec** (`532dd85`): locked at
`docs/superpowers/specs/CONTENT_MANAGER_SPEC.md`. Four open questions resolved,
two bugs fixed (fallback values, notification routing), four drift items addressed,
role-aware dashboard composition amendment added to §9.

**Content Manager prototype extension** (`389dae7`): `MyLearningView`,
`SlideViewer`, `McQuizTaker`, `FrCapstoneTaker`, `CmOversightView` (with Manager
role branch and supervisor drill-down), `SupervisorOversightDetail`,
`CmMgmtView` (Assignments / Sequences / Authoring tabs), `SysAdminContent`,
`SlideEditor`, `QuizEditor`, and full CM seed data (`CM_SEQUENCES`, `CM_COURSES`,
`CM_MODULES`, `CM_MODULE_QUIZZES`, `CM_COURSE_QUIZ`, `CM_ENROLLMENTS`,
`CM_LESSON_COMPLETIONS`, `CM_QUIZ_ATTEMPTS`, `CM_AUTHORITY_UNLOCKS`,
`CM_NOTIFICATIONS`) — all landed and corrected across four rounds.

### What is not yet done

- `src/features/content-manager/` does not exist.
- No CM Drizzle table definitions exist; `src/lib/db/schema/` has a placeholder only.
- No CM migrations have been generated or applied.
- `src/lib/audit/log.ts` `AuditEvent.category` union does not include `'LEARNING'`.
- `src/lib/types/role.ts` `AuthorityBands` interface has four dimensions; it does
  not yet have `letterOverride` or `templatePublication`.
- No CM dependencies are installed (`react-markdown`, `remark-gfm`, `pdf-to-img`
  may be absent; `drizzle-orm`/`drizzle-kit` may be absent — verify with
  `npm ls` before installing).
- `content-assets` Supabase Storage bucket does not exist.
- No CM source routes exist under `src/app/(app)/`.
- The `content/courses/auto-cob-wisconsin/` directory uses `chapter-NN-*` naming;
  rename to `module-NN-*` is deferred to CP11 pre-ingestion prep.

---

## §3 — Checkpoint Roadmap

### CP1 — Foundations and feature module scaffold

#### Goal

Install all Content Manager dependencies not already present, verify local
Supabase is running, scaffold the `src/features/content-manager/` module
boundary, extend `AuditEvent.category` to include `'LEARNING'`, and extend
`AuthorityBands` to six dimensions. After CP1, the repo compiles cleanly with
the new type shapes and the feature directory is in place.

#### Prerequisites

Phase B.1 complete (`aace942` on `origin/main`). Local Supabase Docker running
(or startable with `supabase start`). `.env.local` present with the four
Supabase keys (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`).

#### Steps

1. For each package in the table below, run `npm ls <package>` to check presence.
   Install only the missing ones. Do not install duplicates.

   | Package | Purpose |
   |---|---|
   | `drizzle-orm` | Drizzle query builder |
   | `drizzle-kit` | Migration generator (`npm run db:generate`) |
   | `@supabase/ssr` | Supabase SSR helpers for Next.js |
   | `@supabase/supabase-js` | Supabase JS client |
   | `react-hook-form` | Form state management |
   | `@hookform/resolvers` | Zod resolver for React Hook Form |
   | `zod` | Schema validation |
   | `@tanstack/react-table` | TanStack Table (authoring and oversight lists) |
   | `react-markdown` | Markdown preview in slide/quiz editors and learner player |
   | `remark-gfm` | GitHub Flavored Markdown plugin for `react-markdown` |
   | `pdf-to-img` | PDF page-to-PNG rendering for slide import |

   Maps to spec §12 step 1.

2. Run `supabase status`. If not running, run `supabase start`. Confirm local
   Supabase URL `http://127.0.0.1:54321` and Postgres at `127.0.0.1:54322`.
   Maps to spec §12 step 2.

3. Create `src/features/content-manager/` with the following files:
   - `types.ts` — empty export placeholder (CM-specific TypeScript types; populated in CP2+)
   - `components/` — empty directory (add `.gitkeep`)
   - `hooks/` — empty directory (add `.gitkeep`)
   - `actions/` — empty directory (add `.gitkeep`)
   - `index.ts` — re-exports from `types.ts`; otherwise empty

   Maps to spec §12 step 9.

4. Edit `src/lib/audit/log.ts`. Extend the `AuditEvent.category` union:
   ```typescript
   // Before:
   category: "WORKFLOW" | "CONFIG" | "INGEST" | "AUTH" | "AUTHORITY";
   // After:
   category: "WORKFLOW" | "CONFIG" | "INGEST" | "AUTH" | "AUTHORITY" | "LEARNING";
   ```
   Run `npm run typecheck`. Zero errors expected. Maps to spec §12 step 10.

5. Edit `src/lib/types/role.ts`. Add two fields to the `AuthorityBands` interface:
   ```typescript
   letterOverride: number;
   templatePublication: number;
   ```
   Existing call sites are unaffected (additive change). Run `npm run typecheck`.
   Zero errors expected. Maps to spec §12 step 11.

#### Acceptance Criteria

- `npm ls drizzle-orm react-markdown pdf-to-img` each return a version line with
  no `(empty)` markers.
- `supabase status` shows `API URL: http://127.0.0.1:54321`.
- `src/features/content-manager/` exists with `types.ts`, `index.ts`, and three
  subdirectory stubs.
- `AuditEvent.category` includes `'LEARNING'` in `src/lib/audit/log.ts`.
- `AuthorityBands` has six fields in `src/lib/types/role.ts`.
- `npm run typecheck` exits clean.
- `npm run lint` exits clean.
- `npm run build` exits clean.

#### Verification Gate

```bash
npm ls drizzle-orm @supabase/ssr react-markdown remark-gfm pdf-to-img
supabase status
grep -n "LEARNING" src/lib/audit/log.ts             # expect one match on the category union
grep -n "letterOverride" src/lib/types/role.ts      # expect one match
npm run typecheck
npm run lint
npm run build
```

#### Commit Pattern

Two commits:
1. `feat(cm): install Content Manager dependencies and scaffold feature module`
   — `package.json` + `package-lock.json` + `src/features/content-manager/` skeleton
2. `feat(cm): extend AuditEvent.category and AuthorityBands for CM`
   — `src/lib/audit/log.ts` + `src/lib/types/role.ts`

Push to `origin/main` after both commits. Record remote HEAD hash in CP summary.

#### Carry-Forward Notes

CP2 can assume all CM packages are installed, `src/features/content-manager/`
exists, and the `'LEARNING'` audit category and six-dimension `AuthorityBands`
type shapes are in place. Supabase local is confirmed running.

---

### CP2 — Database schema, migrations, RLS, helper functions

#### Goal

Define all CM Drizzle table schemas, generate the Drizzle migration, author a
follow-up raw SQL migration for RLS policies and helper functions, and apply both
migrations to local Supabase. After CP2, all CM tables exist in the local
database with RLS enforced.

#### Prerequisites

CP1 complete. `drizzle-orm` and `drizzle-kit` installed. Supabase local running.
`src/lib/db/schema/` directory exists (placeholder from Phase A scaffolding).

#### Steps

1. Create `src/lib/db/schema/content.ts`. Define these Drizzle tables exactly
   per spec §3 DDL: `courseSequences`, `courses`, `modules`, `lessons`, `quizzes`,
   `quizQuestions`. Include all CHECK constraints and unique constraints listed in
   the spec. The partial unique index on `courses(sequence_id, sequence_order)`
   cannot be expressed in Drizzle table definitions — note it for the raw SQL
   migration (step 3).

2. Create `src/lib/db/schema/learner.ts`. Define: `courseEnrollments`,
   `lessonCompletions`, `quizAttempts`, `courseCompletions`. No `module_completions`
   table — module completion is derived state (see spec §3 note after
   `authority_unlocks`).

3. Create `src/lib/db/schema/authority.ts`. Define: `authorityUnlocks`,
   `platformAuthorityCeilings`.

4. Create `src/lib/db/schema/notifications.ts`. Define: `learningNotifications`.

5. Create `src/lib/db/schema/jobs.ts`. Define: `pdfImportJobs`.

6. Extend the existing tenants schema file (or `src/lib/mock/tenants.ts` if the
   Drizzle version is the mock file — confirm path) to add:
   ```typescript
   features: jsonb('features').notNull().default(sql`'{"content_manager": true}'::jsonb`)
   ```
   Also extend the TypeScript type: `features: { content_manager: boolean }`.

7. Extend the existing teams schema file to add `manager_id`:
   ```typescript
   manager_id: uuid('manager_id').references(() => users.id, { onDelete: 'set null' })
   ```
   This resolves the supervisor-to-manager hop in notification routing (spec §9).

8. Update `src/lib/db/schema/index.ts` (or the Drizzle config barrel) to export
   all new schema files.

9. Run `npm run db:generate`. Confirm a new migration file appears under `drizzle/`
   containing DDL for all CM tables, the extended `tenants.features` column, and
   the extended `teams.manager_id` column. Maps to spec §12 step 4.

10. Author a new raw SQL file in `drizzle/` (suffix `_rls_helpers.sql` or as a
    Drizzle `sql` migration template — see `drizzle-kit` docs for raw SQL migration
    support). Include in this file:
    - The seven helper functions from spec §4: `is_admin()`, `is_manager()`,
      `is_supervisor()`, `is_analyst()`, `is_tenant_member()`,
      `student_is_enrolled_in_course()`, `effective_authority()`.
    - The SECURITY DEFINER function `grant_unlock_from_completion()` from spec §4.
    - All `CREATE POLICY` statements from spec §4 for every CM table.
    - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` for all CM tables.
    - The recommended indexes from spec §3 including the partial unique index
      `courses_sequence_order_uniq` and the `authority_unlocks_active_idx` partial
      index.

    Maps to spec §12 step 5.

11. Run `npm run db:migrate`. Confirm zero errors. Maps to spec §12 step 6.

12. Run `npm run db:studio`. Visually confirm all CM tables appear. Check that RLS
    is enabled via the Studio table view or `psql -h 127.0.0.1 -p 54322 -U postgres
    -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'
    ORDER BY tablename"`.

#### Acceptance Criteria

- `src/lib/db/schema/content.ts`, `learner.ts`, `authority.ts`,
  `notifications.ts`, `jobs.ts` all exist with the tables specified in spec §3.
- `tenants` table has `features` JSONB column; `teams` table has `manager_id`.
- Drizzle migration file under `drizzle/` contains DDL for all CM tables.
- Raw SQL migration file under `drizzle/` contains all helper functions and RLS
  policies from spec §4.
- `npm run db:migrate` exits clean (zero errors).
- `psql` query above shows `rowsecurity = t` for all CM tables.
- `npm run typecheck` clean (schema types inferred correctly by Drizzle).
- `npm run build` clean.

#### Verification Gate

```bash
npm run db:migrate
psql -h 127.0.0.1 -p 54322 -U postgres -c \
  "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
# expect: course_sequences, courses, modules, lessons, quizzes, quiz_questions,
#         course_enrollments, lesson_completions, quiz_attempts, course_completions,
#         authority_unlocks, platform_authority_ceilings, learning_notifications, pdf_import_jobs
psql -h 127.0.0.1 -p 54322 -U postgres -c \
  "SELECT proname FROM pg_proc WHERE proname IN ('is_admin','is_manager','is_supervisor',
   'is_analyst','is_tenant_member','student_is_enrolled_in_course',
   'effective_authority','grant_unlock_from_completion')"
npm run typecheck
npm run lint
npm run build
```

#### Commit Pattern

Four commits:
1. `feat(cm/db): add CM Drizzle schema files (content, learner, authority, notifications, jobs)`
2. `feat(cm/db): extend tenants.features and teams.manager_id`
3. `feat(cm/db): generate Drizzle migration for CM tables`
4. `feat(cm/db): add RLS policies, helper functions, and recommended indexes migration`

Apply migrations as part of commit 4 verification. Push to `origin/main`. Record
remote HEAD hash.

#### Carry-Forward Notes

CP3 can assume all CM tables exist in the local Postgres instance with RLS
enforced and helper functions defined. The `grant_unlock_from_completion()`
SECURITY DEFINER function is available for CP9.

---

### CP3 — Connection wrapper and Storage bucket

#### Goal

Build the session-context plumbing in `src/lib/db/client.ts` so that every
Drizzle query sets the three Postgres session-local variables required by the RLS
helper functions. Create the `content-assets` Supabase Storage bucket with RLS
policies mirroring content read scope.

#### Prerequisites

CP2 complete. All CM tables exist with RLS enabled. Helper functions deployed.

#### Steps

1. Create `src/lib/db/client.ts`. Every Drizzle/Supabase connection must set the
   three session-local variables before executing queries:
   ```sql
   SET LOCAL app.current_user_id  = '<uuid>';
   SET LOCAL app.current_tenant_id = '<uuid>';
   SET LOCAL app.current_role      = 'ANALYST' | 'SUPERVISOR' | 'MANAGER' | 'ADMIN';
   ```
   Source these values from `getCurrentUser()` in `src/lib/auth/session.ts`.
   Use Drizzle's `db.execute(sql`SET LOCAL ...`)` pattern inside a transaction
   wrapper, or the `postgres.js` `connection` callback if the underlying driver
   supports per-connection hooks. The client module must not be imported from
   client components; it is a server-only module. Maps to spec §12 step 7.

2. Create (or update) `src/lib/db/index.ts` to export the session-aware client
   created in step 1 as the default DB export for server actions and Server
   Components.

3. Create the `content-assets` Supabase Storage bucket. Use the Supabase CLI:
   ```bash
   supabase storage create content-assets
   ```
   Set the bucket to private (not public URL). Apply bucket-level RLS policies
   matching content read scope: platform-type assets readable by any
   authenticated user; customer-type assets readable only by same-tenant users.
   The policy uses the path prefix `{content_type}/` to distinguish.
   Maps to spec §12 step 8.

4. Add a `buckets` entry to `supabase/config.toml` for `content-assets` so the
   bucket is recreated on `supabase db reset`:
   ```toml
   [storage.buckets.content-assets]
   public = false
   ```

5. Run `npm run typecheck`. Confirm `src/lib/db/client.ts` compiles without
   errors and that importing it from a Server Component does not cause client-side
   module resolution errors.

#### Acceptance Criteria

- `src/lib/db/client.ts` exists and exports a session-aware Drizzle client.
- Importing the client in a Server Component does not trigger the
  `"use client"` restriction.
- `content-assets` bucket exists in local Supabase (verify via Supabase Studio
  at `http://127.0.0.1:54323`).
- `supabase/config.toml` declares `content-assets` as a private bucket.
- `npm run typecheck` and `npm run build` clean.

#### Verification Gate

```bash
# Confirm bucket exists
supabase storage ls
# Expect: content-assets listed
npm run typecheck
npm run lint
npm run build
```

#### Commit Pattern

Two commits:
1. `feat(cm/db): add session-context connection wrapper for RLS plumbing`
2. `feat(cm/storage): create content-assets bucket with RLS policy`

Push to `origin/main`. Record remote HEAD hash.

#### Carry-Forward Notes

CP4 and later CPs can import the session-aware DB client from `src/lib/db/`
without any additional plumbing. Server actions will use this client to satisfy
RLS helper functions on all CM table queries.

---

### CP4 — Admin authoring routes (catalog + sequence/course/module CRUD)

#### Goal

Build the `/admin/content/*` route tree with full CRUD for sequences, courses,
and modules. Lesson and quiz editor routes exist as stubs (placeholder pages).
Role-gated to ADMIN. Visual reference: `SysAdminContent` component in
`docs/COB_Flow_MVP.html`.

#### Prerequisites

CP3 complete. Session-aware DB client available. CM tables exist in local Postgres.

#### Steps

1. Create `src/app/(app)/admin/content/` route tree per spec §7 route map:
   - `page.tsx` — redirect to `sequences/`
   - `sequences/page.tsx` — Sequence list
   - `sequences/new/page.tsx` — Create sequence
   - `sequences/[sequenceId]/page.tsx` — Sequence detail
   - `sequences/[sequenceId]/edit/page.tsx` — Edit sequence metadata
   - `courses/page.tsx` — Course list (standalone + in-sequence)
   - `courses/new/page.tsx` — Create course
   - `courses/[courseId]/page.tsx` — Course detail (Modules / Course Quizzes / Settings tabs)
   - `courses/[courseId]/edit/page.tsx` — Edit course metadata
   - `courses/[courseId]/modules/[moduleId]/page.tsx` — Module detail
   - `courses/[courseId]/modules/[moduleId]/edit/page.tsx` — Edit module metadata
   - `courses/[courseId]/modules/[moduleId]/lessons/[lessonId]/edit/page.tsx` — Stub (CP5)
   - `courses/[courseId]/modules/[moduleId]/quiz/[quizId]/edit/page.tsx` — Stub (CP6)
   - `courses/[courseId]/course-quizzes/[quizId]/edit/page.tsx` — Stub (CP6)

2. Add layout-level ADMIN role gate to `src/app/(app)/admin/content/layout.tsx`:
   ```typescript
   const user = await getCurrentUser();
   if (!isAdmin(user)) redirect('/dashboard');
   ```
   Use `isAdmin()` from `src/lib/authority/roles.ts` — no inline role string
   comparison.

3. Implement Sequence list (`sequences/page.tsx`). Server Component. Reads
   `course_sequences` where `content_type = 'platform'` via the CM DB client.
   TanStack Table with columns: name, audience, status, course count, last
   updated, row actions (Edit, Archive). Top action: "New Sequence" link.

4. Implement Sequence CRUD forms (`sequences/new/`, `sequences/[id]/edit/`).
   React Hook Form + Zod. Fields: name, slug (auto-derived from name, editable),
   description, audience. Archive action (on detail page) opens a shadcn Dialog
   requiring justification text. On archive, writes audit event
   `sequence_archived` (category `CONFIG`).

5. Implement Course list, Course detail (three tabs: Modules, Course Quizzes,
   Settings), and Course CRUD forms. Course detail Modules tab shows modules in
   `module_order` with drag handles (use `@dnd-kit/sortable` or similar — check
   CLAUDE.md locked stack; if no drag library is listed, use a simple Up/Down
   button reorder pattern). `unlock_definition` JSONB field: a repeating
   fieldset with unlock type dropdown and value input, rendered from the six
   unlock dimensions. Archive requires justification.

6. Implement Module detail (lessons list + module quiz stub) and Module CRUD.
   Module detail shows lessons in `lesson_order` with Up/Down reorder. `Add
   Lesson` opens a create-inline form (lesson type dropdown, title). Module
   `unlock_definition` JSONB field: same pattern as Course.

7. Stub pages for lesson slide editor and quiz editor: render a placeholder card
   "Slide editor — coming in CP5" and "Quiz editor — coming in CP6" respectively.

8. Wire all audit events for authoring lifecycle per spec §10 table
   (category `CONFIG`): `sequence_created`, `sequence_published`,
   `sequence_archived`, `course_created`, `course_published`, `course_archived`,
   `module_created`, `module_published`, `module_archived`, `lesson_created`.
   Each server action writes exactly one audit event on success.

9. Update the existing Admin sidebar nav item (or `src/app/(app)/admin/` layout)
   to include a "Content" nav entry pointing to `/admin/content/`. This is the
   7th Admin sub-surface alongside System / Customer / Integrations / Security /
   Audit / Roadmap.

#### Acceptance Criteria

- All route files exist under `src/app/(app)/admin/content/`.
- Navigating to `/admin/content/` while signed in as Admin renders the Sequence
  list page.
- Navigating to `/admin/content/` while signed in as any non-Admin role redirects
  to `/dashboard`.
- Create, edit, publish, and archive flows for sequences, courses, and modules
  each work end-to-end (data persists to local Postgres via RLS-aware client).
- Archive dialogs require and accept justification text.
- Audit event rows appear in the in-memory audit log (or Postgres, if wired) for
  each authoring action.
- Lesson and quiz editor routes render stub pages.
- `npm run typecheck`, `npm run lint`, `npm run build` clean.

#### Verification Gate

```bash
npm run dev
# Manual: sign in as Admin (S. Patel demo account), navigate /admin/content/
# Manual: create a sequence, publish it, archive it (with justification)
# Manual: sign in as Analyst, attempt /admin/content/ — expect redirect to /dashboard
npm run typecheck
npm run lint
npm run build
```

#### Commit Pattern

Four to six commits:
1. `feat(cm/admin): scaffold /admin/content route tree with ADMIN role gate`
2. `feat(cm/admin): implement sequence list and CRUD`
3. `feat(cm/admin): implement course list and CRUD with unlock_definition editor`
4. `feat(cm/admin): implement module list and CRUD; add lesson and quiz editor stubs`
5. `feat(cm/admin): wire CONFIG audit events for authoring lifecycle`
6. `feat(cm/admin): add Content nav entry to Admin sidebar`

Push to `origin/main`. Record remote HEAD hash.

#### Carry-Forward Notes

CP5 fills the lesson slide editor stub. CP6 fills the quiz editor stub. CP7
mirrors this entire route tree at `/management/content/` scoped to customer
content. All audit wiring for authoring events is complete after CP4.

---

### CP5 — Slide editor

#### Goal

Implement the three-pane lesson slide editor at the lesson edit route in both the
Admin authoring tree and (after CP7) the management tree. Three slide types: text,
image, imported. Desktop-only with mobile redirect. Visual reference:
`SlideEditor` component in `docs/COB_Flow_MVP.html`.

#### Prerequisites

CP4 complete. `content-assets` bucket exists (CP3). `react-markdown` and
`remark-gfm` installed (CP1). `pdf-to-img` installed (CP1). Lesson routes exist
as stubs.

#### Steps

1. Create `src/features/content-manager/components/SlideEditor.tsx`. Three-pane
   layout:
   - **Left rail** (240px): ordered list of slide thumbnail chips (type icon +
     truncated heading/caption). Drag handles for reorder (Up/Down button pattern
     if no drag library in locked stack). "Add Slide" dropdown menu with three
     options: Text, Image, PDF Import.
   - **Main editor pane** (flexible width): varies by slide type (see steps 2–4).
   - **Preview toggle button** in top-right of main pane: toggles between edit
     and preview mode. Preview renders the current slide using `react-markdown` +
     `remark-gfm`.

2. Text slide editor fields: Heading (single-line), Body (markdown textarea,
   full-width ~20 rows), Citation helper bar. Citation helper bar has nine buttons:
   Internal, Syllabus, Spec, WI Admin Code, WI Statute, Case Law, FH Training,
   FH Handbook, CMS. Each button inserts the pre-formatted citation snippet from
   `content/courses/auto-cob-wisconsin/conventions.md` at cursor position in the
   Body textarea.

   Citation snippet formats:
   ```
   Internal:     [Module N § Section Title]
   Syllabus:     [Syllabus Module N]
   Spec:         [Spec § N.N Rule N]
   WI Admin Code:[Wis. Admin. Code § Ins 3.40(X)(x)]
   WI Statute:   [Wis. Stat. § XXX.XX]
   Case Law:     [Party v. Party, XXX Wis. 2d XXX (YYYY)]
   FH Training:  [FH Master Deck slide N] or [FH Policy Reference p. N]
   FH Handbook:  [FH Handbook Topic #NNN (Topic Title)]
   CMS:          [CMS COB Workbook Module N]
   ```

3. Image slide editor fields: Image upload control (Supabase Storage upload to
   `content-assets/{content_type}/{course_slug}/{module_slug}/{lesson_slug}/{uuid}.{ext}`
   — path assembled from route params), Caption (single-line), Optional body
   markdown. On upload, call Supabase Storage `upload()` API and persist the
   returned path as `image_url` on the slide object.

4. Imported slide (PDF-derived): read-only in the editor. Shows source PDF
   filename, page number, and the rendered PNG at `image_url`. Caption is
   editable.

5. PDF import flow — synchronous path (≤50 pages): when the user selects "PDF
   Import" and uploads a PDF of ≤50 pages, use `pdf-to-img` to render all pages
   to PNG at 150 DPI client-side, upload each PNG to the `content-assets` bucket
   under the lesson path, and insert imported-type slides into the local slide
   array. Maps to spec §12 step 15 (sync portion). Async path (51–200 pages) is
   CP10. Files >200 pages: show an error toast "PDF exceeds the 200-page import
   limit."

6. Save behavior: maintain local state for the slides array. Show "Unsaved
   changes" banner after any edit. Explicit "Save" button writes the full `slides`
   JSONB to the `lessons` table via a server action. On save, write audit event
   `lesson_updated` (category `CONFIG`, metadata `{ lesson_id, slide_count }`).
   Wire `beforeunload` event to warn on navigation with unsaved changes.

7. Desktop-only guard: in the lesson edit layout, detect viewport width. Below
   `lg` breakpoint, replace the editor with a card: "The slide editor requires a
   desktop browser. Please switch to a larger screen." Use a CSS media query check
   (`useMediaQuery` hook or a CSS `hidden` class on the editor + a visible
   fallback block).

8. Replace the CP4 stub page at `courses/[courseId]/modules/[moduleId]/lessons/
   [lessonId]/edit/page.tsx` with the real `SlideEditor` component. Pass course
   slug, module slug, lesson slug, and content type as props derived from route
   params and DB query.

#### Acceptance Criteria

- Lesson edit route renders the three-pane slide editor on desktop viewports.
- Adding a text slide, typing heading and body, previewing, and saving persists
  the updated `slides` JSONB to the `lessons` table.
- Image upload sends a file to the `content-assets` bucket and renders the image
  in both edit and preview modes.
- Citation helper buttons insert correct citation snippets at cursor position.
- PDF file ≤50 pages imports synchronously; slides appear in the rail with type
  `imported`.
- PDF file >200 pages shows the rejection toast.
- "Unsaved changes" banner appears after edits; disappears after save.
- On mobile viewport, the editor is replaced by the desktop-only notice.
- `npm run typecheck`, `npm run lint`, `npm run build` clean.

#### Verification Gate

```bash
npm run dev
# Manual: navigate to a lesson edit route, add text/image slides, save, reload — data persists
# Manual: import a ≤50 page PDF, verify imported slides appear
# Manual: resize to mobile width, verify desktop-only notice appears
npm run typecheck
npm run lint
npm run build
```

#### Commit Pattern

Three commits:
1. `feat(cm): implement SlideEditor component with text and image slide types`
2. `feat(cm): add citation helper bar and preview toggle to SlideEditor`
3. `feat(cm): wire synchronous PDF import and desktop-only guard to SlideEditor`

Push to `origin/main`. Record remote HEAD hash.

#### Carry-Forward Notes

CP6 implements the quiz editor. CP10 implements the async PDF import path for
51–200 page PDFs. The `SlideEditor` component is also used at the management
authoring routes once CP7 mirrors the route tree.

---

### CP6 — Quiz editor

#### Goal

Implement the quiz editor for both MC and FR modes, shared between module quiz
routes and course quiz routes. Visual reference: `QuizEditor` component in
`docs/COB_Flow_MVP.html`.

#### Prerequisites

CP5 complete. `react-markdown` + `remark-gfm` available. Module and course quiz
editor routes exist as stubs from CP4.

#### Steps

1. Create `src/features/content-manager/components/QuizEditor.tsx`. Single-page
   form, adapts to `quiz_type` (`multiple_choice` or `free_response`).

2. Pass threshold field: integer input, range 0–100, default 80. For
   `free_response` quizzes, replace input with static label "Completion-based
   (self-attestation)".

3. MC question editor. For each question in `quiz_questions` order:
   - Stem (markdown textarea)
   - Options A, B, C, D (four text inputs)
   - Correct answer radio (A / B / C / D)
   - Explanation (markdown textarea; shown to learner after submission)
   - Topic (single-line)
   - Per-question preview toggle: collapses editor fields and renders stem +
     options as the learner will see them.
   - Drag handles (Up/Down buttons) for `question_order`.
   - "Delete question" button (soft: removes from local state; committed on Save).

4. FR question editor. For each question:
   - Stem (markdown textarea)
   - Model answer walkthrough (markdown textarea)
   - Grading rubric (markdown textarea)
   - Topic (single-line)
   - Per-question preview toggle: renders stem only (model answer hidden until
     learner submits).

5. "Add Question" button at bottom: appends a new blank question of the quiz's
   type. MC questions default to four empty options and no correct answer selected.

6. Full-quiz preview button at the top renders all questions in learner mode
   (without correct answers shown for MC; without model answer for FR).

7. Save behavior: explicit "Save" button. Writes the `pass_threshold` update to
   `quizzes` and all `quiz_questions` upserts. Write audit event `quiz_published`
   or `quiz_created` (category `CONFIG`) as appropriate. Use optimistic concurrency
   (`updated_at` check).

8. Replace CP4 stub pages at `modules/[moduleId]/quiz/[quizId]/edit/` and
   `course-quizzes/[quizId]/edit/` with `QuizEditor`.

#### Acceptance Criteria

- Module quiz edit route renders `QuizEditor` in MC mode with pass threshold
  input.
- Course quiz edit route renders `QuizEditor` in the mode matching the quiz's
  `quiz_type`.
- FR quiz shows "Completion-based (self-attestation)" label instead of threshold
  input.
- Adding, editing, reordering, and deleting questions persists on Save.
- Per-question preview toggle correctly hides/shows editor fields.
- Full-quiz preview renders all questions in learner mode.
- `npm run typecheck`, `npm run lint`, `npm run build` clean.

#### Verification Gate

```bash
npm run dev
# Manual: navigate to module quiz edit, add MC questions, set pass threshold, save, reload
# Manual: navigate to course quiz edit (FR type), verify label, add FR question, save
# Manual: per-question preview toggle, full-quiz preview
npm run typecheck
npm run lint
npm run build
```

#### Commit Pattern

Two commits:
1. `feat(cm): implement QuizEditor with MC and FR modes and pass threshold`
2. `feat(cm): wire per-question preview, drag-reorder, and save to QuizEditor`

Push to `origin/main`. Record remote HEAD hash.

#### Carry-Forward Notes

CP7 mirrors the `/admin/content/` tree at `/management/content/`. The
`SlideEditor` and `QuizEditor` components are re-used without change; only the
role gate and `content_type` scope change. CP8 builds the learner quiz-taking
surfaces (separate from the editor).

---

### CP7 — Management authoring routes + tenant feature flag

#### Goal

Mirror the `/admin/content/` route tree at `/management/content/` scoped to
`content_type = 'customer'` and the session tenant. Add the `content_manager`
tenant feature flag gate to `/learn/*` and `/management/content/*` layouts.

#### Prerequisites

CP6 complete. Admin authoring routes, `SlideEditor`, and `QuizEditor` all
functional. Session-aware DB client with tenant context available.

#### Steps

1. Create `src/app/(app)/management/content/` route tree mirroring the admin
   tree structure from spec §7. Reuse the same page components where possible;
   the only differences are the role gate and the `content_type` filter.

2. Add layout-level role gate to `src/app/(app)/management/content/layout.tsx`:
   ```typescript
   const user = await getCurrentUser();
   if (!isManager(user) && !isSupervisor(user)) redirect('/dashboard');
   ```
   Use `isManager()` and `isSupervisor()` from `src/lib/authority/roles.ts`.

3. Scope all DB queries in the management authoring routes to
   `content_type = 'customer'` AND `tenant_id = session.tenantId`. The RLS
   policy on `courses` already enforces this at the database layer; the
   application-layer filter is defense-in-depth and keeps the query intent
   explicit in the code.

4. Managers and Supervisors have equal CRUD rights on customer content (spec §7).
   Do not introduce a publish-approval workflow or differentiated permissions
   between the two roles on this surface.

5. Add the tenant feature flag gate. Read `tenant.features.content_manager` from
   the session in:
   - `src/app/(app)/learn/layout.tsx`
   - `src/app/(app)/management/content/layout.tsx`

   If the flag is `false`, render a full-page informational component:
   "Learning Management is not enabled for your organization. Contact your
   administrator." Do not return a 404; return this page with a 200.
   The `/admin/content/*` routes are NOT gated by this flag.

6. Conditionally show the "Learning" sidebar nav item (pointing to `/learn/`) and
   the "Learning Content" management nav item only when `tenant.features.
   content_manager` is `true`. The Admin sidebar "Content" item is always visible.

7. Seed `tenants.features` in the mock fixture (if still fixture-based):
   set `{ content_manager: true }` for all three demo tenants. This ensures the
   learner and management authoring surfaces are visible in the demo.

#### Acceptance Criteria

- Navigating to `/management/content/` as Manager or Supervisor renders the
  sequence list scoped to customer content for the session tenant.
- Navigating to `/management/content/` as Analyst redirects to `/dashboard`.
- Creating a sequence on the management authoring surface writes a row with
  `content_type = 'customer'` and `tenant_id` set.
- With `content_manager: false` in tenant features, `/learn/` and
  `/management/content/` render the disabled message; `/admin/content/` is
  unaffected.
- Sidebar nav items appear/hide correctly based on the feature flag.
- `npm run typecheck`, `npm run lint`, `npm run build` clean.

#### Verification Gate

```bash
npm run dev
# Manual: sign in as Supervisor (T. Ramos), navigate /management/content/ — expect customer catalog
# Manual: sign in as Manager (D. Berger), navigate /management/content/ — expect customer catalog
# Manual: sign in as Analyst, navigate /management/content/ — expect redirect
# Manual: temporarily set content_manager: false in mock fixture, reload — expect disabled page
npm run typecheck
npm run lint
npm run build
```

#### Commit Pattern

Three commits:
1. `feat(cm/mgmt): scaffold /management/content route tree with Manager+Supervisor role gate`
2. `feat(cm/mgmt): scope management authoring to customer content_type and session tenant`
3. `feat(cm): add tenant content_manager feature flag gate to learn and management routes`

Push to `origin/main`. Record remote HEAD hash.

#### Carry-Forward Notes

CP8 builds the learner surface at `/learn/*`. The feature flag gate is in place;
the learner surface only renders when the flag is `true`. CP9 wires the completion
side effects that the learner routes trigger.

---

### CP8 — Learner surface

#### Goal

Build the full `/learn/*` route tree: catalog, sequence overview, course landing,
module landing, lesson player (slide carousel), MC quiz attempt + result, FR quiz
attempt + result, and history view. Visual references: `MyLearningView`,
`SlideViewer`, `McQuizTaker`, `FrCapstoneTaker` in `docs/COB_Flow_MVP.html`.

#### Prerequisites

CP7 complete. Feature flag gate in place. CM tables populated with at least one
course and module via manual seeding or CP4 admin authoring. Session-aware DB
client available.

#### Steps

1. Create `src/app/(app)/learn/layout.tsx` with feature flag gate (CP7 installed
   this; verify it is in place). Add `Learning` sidebar nav item pointing to
   `/learn/`.

2. Implement Catalog (`/learn/catalog/page.tsx`). Four sections (spec §7):
   - Continue Learning — enrolled courses with `status = 'in_progress'`
   - Available Sequences — published sequences matching audience filter
   - Available Standalone Courses — published standalone courses matching filter
   - Recently Completed — `course_completions` within last 90 days

   Audience filter defaults to the current user's role lowercased (`'analyst'`
   in v1). "View all" toggle removes the filter. Locked courses (sequenced,
   prior course incomplete) show a lock icon and "Complete [prior title] to
   unlock" tooltip.

3. Implement Sequence overview (`/learn/sequences/[sequenceId]/page.tsx`).
   Sequence name, description, ordered course list with per-course completion
   status.

4. Implement Course landing (`/learn/courses/[courseId]/page.tsx`). Module list
   with per-module completion status (derived: all lessons complete + module quiz
   passed if present). Total progress bar. Estimated hours remaining. Enroll CTA
   (calls `enrollCourse()` server action) or Resume button (deep-links to first
   incomplete lesson). Module completion check is derived — no `module_completions`
   table to query.

5. Implement Module landing (`/learn/courses/[courseId]/modules/[moduleId]/
   page.tsx`). Lessons list with per-lesson completion status (row in
   `lesson_completions`). Module quiz link if a module quiz exists.

6. Implement Lesson player (`/learn/courses/[courseId]/modules/[moduleId]/
   lessons/[lessonId]/page.tsx`). Slide carousel: one slide visible at a time.
   `react-markdown` + `remark-gfm` for text slide body and image captions.
   Bottom navigation: Previous / Next. Progress indicator: "Slide N of M".
   Reaching the last slide triggers `completeLesson()` server action (CP9
   wires the side effects; in CP8 write the idempotent upsert only).
   Breadcrumb: Course title → Module title → Lesson title.

7. Implement MC quiz attempt page (`/learn/courses/[courseId]/modules/[moduleId]/
   quiz/page.tsx`). All questions on one page. Radio buttons A–D per question.
   Single "Submit" button. On submit, call `submitQuizAttempt()` server action
   (CP9 for side effects; in CP8 write the attempt row and redirect to result).
   Submission is final; no edit after submit.

8. Implement MC quiz result page (`.../quiz/[attemptId]/result/page.tsx`).
   Score percent, pass/fail badge, per-question breakdown (correct option green,
   selected wrong option red, explanation shown). "Retake" button creates new
   attempt. No cooldown.

9. Implement FR quiz attempt page (`/learn/courses/[courseId]/course-quiz/
   [quizId]/page.tsx`). Stem + `<textarea>` for answer. Submit reveals model
   answer, grading rubric, and self-attestation button. Call `selfAttestQuiz()`
   on attestation (CP9 for side effects; in CP8 write `self_attested_at`).

10. Implement FR quiz result page. Learner answer alongside model answer and
    rubric. Unattempted attestation surfaced. "Course Complete" banner after
    attestation with unlocks earned (query `authority_unlocks` for the user
    after CP9 is wired; stub in CP8 with a placeholder "Authority unlocks
    updated" message).

11. Implement History view (`/learn/history/page.tsx`). Always visible regardless
    of role. All `course_enrollments` for session user with status, completion
    date, and authority unlocks earned per course.

12. Ensure all learner routes are fully mobile-responsive. Use the mobile patterns
    from Phase B: compact layout, no horizontal overflow, touch-friendly slide
    navigation.

#### Acceptance Criteria

- Catalog at `/learn/catalog/` shows enrolled, available, and completed courses
  for the session user.
- Lesson player navigates through slides; reaching the final slide writes a
  `lesson_completions` row.
- MC quiz submit writes a `quiz_attempts` row and navigates to the result page.
- FR quiz submit then self-attest writes `self_attested_at` on the attempt.
- History shows all enrollments for the session user.
- All learner routes render correctly at mobile viewport widths.
- `npm run typecheck`, `npm run lint`, `npm run build` clean.

#### Verification Gate

```bash
npm run dev
# Manual: sign in as Analyst (J. Mueller), navigate /learn/catalog/
# Manual: enroll in a course, navigate to first lesson, advance through slides
# Manual: complete an MC quiz, check result page
# Manual: view /learn/history/ — verify enrollment record appears
npm run typecheck
npm run lint
npm run build
```

#### Commit Pattern

Five commits:
1. `feat(cm/learn): add /learn layout, catalog, sequence overview, and course landing`
2. `feat(cm/learn): implement module landing and lesson player (slide carousel)`
3. `feat(cm/learn): implement MC quiz attempt and result pages`
4. `feat(cm/learn): implement FR quiz attempt, self-attestation, and result pages`
5. `feat(cm/learn): implement history view; ensure mobile responsiveness`

Push to `origin/main`. Record remote HEAD hash.

#### Carry-Forward Notes

CP9 wires the completion side effects for the server actions stubbed in CP8
(`completeLesson`, `submitQuizAttempt`, `selfAttestQuiz`, `completeModule`,
`completeCourse`). The learner routes call these actions but the side effects
(unlock grants, notifications, audit events) are not yet produced.

---

### CP9 — Completion wiring: unlocks + notifications + audit

#### Goal

Implement the five server actions that drive the learning completion loop. Each
action writes learner records, triggers unlock grants via
`grant_unlock_from_completion()`, inserts `learning_notifications`, and writes
`AuditEvent` rows. After CP9, the full completion chain from lesson → module →
course is wired and produces audit-traceable authority unlock records.

#### Prerequisites

CP8 complete. Learner routes exist. `grant_unlock_from_completion()` SECURITY
DEFINER function deployed (CP2). `learning_notifications` table exists (CP2).
`AuditEvent.category` includes `'LEARNING'` and `'AUTHORITY'` (CP1).

#### Steps

1. Create `src/features/content-manager/actions/complete-lesson.ts`.
   `completeLesson(lessonId)`:
   - Upsert into `lesson_completions` (idempotent — upsert on conflict do nothing).
   - Write audit event: category `LEARNING`, action `lesson_completed`,
     metadata `{ lesson_id, user_id }`.
   - Check if this completion triggers module completion (step 2 below).

2. Create `src/features/content-manager/actions/complete-module.ts`.
   Module completion trigger logic (called from within `completeLesson()` and
   `submitQuizAttempt()` when a passing quiz attempt is submitted):
   - Derived check: all lessons in the module have `lesson_completions` rows
     for the user AND (if a module quiz exists) a `quiz_attempts` row with
     `passed = true`.
   - If conditions met: for each entry in `modules.unlock_definition`, call
     `grant_unlock_from_completion()` only if the new `unlock_value` exceeds
     the current MAX for that `unlock_type` for this user (no-op rule — spec §6).
   - Clamp `unlock_value` against `platform_authority_ceilings.max_value` before
     passing to `grant_unlock_from_completion()`.
   - Write audit event: category `LEARNING`, action `module_completed`, metadata
     `{ module_id, user_id, unlocks_granted }`.
   - Write audit event: category `AUTHORITY`, action `authority_granted` for each
     unlock actually inserted.
   - Resolve `recipient_user_id` for the notification: `users.teamId` → team's
     `supervisor_id` for Analyst learners; `teams.manager_id` for Supervisor
     learners; no notification for Manager learners. If no supervisor resolvable,
     insert notification with `recipient_user_id = NULL`.
   - Insert `learning_notifications` row.
   - Write audit event: category `LEARNING`, action `learning_notification_sent`.
   - Check if this module completion triggers course completion (step 4 below).

3. Create `src/features/content-manager/actions/submit-quiz-attempt.ts`.
   `submitQuizAttempt(quizId, responses)`:
   - Compute `attempt_number` as `MAX(attempt_number) + 1` for `(user_id, quiz_id)`.
   - Compute `score_percent` and `passed` per scoring formula (spec §8).
   - Insert `quiz_attempts` row with `submitted_at` set.
   - Write audit event: category `LEARNING`, action `quiz_attempted`.
   - If `passed = true` AND quiz is a module quiz, call module completion trigger.

4. Create `src/features/content-manager/actions/self-attest-quiz.ts`.
   `selfAttestQuiz(attemptId)`:
   - Set `self_attested_at` on the `quiz_attempts` row.
   - Write audit event: category `LEARNING`, action `quiz_self_attested`.
   - Call course completion trigger (step 5 below).

5. Create `src/features/content-manager/actions/complete-course.ts`.
   Course completion trigger (called from `selfAttestQuiz()` for FR capstone, or
   from `completeModule()` for courses with no capstone quiz):
   - Prerequisites: all modules in the course are complete AND (if a course-level
     quiz exists) it has been self-attested.
   - Insert `course_completions` row with `capstone_attempt_id` set if applicable.
   - For each entry in `courses.unlock_definition`, apply the same no-op /
     ceiling-clamp / `grant_unlock_from_completion()` flow as module completion.
   - Write audit event: category `LEARNING`, action `course_completed`.
   - Write audit event: category `AUTHORITY`, action `authority_granted` for each
     unlock inserted.
   - Route notification to supervisor or manager per the same routing logic.
   - Write audit event: category `LEARNING`, action `learning_notification_sent`.

6. Update the stub server action calls in CP8 learner routes to call these
   real implementations.

#### Acceptance Criteria

- Completing all lessons in a module (and passing the module quiz if present)
  produces rows in `authority_unlocks` matching the module's `unlock_definition`.
- Completing a course (with FR capstone self-attested if present) produces rows
  in `authority_unlocks` matching the course's `unlock_definition`.
- Platform ceiling clamping: if a module defines `unlock_value: 999999`, the
  inserted row shows the ceiling value, not `999999`.
- `learning_notifications` rows are created for Analyst completions addressed to
  their supervisor, and for Supervisor completions addressed to the team manager.
- Audit log contains `lesson_completed`, `module_completed`, `course_completed`,
  `authority_granted`, `learning_notification_sent` events.
- Duplicate `completeLesson()` calls for the same lesson+user are idempotent.
- `npm run typecheck`, `npm run lint`, `npm run build` clean.

#### Verification Gate

```bash
npm run dev
# Manual: complete all lessons in a module, pass the MC quiz
# Manual: psql -h 127.0.0.1 -p 54322 -U postgres -c \
#   "SELECT * FROM authority_unlocks WHERE user_id = '<jm_user_id>' ORDER BY granted_at"
# Manual: verify learning_notifications row with correct recipient
# Manual: verify audit log entries for the completion chain
npm run typecheck
npm run lint
npm run build
```

#### Commit Pattern

Three commits:
1. `feat(cm/actions): implement completeLesson and module-completion trigger`
2. `feat(cm/actions): implement submitQuizAttempt, selfAttestQuiz, and course-completion trigger`
3. `feat(cm/actions): wire unlock grants, notifications, and audit events to completion actions`

Push to `origin/main`. Record remote HEAD hash.

#### Carry-Forward Notes

CP10 builds on the completed notification model — the oversight surface at
`/management/learning/` reads `learning_notifications` rows created in CP9.
The `grant_unlock_from_completion()` function and the no-op/ceiling logic from
CP9 are the authority model; the revoke surface in CP10 soft-deletes rows written
here.

---

### CP10 — Async PDF import + role-aware oversight surface

#### Goal

Implement the async PDF import flow for 51–200 page PDFs with a polling endpoint.
Build the `/management/learning/` oversight surface with role-aware composition:
Manager sees supervisors-list-with-aggregates and drill-down; Supervisor sees
their own team's analyst progress directly. Visual references:
`CmOversightView` and `SupervisorOversightDetail` in `docs/COB_Flow_MVP.html`.

#### Prerequisites

CP9 complete. `learning_notifications` rows are being created. `pdf_import_jobs`
table exists (CP2). `pdf-to-img` installed (CP1).

#### Steps

1. Async PDF import flow. In `SlideEditor.tsx`, when a PDF upload is ≥51 pages:
   - Call a server action `createPdfImportJob(lessonId, filename, totalPages)`
     that inserts a `pdf_import_jobs` row with `status = 'pending'` and returns
     the job ID.
   - Return the job ID to the client immediately.
   - Show a progress UI in the slide rail: "Importing page N / M..."
   - Client polls `GET /api/cm/pdf-import/[jobId]` every 2 seconds.

2. Create `src/app/api/cm/pdf-import/[jobId]/route.ts`. Returns:
   ```json
   { "status": "pending" | "processing" | "complete" | "failed",
     "completed_pages": N,
     "total_pages": M }
   ```
   No auth bypass — use the session-aware client; the route is accessible only
   to signed-in users.

3. Implement the background processor. Given the Next.js App Router environment
   (no persistent long-running workers), implement the processor as a server
   action triggered by the client after creating the job:
   `processPdfImportJob(jobId)`. This action:
   - Updates `status = 'processing'`.
   - Reads the uploaded PDF file from Storage.
   - Loops through pages using `pdf-to-img`, uploads each PNG to
     `content-assets/{path}/{uuid}.png`.
   - After each page, increments `completed_pages` and upserts the imported slide
     into the lesson's `slides` JSONB array.
   - On completion, sets `status = 'complete'` and writes audit event
     `pdf_imported` (category `CONFIG`).
   - On error, sets `status = 'failed'` with `error_message`.

   Note: this is a long-running server action. In CP10, implement it as a
   synchronous sequential action for correctness. See §5 for the open question
   about Supabase Edge Functions vs. Next.js API routes for a future refactor.

4. Update the polling in `SlideEditor.tsx` to stop when status is `complete` or
   `failed`, and to re-fetch the lesson's `slides` on completion.

5. Build `src/app/(app)/management/learning/` route tree per spec §7:
   - `layout.tsx` — SUPERVISOR or MANAGER role gate
   - `page.tsx` — redirect to `notifications/`
   - `notifications/page.tsx` — notification list
   - `learners/[userId]/page.tsx` — learner profile
   - `learners/[userId]/quizzes/[attemptId]/page.tsx` — quiz attempt review
   - `learners/[userId]/authority/page.tsx` — authority surface with revoke

6. Implement notification list (`notifications/page.tsx`). TanStack Table:
   learner name, course title, completion date, attestation status (FR only),
   acknowledged/unacknowledged status. Filter: `recipient_user_id =
   session.userId`. Clicking a row navigates to the learner's quiz attempt review.
   Marking a notification acknowledged sets `acknowledged_at`.

7. Implement role-aware oversight composition. In the management learning layout
   or root page, branch on role:
   - **Manager** path: show a supervisors-list with aggregate stats per team
     (analyst count, enrolled count, completions in last 30 days, unlocks in
     last 30 days, last activity date). Resolve supervisors via `TEAMS` filtered
     by `manager_id = session.userId`. Clicking a supervisor row drills into
     `SupervisorOversightDetail` view for that supervisor.
   - **Supervisor** path: go directly to the oversight detail for the session
     user's own team.

   This mirrors the `CmOversightView` role-branch in the prototype at commit
   `389dae7`. Resolve `teams.manager_id` (added to schema in CP2).

8. Implement quiz attempt review (`learners/[userId]/quizzes/[attemptId]/page.tsx`).
   Reuse the learner result page component. Shows the learner's submitted answer
   (FR) or selected options (MC) alongside model answers. For FR, shows grading
   rubric. The supervisor can add a coaching note here — store in a separate
   coaching_notes store; NOT the audit log (CLAUDE.md: "Audit log ≠ coaching
   notes"). In CP10, implement the coaching note as a local `supervisor_notes`
   fixture or stub — the real coaching notes table is Phase 2.

9. Implement authority surface (`learners/[userId]/authority/page.tsx`). Lists
   all `authority_unlocks` for the learner: unlock type, value, source
   (course/module/manager-grant), granted date, revoked status. "Revoke" button
   on each active row opens a shadcn Dialog requiring justification text. On
   confirm: set `revoked_at`, `revoked_by_user_id`, `revoked_reason`; write audit
   event (category `AUTHORITY`, action `authority_revoked`, metadata per spec §10).

10. Add "Learning Oversight" sidebar nav item under Management for MANAGER and
    SUPERVISOR roles, pointing to `/management/learning/`.

#### Acceptance Criteria

- PDF of 51–200 pages initiates an async import job; the client polls and slides
  appear progressively.
- PDF of >200 pages is rejected at selection (no job created).
- Manager signed in sees the supervisors-list at `/management/learning/` with
  aggregate stats; clicking a supervisor drills into that supervisor's team detail.
- Supervisor signed in sees their own team's analyst progress directly.
- Notification list shows only notifications addressed to the session user.
- Revoke action on an authority unlock sets `revoked_at` and writes an `AUTHORITY`
  audit event with justification.
- `npm run typecheck`, `npm run lint`, `npm run build` clean.

#### Verification Gate

```bash
npm run dev
# Manual: upload a ~60-page PDF in the slide editor — expect async import progress
# Manual: sign in as Manager, navigate /management/learning/ — supervisors-list with stats
# Manual: click a supervisor row — drill into their team detail
# Manual: sign in as Supervisor — own team detail shown directly
# Manual: navigate to a learner's authority surface, revoke an unlock, inspect audit log
npm run typecheck
npm run lint
npm run build
```

#### Commit Pattern

Four commits:
1. `feat(cm/slide): implement async PDF import with pdf_import_jobs tracking and polling endpoint`
2. `feat(cm/oversight): scaffold /management/learning route tree with role gate`
3. `feat(cm/oversight): implement notification list and role-aware oversight composition`
4. `feat(cm/oversight): implement quiz attempt review and authority revoke surface`

Push to `origin/main`. Record remote HEAD hash.

#### Carry-Forward Notes

CP11 ingests the Auto COB Wisconsin Chapter 1 (Module 1) content as a platform
course. The learner routes from CP8, the completion chain from CP9, and the
oversight surface from CP10 are all in place for end-to-end verification.

---

### CP11 — Seed ingestion + final verification

#### Goal

Prepare source content for ingestion (rename directories, strip audience markers
from conventions), run the ingestion script to load the Auto COB Wisconsin Module 1
platform course into the CM tables, verify the course is playable end-to-end, run
full test suite, and author the Phase CM completion summary in
`docs/COB_Flow_Handoff.md`.

#### Prerequisites

CP10 complete. Full learner and oversight surfaces functional. All CM tables
populated with helper data (sequences, platform ceilings seeded). Local Supabase
running with all migrations applied.

#### Steps

1. Pre-ingestion content cleanup. Apply via a separate agent prompt per the
   working norms (spec §12 step 21):
   - Rename `content/courses/auto-cob-wisconsin/chapter-NN-*` directories to
     `module-NN-*` for all 12 modules.
   - Update `content/courses/auto-cob-wisconsin/README.md`: replace all
     references to "chapter" with "module", update the directory structure table,
     drop the Customer/Self tier marker documentation.
   - Update `content/courses/auto-cob-wisconsin/conventions.md`: replace
     "chapter" → "module" in naming rules and citation style; remove the
     Customer/Self tier marker section and the `Tier` field from the MC question
     schema; remove the scenario question schema section (course-level quizzes
     retain their own conventions but the `Tier` field is removed).
   - Strip inline audience markers from all `.md` files under
     `module-01-foundations/` (remove `> **Analyst track and deeper:**` and
     `> **Self track only:**` blockquote wrappers; keep the content beneath them
     as unmarked text).

2. Write ingestion script `scripts/cm/ingest-auto-cob-wisconsin.ts`. The script:
   - Reads the directory tree under
     `content/courses/auto-cob-wisconsin/module-01-foundations/`.
   - Parses `module.md` (renamed from `chapter.md`) for module metadata:
     title, description, `module_order` derived from the directory `NN` prefix.
   - For each `lesson-N-*.md` file, parses the markdown into slides:
     each H2/H3 section becomes a text slide with the section heading and
     body markdown.
   - Parses `quiz.md` into `quiz_questions` rows using the MC question schema
     from `conventions.md` (after Tier field removal).
   - Inserts rows in dependency order:
     `course_sequences` → `courses` → `modules` → `lessons` (with `slides`
     JSONB) → `quizzes` → `quiz_questions`.
   - Sets `content_type = 'platform'`, `audience = 'analyst'`,
     `status = 'published'` for all inserted rows.
   - The course is the "Auto COB Wisconsin" course (Module 1 only in v1 seeding).
   - Maps to spec §12 step 21.

3. Run ingestion script:
   ```bash
   npx tsx scripts/cm/ingest-auto-cob-wisconsin.ts
   ```
   Verify no errors. Inspect rows in Drizzle Studio.

4. End-to-end learner verification:
   - Sign in as Analyst, navigate to catalog, confirm the Auto COB Wisconsin
     course appears.
   - Enroll, navigate to Module 1, Lesson 1, advance through all slides.
   - Verify `lesson_completions` row written.
   - Complete the MC quiz for Module 1, verify pass/fail result, verify
     `authority_unlocks` row if module has `unlock_definition`.
   - Navigate to History, verify enrollment and completion appear.

5. Admin catalog verification:
   - Sign in as Admin, navigate `/admin/content/courses/`, verify the Auto COB
     Wisconsin course appears with status Published.
   - Navigate to the module, verify lessons and quiz are populated.

6. Run full verification suite:
   ```bash
   npm run typecheck     # zero errors
   npm run lint          # zero warnings
   npm run test          # all Vitest unit tests pass
   npm run test:e2e      # all Playwright E2E tests pass
   npm run build         # clean production build
   supabase db diff      # no pending schema drift
   ```

7. Author the Phase CM completion summary in `docs/COB_Flow_Handoff.md` §11
   following the Phase B template (see template in §6 of this plan). Fill in
   actual commit hashes, surfaces shipped, Phase G inheritance seams, and any
   spec deviations.

#### Acceptance Criteria

- `content/courses/auto-cob-wisconsin/` uses `module-NN-*` naming throughout.
- `conventions.md` and `README.md` updated to module terminology; audience
  markers removed.
- Auto COB Wisconsin Module 1 appears in the admin catalog and learner catalog.
- Full lesson + quiz end-to-end play-through succeeds and writes all expected DB rows.
- All six verification commands exit clean.
- Phase CM summary written in `docs/COB_Flow_Handoff.md` §11.

#### Verification Gate

```bash
ls content/courses/auto-cob-wisconsin/ | grep module   # expect module-01-foundations etc.
grep -r "Analyst track and deeper" content/courses/auto-cob-wisconsin/module-01-foundations/
# expect zero matches
npx tsx scripts/cm/ingest-auto-cob-wisconsin.ts
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
supabase db diff
```

#### Commit Pattern

Four commits:
1. `chore(course): rename chapter-NN directories to module-NN; update README and conventions`
2. `chore(course): strip audience tier markers from module-01-foundations source files`
3. `feat(cm/ingest): add Auto COB Wisconsin ingestion script; seed Module 1 platform course`
4. `docs(cm): add Phase CM completion summary to COB_Flow_Handoff.md §11`

Push to `origin/main`. Record remote HEAD hash in Phase CM summary.

#### Carry-Forward Notes

Phase G inherits a fully operational Content Manager with platform content seeded
(Module 1), authority unlock records writing into `authority_unlocks`, the
`effective_authority()` Postgres function ready for `canPerform()` in Phase 2,
and the coaching notes hook point at
`/management/learning/learners/[userId]/quizzes/[attemptId]/` wired but pointing
at a Phase 2 stub.

---

## §4 — Cross-Cutting Concerns

### Test Strategy

Unit tests (Vitest) ship alongside each CP for pure logic: scoring formula in
`submitQuizAttempt()`, no-op/ceiling-clamp logic in the unlock grant path,
audience-filter derivation in the catalog, and the `shift_question_order`
procedure equivalent in TypeScript. Integration tests target the local Supabase
Postgres instance and are gated to `CI=true && SUPABASE_LOCAL=true` environment
flags to avoid running in CI environments without Docker. Integration tests cover
RLS boundary cases: Analyst cannot read another tenant's content, Supervisor can
read their own tenant's learner records, the `grant_unlock_from_completion()`
SECURITY DEFINER function writes past Analyst RLS. End-to-end Playwright tests
cover three critical paths: the full authoring flow (CP4–6), the learner lesson +
quiz completion flow (CP8–9), and the oversight drill-down (CP10). E2E tests run
with the local Supabase instance seeded with the ingested platform course (CP11).

### Audit Log Discipline

Every server action writes exactly one `AuditEvent` row — success or failure.
Categories per spec §10: `CONFIG` for authoring lifecycle events, `LEARNING` for
learner activity and notifications, `AUTHORITY` for unlock grants and revocations.
The append-only invariant in `src/lib/audit/log.ts` is never bypassed; no
existing entries are mutated. No client component writes audit events. Server
actions catch exceptions and write a failure audit event before re-throwing, so
every attempted action is on the record regardless of outcome.

### Error Handling

Server actions return a discriminated union:
```typescript
type ActionResult<T> = { ok: true; data?: T } | { ok: false; error: string; reason?: string };
```
UI surfaces failures via the existing toast pattern from Phase B. Optimistic
concurrency on all content tables: update server actions include a
`WHERE updated_at = $last_known_updated_at` clause; a mismatch returns
`{ ok: false, error: "Conflict", reason: "Someone else modified this content." }`
with HTTP 409. The author must reload. No silent data loss.

### Mobile Responsiveness

Authoring routes (`/admin/content/*`, `/management/content/*`) are desktop-only.
The slide editor and quiz editor use a viewport-width check to redirect mobile
users to a "Switch to desktop" notice. Learner routes (`/learn/*`) are fully
mobile-responsive: compact slide carousel with touch-friendly Previous/Next
buttons, readable quiz question layout at small viewports, and no horizontal
overflow. The implementation reuses the mobile patterns from Phase B (compact top
bar, `SidebarSheet` overlay, `max-w-sm` containers).

### Working with the Prototype

When implementing each CP, reference the prototype's equivalent component
(`docs/COB_Flow_MVP.html` at commit `389dae7`) for layout and interaction
patterns. Reference the spec (`docs/superpowers/specs/CONTENT_MANAGER_SPEC.md`
at commit `532dd85`) for behavior and data shape. The prototype wins on
look-and-feel (column widths, card padding, status pill colors, TanStack Table
column layout). The spec wins on behavior (which roles can do what, completion
trigger conditions, notification routing, RLS semantics). When the two conflict
in ways not resolved by this rule, stop and ask Jim rather than guessing.

---

## §5 — Open Execution Questions

The following questions will be answered during CP execution rather than blocking
this plan from being written.

1. **Async PDF import processing mechanism (CP10):** Whether to implement the
   background processor as a long-running Next.js server action, a Supabase Edge
   Function, or a Next.js API route with streaming response. The current plan
   defaults to a sequential server action for correctness; a more scalable
   approach may be needed if large-PDF import performance is unacceptable in
   practice. Defer to CP10 review.

2. **`content-assets` CDN strategy (CP3):** Whether to serve uploaded images via
   public bucket URL with RLS at the bucket level, or via Supabase Storage signed
   URLs with a short expiry (e.g., 1-hour TTL). Signed URLs are more secure for
   customer content but add latency on every slide load. Public URL + bucket RLS
   is simpler and consistent with the existing Supabase Storage pattern. Defer to
   CP3 review.

3. **`audit_events` Drizzle table (CP2 candidate):** Whether to promote
   `src/lib/audit/log.ts` from its current in-memory array stub to a real Drizzle
   table in CP2 (alongside the CM tables), or defer to Phase F (Admin workspace)
   where the Audit tab will surface the full history. Making it a real table in
   CP2 simplifies the CP9 audit wiring and makes `audit_events` queryable from
   the oversight surface. Defer decision to CP2 start.

4. **Supabase Realtime for notification updates (CP10):** Whether to use Supabase
   Realtime subscriptions for live notification badge updates in the Management
   sidebar or rely on route-level re-fetching on navigation. Realtime adds a
   WebSocket dependency and client-side subscription management. Defer to CP10
   review.

5. **`@dnd-kit/sortable` for drag reorder (CP4):** The locked stack in `CLAUDE.md`
   does not list a drag-and-drop library. CP4 uses Up/Down buttons as the
   baseline. If a full drag-handle UX is wanted, `@dnd-kit/sortable` is the
   recommended addition (Radix/shadcn-compatible, no jQuery). Confirm preference
   with Jim before CP4 execution.

6. **Coaching notes stub in CP10:** The `supervisor_notes` coaching-note stub
   from CP10 will use an in-memory fixture for v1. The Phase 2 hook is the
   `coaching_notes` table. Confirm whether a schema-level stub (table exists but
   is empty) is preferred over a TypeScript-only fixture for CP10.

---

## §6 — Phase CM Summary Template

The following skeleton will be filled in by the agent at the close of CP11 and
committed to `docs/COB_Flow_Handoff.md` §11 as the Phase CM completion summary.
It follows the Phase B template voice.

```markdown
### Phase CM — Content Manager (complete, YYYY-MM-DD)

Built against `CONTENT_MANAGER_SPEC.md` (commit `532dd85`) and
`CONTENT_MANAGER_IMPLEMENTATION_PLAN.md` (commit [TBD at CP1]).

**What's working:**

- Admin authoring surface at `/admin/content/` — sequence, course, and module
  CRUD with publish/archive lifecycle and optimistic concurrency
- Management authoring surface at `/management/content/` — customer-scoped
  content CRUD for Manager and Supervisor with equal rights
- Slide editor: three-pane layout, text/image/imported slide types, citation
  helper bar, `react-markdown` preview, image upload to `content-assets`,
  synchronous PDF import (≤50 pages), async PDF import (51–200 pages) with
  progress polling
- Quiz editor: MC and FR modes, per-question preview, drag-reorder, pass
  threshold configuration
- Learner surface at `/learn/` — catalog with audience filter, lesson player,
  MC quiz with per-question breakdown, FR capstone with self-attestation, history
- Completion chain: lesson → module → course completion triggers authority unlock
  grants, learning notifications, and audit events
- Oversight surface at `/management/learning/` — role-aware composition (Manager
  sees supervisors-list with aggregates + drill-down; Supervisor sees own team
  directly), notification list, quiz attempt review, authority revoke
- Auto COB Wisconsin Module 1 ingested as published platform course, playable
  end-to-end in the learner surface
- Tenant `content_manager` feature flag gates learner and management surfaces

**Mobile polish (post-CP11):** [TBD at completion]

**What Phase G inherits:**

- `authority_unlocks` populated with real completion data; `effective_authority()`
  Postgres function ready for `canPerform()` activation in Phase 2
- `learning_notifications` table populated; oversight notification surface
  functional
- `grant_unlock_from_completion()` SECURITY DEFINER function deployed and tested
- `pdf_import_jobs` table and polling endpoint ready for larger PDFs
- Coaching notes hook point at quiz attempt review (Phase 2 stub only)
- Per-quiz `requires_supervisor_review` Phase 2 hook point documented in spec §9
  but not built
- `tenants.features` JSONB ready for additional feature flag keys without
  migration
- `content/courses/auto-cob-wisconsin/` using module terminology; remaining
  modules (2–12) ready for authoring

**Spec deviations documented:**

1. [TBD at completion — list any acceptable deviations from spec §12 discovered
   during execution, with rationale]
```
