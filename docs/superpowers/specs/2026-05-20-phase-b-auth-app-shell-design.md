# Phase B — Auth + App Shell Design

**Date:** 2026-05-20
**Status:** Approved
**Scope:** Sign-in page, mock auth session, app shell (top bar + sidebar), middleware, error/not-found boundaries.
**Next phase:** Phase C — read-only workspaces (Dashboard, Claims & Triage list, Recovery Tracker).

---

## 1. Files Created or Modified

```
src/middleware.ts                                    new
src/app/layout.tsx                                  modify — Inter font, metadata, clean up scaffold
src/app/page.tsx                                    replace scaffold — redirect only
src/app/(auth)/layout.tsx                           new
src/app/(auth)/signin/page.tsx                      new
src/app/(app)/layout.tsx                            new
src/app/(app)/dashboard/page.tsx                    new — Phase C placeholder
src/app/(app)/error.tsx                             new
src/app/(app)/not-found.tsx                         new
src/app/global-error.tsx                            new

src/components/layout/top-bar.tsx                   new — Server Component
src/components/layout/top-bar-client.tsx            new — "use client"
src/components/layout/sidebar.tsx                   new — Server Component
src/components/layout/sidebar-nav.tsx               new — "use client"
src/components/layout/sidebar-sheet.tsx             new — "use client"
src/components/layout/app-shell-client.tsx          new — "use client"
src/components/shared/role-chip.tsx                 new

src/lib/contexts/app-shell-context.tsx              new
src/lib/actions/auth.ts                             new
src/lib/actions/session.ts                          new
src/lib/auth/session.ts                             modify — add getActiveTenant()
```

shadcn/ui component to add: `npx shadcn@latest add dropdown-menu`

---

## 2. Middleware

**File:** `src/middleware.ts`

Cookie-presence check only — no user shape, no DB call, runs on the edge.

