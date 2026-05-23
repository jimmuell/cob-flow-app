# COB Flow — Project Handoff

**Last updated:** 2026-05-23 (Content Manager build CP1–CP6 shipped; original Phase C deferred pending CM completion)
**Purpose:** Bring a new session (human or AI) up to speed on the COB Flow project with everything needed to continue without re-discovering context.

> If you only read one thing: this is a pre-revenue SaaS effort by Jim Mueller (Brookfield, WI) to automate healthcare COB primacy determination, auto med-pay/PIP recovery, intake/triage, and recovery correspondence. Wisconsin is the pilot state. The product is positioned as **decision-support** (analyst signs every determination in v1). A working single-file HTML prototype demonstrates the full analyst workflow plus the four-role management/admin model, customer claim feeds, case state lifecycle, and the late-arrival approval flow. **A Next.js conversion handoff (`COB_Flow_NextJS_Conversion_Handoff.md`) is now packaged and ready to pass to Claude Code** — locked stack: Next.js 15 / TypeScript / Tailwind / shadcn/ui / Supabase (auth + DB) / Drizzle / Vercel / GitHub repo `cob-flow-app`. **No customer interviews have happened yet** — that's still GTM Phase 1 and runs in parallel with engineering. The SPD Review Template and Onboarding Playbook remain the front-door instruments for customer discovery.

---

## 0. Required first actions for a new session — do these before responding to Jim

**Do not ask Jim what to work on until you have completed steps 1–5 below.** A cold session that starts asking questions before reading context will frustrate him and waste turns. Jim expects you to arrive context-loaded.

1. **Mount / confirm the working directory.** The project folder is `/Users/jameslmueller/Documents/Claude/Projects/COB Auto Claims/`. If you're in Cowork and the folder isn't already mounted, call `request_cowork_directory` with that path right away. Do not proceed until you can `Read` files in this folder.
2. **Read this entire handoff doc** (`COB_Flow_Handoff.md`). All ten sections, not just the executive snapshot.
3. **Read memory.** Open `MEMORY.md` in the memory directory and read every file it links: `user_role.md`, `project_cob_auto.md`, `project_wisconsin_pilot.md`, `project_authority_model.md`. If memory is not reachable from your surface (Cowork cannot write memory; sometimes cannot read it either — see §3), note that and continue. Don't get stuck on it.
4. **Inventory the project folder.** Confirm the files listed in §2 are present. If anything in §2 is missing or a newer version exists (e.g., `COB_Flow_Product_Spec_v0.8.docx`), flag it.
5. **Skim the canonical specs and the conversion handoff.** Open `COB_Flow_Product_Spec_v0.7.docx` (read at minimum the Table of Contents and §§ 11.2, 14, 15), `COB_Flow_Dashboard_Spec_v0.1.docx` (read at minimum §§ 4, 5, 7, 8), and `COB_Flow_NextJS_Conversion_Handoff.md` (the conversion brief for Claude Code — read the executive header, §5 stack, §6 architectural principles, §11 ingest architecture, and §17 open decisions). These tell you the current state of the role/authority model, the ingest architecture, and what's locked vs. open for the build.
6. **Only then greet Jim.** A good opening is a one-paragraph "here's where we are and here are the live threads" — proving you actually loaded context — followed by a single question about what he wants to work on. Don't recite the handoff back at him; demonstrate it.

