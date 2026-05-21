# cob-flow-app — Build Documentation

This directory holds the **canonical, build-driving documentation** for the cob-flow-app Next.js application. Anything that drives implementation lives here:

- `COB_Flow_Handoff.md` — phase log, updated as each build phase lands (currently through Phase B.1; Phase C planning in progress)
- `COB_Flow_NextJS_Conversion_Handoff.md` — conversion brief and architectural principles
- `COB_Flow_Product_Spec_v0.8.docx` — current product spec (always exactly one current version here; older versions live in cob-auto-claim/archive/specs/)
- `COB_Flow_Dashboard_Spec_v0.1.docx` — role / authority / audit architecture
- `COB_Flow_WI_Workflow_v1.0.docx` — 9-phase analyst workflow
- `COB_Flow_MVP.html` — authoritative UI reference prototype
- `superpowers/specs/` — per-phase build specifications
- `superpowers/plans/` — per-phase implementation plans

## What does NOT live here

Planning, business, GTM, and external reference material lives in the [cob-auto-claim](https://github.com/jimmuell/cob-auto-claim.git) repository (private). That includes:

- Strategy and GTM docs (App Strategy, GTM Roadmap, Target List, Onboarding Playbook, SPD Review Template, Demand Letter Template)
- External reference (Wisconsin Legislature PDF, COB-TPL Handbook, subrogation textbook scans)
- Historical Product Spec versions (v0.5, v0.6, v0.7)
- Original kickoff prompt artifacts

If you're looking for the strategic or business context behind a feature, that's where to look. If you're implementing a feature, everything you need is here.

## Lifecycle rule

When a new Product Spec version supersedes the current one, the previous version moves to `cob-auto-claim/archive/specs/`. This directory always holds exactly one current version per spec.

## Read order for new engineers

1. **`COB_Flow_NextJS_Conversion_Handoff.md`** — the conversion brief. Locked tech stack (§5), architectural principles (§6), ingest architecture (§11), pass-1 vs Phase 2 scope, open decisions (§17), helper TypeScript signatures and README skeleton in the appendices. **Start here.**
2. **`COB_Flow_Handoff.md`** — session-handoff context. Project background, file inventory, working conventions, guardrails (§9), likely next workstreams (§10). Useful background for anyone new.
3. **`COB_Flow_Product_Spec_v0.8.docx`** — canonical product spec. The source of truth on product behavior. Minimum read: §3 (deployment modes), §6 (decision engine), §8 (system architecture), §9 (data model), §10 (integrations — especially §10.2 customer claim feeds), §11 (compliance + authority model), §14 (open questions), Appendix A glossary.
4. **`COB_Flow_Dashboard_Spec_v0.1.docx`** — technical companion. Role/authority architecture, approval queue types, audit architecture, implementation issues. Read all of §§3–8.
5. **`COB_Flow_WI_Workflow_v1.0.docx`** — the 9-phase analyst workflow. Source of truth for what the app must support across the claim lifecycle.
6. **`COB_Flow_MVP.html`** — the prototype itself. Single file, React 18 + Babel-standalone via CDN, ~5,000 lines. Open in a browser; sign in via the demo-accounts picker. **The authoritative reference for layout, copy, component composition, and interaction behavior.** When the spec and the prototype disagree, ask Jim; do not guess.

## Conflict-resolution rule

If the Conversion Handoff (#1) and the companion docs (#3–#6) disagree:

- **Companion docs win on product behavior** (what the app does).
- **Conversion Handoff wins on engineering structure** (how the app is built).

## Currency

- Product Spec is at v0.8 (Wisconsin pilot · ingest architecture). Earlier versions are archived in cob-auto-claim/archive/specs/.
- Conversion Handoff is at v0.3 (stack locked; ingest in §11; appendices added).
- Prototype HTML is current as of 2026-05-19.
