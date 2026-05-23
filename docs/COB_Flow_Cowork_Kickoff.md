# Next Cowork Session — Kickoff Prompt

This file holds the prompt to paste into a new Cowork session in the Claude.ai desktop app to pick up where the last session left off. It is the authoritative handoff mechanism between Cowork sessions.

## How to use

1. Open a new Cowork session in the Claude.ai desktop app with both repos mounted (cob-flow-app and cob-auto-claim).
2. Copy the kickoff prompt below (everything between the `BEGIN PROMPT` and `END PROMPT` markers).
3. Paste into the new Cowork session as the first message.
4. Cowork will read the referenced documents, ack scope and state, and propose the next move.

The kickoff prompt encodes everything Cowork needs to pick up cleanly: the working model, the major decisions, current repo state, accumulated conventions, and the next action.

## When to update this file

Update this file when:

- A major decision changes the next-session focus (e.g., a phase pivot, a feature scope change)
- HEAD hashes change significantly enough that an old kickoff would point at stale state
- The working model evolves (e.g., new roles, new conventions, changes to DIVISION_OF_LABOR.md)
- Accumulated conventions (from agent reports, drift fixes, etc.) need to land somewhere the next session sees them

The update is done via a Cowork-generated agent prompt at the end of the session (as part of the normal wrap-up routine). The new agent prompt rewrites this file's "Current kickoff prompt" section and prepends a History entry.

## Current kickoff prompt

State: end of session 2026-05-23. cob-flow-app at HEAD `b6c6790` (CP6 + Auto COB demo seed + FR capstone fix + full end-of-session cleanup pass). cob-auto-claim at HEAD `1e570c1` (unchanged since 2026-05-21).

---

BEGIN PROMPT

I'm starting a new Cowork session for the COB Flow project. You are Cowork — the senior technical PM described in `cob-flow-app/DIVISION_OF_LABOR.md`. Both repos are accessible: cob-flow-app (the Next.js app) and cob-auto-claim (planning/docs).

Read these documents in this order before responding:

1. `cob-flow-app/DIVISION_OF_LABOR.md` — three-party working model. You do not directly write to or commit in the repos; all repo changes flow through prompts you generate for the Claude Code agents to execute.
2. `cob-flow-app/CLAUDE.md` — locked stack (Next.js 15, React 19, TS strict, Tailwind, shadcn, Supabase + Drizzle, Vercel), four-role model (Analyst/Supervisor/Manager/Admin), canPerform contract, audit log shape, critical guardrails (NO_FAULT_STATES empty, Job Levels ≠ Tiers, COB ≠ CoC, Customer not Tenant in UI), and the "Accumulated conventions" section that lists post-CP4 patterns the agents must follow.
3. `cob-auto-claim/CLAUDE.md` — what cob-auto-claim contains (planning, strategy, GTM, external reference material) and the single-source-of-truth split with cob-flow-app.
4. `cob-flow-app/docs/COB_Flow_Handoff.md` — full project context (§§1–10) and the NextJS conversion + CM build phase log (§11). Refreshed end of session 2026-05-23 to reflect the CM build scope pivot.
5. `cob-flow-app/docs/superpowers/specs/CONTENT_MANAGER_SPEC.md` — locked Content Manager spec (commit `532dd85`, with end-of-session corrections at §3 image_path and §7 route map). At minimum read §3 (schema), §7 (route map), §8 (editors), §9 (oversight model), §10 (audit events), §12 (bootstrap checklist).
6. `cob-flow-app/docs/superpowers/plans/CONTENT_MANAGER_IMPLEMENTATION_PLAN.md` — execution plan covering CP1–CP11. Read CP7 in full plus the CP roadmap context. Route paths in CP4 step 1 reflect the actual flattened layout (post end-of-session 2026-05-23 correction).
7. `cob-flow-app/docs/COB_Flow_Cowork_Kickoff.md` — this file. The History section is your record of accumulated session decisions.
8. `cob-flow-app/content/courses/auto-cob-wisconsin/README.md` and `conventions.md` — the Auto COB course scaffolding the Content Manager will ingest in CP11.

After reading, ack scope in one paragraph confirming you understand:

