"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Mail,
  LayoutDashboard,
  PlusCircle,
  History,
  Inbox,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  user: {
    name: string;
    email: string;
    image: string;
  };
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/campaign/new", label: "New Campaign", icon: PlusCircle },
  { href: "/dashboard/history", label: "History", icon: History },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardShell({ user, children }: DashboardShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };

    // Initial check
    checkScreenSize();

    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "flex flex-col border-r border-border-default bg-bg-surface transition-all duration-300 ease-in-out flex-shrink-0",
          collapsed ? "w-[68px]" : "w-[240px]"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-border-default">
          <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-accent-primary flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-white" />
            </div>
            {!collapsed && (
              <span className="text-lg font-semibold tracking-tight whitespace-nowrap">
                Pitchr
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-accent-dim text-accent-primary"
                    : "text-text-muted hover:text-text-primary hover:bg-bg-elevated"
                )}
                title={collapsed ? label : undefined}
              >
                <Icon className={cn("w-[18px] h-[18px] flex-shrink-0", isActive && "text-accent-primary")} />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mx-3 mb-2 p-2 rounded-xl text-text-faint hover:text-text-muted hover:bg-bg-elevated transition-colors flex items-center justify-center"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>

        {/* User section */}
        <div className="border-t border-border-default p-3 space-y-1">
          <div className="flex items-center gap-2.5 px-2 py-2 overflow-hidden">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name}
                className="w-8 h-8 rounded-lg flex-shrink-0 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-4 h-4 text-text-muted" />
              </div>
            )}
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-text-faint truncate">{user.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className={cn(
              "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-text-muted hover:text-error hover:bg-error-dim transition-colors",
              collapsed && "justify-center"
            )}
            title={collapsed ? "Sign out" : undefined}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto bg-bg-base">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
