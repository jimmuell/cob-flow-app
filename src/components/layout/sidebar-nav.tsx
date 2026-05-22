"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Activity,
  DollarSign,
  Users,
  Settings,
  Library,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/classnames";

// Icon resolved on the client — functions can't cross the Server→Client boundary as props.
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  FileText,
  Activity,
  DollarSign,
  Users,
  Settings,
  Library,
};

export interface NavItem {
  id: string;
  label: string;
  href: string;
  iconId: string;
  children?: { id: string; label: string; href: string }[];
}

interface SidebarNavProps {
  navItems: NavItem[];
}

export function SidebarNav({ navItems }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="p-3 space-y-1">
      {navItems.map((item) => {
        const isParentActive =
          item.children?.some((c) => pathname.startsWith(c.href)) ?? false;
        const isActive = item.children
          ? isParentActive
          : pathname.startsWith(item.href);

        const Icon = ICON_MAP[item.iconId];
        return (
          <div key={item.id}>
            {/* Parent item links to first child href if it has children */}
            <Link
              href={item.children ? item.children[0].href : item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm",
                isActive
                  ? "bg-brand-50 text-brand-700 font-medium"
                  : "text-slate-700 hover:bg-slate-100"
              )}
            >
              {Icon && <Icon className="w-5 h-5" />}
              {item.label}
            </Link>

            {item.children && isActive && (
              <div className="ml-3 mt-1 space-y-1 border-l border-slate-200 pl-3">
                {item.children.map((child) => {
                  const childActive = pathname.startsWith(child.href);
                  return (
                    <Link
                      key={child.id}
                      href={child.href}
                      className={cn(
                        "block px-3 py-1.5 rounded-md text-xs",
                        childActive
                          ? "bg-brand-100 text-brand-700 font-medium"
                          : "text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
