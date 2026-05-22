import { SidebarNav, type NavItem } from "./sidebar-nav";
import { SidebarSheet } from "./sidebar-sheet";
import { TENANTS } from "@/lib/mock/tenants";
import { isAdmin, isSupervisor, isManager } from "@/lib/authority/roles";
import { getActiveTenant } from "@/lib/auth/session";
import type { CurrentUser } from "@/lib/auth/session";

interface SidebarProps {
  currentUser: CurrentUser;
}

export async function Sidebar({ currentUser }: SidebarProps) {
  const activeTenantId = await getActiveTenant();
  const tenant = TENANTS.find((t) => t.id === activeTenantId);

  const allItems: NavItem[] = [
    { id: "dashboard", label: "Dashboard",        href: "/dashboard", iconId: "LayoutDashboard" },
    { id: "claims",    label: "Claims & Triage",  href: "/claims",    iconId: "FileText"        },
    { id: "cob",       label: "COB Analyzer",     href: "/cob",       iconId: "Activity"        },
    { id: "recovery",  label: "Recovery Tracker", href: "/recovery",  iconId: "DollarSign"      },
    ...(isSupervisor(currentUser) || isManager(currentUser)
      ? [{
          id: "management",
          label: "Management",
          href: "/management",
          iconId: "Users",
          children: [
            { id: "mgmt-overview", label: "Overview", href: "/management/overview" },
            { id: "mgmt-team",     label: "Team",     href: "/management/team"     },
          ],
        }]
      : []),
    ...(isAdmin(currentUser)
      ? [
          { id: "admin", label: "Admin", href: "/admin", iconId: "Settings" },
          { id: "admin-content", label: "Content", href: "/admin/content", iconId: "Library" },
        ]
      : []),
  ];

  const navContent = (
    <>
      <SidebarNav navItems={allItems} />
      {tenant && (
        <div className="p-3 mx-3 mt-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
          <div className="font-semibold text-slate-700 mb-1">Customer mode</div>
          <div>{tenant.mode}</div>
          <div className="mt-2 text-slate-500">Data isolation: row-level</div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop sidebar — always visible at md+ */}
      <aside className="hidden md:block w-56 shrink-0 border-r border-slate-200 overflow-y-auto">
        {navContent}
      </aside>

      {/* Mobile overlay — reads sidebarOpen from AppShellContext */}
      <SidebarSheet>
        {navContent}
      </SidebarSheet>
    </>
  );
}
