"use client";

import { useAppShell } from "@/lib/contexts/app-shell-context";

interface SidebarSheetProps {
  children: React.ReactNode;
}

export function SidebarSheet({ children }: SidebarSheetProps) {
  // Same AppShellContext instance as TopBarClient — AppShellClient wraps both.
  const { sidebarOpen, setSidebarOpen } = useAppShell();

  if (!sidebarOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-10 bg-black/40 md:hidden"
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
      {/* Sheet */}
      <aside className="fixed inset-y-0 top-14 left-0 z-20 w-60 bg-white border-r border-slate-200 overflow-y-auto md:hidden">
        {children}
      </aside>
    </>
  );
}
