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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Deliverability */}
          <div className="group relative border-2 border-border hover:border-[#ea580c]/40 bg-card transition-all duration-300 flex flex-col">
            <div className="flex items-center gap-2 border-b border-border px-4 py-2 bg-foreground/[0.01]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] tracking-widest text-muted-foreground uppercase font-mono">
                sys_monitor.dll
              </span>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  DELIVERABILITY
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="font-pixel text-3xl text-foreground">
                    {deliverabilityRate}%
                  </h3>
                </div>
              </div>
              
              {/* Mini visual wave */}
              <div className="my-3 h-8 w-full flex items-center opacity-60 group-hover:opacity-100 transition-opacity">
                <svg viewBox="0 0 100 30" className="w-full h-full">
                  <path
                    d="M0 15 Q 10 5, 20 15 T 40 15 T 60 15 T 80 15 T 100 15"
                    fill="none"
                    stroke="#34D399"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M0 15 Q 10 5, 20 15 T 40 15 T 60 15 T 80 15 T 100 15 L 100 30 L 0 30 Z"
                    fill="url(#wave-gradient)"
                    opacity="0.08"
                  />
                  <defs>
                    <linearGradient id="wave-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34D399" />
                      <stop offset="100%" stopColor="#34D399" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <div className="pt-2.5 border-t border-border flex items-center justify-between text-[9px] font-mono text-muted-foreground uppercase">
                <span>SENT: <strong className="text-foreground">{(data?.emails.sent ?? 0).toLocaleString()}</strong></span>
                <Link href="/dashboard/history" className="text-[#ea580c] hover:underline inline-flex items-center gap-0.5 font-bold">
                  LOGS <ArrowUpRight className="w-2.5 h-2.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Card 2: Outbound Stream */}
          <div className="group relative border-2 border-border hover:border-[#ea580c]/40 bg-card transition-all duration-300 flex flex-col">
            <div className="flex items-center gap-2 border-b border-border px-4 py-2 bg-foreground/[0.01]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ea580c]" />
              <span className="text-[9px] tracking-widest text-muted-foreground uppercase font-mono">
                stream_buffer.sys
              </span>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  OUTBOUND BUFFER
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="font-pixel text-3xl text-foreground">
                    {(data?.emails.sent ?? 0).toLocaleString()}
                  </h3>
                </div>
              </div>
              
              {/* Segmented loading progress */}
              <div className="my-4 flex items-center gap-1.5 w-full">
                {Array.from({ length: 8 }).map((_, i) => {
                  const sent = data?.emails.sent ?? 0;
                  const total = (data?.emails.total ?? 1) || 1;
                  const ratio = sent / total;
                  const active = ratio >= (i + 1) / 8;
                  return (
                    <div
                      key={i}
                      className={`h-4 flex-1 border transition-all duration-500 ${active ? 'bg-[#ea580c] border-[#ea580c] shadow-[0_0_6px_rgba(234,88,12,0.3)]' : 'bg-transparent border-border'}`}
                    />
                  );
                })}
              </div>

              <div className="pt-2.5 border-t border-border flex items-center justify-between text-[9px] font-mono text-muted-foreground uppercase">
                <span>QUEUE: <strong className="text-foreground">{(data?.emails.queued ?? 0).toLocaleString()}</strong></span>
                <span className="text-muted-foreground">BUF: 100%</span>
              </div>
            </div>
          </div>

          {/* Card 3: Reply Telemetry */}
          <div className="group relative border-2 border-border hover:border-[#ea580c]/40 bg-card transition-all duration-300 flex flex-col">
            <div className="flex items-center gap-2 border-b border-border px-4 py-2 bg-foreground/[0.01]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#6366F1] animate-pulse" />
              <span className="text-[9px] tracking-widest text-muted-foreground uppercase font-mono">
                conv_telemetry.log
              </span>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  REACTION INDEX
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="font-pixel text-3xl text-foreground">
                    {data?.emails.sent && data.emails.sent > 0
                      ? ((data.emails.replied / data.emails.sent) * 100).toFixed(1)
                      : "0.0"}%
                  </h3>
                </div>
              </div>
              
              {/* Telemetry Radar Arc Swinger */}
              <div className="my-2 h-9 w-full flex items-center justify-center opacity-65 group-hover:opacity-100 transition-opacity">
                <div className="w-16 h-8 overflow-hidden relative">
                  <div className="w-16 h-16 rounded-full border border-dashed border-[#6366F1]/40 absolute top-0 left-0" />
                  <div className="w-10 h-10 rounded-full border border-[#6366F1]/20 absolute top-3 left-3" />
                  <div className="w-0.5 h-8 bg-[#6366F1] origin-bottom absolute bottom-0 left-[31px] animate-[spin_4s_linear_infinite]" style={{ transformOrigin: 'bottom center' }} />
                </div>
              </div>

              <div className="pt-2.5 border-t border-border flex items-center justify-between text-[9px] font-mono text-muted-foreground uppercase">
                <span>REPLIES: <strong className="text-foreground">{(data?.emails.replied ?? 0).toLocaleString()}</strong></span>
                <span className="text-[#6366F1] font-bold">RADAR_ON</span>
              </div>
            </div>
          </div>

          {/* Card 4: Operations Cluster */}
          <div className="group relative border-2 border-border hover:border-foreground/30 bg-card transition-all duration-300 flex flex-col">
            <div className="flex items-center gap-2 border-b border-border px-4 py-2 bg-foreground/[0.01]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FBBF24] animate-pulse" />
              <span className="text-[9px] tracking-widest text-muted-foreground uppercase font-mono">
                ops_cluster.bin
              </span>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  ACTIVE PIPES
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="font-pixel text-3xl text-foreground">
                    {activeCampaignsCount}
                  </h3>
                </div>
              </div>
              
              {/* Terminal command display */}
              <div className="my-2.5 p-2 bg-background border border-border/80 font-mono text-[8px] text-muted-foreground flex flex-col gap-0.5 select-none max-h-[36px] overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-400">GEN: {data?.campaigns.generating ?? 0}</span>
                  <span className="text-blue-400">SND: {data?.campaigns.sending ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-amber-400">RDY: {data?.campaigns.ready ?? 0}</span>
                  <span className="text-muted-foreground">TOTAL: {data?.campaigns.total ?? 0}</span>
                </div>
              </div>

              <div className="pt-2.5 border-t border-border flex items-center justify-between text-[9px] font-mono text-muted-foreground uppercase">
                <span>DONE: <strong className="text-foreground">{(data?.campaigns.completed ?? 0).toLocaleString()}</strong></span>
                <Link href="/dashboard/campaign/new" className="text-[#ea580c] hover:underline inline-flex items-center gap-0.5 font-bold">
                  LAUNCH <ArrowRight className="w-2.5 h-2.5" />
                </Link>
              </div>
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
          <div className="lg:col-span-8 border-2 border-border bg-card flex flex-col relative overflow-hidden group hover:border-[#ea580c]/30 transition-all duration-300">
            {/* Window title bar */}
            <div className="flex items-center gap-2 border-b border-border px-4 py-2 bg-foreground/[0.01]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ea580c]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#FBBF24]" />
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="ml-2 text-[10px] tracking-widest text-muted-foreground uppercase font-mono">
                daily_volume_oscilloscope.dll
              </span>
              <span className="ml-auto text-[8px] font-mono text-muted-foreground uppercase tracking-wider bg-foreground/5 px-2 py-0.5">
                Status: ACTIVE
              </span>
            </div>
            
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
                <div>
                  <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-foreground">
                    Telemetry Stream
                  </h3>
                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                    Delivered vs failed outbound events · last 30 days
                  </p>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-emerald-400 inline-block rounded-sm" />
                    <span className="text-muted-foreground uppercase tracking-wider">Delivered</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-red-400 inline-block rounded-sm" />
                    <span className="text-muted-foreground uppercase tracking-wider">Failed</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-h-[200px] w-full relative">
                <EmailTrendBarChart stats={data?.dailyEmailStats || []} />
              </div>
            </div>
          </div>

          {/* Email Status Distribution */}
          <div className="lg:col-span-4 border-2 border-border bg-card flex flex-col relative overflow-hidden group hover:border-[#ea580c]/30 transition-all duration-300">
            {/* Window title bar */}
            <div className="flex items-center gap-2 border-b border-border px-4 py-2 bg-foreground/[0.01]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ea580c]" />
              <span className="h-1.5 w-1.5 rounded-full bg-foreground/20" />
              <span className="h-1.5 w-1.5 rounded-full border border-foreground/20" />
              <span className="ml-2 text-[10px] tracking-widest text-muted-foreground uppercase font-mono">
                status_ratio_target.sys
              </span>
              <span className="ml-auto text-[8px] font-mono text-muted-foreground uppercase tracking-wider bg-foreground/5 px-2 py-0.5">
                Live
              </span>
            </div>
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-foreground mb-1">
                  Outcome Proportions
                </h3>
                <p className="text-[10px] font-mono text-muted-foreground mb-4">
                  Aggregated telemetry outcomes and statistics
                </p>
              </div>
              
              <EmailStatusDonutChart emails={data?.emails || { total: 0, sent: 0, failed: 0, replied: 0, bounced: 0, queued: 0, generated: 0 }} />
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
          <div className="lg:col-span-8 border-2 border-border bg-card flex flex-col relative overflow-hidden group hover:border-[#ea580c]/30 transition-all duration-300">
            {/* Window title bar */}
            <div className="flex items-center gap-2 border-b border-border px-4 py-2 bg-foreground/[0.01]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ea580c]" />
              <span className="h-1.5 w-1.5 rounded-full bg-foreground/20" />
              <span className="h-1.5 w-1.5 rounded-full border border-foreground/20" />
              <span className="ml-2 text-[10px] tracking-widest text-muted-foreground uppercase font-mono">
                pipeline_registry.db
              </span>
              <span className="ml-auto text-[8px] font-mono text-muted-foreground uppercase tracking-wider bg-foreground/5 px-2 py-0.5">
                Records: {data?.recentCampaigns?.length ?? 0}
              </span>
            </div>
            
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-foreground">
                    Campaign Stream Log
                  </h3>
                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                    Real-time status of pipeline outbound configurations
                  </p>
                </div>
                <Link href="/dashboard/history" className="text-[10px] font-mono font-bold text-[#ea580c] hover:text-[#ea580c]/80 uppercase tracking-widest inline-flex items-center gap-1 border border-[#ea580c]/30 bg-[#ea580c]/5 px-2.5 py-1 font-bold">
                  SYS_LOG <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse font-mono">
                  <thead>
                    <tr className="border-b border-border text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                      <th className="pb-3 text-left">Configuration</th>
                      <th className="pb-3 text-left">Transmission</th>
                      <th className="pb-3 text-left">Telemetry</th>
                      <th className="pb-3 pr-2 text-right">→</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30 text-xs">
                    {data?.recentCampaigns && data.recentCampaigns.length > 0 ? (
                      data.recentCampaigns.map((camp) => {
                        const statusStyles = {
                          DRAFT: "text-muted-foreground border-border bg-muted/10",
                          GENERATING: "text-blue-400 border-blue-400/30 bg-blue-400/5",
                          READY: "text-emerald-400 border-emerald-400/30 bg-emerald-400/5",
                          SENDING: "text-[#ea580c] border-[#ea580c]/30 bg-[#ea580c]/5 shadow-[0_0_6px_rgba(234,88,12,0.1)]",
                          COMPLETED: "text-indigo-400 border-indigo-400/30 bg-indigo-400/5",
                          FAILED: "text-red-400 border-red-400/30 bg-red-400/5",
                        } as Record<string, string>;

                        const progressPercent = Math.min(
                          100,
                          (camp.sentCount / (camp.leadsCount || 1)) * 100
                        );

                        return (
                          <tr key={camp._id} className="hover:bg-foreground/[0.01] transition-colors group">
                            <td className="py-3.5 pr-4">
                              <p className="font-bold text-foreground group-hover:text-[#ea580c] transition-colors uppercase tracking-wide text-xs">
                                {camp.name}
                              </p>
                              <p className="text-[9px] text-muted-foreground mt-0.5 tracking-wider">
                                INIT_DATE: {new Date(camp.createdAt).toLocaleDateString()}
                              </p>
                            </td>
                            <td className="py-3.5 pr-4">
                              <div className="space-y-1.5 max-w-[140px]">
                                <div className="flex items-center justify-between text-[9px] text-muted-foreground tracking-wider">
                                  <span>{camp.sentCount}/{camp.leadsCount} TX</span>
                                  <span>{Math.round(progressPercent)}%</span>
                                </div>
                                <div className="w-full bg-muted/10 border border-border h-2 overflow-hidden flex">
                                  <div
                                    className="bg-[#ea580c] h-full transition-all duration-500 shadow-[0_0_4px_rgba(234,88,12,0.3)]"
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
                                className="p-1.5 border border-border hover:border-[#ea580c] hover:text-[#ea580c] inline-flex items-center justify-center transition-colors"
                              >
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center py-12 text-muted-foreground text-[9px] uppercase tracking-widest font-mono">
                          NO ACTIVE CONFIGURATIONS FOUND. INITIALIZE OUTBOUND VIA THE ACTION PIPELINES.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-4 space-y-3 flex flex-col justify-start">
            <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-foreground px-1 mb-1">
              Command Bindings
            </h3>

            <Link
              href="/dashboard/campaign/new"
              className="flex items-center justify-between p-4 border-2 border-border bg-card hover:border-[#ea580c]/50 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border border-[#ea580c]/30 bg-[#ea580c]/5 flex items-center justify-center text-[#ea580c] group-hover:bg-[#ea580c] group-hover:text-background transition-all duration-200">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="font-mono font-bold text-xs text-foreground group-hover:text-[#ea580c] transition-colors uppercase tracking-wider">
                    New Campaign
                  </p>
                  <p className="text-[9px] font-mono text-muted-foreground mt-0.5 tracking-wider">
                    Upload leads, generate emails
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-[#ea580c] group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              href="/dashboard/inbox"
              className="flex items-center justify-between p-4 border-2 border-border bg-card hover:border-foreground/30 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border border-border bg-foreground/5 flex items-center justify-center text-foreground/60 group-hover:bg-foreground group-hover:text-background transition-all duration-200">
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
              className="flex items-center justify-between p-4 border-2 border-border bg-card hover:border-[#FBBF24]/50 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border border-[#FBBF24]/20 bg-[#FBBF24]/5 flex items-center justify-center text-[#FBBF24] group-hover:bg-[#FBBF24] group-hover:text-black transition-all duration-200">
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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const filledStats = getFilledStats(stats);
  const maxVal = Math.max(...filledStats.map((d) => Math.max(d.sent, d.failed)), 10);

  const width = 600;
  const height = 180;
  const pl = 40;
  const pr = 15;
  const pt = 20;
  const pb = 25;

  const chartHeight = height - pt - pb;
  const chartWidth = width - pl - pr;
  const n = filledStats.length;
  const step = n > 1 ? chartWidth / (n - 1) : chartWidth;

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  const pointsDelivered = filledStats.map((d, i) => {
    const x = pl + i * step;
    const y = pt + chartHeight - (d.sent / maxVal) * chartHeight;
    return { x, y };
  });

  const pointsFailed = filledStats.map((d, i) => {
    const x = pl + i * step;
    const y = pt + chartHeight - (d.failed / maxVal) * chartHeight;
    return { x, y };
  });

  const dDelivered = pointsDelivered.reduce((acc, p, i) => 
    i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, ""
  );

  const dFailed = pointsFailed.reduce((acc, p, i) => 
    i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, ""
  );

  const areaDelivered = pointsDelivered.length > 0 
    ? `${dDelivered} L ${pointsDelivered[pointsDelivered.length - 1].x} ${pt + chartHeight} L ${pointsDelivered[0].x} ${pt + chartHeight} Z`
    : "";

  const areaFailed = pointsFailed.length > 0
    ? `${dFailed} L ${pointsFailed[pointsFailed.length - 1].x} ${pt + chartHeight} L ${pointsFailed[0].x} ${pt + chartHeight} Z`
    : "";

  return (
    <div className="relative w-full h-full">
      {/* SVG graph */}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full font-mono select-none overflow-visible">
        <defs>
          <linearGradient id="gradient-delivered" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34D399" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#34D399" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gradient-failed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F87171" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#F87171" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines & Y-axis labels */}
        {gridLines.map((gl, index) => {
          const y = pt + chartHeight * (1 - gl);
          const val = Math.round(maxVal * gl);
          return (
            <g key={index} className="opacity-30">
              <line x1={pl} y1={y} x2={width - pr} y2={y} stroke="var(--border-default)" strokeWidth="0.5" strokeDasharray="3 3" />
              <text x={pl - 10} y={y + 3} textAnchor="end" className="text-[8px] fill-muted-foreground font-bold">{val}</text>
            </g>
          );
        })}

        {/* Vertical dotted grid lines for dates */}
        {filledStats.map((d, i) => {
          if (n > 10 && i % Math.floor(n / 6) !== 0) return null;
          const x = pl + i * step;
          return (
            <g key={i} className="opacity-25">
              <line x1={x} y1={pt} x2={x} y2={pt + chartHeight} stroke="var(--border-default)" strokeWidth="0.5" strokeDasharray="3 3" />
            </g>
          );
        })}

        {/* Areas */}
        {pointsDelivered.length > 0 && (
          <path d={areaDelivered} fill="url(#gradient-delivered)" className="transition-all duration-300" />
        )}
        {pointsFailed.length > 0 && (
          <path d={areaFailed} fill="url(#gradient-failed)" className="transition-all duration-300" />
        )}

        {/* Lines */}
        {pointsDelivered.length > 0 && (
          <path d={dDelivered} fill="none" stroke="#34D399" strokeWidth="2" strokeLinecap="round" className="transition-all duration-300" />
        )}
        {pointsFailed.length > 0 && (
          <path d={dFailed} fill="none" stroke="#F87171" strokeWidth="1.5" strokeLinecap="round" className="transition-all duration-300" />
        )}

        {/* Coordinate squares ( Delivered ) */}
        {pointsDelivered.map((p, i) => (
          (hoveredIndex === i || n <= 15) && (
            <rect
              key={i}
              x={p.x - 2.5}
              y={p.y - 2.5}
              width={5}
              height={5}
              className="fill-card stroke-emerald-400 stroke-[1.5] transition-all duration-150"
            />
          )
        ))}

        {/* Coordinate squares ( Failed ) */}
        {pointsFailed.map((p, i) => (
          (hoveredIndex === i || n <= 15) && (
            <rect
              key={i}
              x={p.x - 2}
              y={p.y - 2}
              width={4}
              height={4}
              className="fill-card stroke-red-400 stroke-[1.5] transition-all duration-150"
            />
          )
        ))}

        {/* X-axis date labels */}
        {filledStats.map((d, i) => {
          if (n > 10 && i % Math.floor(n / 6) !== 0) return null;
          const x = pl + i * step;
          return (
            <text key={i} x={x} y={height - 6} textAnchor="middle" className="text-[8px] fill-muted-foreground font-mono font-bold uppercase tracking-wider">
              {d.date}
            </text>
          );
        })}

        {/* Hover Guideline */}
        {hoveredIndex !== null && (
          <g>
            <line
              x1={pl + hoveredIndex * step}
              y1={pt}
              x2={pl + hoveredIndex * step}
              y2={pt + chartHeight}
              stroke="rgba(234, 88, 12, 0.4)"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            {/* Glowing intersection circles */}
            <circle
              cx={pointsDelivered[hoveredIndex].x}
              cy={pointsDelivered[hoveredIndex].y}
              r="4.5"
              className="fill-emerald-400 stroke-background stroke-[1.5] shadow-lg animate-pulse"
            />
            <circle
              cx={pointsFailed[hoveredIndex].x}
              cy={pointsFailed[hoveredIndex].y}
              r="4"
              className="fill-red-400 stroke-background stroke-[1.5] shadow-lg animate-pulse"
            />
          </g>
        )}

        {/* Transparent Hover Interceptor Zones */}
        {filledStats.map((d, i) => {
          const xStart = pl + i * step - step / 2;
          const rectWidth = step;
          return (
            <rect
              key={i}
              x={xStart}
              y={0}
              width={rectWidth}
              height={height}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          );
        })}
      </svg>

      {/* Absolute Tooltip Overlay */}
      {hoveredIndex !== null && (
        <div
          className="absolute z-20 pointer-events-none border-2 border-foreground bg-card p-2.5 font-mono shadow-[0_0_12px_rgba(234,88,12,0.15)] flex flex-col gap-1.5 text-[9px] min-w-[110px]"
          style={{
            left: `${((pl + hoveredIndex * step) / width) * 100}%`,
            top: "10%",
            transform: hoveredIndex < 3 
              ? "none" 
              : hoveredIndex > n - 4 
                ? "translateX(-100%)" 
                : "translateX(-50%)",
            transition: "left 0.1s ease-out",
          }}
        >
          <div className="text-foreground uppercase border-b border-border pb-1 font-bold flex items-center justify-between gap-2">
            <span>TICK: {filledStats[hoveredIndex].date}</span>
            <span className="h-1.5 w-1.5 bg-[#ea580c]" />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 inline-block" />
              <span className="text-muted-foreground uppercase text-[8px]">DELIV:</span>
            </div>
            <span className="text-foreground font-bold">{filledStats[hoveredIndex].sent}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-red-400 inline-block" />
              <span className="text-muted-foreground uppercase text-[8px]">FAULT:</span>
            </div>
            <span className="text-foreground font-bold">{filledStats[hoveredIndex].failed}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function EmailStatusDonutChart({ emails }: { emails: any }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const segments = [
    { label: "Delivered", count: emails.sent ?? 0, color: "stroke-emerald-400", bgColor: "bg-emerald-400" },
    { label: "Replied", count: emails.replied ?? 0, color: "stroke-indigo-400", bgColor: "bg-indigo-400" },
    { label: "Bounced", count: emails.bounced ?? 0, color: "stroke-amber-400", bgColor: "bg-amber-400" },
    { label: "Failed", count: emails.failed ?? 0, color: "stroke-red-400", bgColor: "bg-red-400" },
  ];

  const totalCounts = segments.reduce((sum, s) => sum + s.count, 0);
  const isNoData = totalCounts === 0;

  let currentOffset = 0;
  const processedSegments = segments.map((s, index) => {
    const percentage = isNoData ? 0 : s.count / totalCounts;
    const strokeLength = percentage * 251.327; // C = 2 * PI * r (r = 40)
    const strokeOffset = currentOffset;
    currentOffset += strokeLength;
    return {
      ...s,
      percentage: Math.round(percentage * 100),
      strokeDasharray: `${strokeLength} 251.327`,
      strokeDashoffset: -strokeOffset,
      index,
    };
  });

  return (
    <div className="flex flex-col h-full justify-between gap-6">
      <div className="flex justify-center relative">
        <div className="relative w-36 h-36 flex items-center justify-center">
          {/* Radial radar grid background */}
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 select-none">
            {/* Outer dotted tracking circle */}
            <circle cx="50" cy="50" r="47" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" strokeDasharray="2 2" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
            
            {isNoData ? (
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--border)" strokeWidth="8" />
            ) : (
              processedSegments.map((s, i) => (
                s.count > 0 && (
                  <circle
                    key={i}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    className={`${s.color} transition-all duration-300 cursor-pointer ${hoveredIndex !== null && hoveredIndex !== i ? 'opacity-40 stroke-[6]' : 'opacity-100 stroke-[8]'}`}
                    strokeDasharray={s.strokeDasharray}
                    strokeDashoffset={s.strokeDashoffset}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                )
              ))
            )}
          </svg>
          
          {/* Center telemetry readout */}
          <div className="absolute text-center flex flex-col items-center justify-center font-mono pointer-events-none">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
              {hoveredIndex === null ? "Total" : segments[hoveredIndex].label}
            </span>
            <span className="font-pixel text-xl text-foreground mt-0.5">
              {hoveredIndex === null 
                ? (isNoData ? "0" : totalCounts.toLocaleString()) 
                : segments[hoveredIndex].count.toLocaleString()}
            </span>
            <span className="text-[8px] text-[#ea580c] mt-0.5 tracking-wider font-bold">
              {hoveredIndex === null 
                ? "OUTCOMES" 
                : `${isNoData ? "0.0" : ((segments[hoveredIndex].count / totalCounts) * 100).toFixed(1)}%`}
            </span>
          </div>
        </div>
      </div>

      {/* Stats list with matching hover listeners */}
      <div className="space-y-2 text-xs font-mono">
        {processedSegments.map((item, idx) => {
          const pct = totalCounts > 0 ? ((item.count / totalCounts) * 100).toFixed(1) : "0.0";
          const isHovered = hoveredIndex === idx;
          const isAnyHovered = hoveredIndex !== null;

          return (
            <div
              key={item.label}
              className={`flex items-center justify-between border-b border-border/40 pb-1.5 last:border-0 last:pb-0 transition-colors duration-150 cursor-pointer ${isHovered ? 'text-foreground font-bold' : isAnyHovered ? 'opacity-40 text-muted-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-sm ${item.bgColor} ${isHovered ? 'animate-pulse' : ''}`} />
                <span className="text-[10px] uppercase tracking-wider font-medium">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground">{item.count.toLocaleString()}</span>
                <span className="text-[9px]">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
