# COB Flow — Next.js Conversion Handoff

**Audience:** Claude Code agent (or any senior engineer) tasked with converting the COB Flow single-file HTML prototype into a Next.js React application.
**Author:** Jim Mueller (founder, healthcare subrogation SME) — drafted with Cowork.
**Status:** v0.3. Tech stack locked; ingest architecture (§11) and Claim/Case/Recovery model added; appendices added with helper TypeScript signatures, env vars, pre-flight checklist, and README skeleton (§20). Remaining open items are business decisions tied to pilot-tenant identification, not the conversion itself.
**Source of truth for product behavior:** the prototype (`COB_Flow_MVP.html`) plus the companion docs in §3. This handoff is the **conversion brief**, not a product spec.

---

## 1. Purpose

This document tells Claude Code what to build, what stack to build it on, and what "done" looks like for the first conversion pass. The goal is a Next.js application that has functional parity with the current HTML prototype (single-tenant, mock data, role-conditional UI) and an architecture that supports the production direction the project is moving toward (multi-tenant, real auth, real audit, real integrations) without painting that future into a corner.

The first conversion pass is **still a prototype**. It is NOT a production deployment of COB Flow. It does not handle real PHI, real claims, or real recoveries. It replaces the single-file HTML demo with a properly-structured React/Next.js app that we can iterate on, demo from staging URLs, and grow toward production.

If a section of this doc conflicts with the companion docs in §3, **the companion docs win on product behavior** and this doc wins on engineering structure.

---

## 2. Project context (one paragraph)

COB Flow is a pre-revenue healthcare SaaS for coordination of benefits, auto med-pay/PIP recovery, and post-payment subrogation. The pilot state is Wisconsin (tort, made-whole doctrine). The product is positioned as **decision-support** in v1 — the engine recommends, the analyst signs. The role model has four roles (Analyst, Supervisor, Manager, Admin) and the architecture supports three deployment modes (carrier in-house, vendor/TPA, independent vendor service). Analysts also have a Job Level (Trainee/Junior/Mid/Senior) that drives authority defaults. See `COB_Flow_Product_Spec_v0.7.docx` for the full picture.

