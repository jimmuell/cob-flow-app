import { TopBarClient } from "./top-bar-client";
import type { CurrentUser } from "@/lib/auth/session";

interface TopBarProps {
  currentUser: CurrentUser;
  activeTenantId: string;
}

export function TopBar({ currentUser, activeTenantId }: TopBarProps) {
  return (
    <header className="bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-6 h-14 sticky top-0 z-30">
      {/* Brand */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-sm">
          CF
        </div>
        {/* text-sm on mobile keeps it single-line; text-base restores full weight at sm+ */}
        <span className="font-semibold text-sm sm:text-base text-slate-800">COB Flow</span>
        <span className="hidden sm:inline-flex text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full font-medium">
          Wisconsin pilot · MVP
        </span>
      </div>

      <TopBarClient currentUser={currentUser} activeTenantId={activeTenantId} />
    </header>
  );
}
