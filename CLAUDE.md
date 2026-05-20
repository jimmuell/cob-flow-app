# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

COB Flow — decision-support SaaS for healthcare coordination of benefits (COB), auto med-pay/PIP recovery, and post-payment subrogation. Wisconsin pilot state. Engine recommends, analyst signs every determination.

This repository is the Next.js conversion of `docs/COB_Flow_MVP.html` (single-file React prototype). Read `docs/COB_Flow_NextJS_Conversion_Handoff.md` before making architectural decisions. When the spec and the prototype disagree on behavior, ask Jim — do not guess.

## Commands

```bash
npm install           # install deps
npm run dev           # dev server → http://localhost:3000
npm run build         # production build
npm run typecheck     # tsc --noEmit
npm run lint          # ESLint
npm test              # Vitest unit tests
npm run test:e2e      # Playwright end-to-end
# Drizzle
npm run db:generate   # generate migration from schema changes
npm run db:migrate    # apply migrations to local Supabase
npm run db:studio     # Drizzle Studio UI
```

Supabase local: `supabase start` / `supabase stop`. Keys already in `.env.local` (gitignored). Verify with `supabase status`.

## Locked stack

Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind CSS v3+ · shadcn/ui · lucide-react · React Hook Form + Zod · TanStack Table · Supabase (auth + Postgres, local instance for pass 1) · Drizzle ORM · Vercel · Vitest + Playwright · Node 24.x · ESLint + Prettier

## Architecture

### Route groups

- `(auth)/signin` — unauthenticated landing / sign-in (mock auth pass 1)
- `(app)/` — authenticated app shell (top bar + sidebar)
  - `dashboard/`, `claims/[claimId]/`, `cob/`, `recovery/`
  - `management/overview/` (Supervisor + Manager) · `management/team/[personId]/`
  - `admin/` (Admin only) — 6 tabs: system, customer, integrations, security, audit, roadmap

Claim Detail has 7 nested routes: `overview`, `contacts`, `activity`, `communications`, `correspondence`, `records`, `tasks`.

### lib/ boundaries — do not bypass these

| File | Purpose |
|---|---|
| `lib/auth/session.ts` | `getCurrentUser()` · `signIn()` · `signOut()` — pass 1: cookie mock; pass 2: Supabase Auth swap, callers unchanged |
| `lib/authority/can-perform.ts` | `canPerform(ctx)` — **every** state-changing action routes through here. Returns `{ decision: "allow" }` \| `{ decision: "requires_approval"; approverRole; queueType }` \| `{ decision: "deny"; reason }`. Pass 1 returns `allow` if signed in; pass 2 consults authority limits. Shape is fixed — call sites check `result.decision`. |
| `lib/authority/roles.ts` | `hasRole()` · `isAnalyst()` · `isSupervisor()` · `isManager()` · `isAdmin()` · `effectiveRoles()` — no direct `user.role === "..."` comparisons outside this file |
| `lib/audit/log.ts` | `auditLog.record(event)` — append-only; `justification?` column exists from day one; pass 1 in-memory; pass 2 Postgres. Never mutate existing entries. |
| `lib/engine/primacy.ts` | COB decision engine — ported verbatim from prototype JS, zero behavioral changes in pass 1 |
| `lib/mock/` | All seed data as typed TypeScript fixtures — exact shapes and values from prototype |

Server Components by default. `"use client"` only for interactivity (forms, dialogs, role toggle, anything with `useState`/`useEffect`).

Tenant context is always in the session, never passed as free-floating component props.

## Critical guardrails

- **`NO_FAULT_STATES` is intentionally empty.** Wisconsin is at-fault. Do not "fix" it. The no-fault PIP rule remains in the codebase for Phase 3 expansion but never fires for WI.
- **Job Levels ≠ Tiers.** Job Levels = Analyst seniority (Trainee / Junior / Mid / Senior). "Tier" = `LETTER_TYPES` correspondence priority (Tier 1 / Tier 2). Never rename either.
- **COB ≠ CoC.** Coordination of Benefits ≠ Coordination of Care. Always disambiguate; never write the unqualified word "coordination."
- **Audit log ≠ coaching notes.** Two separate stores. Coaching notes are role-private (`SUP_AND_MGR` or `MGR_ONLY` visibility); never leak into the audit surface.
- **`canPerform()` shape is locked.** Pass 2 fills in logic; call sites must not change.
- **`SENIOR_ANALYST` is not a Role.** Users are `role: "ANALYST"` + `level: "SENIOR"` in the fixtures and type system. The four-role model is canonical: `"ANALYST" | "SUPERVISOR" | "MANAGER" | "ADMIN"`.
- **Roles helper is the only place for role checks.** No `user.role === "..."` string comparisons in components or pages.

## Locked decisions

- **Auth pass 1:** cookie-backed mock session; demo-accounts picker on sign-in page. Supabase Auth boundary is wired but not exercised.
- **Database pass 1:** in-memory TypeScript fixtures in `lib/mock/`. Supabase Postgres schema exists locally but is not yet populated.
- **Tenant model:** single-tenant deployment for COB Flow Recovery in pass 1; multi-tenant seams preserved (`tenant_id` on every domain table, tenant context via session).
- **Domain:** deferred to `cob-flow-app.vercel.app` (Vercel auto-generated). No custom domain in pass 1.
- **Supabase local:** `http://127.0.0.1:54321`, Postgres at `127.0.0.1:54322`. Keys in `.env.local`.

## Pass-1 scope

**In scope:** functional parity with prototype — all 6 workspaces, Claim Detail 7 tabs, four-state demo role toggle, COB engine + Wisconsin overlay, mobile responsiveness.

**Out of scope:** real auth, real DB connections, real integrations (X12/SFTP/API), LLM parsing, HIPAA-grade audit, email/fax/SMS sending, Profile/Settings pages.

## Domain language

COB primacy · made-whole doctrine · recovery cycle · lien reduction · payer hierarchy · ERISA preemption · MSP working aged · Wis. Admin. Code § Ins 3.40 · comparative negligence (Wis. Stat. § 895.045) · common-fund doctrine · Claim (feed line item) · Case (accident bundle) · Recovery (the pursuit)
