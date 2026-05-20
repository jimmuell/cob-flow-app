import { redirect } from "next/navigation";
import { getCurrentUser, getActiveTenant } from "@/lib/auth/session";
import { AppShellClient } from "@/components/layout/app-shell-client";
import { TopBar } from "@/components/layout/top-bar";
import { Sidebar } from "@/components/layout/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense-in-depth: middleware already redirects unauthenticated requests,
  // but this ensures correctness if middleware is bypassed or misconfigured.
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/signin");

  const activeTenantId = await getActiveTenant();

  return (
    // AppShellClient is the single context provider — TopBarClient and
    // SidebarSheet both call useAppShell() and receive the same instance.
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
  );
}
