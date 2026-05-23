"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Shield,
  Key,
  LayoutDashboard,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  ArrowLeft,
  Users,
  Mail,
  Ban,
  Coins,
  Sliders,
  Zap,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminShellProps {
  user: {
    name: string;
    email: string;
    image: string;
  };
  isImpersonating?: boolean;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/api-keys", label: "API Keys", icon: Key },
  { href: "/admin/campaigns", label: "Campaigns", icon: Mail },
  { href: "/admin/blacklist", label: "Blacklist", icon: Ban },
  { href: "/admin/financials", label: "Financials", icon: Coins },
  { href: "/admin/prompts", label: "Prompts", icon: Sliders },
  { href: "/admin/inngest", label: "Queue Monitor", icon: Zap },
];

export function AdminShell({ user, isImpersonating = false, children }: AdminShellProps) {
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
          <Link href="/admin" className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-orange-400" />
            </div>
            {!collapsed && (
              <span className="text-lg font-semibold tracking-tight whitespace-nowrap">
                Admin Panel
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-orange-500/10 text-orange-400"
                    : "text-text-muted hover:text-text-primary hover:bg-bg-elevated"
                )}
                title={collapsed ? label : undefined}
              >
                <Icon className={cn("w-[18px] h-[18px] flex-shrink-0", isActive && "text-orange-400")} />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}

          <div className="!mt-4 pt-3 border-t border-border-default">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-all"
              title={collapsed ? "Back to Dashboard" : undefined}
            >
              <ArrowLeft className="w-[18px] h-[18px] flex-shrink-0" />
              {!collapsed && <span>Back to Dashboard</span>}
            </Link>
          </div>
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
      <main className="flex-1 overflow-y-auto bg-bg-base flex flex-col">
        {isImpersonating && (
          <div className="bg-amber-600 text-white px-6 py-3 flex items-center justify-between shadow-md flex-shrink-0 animate-fade-in border-b border-amber-700">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="text-base">⚠️</span>
              <span>
                <strong>Impersonation Active:</strong> You are viewing Pitchr as <strong>{user.email}</strong>.
              </span>
            </div>
            <button
              onClick={async () => {
                try {
                  const res = await fetch("/api/admin/impersonate", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                  });
                  if (res.ok) {
                    window.location.href = "/admin/users";
                  } else {
                    alert("Failed to stop impersonation");
                  }
                } catch {
                  alert("Failed to stop impersonation");
                }
              }}
              className="bg-white text-amber-700 px-3.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-amber-50 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Stop Impersonating
            </button>
          </div>
        )}
        <div className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
