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
  Shield,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PlanBadge } from "@/components/plan-badge";
import { ThemeToggle } from "@/components/landing/theme-toggle";

interface DashboardShellProps {
  user: {
    name: string;
    email: string;
    image: string;
    role?: string;
    plan?: string;
  };
  isImpersonating?: boolean;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/campaign/new", label: "New Campaign", icon: PlusCircle },
  { href: "/dashboard/history", label: "History", icon: History },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard/billing", label: "Billing & Usage", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardShell({ user, isImpersonating = false, children }: DashboardShellProps) {
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
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "flex flex-col border-r-2 border-border bg-card transition-all duration-300 ease-in-out flex-shrink-0",
          collapsed ? "w-[60px]" : "w-[220px]"
        )}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-3 border-b-2 border-border">
          <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
            <img src="/icon.png" alt="Pitchr Logo" className="w-8 h-8 object-contain flex-shrink-0" />
            {!collapsed && (
              <span className="font-pixel text-sm tracking-tight whitespace-nowrap text-foreground">
                PITCHR
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
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
                  "flex items-center gap-2.5 px-2.5 py-2 text-xs font-mono font-medium uppercase tracking-wider transition-all duration-150",
                  isActive
                    ? "bg-[#ea580c]/10 text-[#ea580c] border-l-2 border-[#ea580c]"
                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/5 border-l-2 border-transparent"
                )}
                title={collapsed ? label : undefined}
              >
                <Icon className={cn("w-4 h-4 flex-shrink-0", isActive && "text-[#ea580c]")} />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Admin link — only for admin users */}
        {user.role === "admin" && (
          <div className="px-2 pb-1">
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 text-xs font-mono font-medium uppercase tracking-wider transition-all duration-150",
                pathname.startsWith("/admin")
                  ? "bg-[#FBBF24]/10 text-[#FBBF24] border-l-2 border-[#FBBF24]"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/5 border-l-2 border-transparent"
              )}
              title={collapsed ? "Admin Panel" : undefined}
            >
              <Shield className={cn("w-4 h-4 flex-shrink-0", pathname.startsWith("/admin") && "text-[#FBBF24]")} />
              {!collapsed && <span className="truncate">Admin</span>}
            </Link>
          </div>
        )}

        {/* Collapse toggle & Theme toggle */}
        <div className={cn("mx-2 mb-2 flex items-center gap-2", collapsed ? "flex-col" : "flex-row")}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "p-1.5 text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors flex items-center justify-center border border-border",
              collapsed ? "w-full" : "flex-1"
            )}
          >
            {collapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>
          <ThemeToggle />
        </div>

        {/* User section */}
        <div className="border-t-2 border-border p-2 space-y-1">
          <Link
            href="/dashboard/billing"
            className="flex items-center gap-2 px-2 py-2 overflow-hidden hover:bg-foreground/5 transition-all duration-150 cursor-pointer text-left w-full group"
          >
            {user.image ? (
              <img
                src={user.image}
                alt={user.name}
                className="w-7 h-7 flex-shrink-0 object-cover border-2 border-border group-hover:border-[#ea580c] transition-colors"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 bg-foreground/5 flex items-center justify-center flex-shrink-0 border-2 border-border group-hover:border-[#ea580c] transition-colors">
                <UserIcon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-[#ea580c]" />
              </div>
            )}
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-mono font-medium truncate text-foreground group-hover:text-[#ea580c] transition-colors">
                    {user.name}
                  </p>
                  <PlanBadge plan={user.plan || "free"} />
                </div>
                <p className="text-[9px] font-mono text-muted-foreground truncate">{user.email}</p>
              </div>
            )}
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className={cn(
              "flex items-center gap-2 w-full px-2.5 py-2 text-xs font-mono text-muted-foreground hover:text-red-400 hover:bg-red-400/5 transition-colors uppercase tracking-wider",
              collapsed && "justify-center"
            )}
            title={collapsed ? "Sign out" : undefined}
          >
            <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto bg-background dot-grid-bg flex flex-col">
        {isImpersonating && (
          <div className="bg-[#FBBF24] text-black px-6 py-3 flex items-center justify-between flex-shrink-0 animate-fade-in border-b-2 border-[#FBBF24]/80">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest">
              <span>⚠</span>
              <span>
                Impersonating: <strong>{user.email}</strong>
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
                    window.location.reload();
                  } else {
                    alert("Failed to stop impersonation");
                  }
                } catch {
                  alert("Failed to stop impersonation");
                }
              }}
              className="bg-black text-[#FBBF24] px-4 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-black/80 transition-colors"
            >
              Stop
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
