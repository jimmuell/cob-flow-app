# Content Manager Build — Paused

**Status:** PAUSED at end of Cowork session 2026-05-24, after CP6.
**Last code commit at pause:** `b6c6790`
**Last doc-sync commit at pause:** `5380e32`
**Reason for pause:** Engineering focus pivots back to Phase C of the original Next.js conversion (Dashboard, Claims & Triage list, Recovery Tracker). The Content Manager surfaces shipped to date remain live in the running app; only further CM build work is paused.

## What shipped (CP1–CP6 + side-quests)

**CP1 — Foundations.** Dependencies installed; `src/features/content-manager/` scaffolded; `AuditEvent.category` extended with `'LEARNING'`; `AuthorityBands` extended with `letterOverride` and `templatePublication`.

**CP2 — Database.** All CM Drizzle tables (course_sequences, courses, modules, lessons, quizzes, quiz_questions, course_enrollments, lesson_completions, quiz_attempts, course_completions, authority_unlocks, platform_authority_ceilings, learning_notifications, pdf_import_jobs); RLS policies; helper functions; recommended indexes. `tenants.features` JSONB and `teams.manager_id` added.

**CP3 — Plumbing.** Session-context Drizzle client wrapper at `src/lib/db/client.ts` (sets `app.current_user_id` / `tenant_id` / `role` per query for RLS). `content-assets` Supabase Storage bucket with RLS mirroring content scope.

**CP4 — Admin authoring routes.** `/admin/content/*` with sequence/course/module CRUD. Post-CP4 refinements: Sequence → Learning Path rename, cascade archive, Admin-only hard delete for archived content, status filter on the catalog.

**CP5 — Slide editor (commit `d2543c2`).** Three-pane editor (rail / main / preview), 9-button citation helper bar, synchronous PDF import ≤ 50 pages via `pdf-to-img`, image upload via service-role Supabase client.

**CP6 — Quiz editor (commits `f242d77` → `a2d4207`).** MC + FR modes; `pass_threshold` input (MC) vs static "Completion-based" label (FR); optimistic concurrency via `updated_at` WHERE clause + DELETE+INSERT for child rows; flat WorkingQuestion state pattern; net-new course-quizzes route; Course Quizzes section on course detail.

**Side-quest — demo seed (commits `a433e77` + `5f02182`).** `scripts/seed-content-manager-demo.ts` — 1 Learning Path / 4 Courses / 12 Modules / 36 Lessons / 16 Quizzes / 48 Questions, all `content_type='platform'`. Idempotent + `--reset` flag (`npm run db:seed:cm` / `db:seed:cm:reset`). Courses 1 + 3 capstones MC; Courses 2 + 4 capstones FR with model answers and rubrics.

**End-of-session cleanup pass (commits `ceeb38e` → `b6c6790`, plus doc-sync to `5380e32`).** Slide image storage refactored to bucket-path + render-time signing (1-hour expiry; eliminates the persistent-signed-URL expiry concern). SQL Admin demo user reconciled (S. Patel → A. Donnelly) across seed migration 0004 + migration 0005 fix. Spec §7 and plan CP4/CP5/CP6 route paths corrected to the actual flattened layout. Spec §3 slide JSONB updated to `image_path`. CLAUDE.md absorbed the full accumulated-conventions catalog.

## What's live in the running app (and stays live during the pause)

- `/admin/content/page.tsx` — three-tab catalog (Learning Paths, Courses, Modules)
- `/admin/content/sequences/[id]/` — Learning Path detail + edit
- `/admin/content/courses/[id]/` — Course detail + edit + quizzes
- `/admin/content/modules/[id]/` — Module detail + edit + lessons + quizzes
- `/admin/content/modules/[id]/lessons/[id]/` — Slide editor (CP5)
- `/admin/content/modules/[id]/quizzes/[id]/` and `/admin/content/courses/[id]/course-quizzes/[id]/` — Quiz editor (CP6)
- Demo seed loaded — 1 LP / 4 courses / 12 modules / 36 lessons / 16 quizzes / 48 questions

No learner surface, no completion wiring, no async PDF import, no oversight surface. Those are CP7 through CP10.

## What CP7–CP11 still owe

**CP7 — Management authoring routes mirror + tenant feature flag gate.** Mirror `/admin/content/*` at `/management/content/*` scoped to `content_type='customer'` AND session tenant. Role gate to MANAGER + SUPERVISOR with equal CRUD rights. Tenant feature flag layout gate (`tenant.features.content_manager`) at `/learn/*` and `/management/content/*` — `/admin/content/*` is NOT flag-gated. Conditional sidebar nav for "Learning" and "Learning Content." Seed `tenants.features = { content_manager: true }` for all three demo tenants.

**CP8 — Learner surface.** `/learn/*` routes that render assigned Learning Paths / Courses / Modules / Lessons / Quizzes to enrolled users.

**CP9 — Completion wiring.** Lesson completion tracking, quiz scoring, course completion. On course completion, grant authority unlocks per `unlock_definition` on the course. Audit events for each grant. Learning notifications surface.

**CP10 — Async PDF import + oversight surface.** Move the CP5 synchronous PDF import to a background job (the `pdf_import_jobs` table is already in the CP2 schema). Oversight surface for admins to monitor jobs, errors, and unlock grants.

**CP11 — Auto COB Wisconsin course ingestion.** Ingest the `content/courses/auto-cob-wisconsin/` markdown scaffolding (Chapter 1 currently committed; Chapters 2–12 still to draft) as the first real platform Learning Path. The demo seed's lesson bodies are plausible filler, NOT canonical curriculum — they get replaced at CP11.

## Known parked drift items (low priority; sweep at thaw time)

- **Spec §7 sequences/ route discrepancy.** Spec mentions a `sequences/` list route within `/admin/content/` that doesn't exist as a separate page. The list is served by `/admin/content/page.tsx` via the three-tab catalog. Either correct the spec or accept the doc-vs-implementation divergence.
- **4 orphan `quiz_questions` from CP6 E2E test residue.** 48 questions in the seeded Learning Path; 52 rows in the DB. The 4 orphans don't belong to any seeded quiz. One-line DELETE to clean up.
- **Drizzle migration `0003` numbering gap + `drizzle/meta` out of sync with on-disk migrations.** Likely benign. Worth a `supabase db diff` check before any future migration work to confirm.

## Thaw checklist (do these before resuming CP7)

1. Read this doc in full.
2. Read `docs/superpowers/specs/CONTENT_MANAGER_SPEC.md` (locked at commit `532dd85` with end-of-session corrections at §3 and §7).
3. Read `docs/superpowers/plans/CONTENT_MANAGER_IMPLEMENTATION_PLAN.md`, specifically CP7 in full and the CP8–CP11 roadmap for context.
4. Verify the seed still loads cleanly — `npm run db:seed:cm:reset`, then visit `/admin/content` and confirm catalog rows render.
5. Decide whether to clean up the 4 orphan `quiz_questions` before CP7 (recommendation: yes, one DELETE at the top of CP7).
6. Confirm the "Accumulated conventions" section in `CLAUDE.md` is still authoritative. Any new patterns from Phase C work that happened during the pause may have been added — resolve any conflicts with CP1–CP6 patterns before resuming.

---

*Generated at end of Cowork session 2026-05-24 as part of the pivot back to original Phase C conversion scope.*
