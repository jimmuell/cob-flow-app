"use client";

import { useState } from "react";
import { AppShellContext } from "@/lib/contexts/app-shell-context";

export function AppShellClient({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <AppShellContext.Provider value={{ sidebarOpen, setSidebarOpen }}>
      {children}
    </AppShellContext.Provider>
  );
}
