import { cn } from "@/lib/utils/classnames";
import { ROLE_LABELS } from "@/lib/mock/role-labels";
import type { Role } from "@/lib/types/role";

interface RoleChipProps {
  role: Role;
  initials: string;
  showLabel?: boolean;
}

const ROLE_CHIP_COLORS: Record<Role, { border: string; bg: string; text: string }> = {
  ANALYST:    { border: "border-slate-300",   bg: "bg-slate-200",   text: "text-slate-700"  },
  SUPERVISOR: { border: "border-violet-300",  bg: "bg-violet-200",  text: "text-violet-900" },
  MANAGER:    { border: "border-emerald-300", bg: "bg-emerald-200", text: "text-emerald-900" },
  ADMIN:      { border: "border-amber-300",   bg: "bg-amber-200",   text: "text-amber-900"  },
};

export function RoleChip({ role, initials, showLabel = false }: RoleChipProps) {
  const colors = ROLE_CHIP_COLORS[role];
  const { label } = ROLE_LABELS[role];
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-1.5 py-1 rounded-md border",
        colors.border,
        colors.bg,
        colors.text
      )}
    >
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold">
        {initials}
      </div>
      {showLabel && <span className="hidden sm:inline text-xs font-medium">{label}</span>}
    </div>
  );
}
