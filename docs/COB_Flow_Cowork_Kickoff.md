# Next Cowork Session — Kickoff Prompt

This file holds the prompt to paste into a new Cowork session in the Claude.ai desktop app to pick up where the last session left off. It is the authoritative handoff mechanism between Cowork sessions.

## How to use

1. Open a new Cowork session in the Claude.ai desktop app with both repos mounted (cob-flow-app and cob-auto-claim).
2. Copy the kickoff prompt below (everything between the `BEGIN PROMPT` and `END PROMPT` markers).
3. Paste into the new Cowork session as the first message.
4. Cowork will read the referenced documents, ack scope and state, and propose the next design-review section.

The kickoff prompt encodes everything Cowork needs to pick up cleanly: the working model, the major decisions, current repo state, and the next action.

## When to update this file

Update this file when:

- A major decision changes the next-session focus (e.g., a phase pivot, a feature scope change)
- HEAD hashes change significantly enough that an old kickoff would point at stale state
- The working model evolves (e.g., new roles, new conventions, changes to DIVISION_OF_LABOR.md)

The update is done via a Cowork-generated agent prompt at the end of the session (as part of the normal wrap-up routine). The new agent prompt rewrites this file's "Current kickoff prompt" section.

## Current kickoff prompt

State: end of session 2026-05-21. Both repos at the HEADs noted inside the prompt.

---

BEGIN PROMPT

I'm starting a new Cowork session for the COB Flow project. You are Cowork — the senior technical PM described in `cob-flow-app/DIVISION_OF_LABOR.md`. Both repos are accessible: cob-flow-app (the Next.js app) and cob-auto-claim (planning/docs).

Read these documents in this order before responding:

1. `cob-flow-app/DIVISION_OF_LABOR.md` — three-party working model. Critical: you do not directly write to or commit in the repos; all repo changes flow through prompts you generate for the Claude Code agents to execute.
2. `cob-flow-app/CLAUDE.md` — locked stack (Next.js 15, React 19, TS strict, Tailwind, shadcn, Supabase + Drizzle, Vercel), four-role model (Analyst/Supervisor/Manager/Admin), canPerform contract, audit log shape, critical guardrails (NO_FAULT_STATES empty, Job Levels ≠ Tiers, COB ≠ CoC, Customer not Tenant in UI).
3. `cob-auto-claim/CLAUDE.md` — what cob-auto-claim contains (planning, strategy, GTM, external reference material) and the single-source-of-truth split with cob-flow-app.
4. `cob-flow-app/docs/COB_Flow_Handoff.md` § 11 — the Next.js conversion phase log. Phase B (auth + app shell) and Phase B.1 (scaffolding recovery) complete. Phase C planning is parked mid-design-review.
5. `cob-flow-app/content/courses/auto-cob-wisconsin/README.md` and `conventions.md` — the Auto COB Wisconsin course scaffolding. Twelve chapters, Chapter 1 templates ready. This is the seed content the Content Manager will serve once built.

After reading, ack scope in one paragraph confirming you understand:

- The three-party working model (Jim is architect/SME; Cowork generates prompts and never edits repos directly; Claude Code agents in VS Code execute prompts, one per repo).
- Current state at end of last session (2026-05-21): cob-flow-app at HEAD `035d662`, cob-auto-claim at HEAD `1e570c1`.
- The major decision from the last session: the Content Manager moved from Phase I (post-pass-1) to active pass-1 build, full scope, in parallel with course authoring. Reference shape: a learning-platform CONTENT_MANAGER_SPEC.md template Jim brought in from another project (lives in the previous Cowork conversation transcript, not committed), adapted for COB Flow's multi-tenant + authority-gating + four-role + free-response-quiz context.
- The course authoring labor model: Cowork drafts curriculum content from source materials (Syllabus, ForwardHealth PDFs, Wisconsin regulation, handbooks, case-law scans, spec docs, MVP prototype); Jim reviews as SME.
- What's parked: Phase C Section 3 review (agent revised; Cowork hasn't reviewed) and Section 4 (acceptance criteria, not started); Auto COB course chapter authoring (deferred to ingest into the CM once schema exists); CM spec authoring (about to begin).

Then propose Section 1 of the Content Manager design review: schema and data model. Cover:

- All tables needed: courses, chapters, lessons (and lesson_slides if slides are separate rows vs. JSONB), quizzes, quiz_questions (or JSONB on quizzes), quiz_attempts, course_enrollments, course_completions, authority_unlocks. Surface the tradeoff between JSONB and relational for slides and questions.
- Drizzle schema shape per table — column types, defaults, foreign keys, indexes.
- Content scoping fields: content_type ('platform' | 'customer'), tenant_id, author_id.
- Tier metadata on questions and content sections.
- Order/sequencing fields (module_order for chapters, slide order, question order).
- RLS policies in SQL with English summaries: platform content public read; customer content tenant-scoped read; admin full CRUD on platform; manager/supervisor CRUD on their tenant's customer content.
- Helper functions needed (is_admin, is_tenant_member, student_is_enrolled_in_course).

Use the section-by-section design review pattern from Phase B — present the design, walk Jim through it section by section, get explicit greenlight before moving to Section 2 (route structure and UI surface).

Don't generate any agent prompts yet — Section 1 is design discussion only. Agent prompts come after all design sections are greenlit and the spec is written to `cob-flow-app/docs/superpowers/specs/`.

END PROMPT

---

## History

- 2026-05-21: Initial creation. Captures the end-of-session state after the Content Manager scope decision, the working-model clarification, and the DIVISION_OF_LABOR.md commits to both repos.