**Pass-1 deployment shape.** This conversion deploys as a **single-tenant SaaS** for COB Flow Recovery (Jim's company — the operator). All seeded users belong to that single tenant. The in-app "Customer" dropdown in the top bar is a demo affordance that shows what the product looks like across all three deployment-mode postures; the three dropdown options point to **dummy data**, not real customer tenants. The multi-tenant architecture (per-tenant data isolation, tenant-scoped users, row-level security) is preserved underneath so a second real tenant can be onboarded in Phase 2 without rewriting auth, data, or role logic. Where the product evolves from here — pure SaaS sold to multiple customers, a single-company recovery operation, or somewhere in between — is an open business question (see §16); the conversion does not foreclose any of those paths.

---

## 3. Companion documents — read these first

Read these in this order before opening the prototype HTML:

1. **`COB_Flow_Product_Spec_v0.8.docx`** — canonical product spec. Read at minimum: §3 (Target Users & Deployment Modes), §6 (COB Primacy Decision Engine), §8 (System Architecture), §9 (Data Model), §10 (Integrations — especially §10.2 Customer claim feeds added in v0.8), §11 (Compliance, Security & Liability — especially §11.2 Authority & Approval Model), §14 (Open Questions), and Appendix A glossary.
2. **`COB_Flow_Dashboard_Spec_v0.1.docx`** — technical companion. The role/authority architecture, approval queue types, audit architecture, and implementation issues that need real engineering attention live here. Read all of §§3–8.
3. **`COB_Flow_WI_Workflow_v1.0.docx`** — 9-phase analyst workflow. Source of truth for what the app must support across the claim lifecycle.
4. **`COB_Flow_MVP.html`** — the prototype itself. Single file, React 18 + Babel-standalone via CDN, ~5,000 lines. Open in a browser; sign in via the demo-account picker. The prototype is the authoritative reference for layout, copy, component composition, and interaction behavior. **If the spec and the prototype disagree on a behavior, ask Jim — don't guess.**
5. **`COB_Flow_Handoff.md`** — session-handoff context (for humans/AI agents working on the project). Not strictly necessary for the conversion but useful background.

Other docs (`COB_Flow_GTM_Roadmap.docx`, `COB_Flow_Target_List_53045.xlsx`, `COB_Flow_SPD_Review_Template.docx`, `COB_Flow_Onboarding_Playbook_v0.1.docx`, `COB_Flow_Auto_COB_Syllabus.docx`, `COB_Flow_Demand_Letter_Template.docx`) cover go-to-market and discovery; not relevant for the conversion itself.

---

## 4. Conversion scope

**In scope for the first pass:**

- Convert the single-file HTML prototype into a Next.js (App Router) React application with the same surfaces, role-conditional UI, and seeded mock data.
- TypeScript end to end with strict mode.
- Tailwind CSS for styling (the prototype already uses Tailwind via CDN — preserve the existing classes and design tokens).
- Single-tenant deployment for COB Flow Recovery, with the multi-tenant architectural seams preserved (tenant context plumbed through session, tenant_id columns reserved in the data model) so a second tenant can be onboarded later.
- Mock authentication: a landing/sign-in page with email+password form and a demo-accounts picker that signs you in as a seeded user. **No real auth provider in the first pass** — same posture as the prototype. The Supabase Auth boundary is wired but not yet exercised (see §12).
- Mock data: keep the existing seeded data (USERS, TEAMS, JOB_LEVELS, SAMPLE_CLAIMS, etc.) as TypeScript fixtures in `lib/mock/`. Same shape, same values. The Supabase Postgres schema is sketched in pass 1 but not yet populated.
- The three in-app "Customer" dropdown options (Lakeshore Health Plan, Badger State Subrogation Services, COB Flow Recovery — Brookfield) remain as **dummy data** demonstrating the three deployment-mode postures.
- Role-conditional rendering — Analyst, Supervisor, Manager, Admin — driven by the signed-in user's role.
- Four-state demo role toggle in the top bar — preserved as the existing prototype demo affordance.
- All current workspaces (Dashboard, Claims & Triage, COB Analyzer, Recovery Tracker, Management, Admin) and their sub-tabs.
- Claim Detail page with its 7 tabs (Overview, Contacts, Activity, Communications, Correspondence, Records, Tasks).
- The COB primacy decision engine logic preserved as-is in TypeScript form (no behavioral changes).
- Mobile responsiveness preserved (the prototype is already responsive — match it).

**Explicitly out of scope for the first pass:**

- Real authentication / SSO / MFA.
- Real database. All data is in-memory mock; persists only during session.
- Real backend integrations (X12, SFTP, API endpoints to carriers/Medicare/Medicaid). Stubbed UI is preserved but no real calls.
- LLM-powered document parsing. The Option B pipeline (Spec §7) is documented but not implemented in this pass.
- Email/Fax/SMS sending. The Communications and Correspondence modules generate previews and stub Send actions; no real outbound.
- HIPAA-grade audit logging, PHI access logging, anomaly detection. The architecture should *anticipate* these (§6 below) but not implement them yet.
- Profile and Settings pages. Explicitly out of scope per recent decision (small-app, low value).
- Marketing/landing page content. Sign-in splash only.

**Pilot timing context.** This conversion is part of pre-pilot work. Production deployment, real auth, real DB, and real integrations are Phase 2+ of the product roadmap (see Spec §13.2) and Phase 4+ of the GTM roadmap (see `COB_Flow_GTM_Roadmap.docx`). Don't optimize for production scale on the first pass; optimize for clean structure that can absorb Phase 2 work without a rewrite.

---

## 5. Recommended tech stack

| Layer | Choice | Status | Rationale |
|---|---|---|---|
| Framework | Next.js 15 | **Decided** | Current major; App Router stable; Server Components mature. |
| Routing | App Router | **Decided** | Nested layouts fit the multi-workspace structure. |
| Language | TypeScript (strict) | **Decided** | Type safety pays back fast in a domain this rules-heavy. |
| React | React 19 (paired with Next 15) | **Decided** | Default in Next 15. |
| Styling | Tailwind CSS v3+ | **Decided** | Prototype already uses Tailwind. Preserve existing classes. |
| Component library | shadcn/ui | **Decided** | Headless, Tailwind-native, copy-into-repo (no runtime dep). Good fit for the prototype's idiom. |
| Icons | lucide-react | **Decided** | Replace the inline SVG `ICONS` map in the prototype with lucide imports. Same visual style. |
| Forms | React Hook Form + Zod | **Decided** | Standard combo; Zod doubles as runtime validation for mock data. |
| Tables / lists | TanStack Table (React Table v8) | **Decided** | Approval queue, claims list, audit log all need real table mechanics eventually. |
| State (client) | React useState/useReducer for local; Zustand if a cross-tree need emerges | **Decided** | Don't reach for Redux. Most state in this app is page-scoped. |
| State (server) | React Server Components + Server Actions where applicable | **Decided** | First pass has no real backend so this matters mostly for structure. |
| Auth (pass 1) | Mock — same posture as the prototype, wired through `lib/auth/` so pass 2 swaps in Supabase Auth without surgery | **Decided** | Cookie-backed user-id session. Demo-accounts picker on landing page. |
| Auth (pass 2+) | **Supabase Auth** | **Decided** | Email + password to start; SSO providers (Google, Microsoft, SAML) configurable per tenant later. Bundled with the database for a single-vendor solo-founder stack. |
| Database (pass 1) | TypeScript in-memory fixtures in `lib/mock/` | **Decided** | Same shapes as the prototype's seeded data. |
| Database (pass 2+) | **Supabase Postgres + Drizzle ORM** | **Decided** | Supabase *is* Postgres; Drizzle is the ORM on top. Row-level security on `tenant_id` for forward-compatibility with multi-tenant. |
| File / object storage (pass 2+) | Supabase Storage | **Decided** | For uploaded plan documents, EOBs, medical records. Same vendor as auth/DB. |
| Hosting | **Vercel** | **Decided** | Hobby tier (free) for pass 1 with dummy data; Pro tier (~$20/user/month) at first shared deploy. **Move to a BAA-eligible plan or migrate to AWS/Azure when real PHI lands** (Vercel Enterprise; or self-host on AWS with a BAA). See §17. |
| Code hosting | **GitHub** | **Decided** | Repo: `cob-flow-app`. |
| CI/CD | GitHub Actions | **Decided** | Default with Vercel + GitHub combo. |
| Error tracking | **Sentry** | **Decided** | Add at the first shared deploy (i.e., when anyone other than Jim can hit the URL). Free tier is fine to start. |
| Analytics | **Vercel Analytics** | **Decided** | Zero-config given the host choice. Revisit PostHog (self-hosted) if PHI hosting requirements force off-Vercel infrastructure. |
| Testing | Vitest + Playwright | **Decided** | Vitest for unit (engine logic, authority helper); Playwright for end-to-end role-conditional flows. |
| Lint / format | ESLint (next/core-web-vitals) + Prettier | **Decided** | Boilerplate. |
| Node | LTS (22 at time of writing) | **Decided** | Matches Next 15 requirements. |

**Notes on the tech stack:**

- Keep all dependencies minimal in pass 1. Don't introduce a UI library, charting library, date library, etc. unless an actual component in the prototype requires it. The prototype is light; the conversion should stay light.
- Date handling: use `date-fns` only if needed. Most date display in the prototype is ISO-string formatting.
- **Supabase project structure.** One Supabase project for pass 1 (free tier). Tables include the columns the data model in §10 requires, plus `tenant_id` on every domain table (set to the single-tenant ID in pass 1). Row-level security policies are written from day one keyed on `tenant_id`, even though there's only one value — so the second-tenant migration is a configuration change, not a schema migration. Auth uses Supabase's built-in email/password to start.
- **Drizzle + Supabase pattern.** Drizzle's schema lives in `lib/db/schema.ts`. Drizzle Kit generates and runs migrations against the Supabase Postgres connection string. The Supabase client (`@supabase/supabase-js`) is used for auth flows; Drizzle is used for data queries. This is the standard pairing and well-documented.

**Cost picture by stage.** Useful for budgeting:

- Pass 1 (prototype, dummy data, Jim is the only user): Vercel Hobby (free) + Supabase Free + Claude Code via existing subscription = **~$0/month**.
- First shared deploy (still dummy data; collaborators / advisors / pilot prospects can access): Vercel Pro (~$20/mo) + Supabase Pro (~$25/mo) + Sentry free tier = **~$45/month**.
- First real customer with real PHI: Vercel Enterprise (~$3k/mo for BAA) or migrate to AWS; Supabase HIPAA addon (~$599/mo). Total **~$3.5–4k/month minimum**. This is the cliff; Phase 0–2 of the GTM roadmap does not require it.

---

## 6. Architectural principles

These are the structural rules that protect Phase 2 from being a rewrite. They map to Dashboard Spec §11.2.6 and §7.

### 6.1 Centralized authority helper

A single `canPerform(user, action, context)` function lives in `lib/authority/can-perform.ts`. Every state-changing action in the app routes through it. In pass 1 it returns `{ allowed: true }` if the user is signed in. In Phase 2 it consults job-level defaults, per-analyst overrides, active file-level grants, and supervisor ceiling — and returns one of `{ allowed }`, `{ requiresApproval, approverRole, queueType }`, or `{ denied, reason }`. Calling code does not change between pass 1 and Phase 2.

This is the single most important architectural decision. Get it right.

### 6.2 Append-only audit log at the action boundary

Every meaningful state change writes to an `auditLog.record(event)` function with `{ actor, action, target, timestamp, justification?, metadata }`. In pass 1 this writes to an in-memory array exposed in Admin → Audit. In Phase 2 it writes to Postgres with no in-place mutation. The schema includes the `justification` column from day one (nullable in pass 1).

### 6.3 Roles via a single helper

User roles live on the user record. A single `roles.ts` helper exposes `hasRole(user, role)`, `isAnalyst(user)`, `isSupervisor(user)`, `isManager(user)`, `isAdmin(user)`, and `effectiveRoles(user)` (for hybrid users — Manager + Admin combos are real per Dashboard Spec §7.12). All role checks in the UI use these helpers. No string comparisons scattered through components.

### 6.4 Tenant context plumbed through session

Even in pass 1, the signed-in user's "active customer" (tenant) is part of the session, not a free-floating component prop. In Phase 2 this is the chokepoint for row-level security. In pass 1 it's where the mock data filters happen.

### 6.5 Server Components by default

Page-level routes and read-only views are Server Components. Client Components (`"use client"`) only for interactivity: forms, dialogs, role toggle, account menu, anything with `useState`/`useEffect`. This keeps the boundary explicit and lines up with Next.js best practice.

### 6.6 Audit log is NOT coaching notes

Two separate stores. The audit log is formal, append-only, scoped to compliance review. Coaching notes are role-private (`SUP_AND_MGR` or `MGR_ONLY` visibility), live in `lib/mock/coachingNotes.ts`, and never leak into the audit log surface. See Dashboard Spec §6.3.

---

## 7. Prototype inventory (high level)

The prototype has these top-level surfaces. Each maps to a route in §8.

| Prototype surface | What it does | Role visibility |
|---|---|---|
| Landing / sign-in | Mock auth: email+password form + demo-accounts picker. | Unauthenticated. |
| Top bar (in app shell) | Brand, customer dropdown, demo role toggle, account dropdown. | All signed-in users. |
| Sidebar (in app shell) | Role-conditional nav: Dashboard, Claims & Triage, COB Analyzer, Recovery Tracker, Management (Supervisor + Manager), Admin (Admin only). | All signed-in users; items filter by role. |
| Dashboard | KPIs, recent claims, quick links. | All. |
| Claims & Triage | Intake list with triage scoring; click to open Claim Detail. | All. |
| COB Analyzer | Decision-engine output for a selected claim; primacy determination panel; Wisconsin overlay; override flow; Send to Recovery. | All. |
| Recovery Tracker | Recovery stage view; settlement and lien tracking. | All. |
| Management → Overview | 6 tabs: Approvals, QC, KPIs, Job Levels, Users, Roadmap. | Supervisor + Manager. |
| Management → Team | List of analysts (Supervisor view) or list of supervisors (Manager view). Click drills into Team Person detail. | Supervisor + Manager. |
| Management → Team → Person | Per-analyst detail (or per-supervisor detail for Manager): workload, level health signals, effective authority, pending requests, QC samples, file authority grants, coaching notes. | Supervisor + Manager (visibility scoped). |
| Admin | 6 tabs: System, Customer, Integrations, Security, Audit, Roadmap. | Admin only. |
| Claim Detail | 7 tabs (Overview, Contacts, Activity, Communications, Correspondence, Records, Tasks). Plus a file-level authority row visible to Supervisor + Manager. | All; file-authority row hides for Analyst/Admin. |

**Mock data fixtures in the prototype** (`COB_Flow_MVP.html` lines noted for reference):

- `TENANTS` (3 customer modes) — line 499
- `SAMPLE_CLAIMS` (10 claims, c001–c010; c004 is the richest) — line 508
- `LETTER_TYPES` (9 correspondence templates across Tier 1 / Tier 2) — line 737
- `SAMPLE_RECOVERIES` — line 889
- `JOB_LEVELS` (Trainee / Junior / Mid / Senior with default authority bands) — line 906
- `TEAMS` (Team A, Team B) — line 923
- `USERS` (7 seeded users across roles) — line 930
- `SUPERVISOR_CEILING` — line 960
- `FILE_AUTHORITY_GRANTS` (active grant on c004) — line 971
- `COACHING_NOTES` — line 983
- `SUPERVISOR_PERFORMANCE` — line 1013
- `LEVEL_HEALTH_SIGNALS` — line 1021
- `ROLE_LABELS` — line 1034
- `APPROVAL_QUEUE` (9 queue types — see Dashboard Spec §5) — line 1043
- `QC_SAMPLES` — line 1100
- `TEAM_WORKLOAD` — line 1115
- `CUSTOMER_KPIS` — line 1124
- `SYSTEM_EVENTS` — line 1134
- `NO_FAULT_STATES` (intentionally empty for the Wisconsin-only build) — line 50

Preserve the **exact shape and values** of these fixtures in pass 1. Move them to typed fixture files in `lib/mock/` (one file per fixture or grouped logically).

---

## 8. Route map (App Router)

```
app/
├── layout.tsx                       # root layout: <html>, <body>, theme provider, fonts
├── (auth)/
│   ├── layout.tsx                   # unauthenticated layout (no app shell)
│   └── signin/
│       └── page.tsx                 # landing / sign-in splash
├── (app)/
│   ├── layout.tsx                   # authenticated app shell: top bar + sidebar
│   ├── dashboard/
│   │   └── page.tsx
│   ├── claims/
│   │   ├── page.tsx                 # Claims & Triage list
│   │   └── [claimId]/
│   │       ├── layout.tsx           # Claim Detail shell + tab nav + file-authority row
│   │       ├── page.tsx             # default tab → redirect to overview
│   │       ├── overview/page.tsx
│   │       ├── contacts/page.tsx
│   │       ├── activity/page.tsx
│   │       ├── communications/page.tsx
│   │       ├── correspondence/page.tsx
│   │       ├── records/page.tsx
│   │       └── tasks/page.tsx
│   ├── cob/
│   │   └── page.tsx                 # COB Analyzer; ?claimId=… selects context
│   ├── recovery/
│   │   └── page.tsx                 # Recovery Tracker
│   ├── management/
│   │   ├── layout.tsx               # role-gate: Supervisor + Manager
│   │   ├── overview/
│   │   │   ├── layout.tsx           # tab nav
│   │   │   ├── page.tsx             # → approvals
│   │   │   ├── approvals/page.tsx
│   │   │   ├── qc/page.tsx
│   │   │   ├── kpis/page.tsx
│   │   │   ├── job-levels/page.tsx
│   │   │   ├── users/page.tsx
│   │   │   └── roadmap/page.tsx
│   │   └── team/
│   │       ├── page.tsx             # team list (role-conditional)
│   │       └── [personId]/page.tsx  # drill-down
│   └── admin/
│       ├── layout.tsx               # role-gate: Admin
│       ├── page.tsx                 # → system
│       ├── system/page.tsx
│       ├── customer/page.tsx
│       ├── integrations/page.tsx
│       ├── security/page.tsx
│       ├── audit/page.tsx
│       └── roadmap/page.tsx
```

Notes:

- The `(auth)` and `(app)` route groups give us two distinct layouts (sign-in splash vs. app shell) without polluting URLs.
- Claim Detail's 7 tabs are nested routes under `/claims/[claimId]/`. Alternative: keep the prototype's in-page tab state with a query param. Nested routes are cleaner; tab state via query is faster to ship. **Pass 1 default: nested routes.** Justification: each tab can be a Server Component fetching its own slice.
- Management tabs are also nested routes. Same justification.
- The four-state demo role toggle is a Client Component in the app shell layout; it mutates a session cookie that the layout reads to gate the sidebar nav.
- **UI naming — open question for Jim.** Routes above use `/claims/[claimId]`, which matches the prototype's vocabulary. The data-model split in §10 introduces a distinct `Case` entity (the bundle of related claims for one accident). Three reasonable UI choices: (a) keep "Claims & Triage" workspace and "Claim Detail" page labels — analysts already speak this way; the URL `/claims/[id]` then refers to a case ID with claim line items as a tab inside. (b) rename to "Cases & Triage" + `/cases/[caseId]` + "Case Detail" — clearer model alignment; slight retraining for analysts. (c) mix — keep workspace label "Claims & Triage" (analyst-friendly), rename detail page to "Case Detail" and route to `/cases/[caseId]` (model-aligned). **Default in this doc: option (a)** — same URLs and labels as the prototype. Reverse if Jim prefers (b) or (c).

---

## 9. Folder structure (outside `app/`)

```
src/
├── app/                             # (above)
├── components/
│   ├── ui/                          # shadcn/ui-style primitives: button, card, dialog, etc.
│   ├── layout/                      # TopBar, Sidebar, AppShell, AccountMenu
│   ├── claim/                       # Claim-specific composite components
│   ├── management/                  # Management workspace composites
│   ├── admin/                       # Admin workspace composites
│   ├── cob/                         # COB Analyzer composites
│   └── shared/                      # Pill, RoleChip, AuthorityBadge, etc.
├── lib/
│   ├── auth/
│   │   ├── mock.ts                  # session helpers (pass 1)
│   │   └── session.ts               # getCurrentUser, signIn, signOut (boundary stays in Phase 2)
│   ├── authority/
│   │   ├── can-perform.ts           # central authority helper
│   │   ├── job-levels.ts            # default bands per level
│   │   └── file-grants.ts           # per-file authority elevation
│   ├── audit/
│   │   └── log.ts                   # append-only audit record helper
│   ├── engine/
│   │   ├── primacy.ts               # the COB decision engine (extract from prototype)
│   │   ├── wi-overlay.ts            # Wisconsin made-whole, comparative-neg, common-fund
│   │   └── triage.ts                # intake triage scoring
│   ├── mock/
│   │   ├── tenants.ts
│   │   ├── users.ts
│   │   ├── teams.ts
│   │   ├── job-levels.ts
│   │   ├── claims.ts
│   │   ├── recoveries.ts
│   │   ├── letter-types.ts
│   │   ├── approval-queue.ts
│   │   ├── qc-samples.ts
│   │   ├── coaching-notes.ts
│   │   ├── file-authority-grants.ts
│   │   ├── supervisor-performance.ts
│   │   ├── level-health-signals.ts
│   │   ├── customer-kpis.ts
│   │   ├── team-workload.ts
│   │   ├── system-events.ts
│   │   └── role-labels.ts
│   ├── types/
│   │   ├── user.ts
│   │   ├── role.ts
│   │   ├── claim.ts
│   │   ├── recovery.ts
│   │   ├── approval.ts
│   │   ├── correspondence.ts
│   │   └── engine.ts
│   └── utils/
│       ├── format.ts                # fmtMoney, fmtDate, etc.
│       └── classnames.ts            # cn() helper (clsx + tailwind-merge)
├── styles/
│   └── globals.css                  # Tailwind directives, brand custom properties
└── tests/
    ├── unit/                        # engine, authority helper
    └── e2e/                         # role-conditional flows
```

---

## 10. Data model (pass 1: TypeScript fixtures)

Define one TypeScript type per fixture in `lib/types/`. Export the typed fixtures from `lib/mock/`. Pass 1 data lives in memory; pass 2 (Phase 2 of the product roadmap) migrates to **Supabase Postgres with Drizzle**. Every domain table gets a `tenant_id` column from the start, even though pass 1 has only one tenant — see §6.4.

**Key types to define** (shapes lifted from the prototype's JS objects — preserve field names exactly):

- `User` — `{ id, name, initials, role, status, teamId, level?, authority? }`. Role union: `"ANALYST" | "SENIOR_ANALYST" | "SUPERVISOR" | "MANAGER" | "ADMIN"`. Note: per Spec v0.7, Senior Analyst is a Job Level not a Role; the prototype's `USERS` array still uses `SENIOR_ANALYST` as a role string for backward compatibility with the data. The conversion can either keep the legacy string and collapse at runtime (current prototype approach via `normalizeRole`), or migrate `USERS` to use `role: "ANALYST"` + `level: "SENIOR"` and drop `SENIOR_ANALYST` from the union entirely. **Recommendation: migrate during conversion** — it cleans up a documented inconsistency. Flag the change in the audit-log type narrative.
- `Team` — `{ id, name, supervisorId, memberIds, managerId }`.
- `JobLevel` — `{ id, label, defaults: { settlement, demand, lienReduction, closure } }`.
- `Tenant` (Customer) — `{ id, name, mode }` where mode is `"Carrier in-house" | "Vendor / TPA" | "Independent vendor service"`.
- `Claim` — preserve the prototype shape (`SAMPLE_CLAIMS`). Fields include `id`, `tenant`, `patient`, `dateOfLoss`, `state`, `accidentType`, plan info, comparative-negligence info, etc. Don't redesign — copy the shape.
- `Recovery` — preserve `SAMPLE_RECOVERIES` shape.
- `ApprovalQueueItem` — `{ id, claimId?, type, requester, requestedAt, priority, summary, dollars?, percentage?, justification, target? }`. Type union: the 9 types from Dashboard Spec §5 (`LIEN_REDUCTION`, `DEMAND_APPROVAL`, `OVERRIDE_LOCK`, `CLOSURE_BELOW_DEMAND`, `SETTLEMENT_ACCEPTANCE`, `LEVEL_CHANGE_REQUEST`, `AUTHORITY_OVERRIDE`, `FILE_AUTHORITY_GRANT`, `USER_ACTIVATION`).
- `FileAuthorityGrant` — `{ id, claimId, granteeUserId, grantedBy, scope: { settlement?, demand?, lienReduction?, closure? }, status, grantedAt, expiresAt? }`.
- `CoachingNote` — `{ id, subjectUserId, authorUserId, visibility: "SUP_AND_MGR" | "MGR_ONLY", body, createdAt }`. **Never** writes to the audit log.
- `Correspondence` — preserve prototype shape: status lifecycle `DRAFT → SENT → ACKNOWLEDGED → SUPERSEDED → CLOSED`.
- `AuditEvent` — `{ id, actor, action, target, timestamp, justification?, metadata? }`. Append-only.

**Engine output contract** (Spec §6.3) — define this type carefully. The engine returns a determination object with primary plan, ordering rationale, citation references, Wisconsin overlay results (made-whole flag, comparative-neg calc, common-fund pro-rata), and confidence band.

**A note on Claim vs. Case vs. Recovery — model separation.** The HTML prototype treats "claim" as the analyst's workable unit, but in real customer data, a customer's feed delivers individual *claim line items* (one billed service from one provider), and what the analyst actually works on is a **case** — a bundle of related claims for one accident or injury. The conversion separates these in the data model:

- `Claim` = one line item from the customer feed (member, diagnosis, procedure, provider, dates, amounts). Many claims attach to one case as they trickle in over weeks or months.
- `Case` (or `Matter`) = a bundle of related claims for one accident or injury. Owns the state lifecycle (see §11), the primacy determination, the attached recovery, and the analyst assignment.
- `Recovery` = the pursuit (demand, lien, settlement) attached to a case.

This doesn't break the existing UI. The current "Claim Detail" page becomes "Case Detail." The current Records tab inside the page naturally holds the underlying claim line items. The Claims & Triage workspace lists *cases* (with claim-count and most-recent-activity displayed inline). UI labels are a separate question — see the naming note in §8.

---

## 11. Claims Ingest & Case Architecture

This section describes how customer claims data enters COB Flow, becomes triaged candidates, groups into cases, progresses through a case state lifecycle, and is monitored for feed health and errors. Pass 1 of the conversion stubs the UI surfaces and the data-model seams; real ingest plumbing is Phase 2 work that follows customer discovery.

### 11.1 The six-stage pipeline

1. **Customer feed (inbound channel).** Most likely SFTP with key-based auth for a small-TPA pilot; X12 837 batches for a larger carrier; could be a flat CSV/pipe-delimited extract; less likely VPN or direct database access. Daily cadence is healthcare-industry standard. **Pass 1: a stub configuration page in Admin → Integrations representing one (mock) feed for the demo customer.**
2. **Ingest pipeline.** Validates, parses, and normalizes the inbound file into COB Flow's internal `Claim` records. Per-file: schema check, record count, duplicate detection, error logging. Per-record: required-field check, code-set validation (ICD-10 diagnosis, CPT/HCPCS procedure, NPI provider). **Pass 1: a mock ingest service in `lib/ingest/` that produces synthetic daily files for the seeded sample data and reports them in Admin → Integrations as if they were real.**
3. **Triage.** The prototype's `triageClaim()` already handles this — flags injury-related claims by ICD-10 S00–T98 range, trauma indicators, and place-of-service signals (23 = ER, 21 = inpatient hospital). Untriaged or non-injury claims are filed away; injury candidates flow to case grouping.
4. **Case grouping.** Multiple claims for the same member with overlapping injury-related diagnoses within a temporal window group into one `Case`. Realistic heuristic: `member_id` + `injury-diagnosis-date ± 90 days`, refined by ICD-10 external-cause codes (V/W/X/Y series — motor vehicle, fall, struck-by, etc.). **Pass 1: manual grouping only — the analyst selects "Create case" on a triaged claim and can attach additional claims to it. Automated heuristic grouping is Phase 2.**
5. **Case state lifecycle.** Each case progresses through states:
   - **GATHERING** — claims still trickling in; too early to assess. New cases start here.
   - **READY** — enough claims to triage and assign. Default trigger: 14 days since last claim attachment, or analyst manually marks ready.
   - **ASSIGNED** — an analyst owns it (Supervisor or auto-assignment by team workload).
   - **IN RECOVERY** — analyst has moved past primacy determination and is pursuing recovery.
   - **CLOSED** — recovery complete (paid, written off, withdrawn, or referred to work-comp redirect per Spec §14).
   - **REOPENED** — a late-arriving claim attached to a previously-closed case; requires Supervisor decision (supplemental demand? reopen the recovery? write off?).
6. **Monitoring.** Feed health, error queue, ingest config. Admin → Integrations and Admin → Audit are the surfaces.

### 11.2 Late-arriving claims (the trickle problem)

Real accidents generate claims over weeks to months: ER day 1, specialist visits weeks 1–12, imaging, surgery, PT/rehab, prescriptions. Each provider bills separately, and each plan adjudication takes days. So a case accumulates evidence over time and must stay open to new claims without analyst intervention.

**Behavior when a new claim arrives:**

- If the claim's `member_id` matches no open case → it's a new candidate; runs through triage; if injury-related, creates a new case in GATHERING.
- If the claim matches an open case (GATHERING, READY, ASSIGNED, or IN RECOVERY) → auto-attaches to that case; appends an Activity entry; notifies the case owner (if assigned).
- If the claim matches a CLOSED case → routes to the Approvals queue as a new approval type **`LATE_ARRIVAL_TO_CLOSED_CASE`** for Supervisor review. Supervisor decides whether to issue a supplemental demand, reopen the recovery (transitions case to REOPENED), or write off the new claim. The decision audit-logs with justification.

Matching logic in pass 1 is conservative — exact member_id match plus an injury-diagnosis-overlap check. Phase 2 adds the diagnosis-cluster and date-window heuristics.

### 11.3 Who owns what

The role/authority model from Spec §11.2 and Dashboard Spec §2 already defines the cast. Ingest responsibilities fall along the existing lines:

- **Admin** owns *the pipe*. Feed health (did today's file arrive on time, did it parse, how many records, what errors), customer feed configuration at onboarding, credential/key rotation, transport-layer security. Surfaces: Admin → Integrations (config, health metrics) and Admin → Audit (event log).
- **Supervisor and Analyst** own *the content*. Manual case grouping (pass 1), case-state transitions where judgment is required, late-arrival decisions, primacy determinations, recovery pursuit. Surfaces: Claims & Triage (workspace), Case Detail (per-case work), Management → Approvals (queue for cross-role decisions).
- **Manager** owns the *operational metrics*. Average days from first-claim-received to case-ready, average days first-claim to recovery-close, leakage estimate (cases ingested but never pursued), customer SLA conformance, ingest-error trend. Surfaces: Management → Overview → KPIs.

The clean rule: **Admin owns the pipe; analysts and supervisors own the content; managers own the operational view.**

### 11.4 New approval-queue type

Pass 1 introduces one new approval-queue type beyond the nine listed in Dashboard Spec §5:

| Type | Initiator | Approver | Purpose |
|---|---|---|---|
| `LATE_ARRIVAL_TO_CLOSED_CASE` | System (ingest) | Supervisor | A claim arrived for a CLOSED case. Supervisor decides supplemental demand, reopen, or write-off. |

Manager can override or escalate as usual.

### 11.5 Admin → Integrations: the Customer Feeds surface

The existing prototype has a stubbed Integrations tab in the Admin workspace. The conversion gives it real content:

- **Customer feeds list** — one row per configured feed (carrier, TPA, self-funded plan). Columns: customer name, deployment mode (carrier in-house / vendor / independent), feed type (SFTP / X12 837 / flat file / API), last received, last parsed, today's record count, error count last 7 days, status pill (HEALTHY / DEGRADED / FAILED / SUSPENDED).
- **Feed detail** — drill-down per feed. Configuration (transport credentials masked, schedule, field mapping), recent ingest history (file-level: arrived-at, parsed-at, record count, errors), per-error detail (record line, error type, raw payload).
- **Add Customer Feed** — wizard for onboarding a new feed. Pass 1: stubbed (clicking the button opens a "coming in Phase 2" dialog). Phase 2: real config flow.

In Admin → Audit, ingest events appear as a category alongside the existing system events. Filter by event-type to see only ingest activity.

### 11.6 What waits for customer discovery

Several details of the ingest design depend on the actual pilot customer. The Phase 1 customer-discovery interview script should capture:

- **Transport format.** X12 837 batches? Flat file extract (CSV / pipe / fixed-width)? API endpoint? FHIR? Custom format?
- **Schema.** What fields does the customer's extract include? Critical fields: member ID, claim ID, service-date, diagnosis (ICD-10), procedure (CPT/HCPCS), provider (NPI), amounts (billed, allowed, paid, member responsibility), date-of-loss (often missing on payer extracts), trauma indicators, place-of-service.
- **Cadence.** Daily batch? Weekly? Real-time event stream? Catch-up window for re-processing corrections?
- **Volume.** Expected claims per day. 50/day (small TPA) and 5,000/day (regional carrier) imply meaningfully different architectures.
- **Error-handling expectations.** Does the customer expect a daily ack file? Quarterly reconciliation? Re-send protocol for parse failures?
- **Historical backfill.** Will the customer send back-fill of historical injury claims (typically 1–3 years) at onboarding, or only forward-looking claims?
- **Date-of-loss handling.** Do they capture and forward DoL, or does COB Flow have to infer from the first injury-claim date?

Until those answers exist, the conversion handoff describes the *architecture* of ingest — feed/ingest/triage/grouping/state/monitoring — without committing to a specific format.

### 11.7 Implementation in pass 1 vs. Phase 2

**Pass 1 (conversion) builds:**
- The `Case` and `Claim` data-model separation (see §10).
- The Case Detail page (which the prototype calls "Claim Detail").
- The case state lifecycle, with all six states modeled and transitions wired through the centralized `canPerform()` helper.
- The `LATE_ARRIVAL_TO_CLOSED_CASE` approval-queue type, exercisable from a mock late-arrival demo action.
- Admin → Integrations with a Customer Feeds list backed by mock feed data and stubbed feed-detail drill-downs.
- A `lib/ingest/` mock service that simulates a daily ingest for demo purposes — useful for screenshotting feed-health states.

**Phase 2 (post-pilot-customer-identified):**
- Real SFTP / X12 / API ingest with the customer's chosen transport.
- Schema-validated parsing with the customer's actual field mapping.
- Automated case-grouping heuristics (member + diagnosis-cluster + date-window).
- Real `LATE_ARRIVAL_TO_CLOSED_CASE` triggering from real late arrivals.
- PHI access logging at the ingest layer (per Dashboard Spec §7.7).
- Anomaly detection on ingest patterns (file size deviation, record-count deviation, schema drift).

---

## 12. Authentication & roles (pass 1: mock)

**Sign-in flow (pass 1).** Sign-in page at `/signin`. Email + password form (any non-empty credentials accepted). Demo accounts panel below the form lists seeded users; click signs in. On success, a session cookie holds the user id; redirect to `/dashboard`. Sign-out clears the cookie and returns to `/signin`. This is the same posture as the current HTML prototype.

**Sign-in flow (pass 2+).** Same UI, but the form posts to Supabase Auth (`signInWithPassword`). Demo accounts panel hides in production builds; it stays in development for fast role-switching during demos. Supabase Auth manages the session cookie. SSO providers (Google, Microsoft, SAML for enterprise customers) get added per tenant via Supabase's auth provider configuration.

**Session retrieval.** `lib/auth/session.ts` exports `getCurrentUser()` for Server Components and a hook for Client Components. Pass 1 reads from the cookie-backed mock session. Pass 2 swaps the implementation to `createServerClient` (Supabase SSR helper) — callers don't change.

**Role gating.** Two mechanisms:

1. **Route-level** — `(app)/management/layout.tsx` and `(app)/admin/layout.tsx` redirect to `/dashboard` if the user lacks the required role. Server-side, no flash of unauthorized content.
2. **Component-level** — within shared surfaces (e.g., Claim Detail's file-authority row), check role via the helpers in `lib/authority/`. Don't reach into `user.role === "..."` strings directly.

**Demo role toggle.** A Client Component in the app shell top bar that cycles the session cookie's user id through the four seeded "role-canonical" users (Analyst → Supervisor → Manager → Admin → back to Analyst). It calls a server action to update the cookie, then `router.refresh()`. This preserves the existing prototype's demo affordance.

**Hybrid roles.** Dashboard Spec §7.12: a user can hold multiple roles (Manager + Admin is common). Pass 1 doesn't need to wire the full "acting as" lens selector, but the `User` type should support `roles: Role[]` (plural) from day one, and `hasRole(user, role)` should check membership. The UI can show a single role label in pass 1 by picking the highest in a defined precedence order.

**File-level authority elevation** (Spec §11.2.7, Dashboard Spec §4.3, §7.5). The active grant on c004 is preserved as a seeded fixture. The Claim Detail layout reads grants for the open claim and renders the active-grant row when the signed-in user is Supervisor or Manager and the claim has an active grant. `canPerform()` in Phase 2 will consult these grants automatically; in pass 1, the surface displays state but enforcement is mocked.

---

## 13. Design system

**Tailwind config.** Port the prototype's brand colors. The prototype uses `bg-brand-500`, `bg-brand-600`, `bg-brand-700`, plus `from-brand-500 to-brand-700` gradient. Define these in `tailwind.config.ts` as a custom color ramp. Common Tailwind utilities used elsewhere (`slate`, `emerald`, `violet`, `amber`, `red`) need no special setup.

**Typography.** The prototype uses the system font stack. Add Inter via `next/font` for the conversion (subtle quality upgrade, no design change).

**Spacing & radius.** Tailwind defaults are fine. The prototype uses `rounded-md`, `rounded-lg`, `rounded-full` consistently — match.

**Component patterns to preserve:**

- **Pill / chip** — small colored badge for status, role, priority. Already a `Pill` helper in the prototype.
- **Card** — white background, slate-200 border, rounded-lg, p-4 to p-6 padding.
- **Dialog** — modal with optional `body` JSX prop for rich content above fields. Heavily reused. Lift to `components/ui/dialog.tsx`.
- **Toast** — bottom-right, slate-900 background, auto-dismiss after 3.5s. `components/ui/toast.tsx`.
- **Role chip** — initials avatar + role label, color-coded by role. Used in top bar, account menu, team views. Lift to `components/shared/role-chip.tsx`.
- **Empty states** — match the prototype's pattern (centered icon + headline + subhead + optional CTA).

**Responsive breakpoints.** Use Tailwind defaults. The prototype's mobile breakpoint is `md:` (768px). Sidebar collapses to a sheet below `md:`.

**Accessibility.** Keyboard focus rings on all interactive elements (already present in the prototype via Tailwind's `focus:ring-2`). Use semantic elements (`<button>`, `<nav>`, `<main>`). Add `aria-label` to icon-only buttons (the prototype is partially compliant; tighten during conversion).

---

## 14. Component breakdown (high level)

Not exhaustive — extract by following the prototype. The grep map in §7 lists the prototype's components by line number. Map each to a file in `components/`. Examples:

- `Icon` → drop in favor of `lucide-react`.
- `Pill` → `components/ui/pill.tsx`.
- `Dialog` → `components/ui/dialog.tsx`.
- `Toast` → `components/ui/toast.tsx`.
- `LandingPage` → `app/(auth)/signin/page.tsx`.
- `AccountMenu` → `components/layout/account-menu.tsx`.
- `AppShell` (extracted from the prototype's `App` function) → `app/(app)/layout.tsx` + helpers.
- `DashboardView`, `IntakeView`, `CobAnalyzerView`, `RecoveryView` → their respective `page.tsx` files.
- `AdminOverview`, `AdminTeam`, `AdminTeamPerson`, `AdminApprovals`, `AdminQC`, `AdminLevelHealth`, `AdminKPIs`, `AdminJobLevels`, `AdminTeams`, `AdminUsers`, `AdminCustomer`, `AdminAudit`, `AdminRoadmap` → `app/(app)/management/...` pages and `components/management/*`.
- `SysAdminView`, `SysAdminSystem`, `SysAdminIntegrations`, `SysAdminSecurity`, `SysAdminRoadmap` → `app/(app)/admin/...` pages and `components/admin/*`.
- `ClaimDetailView` + its 7 tab components (`CdOverview`, `CdContacts`, etc.) → `app/(app)/claims/[claimId]/...` and `components/claim/*`.
- `CommunicationsPreview`, `CorrespondenceViewer` → `components/claim/*`.

**Naming conventions:**

- Files: kebab-case (`account-menu.tsx`).
- Components: PascalCase (`AccountMenu`).
- Hooks: camelCase with `use` prefix (`useCurrentUser`).
- Types: PascalCase (`User`, `ApprovalQueueItem`).
- Constants: SCREAMING_SNAKE_CASE.

---

## 15. Build phases

Pass 1 is the conversion. These phases sequence the work — don't try to do them in parallel.

**Phase A — Scaffolding (Day 1).**
- `create-next-app` with TypeScript, Tailwind, App Router, ESLint.
- Configure `tailwind.config.ts` with brand colors.
- Set up `lib/types/` and `lib/mock/` directories. Port the fixtures from the prototype's JS objects to TypeScript files. Run `tsc --noEmit` and confirm it's clean.
- Stub out `lib/auth/`, `lib/authority/`, `lib/audit/`, `lib/engine/`, `lib/utils/`.

**Phase B — Auth + app shell (Day 2).**
- Build `(auth)/signin/page.tsx` matching the prototype's `LandingPage`.
- Build `(app)/layout.tsx` with the top bar (brand, customer dropdown, role toggle, account menu) and sidebar (role-conditional nav).
- Wire mock session cookie + `getCurrentUser()`.
- Confirm sign-in / sign-out / role-toggle loop works.

**Phase C — Read-only workspaces (Days 3–4).**
- Dashboard, Claims & Triage (list only), Recovery Tracker.
- Lift the data display patterns; no interactive forms yet.

**Phase D — Claim Detail (Days 4–5).**
- Layout with tab nav and (conditional) file-authority row.
- All 7 tabs as nested routes.
- Communications + Correspondence — these are the most complex; preserve the prototype's preview pattern (`CommunicationsPreview`, `CorrespondenceViewer`).
- COB Analyzer (`/cob`) — Server Component renders engine output for the claim from the query param.

**Phase E — Management workspace (Days 5–6).**
- Six Overview tabs (Approvals, QC, KPIs, Job Levels, Users, Roadmap).
- Team list (role-conditional) + Team Person drill-down.

**Phase F — Admin workspace (Day 6).**
- Six tabs (System, Customer, Integrations, Security, Audit, Roadmap).

**Phase G — Engine + utilities (Day 7).**
- Port `triageClaim`, the COB primacy engine, and the Wisconsin overlay from the prototype's JS into `lib/engine/`. Unit tests for each rule.
- Port the authority helper boundaries and audit-log boundary. Phase 2 fills these in.

**Phase H — QA + polish (Day 8).**
- Acceptance criteria pass (see §16).
- Visual diff against the prototype.
- Mobile responsiveness sweep.
- Console error sweep.
- TypeScript strict mode clean.

Total target: ~8 working days for a sole engineer or a Claude Code-driven build. Multiply by team size or interruption rate.

---

## 16. Acceptance criteria

Pass 1 is done when all of the following are true:

**Functional parity.**
- Every prototype surface listed in §7 is present and reachable in the Next.js app.
- The decision engine produces identical output for the 10 sample claims (c001–c010) — verified by unit tests against a fixture of expected determinations.
- The role toggle cycles through Analyst → Supervisor → Manager → Admin → Analyst with sidebar nav adjusting in lockstep.
- Sign-in via demo account picker works for all 7 seeded users; sign-out returns to splash.
- Role-conditional gates work: Analyst can't open `/management/*` or `/admin/*`; Admin can't open `/management/*`; Supervisor/Manager can't open `/admin/*`. Redirect to `/dashboard` rather than 404.
- The file-authority row appears on c004's Claim Detail when signed in as Supervisor or Manager and is hidden for Analyst.

**Code quality.**
- TypeScript strict mode, no `any` without a `// reason: ...` comment.
- ESLint clean.
- No console errors or warnings in dev or production builds.
- `npm run build` succeeds with no warnings.
- All shared components have explicit prop types.

**Architecture.**
- `canPerform()`, `auditLog.record()`, and the role helpers exist at the boundaries described in §6, even if their pass-1 implementations are minimal.
- All authority checks in the UI route through helpers — no direct `user.role === "..."` comparisons outside `lib/authority/` and `lib/auth/`.
- All mock data is typed and lives in `lib/mock/`.

**Responsiveness.**
- Sidebar collapses to a sheet below `md:` (768px).
- All pages usable on a 375px-wide viewport.
- Tap targets meet 44px minimum on touch surfaces.

**Accessibility (light pass).**
- Keyboard focus rings visible on all interactive elements.
- Icon-only buttons have `aria-label`.
- Color contrast meets WCAG AA for body text (don't audit chrome).

**Tests.**
- Unit tests for the engine and the Wisconsin overlay — coverage of every rule in Spec §6.1 and §6.2.
- One Playwright end-to-end test per role: sign in, navigate to the role's primary workspace, verify a representative action works.

**Documentation.**
- A `README.md` at the repo root documenting: install steps, dev server command, build command, test commands, and where the mock fixtures live.
- An `ARCHITECTURE.md` at the repo root summarizing §6, §8, and §10 of this doc.

---

## 17. Open decisions and known cliffs

Most stack decisions are now closed (see §5 table). The items below are either business decisions still owed by Jim, or known future cliffs the team should plan for but doesn't have to solve in pass 1.

### Closed (for reference)

- Tenant model: (C) single-tenant in pass 1, multi-tenant architecture preserved.
- Host: Vercel.
- Auth + DB: Supabase.
- ORM: Drizzle.
- Code hosting: GitHub. Repo: `cob-flow-app`.
- CI/CD: GitHub Actions.
- Error tracking: Sentry.
- Analytics: Vercel Analytics.

### Still open

- **Pilot tenant identity.** Which Wisconsin organization does the first real customer conversation aim at? Spec §14 lists Common Ground Healthcare Cooperative (verified WI presence; HQ to be confirmed), Diversified Benefit Services (Hartland), and ProHealth Care (Waukesha) as candidates. Resolution: Phase 1 of the GTM roadmap (customer discovery interviews).
- **Long-term product shape.** Multi-tenant SaaS sold to multiple customers (option A from our discussion), single-company recovery operation around COB Flow Recovery (option B), or grow-into-A-from-B (option C — the current direction). Jim's read: keep this open. The conversion does not foreclose any path.
- **Independent-vendor mode scope.** If COB Flow Recovery is the operator, does it also handle billing/collections, or only identification + correspondence with payment flowing through Jim's back office? Open question from Spec §14.
- **Pricing model for independent-vendor mode.** Contingency, hybrid, or tiered. Open from Spec §14.
- **Wisconsin OCI registration.** Whether independent-vendor mode requires third-party recovery vendor registration. Resolution: Phase 0 attorney scoping call from the GTM roadmap.

### Known future cliffs (not blocking pass 1)

- **BAA-eligible hosting transition.** Once a real customer with real PHI is on the platform, Vercel Hobby/Pro is no longer compliant. Two paths: upgrade to Vercel Enterprise (~$3k/month minimum, BAA included) or migrate the host layer to AWS or Azure with their respective BAA programs. The Next.js app itself is portable either way. Timing: ahead of the Phase 5 pilot in the GTM roadmap.
- **Supabase HIPAA tier.** Similarly, Supabase's HIPAA-compliant offering is a paid addon (~$599/month at time of writing). Timing: same as above.
- **SSO for enterprise customers.** Carriers and large TPAs will require SAML/OIDC for their analyst accounts. Supabase Auth supports this; configuration happens per tenant. Timing: ahead of the first enterprise customer signing.
- **PHI access logging at the query layer.** Dashboard Spec §7.7. Not in pass 1; needs to be in place before real PHI ever hits the database.

---

## 18. Working notes for Claude Code

A few things to know about how this project operates:

- **Jim is the SME.** Domain language is the right register: COB primacy, made-whole doctrine, recovery cycle, lien reduction, payer hierarchy, ERISA preemption, MSP working aged. Frame technical recommendations in those terms when relevant.
- **Coordination of Benefits ≠ Coordination of Care.** Always disambiguate.
- **Wisconsin-only build.** The engine's `NO_FAULT_STATES` set is intentionally empty. Don't "fix" it.
- **Don't rename Job Levels to Tiers.** "Tier" is reserved for `LETTER_TYPES` correspondence priority (Tier 1 / Tier 2) — different concept.
- **The handoff doc** (`COB_Flow_Handoff.md`) has additional context about the project's working conventions, including a list of guardrails (§9) and likely next workstreams (§10). Worth a skim.
- **The prototype occasionally needs Babel-transform health checks** when edited. The handoff §9 documents the pattern: rebuild `outputs/transform.js`, `outputs/transform_admin.js`, and `outputs/sysadmin_check.js` per session and run all three after non-trivial edits. The conversion replaces the prototype as the source of truth, so this check loop applies only while the prototype is still being modified in parallel.
- **Filesystem note.** The project folder occasionally deadlocks for shell reads. If `node`/`python`/`cat` fails to read a file in the project folder with `EDEADLK`, use the file-tool layer (Read/Write/Edit) instead of bash for file ops.

### Tooling map

The project uses several distinct surfaces. Each has a defined role; don't confuse them.

- **Cowork (Claude on Jim's desktop)** — the planning, spec authoring, GTM artifacts, customer-discovery prep, and light prototype-tweak surface. The "technical manager" layer. This handoff document was authored here.
- **Claude Code** — primary dev agent for the Next.js conversion. Operates on the `cob-flow-app` GitHub repo. Handles sustained complex work: feature implementation, refactors, tests, debugging.
- **Vercel** — production host. Hobby tier for pass 1 (free); Pro tier (~$20/mo) at first shared deploy; Enterprise (with BAA) or AWS migration when real PHI lands.
- **Supabase** — auth + Postgres database + storage. Free tier in pass 1; Pro tier at first shared deploy; HIPAA tier when real PHI lands.
- **GitHub** — code source of truth. Repo: `cob-flow-app`.
- **Sentry** — error tracking. Added at first shared deploy.
- **Optional auxiliary AI tools** — Lovable, v0, Replit Agent. Not part of the primary build pipeline. Possible niche uses: Lovable for zero-to-mockup work on individual screens before they're integrated; v0 for one-off component generation; Replit for throwaway demo deployments. Skip unless a specific narrow job calls for one.

---

## 19. What this document is not

- **Not a product spec.** That's `COB_Flow_Product_Spec_v0.8.docx`.
- **Not a workflow spec.** That's `COB_Flow_WI_Workflow_v1.0.docx`.
- **Not a role/authority spec.** That's `COB_Flow_Dashboard_Spec_v0.1.docx`.
- **Not a GTM plan.** That's `COB_Flow_GTM_Roadmap.docx`.
- **Not a final architecture decision record.** Phase 2 will produce ADRs (per the `engineering:architecture` skill) for hosting, ORM, auth, and similar.
- **Not exhaustive.** Anything not covered here defaults to the prototype's behavior.

---

## 20. Appendices

### Appendix A — Helper signatures (TypeScript)

The architectural seams in §6 turn into these TypeScript boundaries. Pass-1 implementations are stubs; pass-2 fills them in. Signatures should not change between passes — call sites must not be rewritten.

```ts
// lib/auth/session.ts
export interface CurrentUser {
  id: string;
  name: string;
  initials: string;
  email: string;
  roles: Role[];           // plural — hybrid users have multiple
  level?: JobLevel;        // ANALYST role only
  teamId?: string | null;
  authority?: AuthorityBands;
}
export async function getCurrentUser(): Promise<CurrentUser | null>;
export async function signIn(emailOrUserId: string, password: string): Promise<CurrentUser>;
export async function signOut(): Promise<void>;

// lib/authority/can-perform.ts
export interface AuthorityContext {
  user: CurrentUser;
  action: AuthorityAction;          // "ACCEPT_SETTLEMENT" | "SEND_DEMAND" | "REDUCE_LIEN" | "CLOSE_RECOVERY" | "OVERRIDE_LOCK" | ...
  caseId?: string;
  dollarAmount?: number;
  percentage?: number;
}
export type CanPerformResult =
  | { decision: "allow" }
  | { decision: "requires_approval"; approverRole: Role; queueType: ApprovalQueueType }
  | { decision: "deny"; reason: string };
export function canPerform(ctx: AuthorityContext): CanPerformResult;

// lib/audit/log.ts
export interface AuditEvent {
  actor: string;             // user id
  action: string;            // e.g., "DEMAND_SENT", "LIEN_REDUCED", "CASE_CLOSED", "FILE_AUTHORITY_GRANTED"
  target: string;            // e.g., case id, user id, recovery id
  timestamp: string;         // ISO 8601
  justification?: string;
  metadata?: Record<string, unknown>;
  category: "WORKFLOW" | "CONFIG" | "INGEST" | "AUTH" | "AUTHORITY";
  tenantId: string;
}
export const auditLog = {
  record(event: AuditEvent): Promise<void>;
  // Phase 2: query, export
};

// lib/authority/roles.ts
export type Role = "ANALYST" | "SUPERVISOR" | "MANAGER" | "ADMIN";
export type JobLevel = "TRAINEE" | "JUNIOR" | "MID" | "SENIOR";
export function hasRole(user: CurrentUser, role: Role): boolean;
export function isAnalyst(user: CurrentUser): boolean;
export function isSupervisor(user: CurrentUser): boolean;
export function isManager(user: CurrentUser): boolean;
export function isAdmin(user: CurrentUser): boolean;
export function effectiveRoles(user: CurrentUser): Role[];

// lib/engine/primacy.ts
export interface PrimacyInput { /* claim, member, coverages, accident */ }
export interface PrimacyResult {
  primaryPayer: { coverageId: string; payerName: string; planType: string };
  rule: string;                       // e.g., "AUTO_MEDPAY_OPTIONAL", "BIRTHDAY_RULE"
  ordering: Array<{ coverageId: string; rank: number; rationale: string }>;
  citations: string[];                // e.g., ["Wis. Admin. Code § Ins 3.40(11)(b)"]
  confidence: "HIGH" | "MEDIUM" | "LOW";
  wisconsinOverlay?: WisconsinOverlayResult;
}
export function determineCobPrimacy(input: PrimacyInput): PrimacyResult;

// lib/engine/wi-overlay.ts
export interface WisconsinOverlayResult {
  madeWhole: { applies: boolean; preempted: boolean; notes: string };
  comparativeNeg: { claimantFaultPct: number; defendantFaultPct: number; barred: boolean; recoverable: number };
  commonFund: { proRataAttorneyFeeShare: number; netRecoveryAfterFee: number };
  citations: string[];
}
export function wisconsinOverlay(input: { /* … */ }): WisconsinOverlayResult;

// lib/ingest/types.ts (pass 1 stubs; pass 2 real)
export interface IncomingClaim { /* one line item from a customer feed */ }
export interface CustomerFeed { /* config */ }
export interface IngestResult {
  fileId: string;
  recordCount: number;
  parsedCount: number;
  errorCount: number;
  errors: Array<{ recordLine: number; type: string; message: string; raw?: string }>;
  attachedToCases: Array<{ claimId: string; caseId: string; transition?: "NEW_CASE" | "ATTACH" | "LATE_ARRIVAL" }>;
}
```

### Appendix B — Environment variables

Required for the Next.js app to boot and connect to Supabase:

```bash
# Public — exposed to the browser
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...                # safe to expose; RLS enforces

# Server-only — never exposed to the browser
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...                    # admin operations
DATABASE_URL=postgresql://postgres:<pwd>@db.<project>.supabase.co:5432/postgres

# App
NEXT_PUBLIC_SITE_URL=https://cob-flow-app.vercel.app   # or production domain
NEXT_PUBLIC_DEPLOYMENT_MODE=DEMO                       # DEMO | STAGING | PRODUCTION
```

Add at first shared deploy (not strictly required for pass-1 local dev):

```bash
SENTRY_DSN=https://...ingest.sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...                     # if client-side too
SENTRY_AUTH_TOKEN=...                                  # for source-map uploads
```

`.env.local` (gitignored) for local dev; Vercel dashboard for the deployed env. `.env.example` in the repo documents the names without the values.

### Appendix C — Pre-flight checklist (for Jim, before kicking off Claude Code)

Do these once before pointing Claude Code at the handoff doc. None require code.

- [ ] Create a GitHub repo named `cob-flow-app` (private). Note the SSH URL.
- [ ] Create a Supabase project (free tier is fine). From the project dashboard, capture: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and the Postgres `DATABASE_URL`.
- [ ] Create a Vercel account (free tier). Don't import the repo yet — Claude Code will scaffold first, then you connect.
- [ ] Decide the production domain (or defer; Vercel auto-generates `cob-flow-app.vercel.app`).
- [ ] Confirm Claude Code has access to read this project folder (the `.md` handoff doc, the prototype HTML, and the four companion docs in §3). Easiest path: keep them all in the same `cob-flow-app` repo under a `docs/` directory, or share a folder Claude Code can access.
- [ ] Stage the prototype HTML somewhere Claude Code can read it. The single-file prototype is the visual source of truth; Claude Code needs to be able to open it.
- [ ] Make sure local dev environment has Node 22 LTS, npm or pnpm, and Git.
- [ ] (Optional) Install the Sentry CLI for the first deploy that adds error tracking.
- [ ] (Optional) Provision a Vercel Analytics enabled project; otherwise it defaults to off until first deploy.

When you hand off, Claude Code's first action should be to read this document, then `COB_Flow_Handoff.md`, then the four companion docs in §3, then open the prototype. After that, Phase A of §15 begins.

### Appendix D — README skeleton

Drop this as `README.md` at the repo root after Claude Code scaffolds the project. Fill in the marked spots.

```markdown
# cob-flow-app

COB Flow — decision-support SaaS for healthcare coordination of benefits,
auto med-pay/PIP recovery, and post-payment subrogation. Wisconsin pilot.

This is the Next.js conversion of the single-file HTML prototype. Pass 1
is functionally on par with the prototype with the architectural seams
described in `docs/COB_Flow_NextJS_Conversion_Handoff.md` §6.

## Tech stack

- Next.js 15 (App Router) · React 19 · TypeScript (strict)
- Tailwind CSS · shadcn/ui · lucide-react
- Supabase (Auth + Postgres) · Drizzle ORM
- Hosted on Vercel

## Local development

\`\`\`bash
# 1. Install
pnpm install   # or npm install

# 2. Configure
cp .env.example .env.local
# fill in the values per docs/COB_Flow_NextJS_Conversion_Handoff.md Appendix B

# 3. Run
pnpm dev       # http://localhost:3000

# 4. Lint, typecheck, test
pnpm lint
pnpm typecheck
pnpm test
\`\`\`

## Project structure

See `docs/COB_Flow_NextJS_Conversion_Handoff.md` §9.

- `src/app/` — App Router pages and layouts
- `src/components/` — shared UI components
- `src/lib/` — auth, authority, audit, engine, mock fixtures, types
- `src/styles/` — Tailwind globals
- `tests/` — Vitest unit + Playwright e2e

## Sign-in (pass 1 — mock auth)

Any non-empty email + password works. The "Demo accounts" panel on the
sign-in page lets you click a user to skip the form. Production swaps
this for Supabase Auth — see handoff §12.

## Docs

- `docs/COB_Flow_NextJS_Conversion_Handoff.md` — the conversion brief
- `docs/COB_Flow_Product_Spec_v0.8.docx` — product spec
- `docs/COB_Flow_Dashboard_Spec_v0.1.docx` — role / authority architecture
- `docs/COB_Flow_WI_Workflow_v1.0.docx` — analyst workflow

## Status

Pass 1 — prototype conversion. **No real PHI, no real customers, no real
auth.** See handoff §17 for the BAA / PHI cliff that gates production use.

## License

[TBD — placeholder]
```

---

*End of handoff. If a section is wrong or incomplete, fix this document — its value depends on staying current.*
