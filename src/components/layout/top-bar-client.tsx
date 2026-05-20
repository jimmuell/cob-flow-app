"use client";

import { useTransition } from "react";
import { Menu, X, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RoleChip } from "@/components/shared/role-chip";
import { useAppShell } from "@/lib/contexts/app-shell-context";
import { setActiveTenantAction, setRoleToggleAction } from "@/lib/actions/session";
import { signOutAction } from "@/lib/actions/auth";
import { TENANTS } from "@/lib/mock/tenants";
import type { CurrentUser } from "@/lib/auth/session";

interface TopBarClientProps {
  currentUser: CurrentUser;
  activeTenantId: string;
}

export function TopBarClient({ currentUser, activeTenantId }: TopBarClientProps) {
  // AppShellContext is provided by AppShellClient which wraps both TopBarClient
  // and SidebarSheet — they share the same context instance.
  const { sidebarOpen, setSidebarOpen } = useAppShell();
  const [, startTransition] = useTransition();
  const role = currentUser.roles[0];

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {/* Mobile sidebar toggle — writes to shared AppShellContext */}
      <button
        className="md:hidden p-2 -ml-1 rounded-md hover:bg-slate-100"
        aria-label="Toggle sidebar"
        onClick={() => setSidebarOpen((o) => !o)}
      >
        {sidebarOpen ? (
          <X className="w-5 h-5 text-slate-600" />
        ) : (
          <Menu className="w-5 h-5 text-slate-600" />
        )}
      </button>

      {/* Tenant dropdown — Server Action → revalidatePath → sidebar info box updates */}
      <form action={setActiveTenantAction}>
        <select
          name="tenantId"
          defaultValue={activeTenantId}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="text-xs sm:text-sm border border-slate-300 rounded-md py-1.5 px-2 bg-white text-slate-700 max-w-[100px] sm:max-w-none truncate"
        >
          {TENANTS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} — {t.mode}
            </option>
          ))}
        </select>
      </form>

      {/* Role toggle — Server Action → revalidatePath → sidebar nav re-gates, chip updates */}
      <form action={setRoleToggleAction}>
        <button
          type="submit"
          title="Toggle demo role: Analyst → Supervisor → Manager → Admin → Analyst"
          className="hover:opacity-90"
        >
          <RoleChip role={role} initials={currentUser.initials} showLabel />
        </button>
      </form>

      {/* Account menu — shadcn DropdownMenu for a11y */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Open account menu"
            className="flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-slate-100 border border-slate-200"
          >
            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 text-[10px] font-semibold flex items-center justify-center">
              {currentUser.initials}
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="pb-1">
            <div className="text-sm font-semibold text-slate-800 truncate">
              {currentUser.name}
            </div>
            <div className="mt-1">
              <RoleChip role={role} initials={currentUser.initials} showLabel />
            </div>
            <div className="text-xs text-slate-500 mt-1.5 truncate font-normal">
              {currentUser.id}@cobflow.demo
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled className="text-[11px] text-slate-500">
            COB Flow · v0.8
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => startTransition(() => { signOutAction(); })}
            className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-500" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
