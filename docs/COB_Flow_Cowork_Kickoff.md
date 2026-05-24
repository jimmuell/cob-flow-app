# 📋 COB Flow — Cowork Session Kickoff

This file holds the prompt to paste into a new Cowork session to pick up where the last session left off. It is the authoritative handoff mechanism between Cowork sessions.

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

State: end of session 2026-05-24. cob-flow-app at HEAD `83405ea` (docs-only pivot: CM build paused snapshot + Phase C design review working doc + handoff updated; see History). cob-auto-claim at HEAD `1e570c1` (unchanged since 2026-05-21).

---

BEGIN PROMPT

I'm starting a new Cowork session for the COB Flow project. You are Cowork — the senior technical PM described in `cob-flow-app/DIVISION_OF_LABOR.md`. Both repos are accessible: cob-flow-app (the Next.js app) and cob-auto-claim (planning/docs).

Read these documents in this order before responding:

1. `cob-flow-app/DIVISION_OF_LABOR.md` — three-party working model. You do not directly write to or commit in the repos; all repo changes flow through prompts you generate for the Claude Code agents to execute.
2. `cob-flow-app/CLAUDE.md` — locked stack (Next.js 15, React 19, TS strict, Tailwind, shadcn, Supabase + Drizzle, Vercel), four-role model (Analyst/Supervisor/Manager/Admin), canPerform contract, audit log shape, critical guardrails (NO_FAULT_STATES empty, Job Levels ≠ Tiers, COB ≠ CoC, Customer not Tenant in UI), and the "Accumulated conventions" section that lists post-CP4 patterns the agents must follow.
3. `cob-auto-claim/CLAUDE.md` — what cob-auto-claim contains (planning, strategy, GTM, external reference material) and the single-source-of-truth split with cob-flow-app.
4. `cob-flow-app/docs/COB_Flow_Handoff.md` — full project context (§§1–10) and the Next.js conversion + CM build phase log (§11). Updated end of session 2026-05-24 to reflect the CM pause and Phase C resumption.
5. `cob-flow-app/docs/COB_Flow_CM_Build_Paused.md` — CM build paused snapshot: what shipped CP1–CP6, what's live in the running app, CP7–CP11 owed, known parked drift items, thaw checklist.
6. `cob-flow-app/docs/COB_Flow_Phase_C_Design_Review_In_Progress.md` — Phase C design review working doc. §1 (Scope & Routes) is CLOSED with 6 decisions. §2 (Data Layer) is DRAFTED, pending Jim's review. §3 and §4 not yet drafted.
7. `cob-flow-app/docs/COB_Flow_Cowork_Kickoff.md` — this file. The History section is your record of accumulated session decisions.

After reading, ack scope in one paragraph confirming you understand:

- The three-party working model. Jim is architect/SME; Cowork generates prompts and never edits repos directly; Claude Code agents in VS Code execute prompts, one per repo. cob-flow-app agent owns its repo; cob-auto-claim agent owns its repo.
- Current state: cob-flow-app at HEAD `83405ea`, cob-auto-claim at HEAD `1e570c1`. CM spec locked at `532dd85` (with end-of-session corrections). CM build paused after CP6 + demo seed + cleanup pass (`b6c6790`). Phase C design review in progress: §1 closed, §2 drafted.
- Phase C §1 decisions (6, all closed): (1) row-click on Claims & Triage list navigates to `/claims/[claimId]` Phase D placeholder showing claim ID, patient name, and 7 future tabs; (2) empty-state component (centered icon + headline + subhead, no CTA) when a fixture group is empty; (3) tenant-switch E2E required for all three Phase C pages — non-negotiable; (4) "Claims & Triage" workspace label and `/claims` URL preserved in Phase C, rename deferred to Phase D; (5) KPI tiles filter `CUSTOMER_KPIS` by `getActiveTenant().id`; (6) Dashboard quick-links render all prototype tiles, with Phase D+ surfaces visually disabled or pill-tagged with their target phase.
- Phase C §2 open design questions (5, all with defaults): (1) helpers in `src/lib/data/` (not feature-scoped); (2) 4/3/3 fixture distribution with c004 on Lakeshore; (3) KPI null → em-dashes, page shape preserved (not full-page empty state); (4) Vitest unit-test coverage for all four helper behaviors (yes); (5) `getActiveTenant()` failure → trust the middleware invariant, don't add a defensive redirect.
- What's parked: CM CP7–CP11 (thaw after Phase C ships per the `docs/COB_Flow_CM_Build_Paused.md` thaw checklist); cob-auto-claim (planning/GTM/reference, no edits queued); Auto COB Wisconsin chapter authoring (deferred until CM fully live, CP11).

Propose reviewing §2 with Jim as the first move — walk through each of the five open design questions one at a time, confirm or override the defaults, then close §2. Do not draft §3 until §2 is closed. After §2 closes, draft §3 (Component Patterns). After §3 closes, draft §4 (Testing Strategy). After all four sections close, produce the consolidated spec commit prompt for the cob-flow-app agent.

END PROMPT

---

## History

- 2026-05-24: Session pivoted from CM CP7 back to Phase C. Landed four docs-only commits on main: (1) `docs/COB_Flow_CM_Build_Paused.md` — CM build pause snapshot (what shipped, what's live, CP7–CP11 owed, thaw checklist); (2) `docs/COB_Flow_Phase_C_Design_Review_In_Progress.md` — Phase C design review working doc (§1 closed with 6 decisions, §2 drafted with `src/lib/data/` helper architecture and 5 open questions); (3) handoff doc updated (last-updated, current-phase cell, §10 next workstreams, §11 restructured with "deferred then resumed" arc and Phase C Resuming section); (4) kickoff doc rewritten to point at Phase C design review §2 review. CM remains paused cleanly at CP6 + demo seed + cleanup pass (`b6c6790`). All CM authoring surfaces stay live in the running app. cob-flow-app: `b6c6790` → `83405ea`. cob-auto-claim unchanged at `1e570c1`.
- 2026-05-23: Session shipped CP5 (slide editor, commit d2543c2), CP6 (quiz editor, commits f242d77 → a2d4207), Auto COB demo seed script side quest (commits a433e77 + 5f02182), and full end-of-session cleanup pass (commits ceeb38e → b6c6790). Cleanup pass included: slide image storage refactored to bucket-path + render-time signing (closes the 1-year signed URL expiry concern); SQL Admin demo user reconciled to A. Donnelly across seed migration + already-applied DB row; spec §7 and plan CP4/CP5/CP6 route paths corrected to match actual flattened layout (no /edit/ subroutes; modules top-level; quiz/new/ removed); spec §3 slide JSONB updated to image_path; CLAUDE.md absorbed full accumulated-conventions catalog as new section; handoff doc §11 phase log brought current with the CM build scope pivot. Memorialized conventions across the session: 1-hour render-time signing for slide images, optimistic concurrency via updated_at + DELETE+INSERT, flat WorkingQuestion state for polymorphic editors, A. Donnelly canonical Admin demo user, E2E auth sync barrier convention, label-rename grep discipline, full verification gate non-negotiable, follow-the-spec-literally on type/shape directives, end-of-CP audit pass for spec/plan drift. CP5 was single-commit (deviation from plan); CP6 honored four-commit pattern; cleanup pass was multi-commit per sub-task. cob-flow-app: 035d662 → b6c6790. cob-auto-claim unchanged at 1e570c1.
- 2026-05-21: Initial creation. Captures the end-of-session state after the Content Manager scope decision, the working-model clarification, and the DIVISION_OF_LABOR.md commits to both repos.
