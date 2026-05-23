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

State: end of session 2026-05-23. cob-flow-app at HEAD `5f02182` (CP6 + Auto COB seed + FR capstone fix). cob-auto-claim at HEAD `1e570c1` (unchanged since 2026-05-21).

---

BEGIN PROMPT

I'm starting a new Cowork session for the COB Flow project. You are Cowork — the senior technical PM described in `cob-flow-app/DIVISION_OF_LABOR.md`. Both repos are accessible: cob-flow-app (the Next.js app) and cob-auto-claim (planning/docs).

Read these documents in this order before responding:

1. `cob-flow-app/DIVISION_OF_LABOR.md` — three-party working model. You do not directly write to or commit in the repos; all repo changes flow through prompts you generate for the Claude Code agents to execute.
2. `cob-flow-app/CLAUDE.md` — locked stack (Next.js 15, React 19, TS strict, Tailwind, shadcn, Supabase + Drizzle, Vercel), four-role model (Analyst/Supervisor/Manager/Admin), canPerform contract, audit log shape, critical guardrails (NO_FAULT_STATES empty, Job Levels ≠ Tiers, COB ≠ CoC, Customer not Tenant in UI).
3. `cob-auto-claim/CLAUDE.md` — what cob-auto-claim contains (planning, strategy, GTM, external reference material) and the single-source-of-truth split with cob-flow-app.
4. `cob-flow-app/docs/superpowers/specs/CONTENT_MANAGER_SPEC.md` — locked Content Manager spec (commit `532dd85`). At minimum read §3 (schema), §7 (route map), §8 (editors), §9 (oversight model), §10 (audit events), §12 (bootstrap checklist).
5. `cob-flow-app/docs/superpowers/plans/CONTENT_MANAGER_IMPLEMENTATION_PLAN.md` — execution plan covering CP1–CP11. Read CP7 in full plus the CP roadmap context to understand done-vs-pending.
6. `cob-flow-app/docs/COB_Flow_Cowork_Kickoff.md` — this file. The History section is your record of accumulated session decisions.
7. `cob-flow-app/content/courses/auto-cob-wisconsin/README.md` and `conventions.md` — the Auto COB course scaffolding the Content Manager will ingest in CP11.

After reading, ack scope in one paragraph confirming you understand:

- The three-party working model. Jim is architect/SME; Cowork generates prompts and never edits repos directly; Claude Code agents in VS Code execute prompts, one per repo. cob-flow-app agent owns its repo; cob-auto-claim agent owns its repo.
- Current state: cob-flow-app at HEAD `5f02182`, cob-auto-claim at HEAD `1e570c1`. CM spec locked at `532dd85`. Implementation plan authored. CP1–CP6 shipped:
    - CP1 (foundations): deps installed, src/features/content-manager/ scaffolded, AuditEvent.category extended with 'LEARNING', AuthorityBands extended with letterOverride and templatePublication
    - CP2 (db): all CM Drizzle tables, RLS policies, helper functions, recommended indexes; tenants.features JSONB and teams.manager_id added
    - CP3 (plumbing): src/lib/db/client.ts session-context wrapper for RLS; content-assets Supabase Storage bucket
    - CP4 (admin authoring routes): /admin/content/* with sequence/course/module CRUD; post-CP4 refinements landed Learning Path rename, cascade archive, Admin-only hard delete for archived content, status filter on catalog
    - CP5 (slide editor, commit d2543c2): three-pane editor, citation helper bar (9 buttons), synchronous PDF import ≤50 pages via pdf-to-img, image upload via service-role server client returning 1-year signed URLs
    - CP6 (quiz editor, commits f242d77 → a2d4207): MC + FR modes, pass_threshold input (MC) vs static "Completion-based" label (FR), optimistic concurrency via updated_at + DELETE+INSERT for child rows, flat WorkingQuestion state pattern for polymorphic editing, course-quizzes route net-new, Course Quizzes section on course detail
    - Side-quest (commits a433e77 + `5f02182`): Auto COB demo seed at scripts/seed-content-manager-demo.ts — 1 LP / 4 courses / 12 modules / 36 lessons / 16 quizzes / 48 questions. Idempotent + `--reset` flag (npm run db:seed:cm / db:seed:cm:reset). Courses 1 and 3 capstones are MC; Courses 2 and 4 are FR with model answers and rubrics. Visual walk-through validated full hierarchy.
- Accumulated conventions in force across all future work:
    - Zod schemas live OUTSIDE 'use server' files (Next.js constraint surfaced in CP4 commit bc3f891)
    - Sequential awaits inside withCurrentSession transactions, NOT Promise.all (pg concurrent-query deprecation surfaced in CP4 commit 829b4ab)
    - Sanitize empty-string form inputs to null where columns allow null (CP4 commit a9d8a6d; also caught CP4-era course-form NaN bug during CP6 work)
    - E2E auth sync barrier: every test that signs in via the demo-account picker must `await expect(page).toHaveURL('/dashboard')` (or another deterministic post-auth assertion) before any subsequent page.goto(). No exceptions.
    - Label-rename grep discipline: when you rename any user-facing string, grep tests/ for the old string before considering the rename complete.
    - Optimistic concurrency pattern (CP6): updated_at WHERE clause check returning a CONFLICT error + full DELETE-and-INSERT for child rows. Propagate to other authoring saves (lesson, module, course, sequence) when those code paths are touched.
    - Admin demo user canonical name is "A. Donnelly" (u_ad). NOT "S. Patel". The handoff doc §4 still says "S. Patel" — that's drift to fix in a sweep.
    - Multi-commit per checkpoint, not one mega-commit. The commit pattern in the implementation plan per CP is the target.
    - Full verification gate (typecheck + lint + build + Vitest unit + Playwright E2E + manual smoke in npm run dev) before any push. CP5 skipped the dynamic gate and CP6 caught three test-staleness issues as a result; we are not repeating that.
    - Server-action shape: getCurrentUser → canPerform → schema validation → withCurrentSession block (queries + auditLog.record inside) → revalidatePath → ActionResult.
    - When an agent reads "seed spec said MIX" but defaults all to one type "to avoid blank fields," that's exactly backwards — the spec means fill in the fields, not avoid the type. Follow the spec.
- What's parked:
    - cob-auto-claim hasn't moved since 2026-05-21. The repo holds planning, GTM, reference PDFs, case-law scans; no edits queued.
    - Auto COB Wisconsin course chapter authoring is deferred until the CM is fully live (post-CP9), then ingested via CP11. Chapter 1 scaffolding files are committed; Chapters 2–12 not yet drafted. The seed dataset's lesson body content is plausible filler, NOT canonical curriculum — to be replaced at CP11.
    - Drift to sweep: handoff doc §4 names Admin as "S. Patel"; canonical is "A. Donnelly". Other docs may carry stale Admin-name references; grep when convenient.
    - 1-year signed URL for slide images (CP5 decision) has a 2027 expiry concern. Not blocking; revisit before then.
- Next move: CP7 — Management authoring routes mirror + tenant feature flag gate. The implementation plan's CP7 section is authoritative. Scope:
    - Mirror the /admin/content/* route tree at /management/content/*, scoped to content_type='customer' AND session tenant_id
    - Role gate to MANAGER + SUPERVISOR with equal CRUD rights (spec §7 — no publish-approval workflow yet)
    - Tenant feature flag layout gate (`tenant.features.content_manager`) at /learn/* and /management/content/*; /admin/content/* is NOT flag-gated
    - Conditional sidebar nav for "Learning" and "Learning Content" items based on the feature flag
    - Seed `tenants.features = { content_manager: true }` for all three demo tenants
    - Component reuse: the SlideEditor (CP5) and QuizEditor (CP6) work unchanged; only the role gate and content_type scope change
    - Tests + full verification gate including manual smoke in npm run dev with at least one Manager and one Supervisor demo account

Propose the CP7 agent prompt as your first paste-target after the ack. Single fenced code block, 4-space indentation inside for any code samples, self-contained for an agent that hasn't seen this conversation. Reference: CONTENT_MANAGER_SPEC.md §3/§4/§7 (RLS scope chain), the implementation plan's CP7 section verbatim, the existing /admin/content/* patterns to mirror (src/app/(app)/admin/content/), the accumulated conventions above, and the existing components (SlideEditor at src/features/content-manager/components/slide-editor.tsx, QuizEditor at src/features/content-manager/components/quiz-editor.tsx).

Don't propose work beyond CP7. CP8 (learner surface), CP9 (completion wiring), CP10 (async PDF + oversight surface), CP11 (course ingestion) come in subsequent sessions.

END PROMPT

---

## History

- 2026-05-23: Session shipped CP5 (slide editor, commit d2543c2), CP6 (quiz editor, commits f242d77 → a2d4207), and the Auto COB demo seed script side quest (commits a433e77 + `5f02182`). Memorialized conventions: 1-year signed-URL pattern for image upload, optimistic concurrency via updated_at + DELETE+INSERT, flat WorkingQuestion state for polymorphic editors, "A. Donnelly" canonical Admin demo user (corrects "S. Patel" in handoff doc §4), E2E auth sync barrier convention, label-rename grep discipline, full verification gate non-negotiable, follow-the-spec-literally on type/shape directives. CP5 was single-commit (deviation from plan); CP6 honored four-commit pattern. Seed initially shipped with all four capstones as MC by agent default; corrected mid-session to mixed MC/FR per spec. cob-flow-app: 035d662 → `5f02182`. cob-auto-claim unchanged at 1e570c1.
- 2026-05-21: Initial creation. Captures the end-of-session state after the Content Manager scope decision, the working-model clarification, and the DIVISION_OF_LABOR.md commits to both repos.