If anything in steps 1–5 fails (folder won't mount, files missing, memory unreachable), tell Jim what failed in plain language and ask him to help — don't silently work around it.

---

## 1. Executive snapshot

| | |
|---|---|
| **Product** | COB Flow — decision-support SaaS for healthcare coordination of benefits, auto med-pay/PIP recovery, and post-payment subrogation |
| **Founder** | Jim Mueller — healthcare subrogation SME |
| **Location** | Brookfield, WI (ZIP 53045) |
| **Pilot state** | Wisconsin (tort state with made-whole doctrine; **not** no-fault) |
| **Current phase** | Phase 0 — Foundation (per GTM Roadmap). No customer interviews yet. Engineering scope pivoted mid-conversion: the Content Manager (learning/authority module) was prioritized over original Phase C (read-only workspaces). CP1–CP6 shipped; CP7 next. Original Phase C–H of the Next.js conversion are deferred pending CM completion (post-CP11). See §11. |
| **Positioning** | Decision-support / analyst assist. Engine recommends, analyst signs. Graduation to autonomous determination is Phase 3 of the product roadmap. |
| **Working prototype** | `COB_Flow_MVP.html` — single-file React/Babel app, runs in any browser. Demonstrates landing/sign-in, analyst workflow, Management workspace (Supervisor + Manager), Admin workspace (with Customer Feeds + ingest event audit filter), case-state lifecycle pills, manual case-grouping, and the LATE_ARRIVAL_TO_CLOSED_CASE approval flow |
| **Conversion handoff** | `COB_Flow_NextJS_Conversion_Handoff.md` (v0.3) — the brief for Claude Code. Locked stack (Next.js 15, TypeScript strict, Tailwind, shadcn/ui, Supabase, Drizzle, Vercel, GitHub `cob-flow-app`). Includes ingest architecture (§11), helper TypeScript signatures, env-var list, pre-flight checklist, README skeleton |
| **Strategic wedge** | CAQH COB Smart owns upstream eligibility-level commercial COB; COB Flow does the downstream recovery work CAQH explicitly excludes (auto/PIP, ERISA preemption, MSP edge cases, lien negotiation). **Wis. Admin. Code § Ins 3.40(18) is the regulatory authority for the recovery workflow** — the rule explicitly authorizes a complying plan to advance benefits and pursue subrogation against a noncomplying plan (auto carriers are carved out as "traditional automobile fault contracts"). |
| **Role model** | Four roles: Analyst, Supervisor, Manager, Admin. Two workspaces gated by role: **Management** (Supervisor + Manager — people and operations) and **Admin** (Admin only — system, security, integrations). All roles share the analyst workflow surfaces. |
| **Dev environment** | Project folder lives in Jim's VS Code workspace at `/Users/jameslmueller/Documents/Claude/Projects/COB Auto Claims/`. **Cowork** is the planning/spec/discovery surface (where this doc, the spec, the prototype, and the GTM artifacts are authored). **Claude Code** will be the dev surface when the project moves from spec → app build. See §8 for practical implications. |

---

## 2. Project file inventory

All files live in `/Users/jameslmueller/Documents/Claude/Projects/COB Auto Claims/`.

| File | Role | Read first when… |
|---|---|---|
| `COB_Flow_Handoff.md` (this file) | Handoff context for new sessions | Always — start here |
| `COB_Flow_NextJS_Conversion_Handoff.md` | **Conversion brief for Claude Code** (v0.3). The single document handed to Claude Code when the project moves prototype → real Next.js app. Locks the tech stack (Next.js 15 / Supabase / Vercel / Drizzle / GitHub `cob-flow-app`), the architecture seams (canPerform helper, append-only audit log, tenant context), the data model (Claim/Case/Recovery separation), the ingest architecture (§11), and the build phases (§15). Includes helper TypeScript signatures, env vars, pre-flight checklist, and README skeleton in Appendices (§20). | Any conversion / build / architecture discussion |
| `COB_Flow_Product_Spec_v0.7.docx` | Master product spec & architecture. Canonical for: scope, deployment modes, engine rules, data model, integrations, compliance, liability framing, authority/approval model, roadmap, open questions, references. v0.7 reconciles §11.2 (Roles table, intro, §11.2.6 guardrail, §13.2 Phase 2 framing) and the glossary to the canonical four-role model, drops Senior Analyst as a role (it's now a Job Level), adds a Role vs. Job Level note after the Roles table and a new Job Level glossary entry, and adds three §14 deferred-design entries (AI document parsing lifecycle, Send-to-Work-Comp routing, closed-file archival). | Any discussion about scope, architecture, or roadmap |
| `COB_Flow_Dashboard_Spec_v0.1.docx` | Technical companion to the spec. Documents the four-role model, two-workspace architecture (Management vs Admin), Job Levels with authority bands, per-analyst overrides, file-level authority elevation, approval queue types, audit architecture, and implementation issues for the roadmap. Sets up the implementation plan. | Any discussion about the dashboard, roles, authority model, or implementation planning |
| `COB_Flow_WI_Workflow_v1.0.docx` | Canonical 9-phase analyst workflow for Wisconsin auto-related COB claims. Source of truth for what the platform must support across the claim lifecycle. Includes Wisconsin legal anchors (made-whole, comparative negligence, common-fund, statutes). | Any discussion about analyst workflow or claim lifecycle |
| `COB_Flow_GTM_Roadmap.docx` | 6-phase go-to-market plan, Phase 0 through commercialization. Each phase has goal, duration, owner, deliverable, decision gate, activities. | Any discussion about timing, sequencing, customer development |
| `COB_Flow_Target_List_53045.xlsx` | Phase 0 target list anchored on Brookfield. 32 organizations across carriers, TPAs, hospital RCM, self-funded employers, law firms (for attorney scoping). Status tracker + outreach log + summary dashboard. | Any discussion about who to approach first |
| `COB_Flow_SPD_Review_Template.docx` | One-page Word doc for marking up a prospect's SPD/EOC during Phase 1 discovery. Captures plan type (fully-insured vs. ERISA), COB language, subrogation provisions, recovery legal handling model, red flags, and tailored interview questions. Front-door instrument for discovery interviews. | Phase 1 customer discovery prep |
| `COB_Flow_Onboarding_Playbook_v0.1.docx` | Two-part doc: internal phase-by-phase playbook + customer-facing implementation guide. Covers all three deployment modes (carrier in-house, vendor/TPA, independent vendor service) across 7 phases from pre-contract through ongoing operations. | Sales/contracting/implementation conversations |
| `COB_Flow_Auto_COB_Syllabus.docx` | 12-module learning syllabus for someone with general health-insurance knowledge moving into Auto COB. Sequential modules, learning objectives, estimated hours, references to specific project artifacts. | Onboarding a new analyst or briefing a non-SME |
| `COB_Flow_Demand_Letter_Template.docx` | Fillable letter template with `{{merge_field}}` placeholders, used by the document service in production. Cites Wis. Admin. Code § Ins 3.40(18) as recovery authority in WI matters. | Discussions about letter generation |
| `COB_Flow_MVP.html` | The working prototype. Single HTML file. Open directly in any browser. | When you need to demo or change the actual product |
| `Wisconsin Legislature_ Ins 3.40(11)(a).pdf` | Saved PDF of the full Wis. Admin. Code § Ins 3.40 text (subs (3)(i) through (19) plus Appendix A model COB provision). The COB rule the engine implements. | Engine compliance checks, citation verification |
| `archive/IMG_1366.jpeg`, `IMG_1368.jpeg`–`IMG_1371.jpeg` (5 files) | Original textbook scans on healthcare subrogation case law (Buckley, McGurl, PM Group Life, Catholic Diocese of Biloxi, Great-West v. Knudson). Archived. **IMG_1367 is genuinely missing content** (not a numbering skip): would have held the Buckley v. Allstate resolution and the McGurl transition. The five cases themselves are recoverable from citation if needed. | Reference only, rarely needed |

**Note:** v0.1–v0.7 of the Product Spec are superseded. **v0.8 is canonical** (Wisconsin pilot · ingest architecture). Prior versions (v0.5, v0.6, v0.7) may still be physically present in the folder if Finder permissions blocked deletion; ignore them.

---

## 3. Persistent memory inventory

Memory files live at `/Users/jameslmueller/Library/Application Support/Claude/local-agent-mode-sessions/.../spaces/.../memory/`. The index is `MEMORY.md`. Read these on session start.

**Write access (added 2026-05-18):** memory is writable from **Claude Code** (auto-memory exposed via system prompt). **Cowork sessions cannot write memory files** — Cowork can stage content for memory but Jim must paste it into Claude Code to persist. If a Cowork session needs the memory directory mounted to read it, request the folder via `request_cowork_directory` (not always possible — the directory lives under Application Support and may be application-internal).

| Memory | What it captures |
|---|---|
| `user_role.md` | Jim is healthcare subrogation SME; building COB Flow SaaS; multi-tenant target |
| `project_cob_auto.md` | Project overview, MVP scope, reference material location |
| `project_wisconsin_pilot.md` | Wisconsin chosen 2026-05-16; tort + made-whole; engine needs WI-specific module |
| `project_authority_model.md` | Original Phase 2 supervisor/manager dashboards + per-analyst authority limits guidance. **Now substantially built in the prototype** — see Dashboard Spec for current architecture. The three MVP design rules (append-only audit log, centralized auth helper, single roles helper) remain valid. |

---

## 4. Current capabilities (the prototype)

`COB_Flow_MVP.html` is a single-file React/Babel app. Open it in any browser to interact. The prototype now demonstrates all four MVP workflows PLUS the full four-role management/admin model in skeleton form.

**Sidebar nav (role-conditional, max 6 items):**
- Dashboard
- Claims & Triage
- COB Analyzer
- Recovery Tracker
- **Management** — expandable parent, children Overview + Team. Visible to Supervisor + Manager.
- **Admin** — flat item leading to a 6-tab page. Visible to Admin only.

**Top bar:** Customer dropdown (3 customer modes), **four-state role toggle** (Analyst → Supervisor → Manager → Admin → Analyst). Each toggle position changes the sidebar and what actions are available. Bounces to Dashboard when toggling to a role that can't see the current view.

**Three customer modes (deployment posture):**
- Lakeshore Health Plan (WI) — Carrier in-house
- Badger State Subrogation Services — Vendor / TPA
- COB Flow Recovery — Brookfield — Independent vendor service

**Mock team (7 users seeded into USERS):**
- *Analysts* (with Job Levels): J. Mueller (Senior), K. Nguyen / M. Lindgren / D. Pemberton (Mid), A. Whitfield (Junior)
- *Supervisors*: T. Ramos (Team A), S. Bergstrom (Team B)
- *Manager*: D. Berger
- *Admin*: A. Donnelly

**Two teams:** Team A (T. Ramos supervises J. Mueller, K. Nguyen, A. Whitfield), Team B (S. Bergstrom supervises M. Lindgren, D. Pemberton). Both roll up to D. Berger.

**Four Job Levels** (renamed from "Tiers" in this session): Trainee / Junior / Mid / Senior. Each carries default authority bands (settlement, demand, lien reduction %, closure). Manager owns level definitions; Supervisor proposes individual analyst placements; Manager approves.

**Claim Detail page (opens when you click a claim from Intake):** seven tabs — Overview, Contacts, Activity, Communications, Correspondence, Records, Tasks. Plus, for Supervisor + Manager only, a **File-level authority row** between the header and the tabs showing any active grant or offering a "Grant file authority" button.

**10 sample claims (c001–c010)** exercise every decision-engine rule plus every branch of the Wisconsin overlay. c004 is the richest (Hailey Brennan WI auto fully-insured + auto med-pay + 20% claimant fault + $95k settlement). c004 also has a seeded active file-level authority grant for K. Nguyen.

**Decision engine rules** (full list and rationale in Spec Section 6, source in HTML around line 50): Medicaid payer-of-last-resort → TFL/Medicare → mandatory no-fault PIP (dormant in WI build) → auto med-pay optional → MSP working aged / disability / ESRD → small-employer exception → employee-over-dependent → active-over-retiree → QMCSO → birthday rule → separated-parents → ERISA self-funded preemption → longer/shorter fallback.

**Wisconsin overlay** (Spec Section 6.2): made-whole doctrine flag (with ERISA-preemption variant), comparative-negligence calculator (Wis. Stat. § 895.045 with 51% bar), common-fund pro-rata attorney-fee share, statutory framework references (Wis. Admin. Code § Ins 3.40, Wis. Stat. § 632.32, § 631.43).

**Communications module** (Claim Detail tab): three channels — Email, Fax, Text (SMS collapsed into single Text channel; the underlying provider handles SMS/RCS/MMS routing). Preview button between Save draft and Send opens a channel-specific recipient-view modal.

**Correspondence module** (Claim Detail tab): 9 letter templates across Tier 1 (Demand, COB Questionnaire, Medical Records Request, Lien Notice, Member Recovery Notice) and Tier 2 (Follow-up Demand, Subrogation Hold, Lien Reduction Offer, Settlement Acknowledgment). Status lifecycle: Draft → Sent → Acknowledged → Superseded → Closed. Locks once sent; Supervisor can request override-edit with justification.

**COB Analyzer Determination panel:** Save determination → toast confirmation. Send to Recovery → confirmation dialog with file summary. Override → justification dialog with audit logging.

**Management → Overview** (Supervisor + Manager) — 6 tabs: Approvals, QC, KPIs, Job Levels, Users, Roadmap. Operational queues and configuration.

**Management → Team** (Supervisor + Manager, role-conditional content):
- *As Supervisor:* list of their team's analysts as cards with workload, level, signals, authority. Card click drills into per-analyst detail page.
- *As Manager:* list of their supervisors as cards with team rollup, supervisor performance signals. Card click drills into per-supervisor detail page.

**Management → Team → [Person]** drill-down (separate page with breadcrumb back): role-appropriate depth. Analyst page shows workload, level health signals, effective authority, pending requests, QC samples, file authority grants, and coaching notes. Supervisor page (Manager view) shows their team roster, supervisor performance, and coaching notes.

**Admin** (Admin only) — 6 tabs: System, Customer, Integrations, Security, Audit, Roadmap. System administration: settings, security policy, PHI audit summary, integration health, compliance attestations.

**Admin → Integrations → Customer claim feeds** (added 2026-05-19): tabular list of inbound feeds per customer with transport, format, last-received time, today's record count, 7-day error count, and status pill. Click any row for a detail dialog with config + recent ingest history. Stub "Add feed" wizard. See conversion handoff §11.5.

**Admin → Audit** (added 2026-05-19): category filter (All / Ingest / Config / Workflow) above the events table. Ingest events include CLAIM_FEED_SYNC, INGEST_PARSE_ERROR, INGEST_LATE_ARRIVAL.

**Approval queue types** (Management → Overview → Approvals): 10 types — LIEN_REDUCTION, DEMAND_APPROVAL, OVERRIDE_LOCK, CLOSURE_BELOW_DEMAND, SETTLEMENT_ACCEPTANCE (analyst→supervisor); LEVEL_CHANGE_REQUEST, AUTHORITY_OVERRIDE, FILE_AUTHORITY_GRANT, USER_ACTIVATION (supervisor→manager); **LATE_ARRIVAL_TO_CLOSED_CASE** (system→supervisor, added 2026-05-19 — fires when ingest attaches a claim to a CLOSED case; supervisor decides supplemental demand, reopen, or write-off). See Dashboard Spec §5 plus conversion handoff §11.4.

**Case state lifecycle** (added 2026-05-19): every seeded claim now carries `caseState` — GATHERING / READY / ASSIGNED / IN_RECOVERY / CLOSED / REOPENED. Pill renders in the Claim Detail header. c006 is CLOSED with a queued late-arrival; c008 is REOPENED demonstrating a successful late-arrival decision; c003 is GATHERING. See conversion handoff §11.1.

**Manual case-grouping** (added 2026-05-19): "Attach claim" button on Claim Detail Overview tab opens a dialog listing other claims for the same member (where seeded). Pass 1 manual; Phase 2 automates via member + diagnosis-cluster + window heuristics.

**Landing / sign-in + Account dropdown** (added 2026-05-19): mock-auth landing page at app entry; sign-in form + demo-account picker. Top-bar account menu with sign-out. Role toggle preserved as separate demo affordance.

**Coaching notes** — role-private, separate from audit log. Notes about analysts visible to Supervisor + Manager. Notes about supervisors visible to Manager only. Encourages candid coaching observations.

---

## 5. Strategic decisions on the record

These are settled. Don't relitigate without a specific reason from new information.

- **Pilot state = Wisconsin.** Tort/at-fault state with made-whole doctrine (Rimes, Vogt, Petta). Engine has explicit Wisconsin module; mandatory no-fault PIP rule is dormant in the Wisconsin-only build.
- **Wis. Admin. Code § Ins 3.40 is the regulatory anchor.** Engine ordering rules track § Ins 3.40(11)(b); **§ Ins 3.40(18) (coordination with noncomplying plans) is the regulatory authority for COB Flow's recovery workflow.** Demand Letter Template cites it.
- **Decision-support positioning, not automation.** v1 ships with analyst sign-off required for every determination. Path to autonomous determination is Phase 3 of the product roadmap.
- **AI document parsing = Option B.** LLM extracts candidate fields from plan docs/EOBs; analyst confirms each before any field flows into the engine.
- **9-phase analyst workflow is canonical.** Defined in `COB_Flow_WI_Workflow_v1.0.docx`. Phases 4, 7, 9 are Phase 2 scope; Phases 1, 2, 3, 5, 6, 8 are MVP (Phase 8 partial).
- **Four-role model (settled this session).** Analyst, Supervisor, Manager, Admin. Two workspaces gated by role: Management (Supervisor + Manager) and Admin (Admin only). Role ≠ Job Level. A user can hold multiple roles in production (Manager + Admin overlap common at small customers).
- **Job Levels, not Tiers.** Renamed this session per Jim's preference. Four levels (Trainee / Junior / Mid / Senior) for the Analyst role only. Carries default authority bands. Supervisors don't have a job level — they have a supervisor ceiling instead.
- **Three layers of authority configuration (settled this session):** (1) job-level defaults — Manager sets; (2) per-analyst overrides — Supervisor proposes, Manager approves; (3) per-file authority elevation — Supervisor grants within ceiling, above ceiling routes to Manager.
- **Coaching notes are separate from the audit log.** Role-private visibility, not part of formal audit trail. Encourages candid coaching.
- **Terminology.** "Customer" everywhere in UI (not "Tenant"). "Correspondence" for formal workflow letters. "Records" for inbound supporting evidence. "Communications" for ad-hoc freeform messages (email/fax/text — no SMS as separate channel). **"Coordination of Benefits" (COB) is distinct from "Coordination of Care" (CoC) — never use the unqualified "coordination."**
- **Role-based lock model.** Analyst can edit drafts; locked-once-sent letters require supervisor override-edit with justification. Audit log captures both names.
- **Architectural guardrails (Spec §11.2.6) remain in force.** Append-only audit log with justification column from day one. Centralized "can this user do X?" helper. Single roles helper.
- **PI attorneys are the primary recovery counterparty, not a customer segment.** Phase 3 customer expansion lists reimbursement-side law firms — different segment from claimant-side PI attorneys.
- **Phase 3 customer expansion = hospital RCM + reimbursement-side law firms.** Not Phase 1.
- **Tech stack for the Next.js conversion is locked** (2026-05-19, see conversion handoff §5): Next.js 15 / React 19 / TypeScript strict / Tailwind / shadcn/ui / lucide-react / React Hook Form + Zod / TanStack Table / Supabase (auth + Postgres + storage) / Drizzle ORM / Vercel host / GitHub repo `cob-flow-app` / Sentry / Vercel Analytics / GitHub Actions CI / Vitest + Playwright tests.
- **Tenant model = scenario (C):** single-tenant deployment in pass 1 for COB Flow Recovery (Jim's company); multi-tenant architecture preserved underneath so a second customer can be onboarded later without rewrites. Long-term product shape (pure SaaS, single-company, or grow-into-SaaS) deliberately kept open.
- **Cost cliffs of record:** Pass-1 (free tiers, dummy data): ~$0/mo. First shared deploy (still dummy data, Vercel Pro + Supabase Pro + Sentry free): ~$45/mo. **First real PHI: ~$3.5–4k/mo** (Vercel Enterprise BAA + Supabase HIPAA addon) — gates the move from prototype to pilot.
- **Data model splits Claim, Case, and Recovery** (added with conversion handoff §10): `Claim` = one feed line item; `Case` = bundle for one accident (state lifecycle, recovery, primacy); `Recovery` = the pursuit. Prototype's "Claim Detail" becomes "Case Detail" in the converted app.
- **Customer claims feed via SFTP / X12 / API** (conversion handoff §11): Admin owns the pipe (feed health, errors, config); analyst/supervisor own the content (case grouping, judgment); manager owns operational metrics. Late-arriving claims auto-attach to GATHERING/READY/ASSIGNED/IN_RECOVERY cases; late arrivals to CLOSED cases route to Supervisor approval (LATE_ARRIVAL_TO_CLOSED_CASE). Format / schema / cadence are deliberately deferred to Phase 1 customer discovery.
- **Cowork is the technical-manager surface; Claude Code is the primary dev agent.** Cowork plans, specs, and authors handoffs. Claude Code executes against the conversion handoff. Lovable / v0 / Replit Agent are optional auxiliary tools for narrow jobs only. See conversion handoff §18 "Tooling map".

---

## 6. Open questions / pending decisions

From Product Spec Section 14 — still open:

- **Pilot tenant identity.** Common Ground Healthcare Cooperative (Brookfield — HQ still to verify; verified 2026-05-17 as the marketplace QHP issuer behind CareSource WI plans), Diversified Benefit Services (Hartland), ProHealth Care (Waukesha), or another?
- **Independent-vendor mode scope.** Does COB Flow handle billing/collections, or only identification + correspondence with payment flowing through Jim's back office?
- **White-label depth.** Full rebrand (logo + domain + colors) for vendor tenants, or co-branded acceptable for v1?
- **Pricing model.** Pure contingency (20–30%), hybrid, or tiered dollar bands?
- **LLM provider.** Anthropic Claude vs. OpenAI vs. on-prem. BAA availability and enterprise procurement constraints will drive this.
- **Wisconsin OCI registration.** Required for independent-vendor mode? Phase 0 attorney scoping call answers this.
- **Engine v1.1 gaps to address.** Continuation coverage rule (§ Ins 3.40(11)(b)5m), 24-hour bridge on length-of-coverage measurement (§ Ins 3.40(11)(b)6m), and COB cap math (§ Ins 3.40(12)) are documented gaps.

Added in v0.7 — deferred design items (not Jim-decisions, but unfinished design work):

- **AI document parsing lifecycle** (Spec §14, AI document parsing bullet). One-time per-plan extraction at customer onboarding; shared plan-language library across analysts; re-extraction triggered only on plan change; immutable per-file snapshot of language used at decision time for legal preservation; plan-language library versioned with date/time stamps. Pair follow-up: expand Onboarding Playbook Phase 3 ¶53 to incorporate this lifecycle in Playbook v0.2.
- **Send-to-Work-Comp routing** (Spec §14, Send-to-Work-Comp bullet). Prototype surface implemented at Claim Detail Overview tab (Task 19 of the 2026-05-18 session). Deferred: downstream destination (customer WC carrier vs. WC TPA vs. carrier intake re-routing), post-redirect claim state, and data exchange with the receiving WC system.
- **Closed-file archival** (Spec §14, archival bullet). Legal retention requirement on file close (whether by COB completion, withdrawal, or WC redirect). Retention period TBD via Phase 0 attorney scoping. Archive state defined (read-only, indexed, every read is an audit event). Deferred: access scope (file owner vs. Manager vs. Admin), reopen path (analyst-initiated, litigation hold, audit response), and whether the prototype needs a Restore-from-archive surface.

From Dashboard Spec §8 — implementation-layer open questions added this session:

- **Authority enforcement language** (silent queue vs. explicit "requires approval" message). Affects analyst UX.
- **Approval routing strictness** (hard-route to team supervisor vs. any-supervisor claim).
- **File-authority enforcement** (block above-ceiling actions, or grant + queue?).
- **Coaching notes retention** (HIPAA 7-year vs. customer-configured vs. on-departure).
- **KPI definitions** (who at the customer signs off on leakage estimate formula and override-rate denominator).
- **Out-of-office delegation** (per-supervisor opt-in vs. customer-policy auto-escalation).
- **Multi-tenant Admin** (vendor-mode Admin sees multiple customers — single-Admin-multi-customer UI vs. context switching).

---

## 7. GTM Roadmap status

Per `COB_Flow_GTM_Roadmap.docx`:

- **Phase 0 (Foundation, weeks 0–2):** Stand up business entity, target interview list, advisor outreach, OCI scoping. **Status: not started.**
- **Phase 1 (Customer Discovery, weeks 2–8):** 15–25 structured interviews. **Status: not started.** This is the next major workstream.
- **Phase 2 (ROI Validation & Pricing, weeks 6–10):** **Not started.**
- **Phases 3–6:** Future. Onboarding Playbook v0.1 covers Phase 5 (Pilot) and onward.

**No customer has been contacted.** No engineering money has been spent. The prototype, the spec (v0.6), the workflow doc, the GTM roadmap, the target list, the SPD review template, the onboarding playbook, the syllabus, the dashboard spec, and this handoff are all that exist.

---

## 8. Technical operating notes

- **Dev environment (added 2026-05-18).** Project files live in Jim's **VS Code** workspace at `/Users/jameslmueller/Documents/Claude/Projects/COB Auto Claims/`. Two AI surfaces touch this project: **Cowork** (this surface) handles spec authoring, prototype tweaks, GTM artifacts, and customer-discovery prep. **Claude Code** will be engaged when the project moves from spec → app build — it owns repo init, dev server, test runs, real backend code, package installs, and memory writes (see §3). The prototype `COB_Flow_MVP.html` is editable from either surface. New sessions: if you're in Cowork and the project folder isn't mounted, request it via `request_cowork_directory` with the path above.
- **The prototype is a single HTML file** (`COB_Flow_MVP.html`) using React 18 + Babel-standalone via CDN. JSX is compiled at runtime. A runtime error blanks the page silently.
- **Babel parser sanity check.** Run `outputs/transform.js` (recreate per session — it's not in the project folder). Compiles the script block and invokes the root component tree with shimmed React.
- **Admin sub-component check.** `outputs/transform_admin.js` (also session-specific) invokes AdminOverview, AdminTeam, AdminTeamPerson, AdminApprovals, AdminQC, AdminLevelHealth, AdminKPIs, AdminJobLevels, AdminTeams, AdminUsers, AdminCustomer, AdminAudit, AdminRoadmap under SUPERVISOR and MANAGER roles. A separate `sysadmin_check.js` invokes SysAdminView, SysAdminSystem, SysAdminIntegrations, SysAdminSecurity, SysAdminRoadmap under ADMIN role.
- **Engine `NO_FAULT_STATES` is intentionally empty.** Wisconsin-only build; no-fault PIP rule never fires for WI.
- **View routing prefixes:** `admin_*` (Management workspace — historical naming, kept for stability) and `sys_*` (Admin workspace — added 2026-05-17). Toggle bounce logic handles both: `view.startsWith("admin")` vs. `view.startsWith("sys")`.
- **Component naming:** `AdminOverview` is the Management/Overview tabbed dashboard (despite the name — historical). `AdminTeam` + `AdminTeamPerson` are the Management/Team surfaces. `SysAdminView` and its sub-components (`SysAdminSystem`, `SysAdminIntegrations`, `SysAdminSecurity`, `SysAdminRoadmap`) are the Admin workspace.
- **Communications channels.** Three buttons (Email, Fax, Text). SMS is not a separate channel.
- **Preview pattern.** `CommunicationsPreview` and `CorrespondenceViewer` render channel-specific previews. Reuse for new preview surfaces.
- **Dialog body prop.** `Dialog` accepts a `body` JSX prop for rendering rich content above fields.
- **Mock data** lives near the top of the script section: `USERS`, `TEAMS`, `JOB_LEVELS`, `LEVEL_HEALTH_SIGNALS`, `TEAM_WORKLOAD`, `APPROVAL_QUEUE`, `QC_SAMPLES`, `SYSTEM_EVENTS`, `CUSTOMER_KPIS`, `FILE_AUTHORITY_GRANTS`, `SUPERVISOR_CEILING`, `SUPERVISOR_PERFORMANCE`, `COACHING_NOTES`, `ROLE_LABELS`.
- **Filesystem occasionally deadlocks** on the mounted project folder. Workaround: Read/Write tools rather than bash `cp`/`cat`.
- **Web egress** is allowlisted for some domains and blocked for others. For client-rendered pages (e.g., legis.wisconsin.gov), WebFetch returns empty — ask user to save as PDF.
- **Docx generation** uses `docx-js` (`npm install docx`). Validation: `python3 /sessions/.../mnt/.claude/skills/docx/scripts/office/validate.py`.

---

## 9. Guardrails — things to be careful about

- **Don't `replace_all` across the whole file without scoping.** Historical failure mode.
- **Always run the Babel transform check before declaring the prototype works.** Run BOTH `transform.js` (root tree) and `transform_admin.js` + `sysadmin_check.js` (admin sub-components) after any prototype edit.
- **Don't add LETTER channel to Communications.** Formal letters live in Correspondence; Communications is ad-hoc only.
- **Don't suggest engineering work before customer discovery.** GTM Phase 1 (interviews) precedes Phase 4 (build). The prototype is the demo asset for discovery.
- **Don't claim things are "production-ready" or "HIPAA compliant."** The prototype is a skeleton.
- **Don't make up case law, statutes, or carrier facts.** WI anchors (Ins 3.40, § 632.32, § 631.43, § 895.045, Rimes, Vogt, Petta) are verified. Full Ins 3.40 PDF in the project folder.
- **Don't add real organization names to the prototype as tenants.** Tenants are generic.
- **Don't confuse "Coordination of Care" with "Coordination of Benefits."** Different domains, same name.
- **Don't confuse the Admin role with the Management workspace.** Management is for Supervisor + Manager (people work). Admin is for the Admin role (system work). They are explicitly different sidebar items with different content. The old "Admin" parent was renamed to "Management" in 2026-05-17 to make this clear.
- **Don't rename "Job Levels" back to "Tiers."** Jim explicitly preferred Job Levels (2026-05-17). "Tier" is reserved for the LETTER_TYPES correspondence priority system (Tier 1 / Tier 2 letter categories) — different concept, distinct context.
- **WebFetch caveat for client-rendered pages.** Empty content fetch → ask user for PDF.

---

## 10. Likely next workstreams (after you've onboarded per §0)

Once you've completed the required first actions in §0, the live threads Jim is most likely to pick up, in rough order of probability:

- **CP7 of the Content Manager build.** Mirror /admin/content/* at /management/content/* scoped to customer content + session tenant, role-gated to MANAGER+SUPERVISOR. Add the tenant feature flag layout gate for /learn/* and /management/content/*. Implementation plan at `docs/superpowers/plans/CONTENT_MANAGER_IMPLEMENTATION_PLAN.md` CP7 is authoritative. Refreshed kickoff doc at `docs/COB_Flow_Cowork_Kickoff.md` is the next-session entry point.
- **(Optional) Iterate on spec v0.8.** `COB_Flow_Product_Spec_v0.8.docx` now has the §10.2 Customer claim feeds subsection in spec-appropriate prose. Future minor revisions can expand the standards-based integrations table once Phase 1 customer discovery surfaces real format choices.
- **GTM Phase 1 prep.** Interview script + week-by-week schedule + synthesis template. SPD Review Template is the front door. The conversion handoff §11.6 lists the seven ingest-format questions to bake into the script.
- **Customer discovery activity.** Drafting outreach emails, scripting interviews against the target list.
- **Continued prototype refinement.** Tier-2 prototype items the conversion handoff treats as deferrable: late-arrival reopen flow detail, feed-health indicator on Dashboard. Jim may also surface new surfaces as Claude Code's output starts to come back.
- **New strategic question or document upload for review.**

**Optional prototype health check.** If Jim mentions the prototype isn't rendering, or you've just made non-trivial edits to `COB_Flow_MVP.html`, rebuild `outputs/transform.js`, `outputs/transform_admin.js`, and `outputs/sysadmin_check.js` from the patterns in this handoff and run all three. Don't run this preemptively — it's not part of the onboarding loop.

**One general rule.** Jim is the SME. He thinks in domain terms (COB primacy, made-whole doctrine, recovery cycle, lien reduction, payer hierarchy, ERISA preemption). Frame your responses in that language. He'll push back on vague or generic suggestions, and he expects substantive recommendations, not just option enumeration. He also asks for plans before execution on big work, so don't barrel into building without checking in when the scope is non-trivial.

---

---

## 11. Next.js conversion — phase log

### Phase B — Auth + App Shell (complete, 2026-05-20)

Built against COB_Flow_Product_Spec_v0.8.docx (§3, §6, §8–11, §14) and COB_Flow_NextJS_Conversion_Handoff.md v0.3.

All 14 acceptance criteria (spec §17) pass; criterion 14 (`not-found.tsx` end-to-end trigger) is scoped to visual inspection only in Phase B — E2E trigger coverage deferred to Phase D per the criterion text.

**What's working:** Sign-in page (email form + nine-user demo-account picker), cookie-backed mock session (`getCurrentUser` / `getActiveTenant`), auth middleware with inverted matcher, four-state role toggle (Server Action + `revalidatePath`), tenant dropdown, sticky top bar with shadcn DropdownMenu account menu, role-gated sidebar nav (two-level hierarchy, pathname-aware active state, mobile SidebarSheet overlay), boundary pages (`error.tsx`, `not-found.tsx`, `global-error.tsx`). 26 unit tests across 6 files + 8 Playwright E2E tests. Build, typecheck, and lint clean. Remote: `github.com/jimmuell/cob-flow-app`, branch `main` at `79cc377`.

**Mobile polish (post-CP4, 2026-05-20):** Compact top bar at `< sm` viewports (commits `9b314fb`, `597b275`, `79cc377`). Wordmark "COB Flow" renders inline next to the CF logo at `text-sm`; "Wisconsin pilot · MVP" sub-line hidden on mobile. Tenant dropdown truncates via `max-w-[100px]`. Role toggle chip hidden on mobile; role switching available via "Switch role (demo)" item in account menu (visible at all sizes for consistent menu structure). Sidebar sheet backdrop deepened to `bg-black/40` for clearer dismiss affordance.

**What Phase C inherits:**

- **`canPerform()` stub seam.** Every state-changing action routes through `lib/authority/can-perform.ts`, which returns `{ decision: "allow" }` for any signed-in user in pass 1. Phase C renders all controls enabled; pass-2 authority limits (Phase E) fill in the logic without changing call-site shape.
- **Role-gated nav pattern.** `lib/authority/roles.ts` is the single gating file. `isSupervisor()`, `isManager()`, `isAdmin()` are the only comparison points. Phase C routes are all-role visible; Management and Admin sidebar items are already gated.
- **`AppShellContext`.** `sidebarOpen` / `setSidebarOpen` is the only shared client state. Phase C pages live inside `<main>` and require no shell changes.
- **`revalidatePath` flow (no `router.refresh()`).** Role toggle and tenant switch use Server Actions + `revalidatePath('/', 'layout')`. Phase C mutations should follow the same pattern.

**Two spec deviations documented (spec §2 and §13):**
1. Middleware excludes `/signin` from matcher; authenticated redirect handled in the sign-in page itself (T9-fix — Rule 2 never fires in middleware).
2. Sign-out uses `onSelect + useTransition + direct action call` instead of `<DropdownMenuItem asChild><form>` (Radix `asChild` forwards its handler to the `<form>` element, not its submit button).

### Phase B.1 — Scaffolding recovery (2026-05-21)

**Root cause:** Phase A scaffolding (`.gitignore`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `src/lib/` boundaries, `supabase/`, and source spec docs) was never committed. Phase B work was built on top of an uncommitted Phase A working tree. The repo at `79cc377` contained only Phase B source files; a fresh clone would not build and `src/lib/mock/` was unavailable to Phase C.

**Recovery commits (all pushed in one batch, 2026-05-21):**
- `c1a052e` — `.gitignore` (first, so generated artifacts stay untracked: `playwright-report/`, `test-results/`, `.claude/settings.local.json`)
- `f1bfbc6` — Next.js build config + project root files (`next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `README.md`, `public/`, `src/app/favicon.ico`)
- `f7edd57` — Phase A lib scaffolding: `lib/types/`, `lib/mock/` (18 fixture files), `lib/authority/` (`canPerform` + `roles.ts`), `lib/engine/` (primacy, wi-overlay, triage, `NO_FAULT_STATES`), `lib/audit/`, `lib/utils/`, `lib/ingest/`
- `95539be` — Supabase local config (`supabase/config.toml`)
- `4a05f83` — Source spec + prototype docs (`COB_Flow_MVP.html`, `COB_Flow_NextJS_Conversion_Handoff.md`, `COB_Flow_Product_Spec_v0.8.docx`, `COB_Flow_Dashboard_Spec_v0.1.docx`, `COB_Flow_WI_Workflow_v1.0.docx`)

**Post-recovery state:** Repo now builds from a clean clone. `src/lib/mock/` is available. All Phase B patterns and tests remain intact.

### Phase C — Read-only workspaces (planned, not started)

**Scope (per Conversion Handoff §15):** three read-only workspaces — Dashboard, Claims & Triage list, Recovery Tracker. Phase C does NOT include the COB Analyzer, Claim Detail tabs, Management workspace, or Admin workspace — those are Phases D / E / F respectively. Resist the temptation to bundle them.

**Schema-timing decision (locked 2026-05-20):** Pass 1 stays fully fixture-based. Phase C reads from typed TypeScript fixtures in `src/lib/mock/` (TENANTS, USERS, SAMPLE_CLAIMS, SAMPLE_RECOVERIES, etc. — already ported from the prototype in Phase A). Drizzle ORM is wired up and `src/lib/db/schema.ts` is a placeholder; no tables are defined. Local Supabase Postgres is running but unused. Real schema design is deferred to pass 2, after GTM Phase 1 customer discovery surfaces what real claim feeds look like and before the HIPAA cost cliff (~$3.5–4k/mo) is crossed. Option 2 (wire one table end-to-end) and Option 3 (full schema design, no data migration) were both considered and deferred.

**Phase C working pattern:** Read-only means render-from-fixtures, no edit forms, no mutations. Lean on Server Components for fixture reads (no client-side data fetching needed). Each workspace is an independent route under `(app)/`; no shell changes required. TanStack Table powers the Claims & Triage list per spec §7. Mobile responsiveness preserved.

---

### Phase C — Deferred (2026-05-22)

Mid-planning, scope pivoted: the Content Manager (learning/authority gating module) was prioritized over original Phase C (Dashboard, Claims & Triage list, Recovery Tracker read-only workspaces). Phase C–H of the original Next.js conversion are now deferred pending Content Manager completion (post-CP11). The Section 3 design review for Phase C that was parked at end of session 2026-05-21 remains parked; it will resume after CM CP11 ships.

Rationale for the pivot: the CM enables authority unlocks driven by course completion (per spec §6), which feeds canPerform() in Phase 2. Building the CM first means Phase 2 authority work can land cleanly on top of real unlock data rather than synthetic fixtures.

### Content Manager build — phase log (2026-05-22 → 2026-05-23)

Spec: `docs/superpowers/specs/CONTENT_MANAGER_SPEC.md` (locked at commit 532dd85, with end-of-session corrections at §3 and §7).
Plan: `docs/superpowers/plans/CONTENT_MANAGER_IMPLEMENTATION_PLAN.md` (CP1–CP11 roadmap).
Working session decisions live in `docs/COB_Flow_Cowork_Kickoff.md` History section.

- **CP1 — Foundations.** Dependencies installed; `src/features/content-manager/` scaffolded; `AuditEvent.category` extended with `'LEARNING'`; `AuthorityBands` extended with `letterOverride` and `templatePublication`.
- **CP2 — Database.** All CM Drizzle tables (course_sequences, courses, modules, lessons, quizzes, quiz_questions, course_enrollments, lesson_completions, quiz_attempts, course_completions, authority_unlocks, platform_authority_ceilings, learning_notifications, pdf_import_jobs); RLS policies; helper functions; recommended indexes. `tenants.features` JSONB and `teams.manager_id` added.
- **CP3 — Plumbing.** Session-context Drizzle client wrapper at `src/lib/db/client.ts` (sets `app.current_user_id` / `tenant_id` / `role` per query for RLS). `content-assets` Supabase Storage bucket with RLS mirroring content scope.
- **CP4 — Admin authoring routes.** `/admin/content/*` with sequence/course/module CRUD. Post-CP4 refinements: Sequence→Learning Path rename, cascade archive, Admin-only hard delete for archived content, status filter on the catalog.
- **CP5 — Slide editor (commit `d2543c2`).** Three-pane editor (rail / main / preview), citation helper bar (9 buttons), synchronous PDF import ≤50 pages via `pdf-to-img`, image upload via service-role Supabase client.
- **CP6 — Quiz editor (commits `f242d77` → `a2d4207`).** MC + FR modes; pass_threshold input (MC) vs static "Completion-based" label (FR); optimistic concurrency via `updated_at` WHERE clause + DELETE+INSERT for child rows; flat WorkingQuestion state pattern for polymorphic editing; net-new course-quizzes route; Course Quizzes section on course detail.
- **Side-quest demo seed (commits `a433e77` + `5f02182`).** `scripts/seed-content-manager-demo.ts` — 1 Learning Path / 4 Courses / 12 Modules / 36 Lessons / 16 Quizzes / 48 Questions, all `content_type='platform'`. Idempotent + `--reset` flag. Courses 1+3 capstones MC; Courses 2+4 capstones FR with model answers and rubrics. Auto COB Wisconsin curriculum used as the demo path.
- **End-of-session cleanup pass (commits `ceeb38e` → `b6c6790`).** Slide image storage refactored to bucket-path + render-time signing (1-hour expiry; eliminates the 1-year signed URL expiry concern from CP5). SQL Admin demo user reconciled (S. Patel → A. Donnelly in seed migration 0004 + migration 0005 fix for already-applied row). Spec §7 + plan CP4/CP5/CP6 route paths corrected to actual flattened layout (no /edit/ subroutes; modules at top-level not nested under courses; quiz/new/ removed). Spec §3 slide JSONB updated to image_path. CLAUDE.md updated with render-time signing convention and full accumulated-conventions catalog.
- **CP7 — Management authoring routes mirror (next).** Mirror `/admin/content/*` at `/management/content/*` scoped to `content_type='customer'` and session tenant. Role-gated to MANAGER+SUPERVISOR with equal CRUD rights. Tenant feature flag layout gate for `/learn/*` and `/management/content/*` (not `/admin/content/*`).
- **CP8–CP11.** Learner surface (CP8); completion wiring with unlock grants + notifications + audit events (CP9); async PDF import + oversight surface (CP10); Auto COB Wisconsin course ingestion from `content/courses/auto-cob-wisconsin/` (CP11).

---

*End of handoff document. If anything in here is stale or wrong, please update it — the value of this document scales with how current it stays.*
