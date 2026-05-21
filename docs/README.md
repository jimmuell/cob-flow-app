# COB Flow — Reference Docs for the Build

These six files are the source of truth for what the Next.js app must do, how it must be structured, and what's deliberately deferred. They are kept here, inside the repo, so Claude Code (or any engineer) can read them in place without depending on external folder access.

## Read in this order

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

- Product Spec is at v0.8 (Wisconsin pilot · ingest architecture). Earlier versions in the source folder are obsolete and not copied here.
- Conversion Handoff is at v0.3 (stack locked; ingest in §11; appendices added).
- Prototype HTML is current as of 2026-05-19.

If these copies fall out of date relative to the masters in `~/Documents/Claude/Projects/COB Auto Claims/`, the masters win — re-sync.
