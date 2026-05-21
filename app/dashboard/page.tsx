"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PlusCircle,
  Mail,
  Sparkles,
  Settings,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Loader2,
  ShieldAlert,
  Activity,
  Check,
} from "lucide-react";

interface DashboardStats {
  setup: {
    gmailConnected: boolean;
    resumeUploaded: boolean;
  };
  profile: {
    name: string;
    email: string;
    image?: string;
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
  recentCampaigns: Array<{
    _id: string;
    name: string;
    leadsCount: number;
    sentCount: number;
    failedCount: number;
    status: string;
    createdAt: string;
  }>;
  dailyEmailStats: Array<{
    date: string;
    sent: number;
    failed: number;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/dashboard-stats")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load dashboard statistics");
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
        <Loader2 className="w-10 h-10 animate-spin text-accent-primary" />
        <p className="text-sm font-semibold text-text-muted">Assembling your workspace stats...</p>
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
          className="mt-5 px-5 py-2.5 bg-accent-primary hover:bg-accent-primary-hover text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-accent-primary/10"
        >
          Retry
        </button>
      </div>
    );
  }

  const isSetupComplete = data?.setup.gmailConnected && data?.setup.resumeUploaded;
  const activeCampaignsCount =
    (data?.campaigns.generating ?? 0) +
    (data?.campaigns.sending ?? 0) +
    (data?.campaigns.ready ?? 0);

  // Deliverability and bounce calculations
  const totalEmailsAttempted = (data?.emails.sent ?? 0) + (data?.emails.failed ?? 0) + (data?.emails.bounced ?? 0);
  const deliverabilityRate = totalEmailsAttempted > 0
    ? (((data?.emails.sent ?? 0) / totalEmailsAttempted) * 100).toFixed(1)
    : "100";

  return (
    <div className="space-y-8 animate-fade-in text-text-primary">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-text-muted">
            Your personalized cold email personalization and outbound center
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-accent-primary bg-accent-dim px-2.5 py-1 rounded-full border border-accent-primary/20">
            Workspace Scoped
          </span>
        </div>
      </div>

      {/* Welcome / Setup checklist banner */}
      {isSetupComplete ? (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 p-6 md:p-8 text-white border border-violet-500/20 shadow-xl shadow-indigo-900/10">
          <div className="absolute right-0 top-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none"></div>
          <div className="absolute left-1/3 bottom-0 -mb-16 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>

          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/10 border border-white/20 backdrop-blur-md mb-4">
              ✨ Outbound Ready
            </span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
              Welcome back, {data?.profile.name || "outbound sender"}! 👋
            </h2>
            <p className="text-white/80 text-sm md:text-base leading-relaxed">
              Your personalized emails are maintaining a <strong className="text-white">{deliverabilityRate}%</strong> deliverability rating. You have run <strong className="text-white">{data?.campaigns.total} campaigns</strong> in total. Head over to Campaign Builder to launch another batch!
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-warning/20 bg-warning-dim/30 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 text-warning">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <h3 className="font-bold text-base">Complete your workspace setup</h3>
            </div>
            <p className="text-sm text-text-secondary max-w-xl">
              You need to configure your personal Gmail outbound credentials and upload your master resume before you can generate and send personalized campaigns.
            </p>
            {/* Checklist */}
            <div className="flex flex-wrap gap-4 mt-4 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center border ${data?.setup.gmailConnected ? 'bg-success/15 border-success/30 text-success' : 'bg-warning/15 border-warning/30 text-warning'}`}>
                  {data?.setup.gmailConnected ? <Check className="w-3.5 h-3.5" /> : "!"}
                </span>
                <span className={data?.setup.gmailConnected ? "text-success" : "text-text-muted"}>Gmail SMTP Config</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center border ${data?.setup.resumeUploaded ? 'bg-success/15 border-success/30 text-success' : 'bg-warning/15 border-warning/30 text-warning'}`}>
                  {data?.setup.resumeUploaded ? <Check className="w-3.5 h-3.5" /> : "!"}
                </span>
                <span className={data?.setup.resumeUploaded ? "text-success" : "text-text-muted"}>Resume Document</span>
              </div>
            </div>
          </div>
          <Link
            href="/dashboard/settings"
            className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-warning hover:bg-warning/90 text-bg-base font-bold transition-all text-sm hover:scale-[1.01] hover:shadow-lg"
          >
            Configure Settings
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Large Gradient KPI Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Deliverability KPI Card */}
        <div className="group relative overflow-hidden rounded-3xl border border-accent-primary/20 bg-gradient-to-br from-accent-primary/5 to-indigo-500/10 p-6 hover:scale-[1.01] hover:shadow-xl hover:shadow-indigo-950/5 transition-all duration-300">
          <div className="absolute right-4 top-4 opacity-10 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none">
            <Mail className="w-24 h-24 text-accent-primary" />
          </div>
          <div className="flex items-center gap-3.5 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-accent-dim flex items-center justify-center border border-accent-primary/20">
              <Mail className="w-5.5 h-5.5 text-accent-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-accent-primary uppercase tracking-wider">Outbound Deliverability</p>
              <p className="text-[10px] text-text-muted mt-0.5">Scored across all cold outreach attempts</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2.5">
            <p className="text-4xl font-extrabold tracking-tight text-text-primary">
              {deliverabilityRate}%
            </p>
            <span className="text-xs font-bold text-accent-primary bg-accent-dim px-2 py-0.5 rounded-lg border border-accent-primary/20">
              {(data?.emails.sent ?? 0).toLocaleString()} sent
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-border-default/45 flex items-center justify-between text-xs text-text-muted">
            <span>Replies: <strong>{data?.emails.replied}</strong> (Bounces: {data?.emails.bounced})</span>
            <Link href="/dashboard/history" className="text-accent-primary hover:text-accent-primary-hover font-semibold inline-flex items-center gap-0.5">
              Campaign History <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Active Runs KPI Card */}
        <div className="group relative overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-amber-500/10 p-6 hover:scale-[1.01] hover:shadow-xl hover:shadow-orange-950/5 transition-all duration-300">
          <div className="absolute right-4 top-4 opacity-10 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none">
            <PlusCircle className="w-24 h-24 text-orange-400" />
          </div>
          <div className="flex items-center gap-3.5 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
              <Activity className="w-5.5 h-5.5 text-orange-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-orange-400/80 uppercase tracking-wider">Active Campaigns</p>
              <p className="text-[10px] text-text-muted mt-0.5">Runs currently generating, ready, or sending</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2.5">
            <p className="text-4xl font-extrabold tracking-tight text-text-primary">
              {activeCampaignsCount}
            </p>
            <span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-lg border border-orange-500/20">
              {data?.campaigns.total} total
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-border-default/45 flex items-center justify-between text-xs text-text-muted">
            <span>Completed: <strong>{data?.campaigns.completed}</strong> (Drafts: {data?.campaigns.draft})</span>
            <Link href="/dashboard/campaign/new" className="text-orange-400 hover:text-orange-300 font-semibold inline-flex items-center gap-0.5">
              Launch Campaign <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* SVG Charts Grid */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Email Volume Trend (Left/Major) */}
        <div className="lg:col-span-8 bg-bg-surface border border-border-default rounded-3xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
            <div>
              <h3 className="text-base font-bold">Outbound Daily Volume</h3>
              <p className="text-xs text-text-muted mt-0.5">Delivered vs Failed email trend (Last 30 Days)</p>
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

        {/* Email Status Distribution (Right/Minor) */}
        <div className="lg:col-span-4 bg-bg-surface border border-border-default rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold mb-1">Status Ratios</h3>
            <p className="text-xs text-text-muted mb-6">Aggregate ratios of your email outcomes</p>
          </div>
          <div className="flex justify-center mb-6">
            <EmailStatusDonutChart emails={data?.emails || { total: 0, sent: 0, failed: 0, replied: 0, bounced: 0, queued: 0, generated: 0 }} />
          </div>
          <div className="space-y-2 text-xs">
            {(() => {
              const emails = data?.emails || { sent: 0, replied: 0, bounced: 0, failed: 0, total: 1 };
              const total = emails.total || 1;
              const segments = [
                { label: "Successful Deliveries", count: emails.sent, color: "bg-green-400" },
                { label: "Lead Replies", count: emails.replied, color: "bg-indigo-400" },
                { label: "Bounces Detected", count: emails.bounced, color: "bg-amber-400" },
                { label: "Failed Runs", count: emails.failed, color: "bg-red-400" },
              ];
              return segments.map((item) => {
                const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : "0.0";
                return (
                  <div key={item.label} className="flex items-center justify-between border-b border-border-default/45 pb-1.5 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${item.color}`} />
                      <span className="text-text-secondary">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text-primary">{item.count}</span>
                      <span className="text-text-muted">({pct}%)</span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* Recent Campaigns & Quick Actions */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Recent Campaigns (Left/Major) */}
        <div className="lg:col-span-8 bg-bg-surface border border-border-default rounded-3xl p-6 shadow-sm font-sans">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold">Outreach Campaigns</h3>
              <p className="text-xs text-text-muted mt-0.5">Progression status of your outreach runs</p>
            </div>
            <Link href="/dashboard/history" className="text-xs font-semibold text-accent-primary hover:text-accent-primary-hover inline-flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-default/60 text-[10px] font-semibold uppercase tracking-wider text-text-muted pb-3">
                  <th className="pb-3 text-left">Campaign Name</th>
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

                    const progressPercent = Math.min(
                      100,
                      (camp.sentCount / (camp.leadsCount || 1)) * 100
                    );

                    return (
                      <tr key={camp._id} className="hover:bg-bg-elevated/20 transition-colors group">
                        <td className="py-3.5 pr-2">
                          <p className="font-bold text-text-primary group-hover:text-accent-primary transition-colors">
                            {camp.name}
                          </p>
                          <p className="text-[10px] text-text-muted font-mono mt-0.5">
                            {new Date(camp.createdAt).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="py-3.5 pr-2 font-medium">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-text-muted">
                              <span>{camp.sentCount} / {camp.leadsCount} sent</span>
                              <span>{Math.round(progressPercent)}%</span>
                            </div>
                            <div className="w-32 bg-bg-elevated border border-border-default/60 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-accent-primary h-full rounded-full transition-all duration-500"
                                style={{ width: `${progressPercent}%` }}
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
                            href={`/dashboard/history/${camp._id}`}
                            className="p-1.5 rounded-lg text-text-muted hover:text-accent-primary hover:bg-accent-dim inline-flex items-center justify-center transition-colors"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-text-muted">
                      No campaigns created yet. Click New Campaign below to begin!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Links Sidebar (Right/Minor) */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-base font-bold px-1">Quick Outbound Actions</h3>

          <Link
            href="/dashboard/campaign/new"
            className="flex items-center justify-between p-5 rounded-3xl border border-border-default bg-bg-surface hover:border-accent-primary/45 hover:bg-bg-elevated transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-accent-dim flex items-center justify-center border border-accent-primary/20 text-accent-primary group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-bold text-sm text-text-primary group-hover:text-accent-primary transition-colors">New Campaign</p>
                <p className="text-[10px] text-text-muted mt-0.5">Upload leads, write custom emails</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-accent-primary group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            href="/dashboard/inbox"
            className="flex items-center justify-between p-5 rounded-3xl border border-border-default bg-bg-surface hover:border-info/45 hover:bg-bg-elevated transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-info-dim flex items-center justify-center border border-info/20 text-info group-hover:scale-105 transition-transform">
                <Mail className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-bold text-sm text-text-primary group-hover:text-info transition-colors">Inbox & Replies</p>
                <p className="text-[10px] text-text-muted mt-0.5">Track IMAP synchronization and responses</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-info group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            href="/dashboard/settings"
            className="flex items-center justify-between p-5 rounded-3xl border border-border-default bg-bg-surface hover:border-warning/45 hover:bg-bg-elevated transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-warning-dim flex items-center justify-center border border-warning/20 text-warning group-hover:scale-105 transition-transform">
                <Settings className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-bold text-sm text-text-primary group-hover:text-warning transition-colors">Outbound Settings</p>
                <p className="text-[10px] text-text-muted mt-0.5">Gmail SMTP and resume configuration</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-warning group-hover:translate-x-0.5 transition-all" />
          </Link>
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
    <div className="relative w-36 h-36 flex items-center justify-center">
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
        <p className="text-xl font-black text-text-primary tracking-tight">{isNoData ? "0" : totalCounts.toLocaleString()}</p>
        <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider mt-0.5">Total Emails</p>
      </div>
    </div>
  );
}