```ts
export const config = {
  matcher: [
    '/((?!signin|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

Rules (in order):
1. `cob_user_id` cookie absent + path is not `/signin` → `NextResponse.redirect('/signin')`
2. `cob_user_id` cookie present + path is `/signin` → `NextResponse.redirect('/dashboard')`
3. Otherwise → `NextResponse.next()`

Role gates are **not** in middleware. They live in the Management and Admin layout files (Phase E and F), where `getCurrentUser()` is available to read the user's role.

---

## 3. Root `app/page.tsx`

Server Component. No rendered UI.

```ts
// Defense-in-depth: middleware already redirects, but this ensures
// correctness if middleware is bypassed or misconfigured.
```

Calls `getCurrentUser()`:
- Signed in → `redirect('/dashboard')`
- Signed out → `redirect('/signin')`

---

## 4. `app/layout.tsx` (root layout)

Replace the scaffold. Changes:
- Swap Geist for **Inter** via `next/font/google` (handoff §13 — subtle quality upgrade, no design change).
- Update `metadata`: `title: "COB Flow"`, `description: "Decision-support for coordination of benefits."`.
- Remove scaffold boilerplate.

---

## 5. `lib/auth/session.ts` additions

Add `getActiveTenant()`:

```ts
export async function getActiveTenant(): Promise<string> {
  // Default to t_carrier (Lakeshore Health Plan) — the pass-1 single tenant and the demo's opening posture.
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  return jar.get("cob_tenant_id")?.value ?? "t_carrier";
}
```

Existing `getCurrentUser()`, `signIn()`, `signOut()` are unchanged.

---

## 6. Server Actions — `lib/actions/auth.ts`

### `signInAction(formData: FormData)`

Reads `userId` (demo accounts picker — hidden input) or falls back to `email` (form input). Calls `signIn(id, password)` from `lib/auth/session.ts`.
- Success → `redirect('/dashboard')`
- Failure → `redirect('/signin?error=Invalid+credentials')`

### `signOutAction()`

Calls `signOut()` from `lib/auth/session.ts`. Then `redirect('/signin')`.

---

## 7. Server Actions — `lib/actions/session.ts`

### `setRoleToggleAction()`

Role-toggle cycle — keyed on user ID, anchored to Team A's demo roster:

| Current `cob_user_id` | Next `cob_user_id` | Role |
|---|---|---|
| `u_jm` (J. Mueller) | `u_tr` | SUPERVISOR |
| `u_tr` (T. Ramos) | `u_db` | MANAGER |
| `u_db` (D. Berger) | `u_ad` | ADMIN |
| `u_ad` (S. Patel) | `u_jm` | ANALYST |
| _(any other)_ | `u_jm` | ANALYST |

Reads `cob_user_id` cookie, maps to next user ID, writes cookie, calls `revalidatePath('/', 'layout')`. No return value. No `router.refresh()` in the client.

### `setActiveTenantAction(formData: FormData)`

Reads `tenantId` from formData, writes `cob_tenant_id` cookie, calls `revalidatePath('/', 'layout')`. No return value.

---

## 8. `lib/contexts/app-shell-context.tsx`

```ts
interface AppShellContextValue {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const AppShellContext = createContext<AppShellContextValue | null>(null);

export function useAppShell(): AppShellContextValue {
  const ctx = useContext(AppShellContext);
  if (!ctx) throw new Error("useAppShell must be used within AppShellClient");
  return ctx;
}
```

---

## 9. `components/layout/app-shell-client.tsx`

`"use client"`. Owns `sidebarOpen` useState. Wraps children in `<AppShellContext.Provider value={{ sidebarOpen, setSidebarOpen }}>`. No other logic.

---

## 10. Sign-in page — `app/(auth)/signin/page.tsx`

Pure Server Component. Reads `searchParams.error` to display inline error from a failed `signInAction`.

**Layout:** `bg-slate-50 min-h-screen flex items-center justify-center p-4`. Max-width container `w-full max-w-md`.

**Brand header:**
- `w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700` with "CF" white bold text
- "COB Flow" (`font-semibold text-slate-800`) + "Wisconsin pilot · MVP" (`text-xs text-slate-500`)

**Sign-in card** (`bg-white border border-slate-200 rounded-lg shadow-sm p-6`):
- `<form action={signInAction}>`:
  - Email input `name="email"`, `type="email"`, `placeholder="you@cobflow.dev"`
  - Password input `name="password"`, `type="password"`, `placeholder="••••••••"`
  - Inline error div when `searchParams.error` present (`text-xs text-red-700 bg-red-50 border border-red-200 rounded-md`)
  - "Forgot password?" — static `<span>` renders a hardcoded demo note inline; no server call, no separate action
  - Submit button: `w-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-md py-2.5`

**Demo accounts panel** (`bg-white border border-dashed border-slate-300 rounded-lg p-4 mt-4`):
- "Demo accounts" label + "Prototype only" badge (`text-[10px] uppercase tracking-wide text-slate-400`)
- One `<form action={signInAction}>` per user in `USERS`. Each form has `<input type="hidden" name="userId" value={u.id}>` and a `<button type="submit">` rendering: initials avatar, name, email (`${u.id}@cobflow.demo`), role chip. Hover: `hover:bg-slate-50 hover:border-slate-200`.
- No `"use client"` needed.

**Footer:** `"COB Flow · v0.8"` (`text-center text-[11px] text-slate-400 mt-6`)

---

## 11. `app/(auth)/layout.tsx`

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-slate-50 min-h-screen">{children}</div>;
}
```

No session check. Middleware handles the redirect for already-signed-in users hitting `/signin`.

---

## 12. App shell — `app/(app)/layout.tsx`

Server Component.

1. Calls `getCurrentUser()` — if `null` → `redirect('/signin')` (defense-in-depth alongside middleware).
2. Calls `getActiveTenant()`.
3. Renders:

```tsx
<AppShellClient>
  <div className="min-h-screen flex flex-col">
    <TopBar currentUser={currentUser} activeTenantId={activeTenantId} />
    <div className="flex flex-1">
      <Sidebar currentUser={currentUser} />
      <main className="flex-1 p-4 sm:p-6 max-w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  </div>
</AppShellClient>
```

---

## 13. Top bar

### `components/layout/top-bar.tsx` — Server Component

Renders static brand mark (gradient "CF" logo + "COB Flow" text + "Wisconsin pilot · MVP" pill, hidden on mobile via `hidden sm:inline-flex`). Passes `currentUser` and `activeTenantId` as props to `<TopBarClient>`.

Outer: `bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-6 h-14 sticky top-0 z-30`.

### `components/layout/top-bar-client.tsx` — `"use client"`

Props: `currentUser: CurrentUser`, `activeTenantId: string`. Four interactive zones — no `useState` except what DropdownMenu manages internally:

1. **Hamburger** (`md:hidden`) — `<button aria-label="Toggle sidebar" onClick={() => setSidebarOpen(o => !o)}>` via `useAppShell()`. Renders menu/close lucide icon based on `sidebarOpen`.

2. **Tenant dropdown** — `<form action={setActiveTenantAction}><select name="tenantId" defaultValue={activeTenantId} onChange={e => e.currentTarget.form?.requestSubmit()}>`. Renders all `TENANTS` as options. No `router.refresh()`.

3. **Role toggle** — `<form action={setRoleToggleAction}><button type="submit" title="Toggle demo role: Analyst → Supervisor → Manager → Admin → Analyst">` containing `<RoleChip role={currentUser.roles[0]} initials={currentUser.initials} showLabel />`. No `router.refresh()`.

4. **Account menu** — shadcn/ui `DropdownMenu`. Trigger: initials avatar button (`aria-label="Open account menu"`). Content:
   - `DropdownMenuLabel`: name + `<RoleChip>` + email
   - `DropdownMenuSeparator`
   - Non-interactive item: "COB Flow · v0.8"
   - `DropdownMenuSeparator`
   - Sign-out item: `<form action={signOutAction}><button type="submit">` with lucide `LogOut` icon + "Sign out"

---

## 14. Sidebar

### `components/layout/sidebar.tsx` — Server Component

Calls `getCurrentUser()` (hits the same cookie — no extra cost). Builds `navItems` filtered by role:

| Label | Path | Visible to |
|---|---|---|
| Dashboard | `/dashboard` | All |
| Claims & Triage | `/claims` | All |
| COB Analyzer | `/cob` | All |
| Recovery Tracker | `/recovery` | All |
| Management | `/management` (parent) | SUPERVISOR, MANAGER |
| → Overview | `/management/overview` | SUPERVISOR, MANAGER |
| → Team | `/management/team` | SUPERVISOR, MANAGER |
| Admin | `/admin` | ADMIN |

Renders `<SidebarNav navItems={navItems} />` for desktop and `<SidebarSheet navItems={navItems} />` for mobile.

`SidebarNav` is extracted to `components/layout/sidebar-nav.tsx`.

Outer aside: `hidden md:block w-56 shrink-0 border-r border-slate-200`.

Customer-mode info box at the bottom of the sidebar: reads `getActiveTenant()`, looks up tenant name + mode from `TENANTS`, renders `bg-slate-50 border border-slate-200 rounded-lg text-xs` box showing mode and "Data isolation: row-level".

### `SidebarNav` — `"use client"` (co-located in `sidebar.tsx` or extracted)

Uses `usePathname()`. Active detection: prefix match (`pathname.startsWith(item.path)`). Management parent shows children when `pathname.startsWith('/management')`. Active item style: `bg-brand-50 text-brand-700 font-medium`. Inactive: `text-slate-700 hover:bg-slate-100`. Child items indent with `ml-3 border-l border-slate-200 pl-3`.

### `components/layout/sidebar-sheet.tsx` — `"use client"`

Props: `navItems`. Reads `sidebarOpen` and `setSidebarOpen` from `useAppShell()`. On mobile: fixed overlay (`fixed inset-0 top-14 z-20 bg-white border-r border-slate-200 w-60 md:hidden`) shown when `sidebarOpen`. Semi-transparent backdrop behind it closes on click. Renders `<SidebarNav>` internally.

---

## 15. `components/shared/role-chip.tsx`

Props: `role: Role`, `initials: string`, `showLabel?: boolean`.

Role color map (from prototype):

| Role | Border | Background | Text |
|---|---|---|---|
| ANALYST | `border-slate-300` | `bg-slate-200` | `text-slate-700` |
| SUPERVISOR | `border-violet-300` | `bg-violet-200` | `text-violet-900` |
| MANAGER | `border-emerald-300` | `bg-emerald-200` | `text-emerald-900` |
| ADMIN | `border-amber-300` | `bg-amber-200` | `text-amber-900` |

Renders: initials circle (`w-6 h-6 rounded-full text-[10px] font-semibold`) + optional role label (`text-xs`). Wrapped in a `flex items-center gap-1.5` container with the border and background applied.

Uses `ROLE_LABELS` from `lib/mock/role-labels.ts` for the display label string.

---

## 16. Placeholder and boundary pages

### `app/(app)/dashboard/page.tsx`

```tsx
export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-800">Dashboard</h1>
      <div className="bg-white border border-slate-200 rounded-lg p-6 text-sm text-slate-500">
        Coming in Phase C.
      </div>
    </div>
  );
}
```

### `app/(app)/error.tsx` — `"use client"`

Props: `error: Error & { digest?: string }`, `reset: () => void`.

Renders centered empty-state card inside the app shell:
- Headline: "Something went wrong"
- Error message: shown only in `process.env.NODE_ENV === 'development'`
- "Try again" button calling `reset()`

### `app/(app)/not-found.tsx` — Server Component

Catches `notFound()` thrown from within the `(app)` route group (Phase D Claim Detail uses this for unknown claim IDs).

Renders empty-state card:
- Headline: "404 — Page not found"
- "Back to Dashboard" `<Link href="/dashboard">`

### `app/global-error.tsx` — `"use client"`

Outer boundary. Wraps its own `<html><body>` (required by Next.js). Complement to `(app)/error.tsx` for errors that fire before the app shell renders.

```tsx
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html><body>
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-md w-full text-center space-y-3">
          <p className="text-sm font-semibold text-slate-800">Something went wrong</p>
          <button onClick={reset} className="text-sm text-brand-700 hover:underline">Try again</button>
        </div>
      </div>
    </body></html>
  );
}
```

---

## 17. Acceptance criteria for Phase B

- [ ] `npm run build` succeeds with no warnings
- [ ] `npm run typecheck` clean
- [ ] Visiting `/` redirects to `/signin` when signed out; redirects to `/dashboard` when signed in
- [ ] Sign-in via email form works (any non-empty password) for all 9 seeded users
- [ ] Sign-in via demo accounts panel works for all 9 seeded users without typing
- [ ] Sign-out from account menu clears session and returns to `/signin`
- [ ] Role toggle cycles J. Mueller → T. Ramos → D. Berger → S. Patel → J. Mueller
- [ ] After role toggle, sidebar nav adjusts: Management appears for SUPERVISOR/MANAGER, disappears for ANALYST/ADMIN; Admin appears for ADMIN only
- [ ] Tenant dropdown updates the customer-mode info box in the sidebar
- [ ] Mobile sidebar sheet opens on hamburger tap, closes on backdrop click, hidden on `md:` and above
- [ ] Account menu (`DropdownMenu`) opens, shows user info and role chip, closes on outside click
- [ ] No `user.role === "..."` string comparisons outside `lib/authority/roles.ts`
- [ ] No `useState` for role or tenant in any client component
- [ ] `app/(app)/not-found.tsx` renders when navigating to `/claims/nonexistent`
