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
  Terminal,
  Zap,
  Inbox,
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
        <div className="w-12 h-12 border-2 border-[#ea580c] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#ea580c]" />
        </div>
        <p className="text-xs font-mono tracking-widest uppercase text-muted-foreground">
          Loading workspace telemetry...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-2 border-red-500 bg-red-500/5 p-8 text-center max-w-md mx-auto my-20">
        <ShieldAlert className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h3 className="text-sm font-mono font-bold text-red-400 uppercase tracking-widest">
          System Fault
        </h3>
        <p className="text-xs text-muted-foreground font-mono mt-2">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-5 px-6 py-2.5 bg-foreground text-background text-xs font-mono font-bold uppercase tracking-widest hover:bg-[#ea580c] transition-colors"
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
    <div className="space-y-8 animate-fade-in">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-2.5 h-2.5 bg-[#ea580c] animate-blink" />
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
              // DASHBOARD
            </span>
          </div>
          <h1 className="font-pixel text-3xl sm:text-4xl tracking-tight text-foreground">
            COMMAND CENTER
          </h1>
          <p className="text-xs font-mono text-muted-foreground mt-1 tracking-wide">
            Outbound pipeline status &amp; campaign telemetry
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-[#ea580c] border border-[#ea580c]/30 bg-[#ea580c]/5 px-3 py-1.5">
            Live
          </span>
        </div>
      </div>

      {/* ── Welcome / Setup checklist banner ── */}
      {isSetupComplete ? (
        <div className="relative overflow-hidden border-2 border-foreground/20 bg-foreground/[0.03] p-6 md:p-8">
          {/* Decorative corner marks */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#ea580c]" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#ea580c]" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#ea580c]" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#ea580c]" />

          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Terminal className="w-4 h-4 text-[#ea580c]" />
              <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#ea580c] font-bold">
                System Online
              </span>
            </div>
            <h2 className="font-pixel text-xl md:text-2xl text-foreground mb-2">
              Welcome back, {data?.profile.name || "operator"}
            </h2>
            <p className="text-xs font-mono text-muted-foreground leading-relaxed max-w-xl">
              Deliverability holding at{" "}
              <span className="text-[#ea580c] font-bold">{deliverabilityRate}%</span>.{" "}
              <span className="text-foreground font-semibold">{data?.campaigns.total}</span> campaigns
              processed to date. Pipeline is clear for next batch.
            </p>
          </div>
        </div>
      ) : (
        <div className="border-2 border-[#FBBF24]/40 bg-[#FBBF24]/5 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#FBBF24] flex-shrink-0" />
              <h3 className="font-mono font-bold text-sm uppercase tracking-widest text-[#FBBF24]">
                Setup Required
              </h3>
            </div>
            <p className="text-xs font-mono text-muted-foreground max-w-xl leading-relaxed">
              Configure Gmail SMTP credentials and upload your master resume before launching campaigns.
            </p>
            {/* Checklist */}
            <div className="flex flex-wrap gap-4 mt-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className={`w-4 h-4 flex items-center justify-center border-2 ${data?.setup.gmailConnected ? 'border-emerald-400 text-emerald-400' : 'border-[#FBBF24] text-[#FBBF24]'}`}>
                  {data?.setup.gmailConnected ? <Check className="w-3 h-3" /> : "!"}
                </span>
                <span className={`uppercase tracking-wider text-[10px] ${data?.setup.gmailConnected ? "text-emerald-400" : "text-muted-foreground"}`}>
                  Gmail SMTP
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-4 h-4 flex items-center justify-center border-2 ${data?.setup.resumeUploaded ? 'border-emerald-400 text-emerald-400' : 'border-[#FBBF24] text-[#FBBF24]'}`}>
                  {data?.setup.resumeUploaded ? <Check className="w-3 h-3" /> : "!"}
                </span>
                <span className={`uppercase tracking-wider text-[10px] ${data?.setup.resumeUploaded ? "text-emerald-400" : "text-muted-foreground"}`}>
                  Resume Doc
                </span>
              </div>
            </div>
          </div>
          <Link
            href="/dashboard/settings"
            className="flex-shrink-0 inline-flex items-center gap-2 bg-[#FBBF24] text-black font-mono font-bold text-xs uppercase tracking-widest px-6 py-3 hover:bg-[#FBBF24]/80 transition-colors"
          >
            Configure
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* ── KPI Metrics Strip ── */}
      <div>
        <div className="flex items-center gap-4 mb-4">
          <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
            // SECTION: Metrics
          </span>
          <div className="flex-1 border-t border-border" />
          <span className="inline-block h-2 w-2 bg-[#ea580c] animate-blink" />
          <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
            01
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Deliverability KPI */}
          <div className="group relative border-2 border-border hover:border-[#ea580c]/40 bg-card p-6 transition-all duration-200">
            <div className="absolute top-0 right-0 w-16 h-16 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
              <Mail className="w-full h-full text-foreground" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 border-2 border-[#ea580c]/30 bg-[#ea580c]/5 flex items-center justify-center">
                <Mail className="w-4 h-4 text-[#ea580c]" />
              </div>
              <div>
                <p className="text-[9px] font-mono font-bold text-[#ea580c] uppercase tracking-[0.2em]">
                  Deliverability
                </p>
                <p className="text-[9px] font-mono text-muted-foreground mt-0.5">
                  All outbound attempts
                </p>
              </div>
            </div>
            <div className="flex items-baseline gap-3">
              <p className="font-pixel text-4xl text-foreground">
                {deliverabilityRate}%
              </p>
              <span className="text-[9px] font-mono font-bold text-[#ea580c] border border-[#ea580c]/20 bg-[#ea580c]/5 px-2 py-0.5">
                {(data?.emails.sent ?? 0).toLocaleString()} sent
              </span>
            </div>
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>
                Replies: <strong className="text-foreground">{data?.emails.replied}</strong> ·
                Bounces: <strong className="text-foreground">{data?.emails.bounced}</strong>
              </span>
              <Link href="/dashboard/history" className="text-[#ea580c] hover:text-[#ea580c]/80 font-bold uppercase tracking-wider inline-flex items-center gap-1">
                History <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Active Campaigns KPI */}
          <div className="group relative border-2 border-border hover:border-foreground/20 bg-card p-6 transition-all duration-200">
            <div className="absolute top-0 right-0 w-16 h-16 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
              <Activity className="w-full h-full text-foreground" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 border-2 border-foreground/20 bg-foreground/5 flex items-center justify-center">
                <Activity className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <p className="text-[9px] font-mono font-bold text-foreground/70 uppercase tracking-[0.2em]">
                  Active Runs
                </p>
                <p className="text-[9px] font-mono text-muted-foreground mt-0.5">
                  Generating, ready, or sending
                </p>
              </div>
            </div>
            <div className="flex items-baseline gap-3">
              <p className="font-pixel text-4xl text-foreground">
                {activeCampaignsCount}
              </p>
              <span className="text-[9px] font-mono font-bold text-foreground/60 border border-foreground/15 bg-foreground/5 px-2 py-0.5">
                {data?.campaigns.total} total
              </span>
            </div>
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>
                Completed: <strong className="text-foreground">{data?.campaigns.completed}</strong> ·
                Drafts: <strong className="text-foreground">{data?.campaigns.draft}</strong>
              </span>
              <Link href="/dashboard/campaign/new" className="text-[#ea580c] hover:text-[#ea580c]/80 font-bold uppercase tracking-wider inline-flex items-center gap-1">
                Launch <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Charts Section ── */}
      <div>
        <div className="flex items-center gap-4 mb-4">
          <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
            // SECTION: Analytics
          </span>
          <div className="flex-1 border-t border-border" />
          <span className="inline-block h-2 w-2 bg-[#ea580c] animate-blink" />
          <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
            02
          </span>
        </div>

        <div className="grid lg:grid-cols-12 gap-4">
          {/* Email Volume Trend */}
          <div className="lg:col-span-8 border-2 border-border bg-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
              <div>
                <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-foreground">
                  Daily Volume
                </h3>
                <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                  Delivered vs failed · last 30 days
                </p>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1.5 bg-emerald-400 inline-block" />
                  <span className="text-muted-foreground uppercase tracking-wider">Delivered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1.5 bg-red-400 inline-block" />
                  <span className="text-muted-foreground uppercase tracking-wider">Failed</span>
                </div>
              </div>
            </div>
            <div className="h-[180px] w-full flex items-end">
              <EmailTrendBarChart stats={data?.dailyEmailStats || []} />
            </div>
          </div>

          {/* Email Status Distribution */}
          <div className="lg:col-span-4 border-2 border-border bg-card p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-foreground mb-1">
                Status Ratios
              </h3>
              <p className="text-[10px] font-mono text-muted-foreground mb-6">
                Aggregate email outcomes
              </p>
            </div>
            <div className="flex justify-center mb-6">
              <EmailStatusDonutChart emails={data?.emails || { total: 0, sent: 0, failed: 0, replied: 0, bounced: 0, queued: 0, generated: 0 }} />
            </div>
            <div className="space-y-2 text-xs font-mono">
              {(() => {
                const emails = data?.emails || { sent: 0, replied: 0, bounced: 0, failed: 0, total: 1 };
                const total = emails.total || 1;
                const segments = [
                  { label: "Delivered", count: emails.sent, color: "bg-emerald-400" },
                  { label: "Replied", count: emails.replied, color: "bg-indigo-400" },
                  { label: "Bounced", count: emails.bounced, color: "bg-amber-400" },
                  { label: "Failed", count: emails.failed, color: "bg-red-400" },
                ];
                return segments.map((item) => {
                  const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : "0.0";
                  return (
                    <div key={item.label} className="flex items-center justify-between border-b border-border/60 pb-1.5 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 ${item.color}`} />
                        <span className="text-muted-foreground text-[10px] uppercase tracking-wider">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{item.count}</span>
                        <span className="text-muted-foreground text-[9px]">({pct}%)</span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Campaigns & Quick Actions ── */}
      <div>
        <div className="flex items-center gap-4 mb-4">
          <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
            // SECTION: Operations
          </span>
          <div className="flex-1 border-t border-border" />
          <span className="inline-block h-2 w-2 bg-[#ea580c] animate-blink" />
          <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
            03
          </span>
        </div>

        <div className="grid lg:grid-cols-12 gap-4">
          {/* Recent Campaigns */}
          <div className="lg:col-span-8 border-2 border-border bg-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-foreground">
                  Campaign Log
                </h3>
                <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                  Recent outreach run progression
                </p>
              </div>
              <Link href="/dashboard/history" className="text-[10px] font-mono font-bold text-[#ea580c] hover:text-[#ea580c]/80 uppercase tracking-widest inline-flex items-center gap-1">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono">
                <thead>
                  <tr className="border-b-2 border-border text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                    <th className="pb-3 text-left">Campaign</th>
                    <th className="pb-3 text-left">Progress</th>
                    <th className="pb-3 text-left">Status</th>
                    <th className="pb-3 pr-2 text-right">→</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-xs">
                  {data?.recentCampaigns && data.recentCampaigns.length > 0 ? (
                    data.recentCampaigns.map((camp) => {
                      const statusStyles = {
                        DRAFT: "text-muted-foreground border-border bg-muted/30",
                        GENERATING: "text-blue-400 border-blue-400/30 bg-blue-400/5",
                        READY: "text-emerald-400 border-emerald-400/30 bg-emerald-400/5",
                        SENDING: "text-[#ea580c] border-[#ea580c]/30 bg-[#ea580c]/5",
                        COMPLETED: "text-indigo-400 border-indigo-400/30 bg-indigo-400/5",
                        FAILED: "text-red-400 border-red-400/30 bg-red-400/5",
                      } as Record<string, string>;

                      const progressPercent = Math.min(
                        100,
                        (camp.sentCount / (camp.leadsCount || 1)) * 100
                      );

                      return (
                        <tr key={camp._id} className="hover:bg-foreground/[0.02] transition-colors group">
                          <td className="py-3.5 pr-4">
                            <p className="font-bold text-foreground group-hover:text-[#ea580c] transition-colors">
                              {camp.name}
                            </p>
                            <p className="text-[9px] text-muted-foreground mt-0.5 tracking-wider">
                              {new Date(camp.createdAt).toLocaleDateString()}
                            </p>
                          </td>
                          <td className="py-3.5 pr-4">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[9px] text-muted-foreground tracking-wider">
                                <span>{camp.sentCount}/{camp.leadsCount}</span>
                                <span>{Math.round(progressPercent)}%</span>
                              </div>
                              <div className="w-28 bg-muted/30 border border-border h-1.5 overflow-hidden">
                                <div
                                  className="bg-[#ea580c] h-full transition-all duration-500"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 pr-2">
                            <span className={`inline-flex items-center px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.15em] border ${statusStyles[camp.status] || "text-muted-foreground"}`}>
                              {camp.status}
                            </span>
                          </td>
                          <td className="py-3.5 pr-2 text-right">
                            <Link
                              href={`/dashboard/history/${camp._id}`}
                              className="p-1.5 text-muted-foreground hover:text-[#ea580c] inline-flex items-center justify-center transition-colors"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-muted-foreground text-[10px] uppercase tracking-widest">
                        No campaigns created. Launch your first outreach below.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-foreground px-1 mb-1">
              Quick Actions
            </h3>

            <Link
              href="/dashboard/campaign/new"
              className="flex items-center justify-between p-4 border-2 border-border bg-card hover:border-[#ea580c]/40 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border-2 border-[#ea580c]/30 bg-[#ea580c]/5 flex items-center justify-center text-[#ea580c] group-hover:bg-[#ea580c] group-hover:text-background transition-all">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="font-mono font-bold text-xs text-foreground group-hover:text-[#ea580c] transition-colors uppercase tracking-wider">
                    New Campaign
                  </p>
                  <p className="text-[9px] font-mono text-muted-foreground mt-0.5 tracking-wider">
                    Upload leads, gen emails
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-[#ea580c] group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              href="/dashboard/inbox"
              className="flex items-center justify-between p-4 border-2 border-border bg-card hover:border-foreground/20 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border-2 border-foreground/15 bg-foreground/5 flex items-center justify-center text-foreground/60 group-hover:bg-foreground group-hover:text-background transition-all">
                  <Inbox className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="font-mono font-bold text-xs text-foreground group-hover:text-foreground/80 transition-colors uppercase tracking-wider">
                    Inbox
                  </p>
                  <p className="text-[9px] font-mono text-muted-foreground mt-0.5 tracking-wider">
                    IMAP sync &amp; replies
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              href="/dashboard/settings"
              className="flex items-center justify-between p-4 border-2 border-border bg-card hover:border-[#FBBF24]/30 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border-2 border-[#FBBF24]/20 bg-[#FBBF24]/5 flex items-center justify-center text-[#FBBF24] group-hover:bg-[#FBBF24] group-hover:text-black transition-all">
                  <Settings className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="font-mono font-bold text-xs text-foreground group-hover:text-[#FBBF24] transition-colors uppercase tracking-wider">
                    Settings
                  </p>
                  <p className="text-[9px] font-mono text-muted-foreground mt-0.5 tracking-wider">
                    SMTP &amp; resume config
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-[#FBBF24] group-hover:translate-x-0.5 transition-all" />
            </Link>
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
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full font-mono select-none">
      {/* Grid lines & Y-axis labels */}
      {gridLines.map((gl, index) => {
        const y = pt + chartHeight * (1 - gl);
        const val = Math.round(maxVal * gl);
        return (
          <g key={index} className="opacity-40">
            <line x1={pl} y1={y} x2={width - pr} y2={y} stroke="var(--border-default)" strokeWidth="1" strokeDasharray="4 4" />
            <text x={pl - 8} y={y + 4} textAnchor="end" className="text-[9px] fill-muted-foreground font-bold">{val}</text>
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
            {/* Sent bar */}
            {d.sent > 0 && (
              <rect
                x={xSent}
                y={ySent}
                width={barWidth}
                height={sentHeight}
                rx={0}
                className="fill-emerald-400 hover:fill-emerald-300 transition-colors cursor-pointer"
              >
                <title>{`Delivered: ${d.sent}`}</title>
              </rect>
            )}

            {/* Failed bar */}
            {d.failed > 0 && (
              <rect
                x={xFailed}
                y={yFailed}
                width={barWidth}
                height={failedHeight}
                rx={0}
                className="fill-red-400 hover:fill-red-300 transition-colors cursor-pointer"
              >
                <title>{`Failed/Bounced: ${d.failed}`}</title>
              </rect>
            )}

            {/* X-axis date labels */}
            {(n <= 10 || i % Math.floor(n / 6) === 0) && (
              <text x={xCenter} y={height - 4} textAnchor="middle" className="text-[9px] fill-muted-foreground font-bold">
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
    { label: "Sent", count: emails.sent ?? 0, color: "stroke-emerald-400" },
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
    <div className="relative w-32 h-32 flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-full h-full transform select-none">
        {/* Base ring */}
        <rect x="10" y="10" width="80" height="80" fill="transparent" stroke="var(--border-default)" strokeWidth="1" />
        <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--border-default)" strokeWidth="10" />

        {isNoData ? (
          <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--border)" strokeWidth="10" />
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
                strokeWidth="10"
                strokeDasharray={s.strokeDasharray}
                strokeDashoffset={s.strokeDashoffset}
                transform="rotate(-90 50 50)"
              />
            )
          ))
        )}
      </svg>
      <div className="absolute text-center">
        <p className="font-pixel text-lg text-foreground tracking-tight">
          {isNoData ? "0" : totalCounts.toLocaleString()}
        </p>
        <p className="text-[8px] text-muted-foreground font-mono font-bold uppercase tracking-[0.15em] mt-0.5">
          Total
        </p>
      </div>
    </div>
  );
}
