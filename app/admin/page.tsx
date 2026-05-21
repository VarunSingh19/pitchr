"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Mail,
  DollarSign,
  Activity,
  ShieldAlert,
  ChevronRight,
  ArrowUpRight,
  Settings,
  Key,
  Loader2,
} from "lucide-react";

interface DashboardData {
  users: {
    total: number;
    active: number;
  };
  campaigns: {
    total: number;
    draft: number;
    generating: number;
    ready: number;
    sending: number;
    completed: number;
    failed: number;
  };
  emails: {
    total: number;
    queued: number;
    generated: number;
    sent: number;
    failed: number;
    bounced: number;
    replied: number;
  };
  financials: {
    totalSpend: number;
    totalTokens: number;
    totalCalls: number;
    successCalls: number;
    failedCalls: number;
  };
  apiKeys: {
    total: number;
    active: number;
    rateLimited: number;
  };
  blacklist: {
    total: number;
  };
  recentCampaigns: Array<{
    _id: string;
    name: string;
    leadsCount: number;
    sentCount: number;
    failedCount: number;
    status: string;
    createdAt: string;
    user: {
      name: string;
      email: string;
      image?: string;
    } | null;
  }>;
  recentActivities: Array<{
    id: string;
    type: "campaign" | "user" | "blacklist";
    title: string;
    description: string;
    user?: {
      name: string;
      email: string;
      image?: string;
    };
    createdAt: string;
  }>;
  dailyEmailStats: Array<{
    date: string;
    sent: number;
    failed: number;
  }>;
  systemApiKeys: Array<{
    _id: string;
    provider: string;
    label: string;
    isActive: boolean;
    usageCount: number;
    averageLatencyMs: number;
    rateLimited: boolean;
  }>;
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load statistics");
        return res.json();
      })
      .then((json) => {
        setData(json);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "An error occurred");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
        <p className="text-sm font-semibold text-text-muted">Assembling dashboard analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center max-w-md mx-auto my-20">
        <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h3 className="text-base font-bold text-red-400">Failed to load statistics</h3>
        <p className="text-xs text-text-muted mt-2">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-5 px-5 py-2.5 bg-red-500 hover:bg-red-400 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-red-500/10"
        >
          Retry
        </button>
      </div>
    );
  }

  // Helper computations
  const totalEmailsAttempted = (data?.emails.sent ?? 0) + (data?.emails.failed ?? 0) + (data?.emails.bounced ?? 0);
  const deliverabilityRate = totalEmailsAttempted > 0
    ? (((data?.emails.sent ?? 0) / totalEmailsAttempted) * 100).toFixed(1)
    : "100";
  const bounceRate = data?.emails.sent && data.emails.sent > 0
    ? ((data.emails.bounced / data.emails.sent) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-8 animate-fade-in text-text-primary">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-sm text-text-muted">
            Platform performance, cost aggregations, and live system monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          
          <span className="text-xs font-semibold text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20">
            Live Sync
          </span>
        </div>
      </div>

      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 p-6 md:p-8 text-white border border-violet-500/20 shadow-xl shadow-indigo-900/10">
        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none"></div>
        <div className="absolute left-1/3 bottom-0 -mb-16 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/10 border border-white/20 backdrop-blur-md mb-4">
            ✨ System Status Overview
          </span>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            System is fully operational! 🚀
          </h2>
          <p className="text-white/80 text-sm md:text-base leading-relaxed">
            Overall deliverability is running at <strong className="text-white">{deliverabilityRate}%</strong> with a total of <strong className="text-white">{(data?.emails.sent ?? 0).toLocaleString()} successful deliveries</strong>. The load balancer pool currently contains <strong className="text-white">{data?.apiKeys.active} active API keys</strong> with {data?.apiKeys.rateLimited} keys cooling down.
          </p>
        </div>
      </div>

      {/* Large Gradient KPI Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Spend Tracker Card */}
        <div className="group relative overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-amber-500/10 p-6 hover:scale-[1.01] hover:shadow-xl hover:shadow-orange-950/5 transition-all duration-300">
          <div className="absolute right-4 top-4 opacity-10 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none">
            <DollarSign className="w-24 h-24 text-orange-400" />
          </div>
          <div className="flex items-center gap-3.5 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
              <DollarSign className="w-5.5 h-5.5 text-orange-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-orange-400/80 uppercase tracking-wider">AI Costs & Token Spend</p>
              <p className="text-[10px] text-text-muted mt-0.5">Estimated USD cost from token consumption</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2.5">
            <p className="text-4xl font-extrabold tracking-tight text-text-primary">
              ${data?.financials.totalSpend.toFixed(2)}
            </p>
            <span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-lg border border-orange-500/20">
              {(data?.financials.totalTokens ?? 0).toLocaleString()} tokens
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-border-default/40 flex items-center justify-between text-xs text-text-muted">
            <span>Calls: <strong>{data?.financials.totalCalls}</strong> (Success: {data?.financials.successCalls})</span>
            <Link href="/admin/financials" className="text-orange-400 hover:text-orange-300 font-semibold inline-flex items-center gap-0.5">
              Details <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Deliverability Card */}
        <div className="group relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 to-purple-500/10 p-6 hover:scale-[1.01] hover:shadow-xl hover:shadow-indigo-950/5 transition-all duration-300">
          <div className="absolute right-4 top-4 opacity-10 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none">
            <Mail className="w-24 h-24 text-indigo-400" />
          </div>
          <div className="flex items-center gap-3.5 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <Mail className="w-5.5 h-5.5 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-indigo-400/80 uppercase tracking-wider">Campaign Deliverability</p>
              <p className="text-[10px] text-text-muted mt-0.5">Sent vs failed email delivery percentages</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2.5">
            <p className="text-4xl font-extrabold tracking-tight text-text-primary">
              {deliverabilityRate}%
            </p>
            <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">
              {(data?.emails.sent ?? 0).toLocaleString()} sent
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-border-default/40 flex items-center justify-between text-xs text-text-muted">
            <span>Replied: <strong>{data?.emails.replied}</strong> (Bounce rate: {bounceRate}%)</span>
            <Link href="/admin/campaigns" className="text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-0.5">
              Analytics <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Section 2: Charts and Activities */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Charts (Left) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Campaign Overview Bar Chart */}
          <div className="bg-bg-surface border border-border-default rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
              <div>
                <h3 className="text-base font-bold">Email Volume Trend</h3>
                <p className="text-xs text-text-muted mt-0.5">Daily delivery outcome volumes (Last 30 Days)</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-md bg-green-400 inline-block"></span>
                  <span className="text-text-secondary">Delivered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-md bg-red-400 inline-block"></span>
                  <span className="text-text-secondary">Bounced / Failed</span>
                </div>
              </div>
            </div>
            
            <div className="h-[180px] w-full flex items-end">
              <EmailTrendBarChart stats={data?.dailyEmailStats || []} />
            </div>
          </div>

          {/* Email status distribution donut chart */}
          <div className="bg-bg-surface border border-border-default rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-bold mb-1">Email Status Distribution</h3>
            <p className="text-xs text-text-muted mb-6">Aggregate ratios of system-wide cold email delivery outcomes</p>
            <div className="grid sm:grid-cols-12 gap-6 items-center">
              {/* Donut graphic */}
              <div className="sm:col-span-5 flex justify-center">
                <EmailStatusDonutChart emails={data?.emails || { total: 0, sent: 0, failed: 0, replied: 0, bounced: 0, queued: 0, generated: 0 }} />
              </div>
              {/* Legend breakdown */}
              <div className="sm:col-span-7 space-y-3.5">
                {(() => {
                  const emails = data?.emails || { sent: 0, replied: 0, bounced: 0, failed: 0, queued: 0, total: 1 };
                  const total = emails.total || 1;
                  const legend = [
                    { label: "Successful Deliveries", count: emails.sent, color: "bg-green-400", text: "text-green-400" },
                    { label: "Lead Replies", count: emails.replied, color: "bg-indigo-400", text: "text-indigo-400" },
                    { label: "Bounces detected", count: emails.bounced, color: "bg-amber-400", text: "text-amber-400" },
                    { label: "Failed runs", count: emails.failed, color: "bg-red-400", text: "text-red-400" },
                  ];
                  return legend.map(item => {
                    const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : "0.0";
                    return (
                      <div key={item.label} className="flex items-center justify-between text-sm border-b border-border-default/45 pb-2 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${item.color}`}></span>
                          <span className="text-text-secondary">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <strong className="text-text-primary font-semibold">{item.count}</strong>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md bg-white/5 ${item.text}`}>{pct}%</span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activities Feed (Right) */}
        <div className="lg:col-span-4">
          <div className="bg-bg-surface border border-border-default rounded-3xl p-6 h-full flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <div>
                <h3 className="text-base font-bold">Recent Activities</h3>
                <p className="text-[11px] text-text-muted mt-0.5">Chronological system events stream</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-md border border-orange-500/20">
                Live
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
              {data?.recentActivities && data.recentActivities.length > 0 ? (
                data.recentActivities.map((act) => {
                  let colorClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                  let Icon = Users;
                  if (act.type === "campaign") {
                    colorClass = "bg-green-500/10 text-green-400 border-green-500/20";
                    Icon = Mail;
                  } else if (act.type === "blacklist") {
                    colorClass = "bg-red-500/10 text-red-400 border-red-500/20";
                    Icon = ShieldAlert;
                  }

                  return (
                    <div key={act.id} className="flex gap-4 items-start relative group">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center border flex-shrink-0 ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-text-primary group-hover:text-orange-400 transition-colors">
                            {act.title}
                          </p>
                          <span className="text-[10px] text-text-muted whitespace-nowrap">
                            {formatRelativeTime(act.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary mt-1 line-clamp-2 leading-relaxed">
                          {act.description}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-12 text-text-muted">
                  <Activity className="w-8 h-8 text-text-faint mb-2 animate-pulse" />
                  <span className="text-xs">No recent activity logged</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Tables Grid */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Recent Campaigns Table (Bottom Left) */}
        <div className="lg:col-span-8 bg-bg-surface border border-border-default rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold">Active & Recent Campaigns</h3>
              <p className="text-xs text-text-muted mt-0.5">Monitor progression states of campaign runs</p>
            </div>
            <Link href="/admin/campaigns" className="text-xs font-semibold text-orange-400 hover:text-orange-300 inline-flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-default/60 text-[11px] font-semibold uppercase tracking-wider text-text-muted pb-3">
                  <th className="pb-3 text-left">Campaign details</th>
                  <th className="pb-3 text-left">User</th>
                  <th className="pb-3 text-left">Progress</th>
                  <th className="pb-3 text-left">Status</th>
                  <th className="pb-3 pr-2 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default/40 text-xs">
                {data?.recentCampaigns && data.recentCampaigns.length > 0 ? (
                  data.recentCampaigns.map((camp) => {
                    const statusColors = {
                      DRAFT: "text-text-muted bg-bg-elevated border-border-default/40",
                      GENERATING: "text-blue-400 bg-blue-500/10 border-blue-500/20",
                      READY: "text-green-400 bg-green-500/10 border-green-500/20",
                      SENDING: "text-orange-400 bg-orange-500/10 border-orange-500/20",
                      COMPLETED: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
                      FAILED: "text-red-400 bg-red-500/10 border-red-500/20",
                    } as Record<string, string>;

                    return (
                      <tr key={camp._id} className="hover:bg-bg-elevated/20 transition-colors group">
                        <td className="py-3.5 pr-2">
                          <p className="font-bold text-text-primary group-hover:text-orange-400 transition-colors">
                            {camp.name}
                          </p>
                          <p className="text-[10px] text-text-muted font-mono mt-0.5">
                            {new Date(camp.createdAt).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="py-3.5 pr-2">
                          {camp.user ? (
                            <div className="flex items-center gap-2">
                              {camp.user.image ? (
                                <img src={camp.user.image} alt={camp.user.name} className="w-5.5 h-5.5 rounded-md object-cover" />
                              ) : (
                                <div className="w-5.5 h-5.5 rounded-md bg-bg-elevated flex items-center justify-center text-[9px] border border-border-default text-text-muted">
                                  {camp.user.name.slice(0, 1)}
                                </div>
                              )}
                              <div className="min-w-0 max-w-[120px]">
                                <p className="font-semibold text-text-secondary truncate">{camp.user.name}</p>
                                <p className="text-[10px] text-text-faint truncate">{camp.user.email}</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-text-faint">System</span>
                          )}
                        </td>
                        <td className="py-3.5 pr-2 font-medium">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span>{camp.sentCount} / {camp.leadsCount} sent</span>
                            </div>
                            <div className="w-24 bg-bg-elevated border border-border-default/60 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-orange-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, (camp.sentCount / (camp.leadsCount || 1)) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 pr-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${statusColors[camp.status] || "text-text-muted"}`}>
                            {camp.status}
                          </span>
                        </td>
                        <td className="py-3.5 pr-2 text-right">
                          <Link
                            href={`/admin/campaigns`}
                            className="p-1.5 rounded-lg text-text-muted hover:text-orange-400 hover:bg-orange-500/10 inline-flex items-center justify-center transition-colors"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-text-muted">
                      No campaigns run yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* API Key Health monitor (Bottom Right) */}
        <div className="lg:col-span-4 bg-bg-surface border border-border-default rounded-3xl p-6 shadow-sm flex flex-col min-h-[300px]">
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <div>
              <h3 className="text-base font-bold">API Key Health</h3>
              <p className="text-xs text-text-muted mt-0.5">Load balancer pool keys & latency stats</p>
            </div>
            <Link href="/admin/api-keys" className="text-xs font-semibold text-orange-400 hover:text-orange-300 inline-flex items-center gap-0.5">
              Manage <Settings className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-1 custom-scrollbar">
            {data?.systemApiKeys && data.systemApiKeys.length > 0 ? (
              data.systemApiKeys.map((key) => {
                const providers = {
                  gemini: "text-blue-400 bg-blue-500/10 border-blue-500/20",
                  nvidia: "text-green-400 bg-green-500/10 border-green-500/20",
                  claude: "text-orange-400 bg-orange-500/10 border-orange-500/20",
                } as Record<string, string>;

                return (
                  <div key={key._id} className="flex items-center justify-between border-b border-border-default/45 pb-3 last:border-0 last:pb-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate text-text-primary">
                        {key.label || "System Key"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${providers[key.provider] || "text-text-muted"}`}>
                          {key.provider}
                        </span>
                        <span className="text-[10px] text-text-muted font-mono">{key.usageCount} calls</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${
                        key.isActive && !key.rateLimited
                          ? "text-green-400 bg-green-500/10"
                          : key.rateLimited
                          ? "text-amber-400 bg-amber-500/10 animate-pulse"
                          : "text-red-400 bg-red-500/10"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          key.isActive && !key.rateLimited
                            ? "bg-green-400"
                            : key.rateLimited
                            ? "bg-amber-400"
                            : "bg-red-400"
                        }`} />
                        {key.isActive && !key.rateLimited ? "Healthy" : key.rateLimited ? "Cooling" : "Disabled"}
                      </span>
                      <p className="text-[10px] text-text-muted mt-1 font-semibold">{key.averageLatencyMs}ms</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 text-text-muted">
                <Key className="w-8 h-8 text-text-faint mb-2" />
                <span className="text-xs">No system keys added yet</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Chart Helpers
function getFilledStats(stats: Array<{ date: string; sent: number; failed: number }>) {
  if (stats && stats.length > 0) return stats;
  // If empty, generate the last 7 days with 0 stats so the chart is drawn beautifully
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    result.push({ date: dateStr, sent: 0, failed: 0 });
  }
  return result;
}

function EmailTrendBarChart({ stats }: { stats: Array<{ date: string; sent: number; failed: number }> }) {
  const filledStats = getFilledStats(stats);
  const maxVal = Math.max(...filledStats.map((d) => d.sent + d.failed), 10);

  const width = 500;
  const height = 150;
  const pl = 35;
  const pr = 10;
  const pt = 15;
  const pb = 20;

  const chartHeight = height - pt - pb;
  const chartWidth = width - pl - pr;
  const n = filledStats.length;
  const step = chartWidth / n;
  const barWidth = Math.max(4, step * 0.25);

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full text-text-muted font-mono select-none">
      {/* Grid lines & Y-axis labels */}
      {gridLines.map((gl, index) => {
        const y = pt + chartHeight * (1 - gl);
        const val = Math.round(maxVal * gl);
        return (
          <g key={index} className="opacity-40">
            <line x1={pl} y1={y} x2={width - pr} y2={y} stroke="var(--border-default)" strokeWidth="1" strokeDasharray="4 4" />
            <text x={pl - 8} y={y + 4} textAnchor="end" className="text-[9px] fill-text-muted font-semibold">{val}</text>
          </g>
        );
      })}

      {/* Bars */}
      {filledStats.map((d, i) => {
        const xCenter = pl + i * step + step / 2;
        const sentHeight = (d.sent / maxVal) * chartHeight;
        const failedHeight = (d.failed / maxVal) * chartHeight;

        const xSent = xCenter - barWidth - 1;
        const ySent = pt + chartHeight - sentHeight;

        const xFailed = xCenter + 1;
        const yFailed = pt + chartHeight - failedHeight;

        return (
          <g key={i}>
            {/* Sent bar (Green/Delivered) */}
            {d.sent > 0 && (
              <rect
                x={xSent}
                y={ySent}
                width={barWidth}
                height={sentHeight}
                rx={Math.min(2, barWidth / 2)}
                className="fill-green-400 hover:fill-green-300 transition-colors cursor-pointer"
              >
                <title>{`Delivered: ${d.sent}`}</title>
              </rect>
            )}

            {/* Failed bar (Red/Failed) */}
            {d.failed > 0 && (
              <rect
                x={xFailed}
                y={yFailed}
                width={barWidth}
                height={failedHeight}
                rx={Math.min(2, barWidth / 2)}
                className="fill-red-400 hover:fill-red-300 transition-colors cursor-pointer"
              >
                <title>{`Failed/Bounced: ${d.failed}`}</title>
              </rect>
            )}

            {/* X-axis date labels */}
            {(n <= 10 || i % Math.floor(n / 6) === 0) && (
              <text x={xCenter} y={height - 4} textAnchor="middle" className="text-[9px] fill-text-muted font-semibold">
                {d.date}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function EmailStatusDonutChart({ emails }: { emails: any }) {
  const segments = [
    { label: "Sent", count: emails.sent ?? 0, color: "stroke-green-400" },
    { label: "Replied", count: emails.replied ?? 0, color: "stroke-indigo-400" },
    { label: "Bounced", count: emails.bounced ?? 0, color: "stroke-amber-400" },
    { label: "Failed", count: emails.failed ?? 0, color: "stroke-red-400" },
  ];

  const totalCounts = segments.reduce((sum, s) => sum + s.count, 0);
  const isNoData = totalCounts === 0;
  
  let currentOffset = 0;
  const processedSegments = segments.map((s) => {
    const percentage = isNoData ? 0 : s.count / totalCounts;
    const strokeLength = percentage * 251.327; // C = 2 * PI * r (r = 40)
    const strokeOffset = currentOffset;
    currentOffset += strokeLength;
    return {
      ...s,
      percentage: Math.round(percentage * 100),
      strokeDasharray: `${strokeLength} 251.327`,
      strokeDashoffset: -strokeOffset,
    };
  });

  return (
    <div className="relative w-40 h-40 flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-full h-full transform select-none">
        <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--border-default)" strokeWidth="12" />
        
        {isNoData ? (
          <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--border-subtle)" strokeWidth="12" />
        ) : (
          processedSegments.map((s, i) => (
            s.count > 0 && (
              <circle
                key={i}
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                className={`${s.color} transition-all duration-500`}
                strokeWidth="12"
                strokeDasharray={s.strokeDasharray}
                strokeDashoffset={s.strokeDashoffset}
                transform="rotate(-90 50 50)"
              />
            )
          ))
        )}
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-black text-text-primary tracking-tight">{isNoData ? "0" : totalCounts.toLocaleString()}</p>
        <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider mt-0.5">Total Emails</p>
      </div>
    </div>
  );
}

// Relative time formatter
function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
}
