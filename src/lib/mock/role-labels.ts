import type { Role } from "@/lib/types/role";

export interface RoleLabel {
  label: string;
  color: string;
}

/**
 * Display labels for roles and the "Senior Analyst" display variant.
 *
 * NOTE: "SENIOR_ANALYST" is NOT a Role in the type system — it is a display-only
 * key used here to render a combined "Senior Analyst" label for ANALYST users with
 * level: "SENIOR". Components should derive this from role + level, not store it.
 */
export type RoleLabelKey = Role | "SENIOR_ANALYST";

export const ROLE_LABELS: Record<RoleLabelKey, RoleLabel> = {
  ANALYST:        { label: "Analyst",        color: "bg-slate-100 text-slate-700" },
  SENIOR_ANALYST: { label: "Senior Analyst", color: "bg-blue-100 text-blue-800" },
  SUPERVISOR:     { label: "Supervisor",     color: "bg-violet-100 text-violet-800" },
  MANAGER:        { label: "Manager",        color: "bg-emerald-100 text-emerald-800" },
  ADMIN:          { label: "Admin",          color: "bg-amber-100 text-amber-800" },
};
