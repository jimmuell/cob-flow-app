# Phase C — Read-only Workspaces · Design Review (In Progress)

**Status:** §1 CLOSED · §2 DRAFTED (pending Jim's review) · §3 not yet drafted · §4 not yet drafted.
**Authoring against:** `COB_Flow_NextJS_Conversion_Handoff.md` §§5/6/15/16; Product Spec §§3/6/8/9/10; Dashboard Spec §§3–8; `COB_Flow_MVP.html` view components (`DashboardView`, `IntakeView`, `RecoveryView`).
**Process anchor:** `DIVISION_OF_LABOR.md` "Section-by-section design review" working norm — Cowork drafts each section; Jim reviews and greenlights each section before the next is drafted; once all four sections are greenlit, Cowork produces a paste-target prompt for the cob-flow-app agent to commit the consolidated spec to `docs/superpowers/specs/` and the corresponding plan to `docs/superpowers/plans/`.

This is a working document. When all four sections close, the consolidated content lands as `docs/superpowers/specs/2026-05-NN-phase-c-read-only-workspaces-design.md` and this in-progress doc is deleted.

---

## §1 — Scope & Routes (CLOSED 2026-05-24)

### Scope

Three read-only workspaces — Dashboard, Claims & Triage list, Recovery Tracker. All render-from-fixture. No forms, no mutations, no Drizzle tables, no Server Actions. Server Components do the fixture reads; Client Components only where the prototype already had interactivity (sort/filter on the table, expand/collapse on a row).

### Explicitly out of scope for Phase C

- COB Analyzer (`/cob`) — Phase D
- Claim Detail page + its 7 nested tabs (`/claims/[claimId]/...`) — Phase D
- Management workspace (`/management/*`) — Phase E
- Admin system tabs (`/admin/system`, `/admin/customer`, etc.) — Phase F. CM routes already shipped under `/admin/content/*` stay live and untouched per Jim's "leave CM surfaces on" decision.
- Engine + Wisconsin overlay unit-test port — Phase G
- Visual diff against prototype + mobile sweep + accessibility audit — Phase H

### Route map (Phase C additions)

```
src/app/(app)/
├── dashboard/page.tsx        replace Phase B placeholder ("Coming in Phase C")
├── claims/
│   ├── page.tsx              new — Claims & Triage list
│   └── [claimId]/page.tsx    new — Phase D placeholder (preserves row-click affordance)
└── recovery/
    └── page.tsx              new — Recovery Tracker
```

Plus the existing `(app)/layout.tsx` from Phase B wraps all three. No new layout files needed.

### Decisions (closing §1)

1. **Row-click on Claims & Triage list.** Navigate to `/claims/[claimId]` placeholder page. Placeholder shows the claim ID, patient name, and the seven Phase D tabs ("Overview, Contacts, Activity, Communications, Correspondence, Records, Tasks — coming in Phase D") so the click affordance is preserved and Phase D scope is previewed at zero cost.
2. **Empty-state handling.** Render the prototype's empty-state component (centered icon + headline + subhead, no CTA) when a fixture group is empty.
3. **Tenant-switch E2E.** Required for all three Phase C pages. Non-negotiable — exercises the tenant-context-via-session seam that Phase 2 depends on.
4. **Claim vs. Case naming.** Honor Conversion Handoff §8 option (a). Keep "Claims & Triage" workspace label and `/claims` URL in Phase C. Rename decision deferred to Phase D's design review.
5. **Dashboard KPI tile data source.** Filter `CUSTOMER_KPIS` by `getActiveTenant().id` in the Server Component. Fixture sanity check (verify all three tenants are represented) happens before implementation; remediation in scope for Phase C if not.
6. **Dashboard quick links.** Render all the prototype's tiles, with Phase D+ surfaces visually disabled or pill-tagged with their target phase (e.g., "COB Analyzer — Phase D", "Management — Phase E"). Preserves the prototype's wayfinding shape.

---

## §2 — Data Layer (DRAFTED, pending Jim's review)

### Operating principle

Every page is a Server Component. Every page calls `getActiveTenant()` from the session and passes the tenant ID to a small data helper that filters the relevant fixture. Pages do not import fixtures directly. When Phase 2 swaps fixtures for Drizzle queries, only the helper internals change — page code and component code stay identical.

This is the single most important architectural rule in §2.

### Where data helpers live

New directory: `src/lib/data/`. Parallel to `lib/auth/`, `lib/authority/`, `lib/audit/`, `lib/engine/`.

```
src/lib/data/
├── claims.ts         # getClaimsForTenant, getRecentClaimsForTenant
├── recoveries.ts     # getRecoveriesForTenant, groupRecoveriesByStage
└── kpis.ts           # getKpisForTenant
```

`lib/mock/` continues to hold the typed fixture data. `lib/data/` holds the *read functions* that query those fixtures. Phase 2: `lib/data/` files swap from `MOCK_*.filter(...)` to Drizzle queries; fixtures stay as test scaffolding for Vitest.

### Helper signatures

```ts
// src/lib/data/kpis.ts
import type { CustomerKpis } from '@/lib/types';
export function getKpisForTenant(tenantId: string): CustomerKpis | null;

// src/lib/data/claims.ts
import type { Claim } from '@/lib/types';
export function getClaimsForTenant(tenantId: string): Claim[];
export function getRecentClaimsForTenant(tenantId: string, limit: number): Claim[];

// src/lib/data/recoveries.ts
import type { Recovery, RecoveryStage } from '@/lib/types';
export function getRecoveriesForTenant(tenantId: string): Recovery[];
export function groupRecoveriesByStage(
  recoveries: Recovery[]
): Record<RecoveryStage, Recovery[]>;
```

All helpers are synchronous in pass 1. Phase 2 wraps them in `Promise<...>` returns; Server Components add `await`. One-line page-level change at swap time.

Empty results return `[]` (or `null` for the single-record KPI lookup). Never throw. The page renders the empty-state component when a result is empty; throwing would bubble to the `error.tsx` boundary, which is the wrong UX for a tenant with zero claims.

### Server Component pattern

Canonical shape for every Phase C page:

```tsx
// src/app/(app)/claims/page.tsx
import { getActiveTenant } from '@/lib/auth/session';
import { getClaimsForTenant } from '@/lib/data/claims';
import { ClaimsTable } from '@/components/claims/claims-table';
import { ClaimsEmpty } from '@/components/claims/claims-empty';

export default async function ClaimsPage() {
  const tenant = await getActiveTenant();
  const claims = getClaimsForTenant(tenant.id);
  return claims.length === 0
    ? <ClaimsEmpty />
    : <ClaimsTable claims={claims} />;
}
```

The TanStack Table inside `ClaimsTable` is a Client Component (sort/filter interactivity); it receives data as a prop — it doesn't fetch.

### Per-page data flows

`/dashboard` reads `getKpisForTenant(tenant.id)` and `getRecentClaimsForTenant(tenant.id, 5)` sequentially. If KPI lookup returns null, KPI tiles render with em-dashes per the prototype's missing-data convention, not the page-level empty state.

`/claims` reads `getClaimsForTenant(tenant.id)`. Sort/filter happens client-side in TanStack Table on the unfiltered list. Default sort: date of loss descending.

`/recovery` reads `getRecoveriesForTenant(tenant.id)` then groups via `groupRecoveriesByStage()`. The grouping helper guarantees every stage key is present in the returned record (with `[]` for empty stages), so the JSX iterates stages in a fixed order without conditional rendering.

### Pre-implementation fixture audit (deferred from §1 questions 2 and 5)

Before any Phase C code is written, audit `src/lib/mock/`:

- `customer-kpis.ts` — entries for all three tenant IDs (Lakeshore Health Plan, Badger State Subrogation Services, COB Flow Recovery — Brookfield)? If only one tenant is represented, add the other two so the tenant-switch demo lands.
- `claims.ts` — same check. The 10 sample claims (`c001`–`c010`) need a `tenantId` field distributed across the three tenants. Proposed split: 4/3/3, with c004 (Hailey Brennan, the rich demo claim with the seeded file-authority grant) on Lakeshore.
- `recoveries.ts` — same check.

Remediation, if needed, is in scope for Phase C as the first commit. If fixtures are already three-tenant, no action.

### Tenant ID source of truth

`getActiveTenant()` from `lib/auth/session.ts` (Phase B addition). Reads from the session cookie which the top-bar dropdown updates via a Server Action + `revalidatePath('/', 'layout')`. Helpers receive the tenant ID as a string parameter — they don't read the session themselves. Keeps helpers pure and unit-testable.

### Phase 2 migration shape (documented now, not built)

- Fixture files in `lib/mock/` stay as test scaffolding for Vitest
- Helper internals in `lib/data/` swap from `MOCK_CLAIMS.filter(...)` to `db.query.claims.findMany({...})`
- Helper return types change from `T` / `T[]` to `Promise<T>` / `Promise<T[]>`
- Server Components add `await` to their helper calls
- Pages, components, fixtures stay identical

This is why the data helpers exist as a layer.

### Open design questions for §2 review

1. **Should helpers live in `src/lib/data/` (proposed) or be folded into `src/features/<workspace>/data/`?** CM established a `src/features/<feature>/` pattern. Argument for `lib/data/`: Phase C reads are shared across pages and with future phases, not feature-owned. Argument for `features/`: consistent with CM convention. **Default: `lib/data/`.**

2. **Per-tenant data distribution in the seed.** Proposed split: 4 claims on Lakeshore (carrier in-house), 3 on Badger State (vendor TPA), 3 on COB Flow Recovery (independent vendor). c004 stays on Lakeshore as the demo focal point. **Default: 4/3/3 with c004 on Lakeshore.**

3. **Dashboard rendering when a tenant has zero KPI data.** (i) KPI tiles with em-dashes + small "No data for this customer" subhead under the tile row, page shape preserved. (ii) Full-page empty state, no KPIs, no recent claims. **Default: (i).**

4. **Helper unit-test coverage.** Vitest tests per helper for tenant-scoped filtering, empty-tenant handling, sort/slice correctness, completeness of stage keys. **Default: yes to all four. No snapshot tests on fixture data.**

5. **`getActiveTenant()` failure mode.** Defensive check + redirect to `/signin`, or trust the middleware invariant and let it throw to `error.tsx`? **Default: trust the invariant.**

---

## §3 — Component Patterns (not yet drafted)

Will cover: TanStack Table setup for the Claims & Triage list (columns, sort, filter, mobile layout), KPI tile primitive, recovery-stage card pattern, Phase D placeholder page for `/claims/[claimId]`, empty-state component, Dashboard quick-link tile with the disabled/phase-pill state, shared `Pill` / `Card` / `Empty` primitives.

---

## §4 — Testing Strategy (not yet drafted)

Will cover: Vitest unit coverage scope (data helpers, any new pure utilities), Playwright E2E per Phase C page including the non-negotiable tenant-switch tests from §1, the E2E auth sync barrier pattern carried forward from CP5 ("await expect(page).toHaveURL('/dashboard') before any subsequent page.goto()"), label-rename grep discipline if any prototype labels get adjusted during conversion, the verification gate the cob-flow-app agent must pass before declaring Phase C done (typecheck + lint + build + Vitest + Playwright + manual smoke in `npm run dev`).

---

## How to resume

1. New Cowork session opens.
2. Cowork reads the files in the order specified by `docs/COB_Flow_Cowork_Kickoff.md` (which now points at Phase C resumption).
3. Cowork acks scope and proposes review of §2 above as the first move.
4. After §2 closes, Cowork drafts §3.
5. After §3 closes, Cowork drafts §4.
6. After §4 closes, Cowork produces a paste-target prompt for this agent to commit the consolidated spec to `docs/superpowers/specs/2026-05-NN-phase-c-read-only-workspaces-design.md`, draft the corresponding implementation plan to `docs/superpowers/plans/`, and delete this in-progress doc.
7. Implementation begins via subsequent paste-target prompts, one checkpoint at a time.

---

*Drafted in Cowork session 2026-05-24. To delete after the consolidated spec lands.*