- The three-party working model. Jim is architect/SME; Cowork generates prompts and never edits repos directly; Claude Code agents in VS Code execute prompts, one per repo. cob-flow-app agent owns its repo; cob-auto-claim agent owns its repo.
- Current state: cob-flow-app at HEAD `b6c6790`, cob-auto-claim at HEAD `1e570c1`. CM spec locked at `532dd85` (with end-of-session corrections). Implementation plan authored. CP1–CP6 shipped:
    - CP1 (foundations): deps installed, src/features/content-manager/ scaffolded, AuditEvent.category extended with 'LEARNING', AuthorityBands extended with letterOverride and templatePublication
    - CP2 (db): all CM Drizzle tables, RLS policies, helper functions, recommended indexes; tenants.features JSONB and teams.manager_id added
    - CP3 (plumbing): src/lib/db/client.ts session-context wrapper for RLS; content-assets Supabase Storage bucket
    - CP4 (admin authoring routes): /admin/content/* with sequence/course/module CRUD; post-CP4 refinements landed Learning Path rename, cascade archive, Admin-only hard delete for archived content, status filter on catalog
    - CP5 (slide editor, commit d2543c2): three-pane editor, citation helper bar (9 buttons), synchronous PDF import ≤50 pages via pdf-to-img, image upload via service-role server client
    - CP6 (quiz editor, commits f242d77 → a2d4207): MC + FR modes, pass_threshold input (MC) vs static "Completion-based" label (FR), optimistic concurrency via updated_at + DELETE+INSERT for child rows, flat WorkingQuestion state pattern for polymorphic editing, course-quizzes route net-new, Course Quizzes section on course detail
    - Side-quest demo seed (commits a433e77 + 5f02182): Auto COB demo at scripts/seed-content-manager-demo.ts — 1 LP / 4 courses / 12 modules / 36 lessons / 16 quizzes / 48 questions. Idempotent + `--reset` flag (npm run db:seed:cm / db:seed:cm:reset). Courses 1 and 3 capstones are MC; Courses 2 and 4 are FR with model answers and rubrics.
    - End-of-session cleanup pass (commits ceeb38e → b6c6790): slide image storage refactored to persist bucket-path + sign at render time with 1-hour expiration (eliminates the 1-year signed URL expiry concern); SQL Admin demo user name corrected (S. Patel → A. Donnelly in seed migration 0004, with migration 0005 fixing the already-applied DB row); spec §7 + plan CP4/CP5/CP6 route paths corrected to reflect actual flattened layout (no /edit/ subroutes; modules top-level not nested under courses; quiz/new/ removed since quizzes are created inline); spec §3 slide JSONB updated to image_path; CLAUDE.md updated with the render-time signing convention and the full accumulated-conventions catalog.
- Accumulated conventions are now consolidated in CLAUDE.md's "Accumulated conventions" section. Reference that as the single source of truth for the post-CP4 patterns Cowork must enforce when drafting agent prompts.
- What's parked:
    - cob-auto-claim hasn't moved since 2026-05-21. The repo holds planning, GTM, reference PDFs, case-law scans; no edits queued.
    - Auto COB Wisconsin course chapter authoring is deferred until the CM is fully live (post-CP9), then ingested via CP11. Chapter 1 scaffolding files are committed; Chapters 2–12 not yet drafted. The seed dataset's lesson body content is plausible filler, NOT canonical curriculum — to be replaced at CP11.
    - Minor drift to sweep at some future cleanup pass: spec §7 mentions a `sequences/` list route within /admin/content/ that doesn't exist as a separate page (the list is served by /admin/content/page.tsx via the three-tab catalog); 4 orphan quiz_questions from CP6 E2E test residue (48 in LP vs 52 in DB); drizzle migration 0003 numbering gap + drizzle/meta out of sync with on-disk migrations (likely benign; worth a `supabase db diff` check sometime).
- Next move: CP7 — Management authoring routes mirror + tenant feature flag gate. The implementation plan's CP7 section is authoritative. Scope:
    - Mirror the /admin/content/* route tree at /management/content/*, scoped to content_type='customer' AND session tenant_id
    - Role gate to MANAGER + SUPERVISOR with equal CRUD rights (spec §7 — no publish-approval workflow yet)
    - Tenant feature flag layout gate (`tenant.features.content_manager`) at /learn/* and /management/content/*; /admin/content/* is NOT flag-gated
    - Conditional sidebar nav for "Learning" and "Learning Content" items based on the feature flag
    - Seed `tenants.features = { content_manager: true }` for all three demo tenants
    - Component reuse: the SlideEditor (CP5) and QuizEditor (CP6) work unchanged; only the role gate and content_type scope change
    - Tests + full verification gate including manual smoke in npm run dev with at least one Manager and one Supervisor demo account

Propose the CP7 agent prompt as your first paste-target after the ack. Single fenced code block, 4-space indentation inside for any code samples, self-contained for an agent that hasn't seen this conversation. Reference: CONTENT_MANAGER_SPEC.md §3/§4/§7 (RLS scope chain), the implementation plan's CP7 section verbatim, the existing /admin/content/* patterns to mirror (src/app/(app)/admin/content/), the conventions catalog in CLAUDE.md, and the existing components (SlideEditor at src/features/content-manager/components/slide-editor.tsx, QuizEditor at src/features/content-manager/components/quiz-editor.tsx).

Don't propose work beyond CP7. CP8 (learner surface), CP9 (completion wiring), CP10 (async PDF + oversight surface), CP11 (course ingestion) come in subsequent sessions.

END PROMPT

---

## History

- 2026-05-23: Session shipped CP5 (slide editor, commit d2543c2), CP6 (quiz editor, commits f242d77 → a2d4207), Auto COB demo seed script side quest (commits a433e77 + 5f02182), and full end-of-session cleanup pass (commits ceeb38e → b6c6790). Cleanup pass included: slide image storage refactored to bucket-path + render-time signing (closes the 1-year signed URL expiry concern); SQL Admin demo user reconciled to A. Donnelly across seed migration + already-applied DB row; spec §7 and plan CP4/CP5/CP6 route paths corrected to match actual flattened layout (no /edit/ subroutes; modules top-level; quiz/new/ removed); spec §3 slide JSONB updated to image_path; CLAUDE.md absorbed full accumulated-conventions catalog as new section; handoff doc §11 phase log brought current with the CM build scope pivot. Memorialized conventions across the session: 1-hour render-time signing for slide images, optimistic concurrency via updated_at + DELETE+INSERT, flat WorkingQuestion state for polymorphic editors, A. Donnelly canonical Admin demo user, E2E auth sync barrier convention, label-rename grep discipline, full verification gate non-negotiable, follow-the-spec-literally on type/shape directives, end-of-CP audit pass for spec/plan drift. CP5 was single-commit (deviation from plan); CP6 honored four-commit pattern; cleanup pass was multi-commit per sub-task. cob-flow-app: 035d662 → b6c6790. cob-auto-claim unchanged at 1e570c1.
- 2026-05-21: Initial creation. Captures the end-of-session state after the Content Manager scope decision, the working-model clarification, and the DIVISION_OF_LABOR.md commits to both repos.
