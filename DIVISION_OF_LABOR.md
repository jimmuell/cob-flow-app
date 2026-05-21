# Division of Labor — COB Flow

This document describes how the three parties working on COB Flow collaborate. It lives identically in both repos (cob-flow-app and cob-auto-claim) so all parties see the same definition.

## The three parties

### Jim — Architect and SME

- Sets project direction and makes the architectural and business calls
- Provides domain expertise (healthcare subrogation, COB, auto med-pay, Wisconsin pilot context)
- Reviews outputs from Cowork and the Claude Code agents
- Pastes Cowork-generated prompts into the appropriate Claude Code agent
- Tells Cowork what's working and what isn't

### Cowork — Senior Technical Project Manager

Runs in the Claude.ai desktop app. The strategic and planning layer.

- Oversees both repositories (cob-flow-app and cob-auto-claim)
- Generates agent prompts based on Jim's input
- Maintains an auto-memory system for context that persists across sessions
- Plans, analyzes, surfaces tradeoffs, asks clarifying questions
- Reads files in both repos; writes only to its own private memory directory and produces planning/handoff content
- **Does NOT directly write to or commit in the repos**
- **Does NOT execute code or git operations**
- Delivers all repo-changing work as agent prompts for Jim to paste into the appropriate Claude Code agent

### Claude Code agents — Execution layer

Two of them, one per repo, running in VS Code terminals.

- `cob-flow-app` agent — handles all cob-flow-app code, content, commits
- `cob-auto-claim` agent — handles all cob-auto-claim docs, planning artifacts, commits
- Each agent is scoped to its own repo and does not directly know what's happening in the other repo (informed only via specific facts Cowork relays through prompts)
- Executes prompts: writes files, runs shell commands, commits, pushes
- Reports results back to Jim, who relays the report to Cowork

## The workflow loop

1. **Jim → Cowork**: tells Cowork what to do (a feature request, a question, a decision to make)
2. **Cowork → Jim**: analyzes, plans, surfaces options, and produces an agent prompt as a single fenced code block when execution is needed
3. **Jim → Agent**: pastes the prompt into the appropriate Claude Code agent (the one in the repo that owns the work)
4. **Agent → Jim**: executes, commits, pushes, and reports back with hashes and verification
5. **Jim → Cowork**: relays the agent's report
6. **Cowork → Memory**: updates memory with new state and decisions; plans the next move

## Boundaries

- Cowork never edits repo files directly. Repo changes always flow through an agent prompt.
- Claude Code agents do not communicate with each other. Cross-repo coordination flows through Cowork via Jim.
- Jim is the only party that interacts with multiple agents directly; Cowork talks to Jim only.
- Cowork maintains its own private auto-memory directory (outside both repos). That memory is for context continuity across Cowork sessions; it is not visible to the Claude Code agents and is not committed to either repo.

## Where things live

- `cob-flow-app/` — the Next.js application. Code, build-driving content (course markdown at `content/courses/`, specs at `docs/`), and eventually the Content Manager's database tables and ingestion code.
- `cob-auto-claim/` — planning, strategy, business documents (GTM, target list, onboarding playbook), external reference material (regulations, handbooks, case-law scans, ForwardHealth training PDFs). Authored once and referenced from elsewhere.
- This DIVISION_OF_LABOR.md — committed identically in both repo roots so all parties see the same authoritative definition.
- Auto-memory (Cowork private) — session-to-session context, decisions, references, handoff state.

## Single source of truth rule

For documents that could live in either repo: build-driving content lives in cob-flow-app; planning, GTM, and external reference material lives in cob-auto-claim. Established 2026-05-21 after catching a drift between two copies of the same handoff doc. See each repo's README for the full mapping.

## Handoff mechanics between Cowork sessions

At the end of every Cowork session, Cowork writes a structured "last session summary" memory entry capturing where we left off, decisions made, what's parked, what's next, and what to read first in the next session. The next Cowork session auto-loads that memory and picks up cleanly without Jim having to re-explain.

## Communication norms

- Cowork delivers paste-target prompts in single fenced code blocks (one paste-target per code block; no nested triple-backticks in prompt content — use 4-space indentation inside)
- Domain language is shared across all parties: COB primacy, made-whole doctrine, ERISA preemption, MSP working aged, payer of last resort, TPL, EOMB, Wisconsin Admin Code § Ins 3.40, comparative negligence (Wis. Stat. § 895.045)
- The word "Cowork" refers to the senior PM layer (this assistant in the Claude.ai desktop app)
- The word "agent" or "Claude Code" refers to the per-repo execution layer
- Domain ambiguity: "coordination" is always qualified (COB = Coordination of Benefits ≠ CoC = Coordination of Care)

## How to verify the parties are in sync

- Cowork's memory and both repos' DIVISION_OF_LABOR.md should agree. If they drift, Cowork updates memory first, then drafts an agent prompt to reconcile the repo copies.
- If an agent receives a prompt that conflicts with its CLAUDE.md guardrails or this document, the agent should flag the conflict back to Jim rather than silently executing.

## Working norms carried forward from current phase of work

- Push to origin/main at end of every checkpoint (not just end of phase). Include the remote HEAD hash in the CP summary.
- Spec to docs/superpowers/specs/, plan to docs/superpowers/plans/, before execution.
- Small focused commits. Eight readable commits per checkpoint beat one giant commit.
- PR-style summaries at end of phase: what landed, decisions made, what's open, what next phase inherits.
- Section-by-section design review for any new feature. Cowork reviews each section; Claude Code does not start the spec write-up until each section is greenlit.
- Cowork drafts course content from source materials; Jim reviews as SME.
