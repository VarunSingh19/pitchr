"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Send,
  Download,
  RotateCcw,
  XCircle,
  Timer,
} from "lucide-react";
import type { SendResult } from "@/lib/types";
import { downloadCsv } from "@/lib/csv-export";

interface SendProgressProps {
  results: SendResult[];
  isSending: boolean;
  isComplete: boolean;
  onReset: () => void;
  autoResetSeconds?: number;
}

const STATUS_ICONS = {
  queued: { icon: Clock, color: "text-muted-foreground", label: "Queued" },
  sending: { icon: Loader2, color: "text-[#ea580c]", label: "Sending" },
  sent: { icon: CheckCircle2, color: "text-emerald-400", label: "Sent" },
  failed: { icon: AlertCircle, color: "text-red-400", label: "Failed" },
  skipped: { icon: XCircle, color: "text-amber-500", label: "Skipped" },
} as const;

export function SendProgress({
  results,
  isSending,
  isComplete,
  onReset,
  autoResetSeconds,
}: SendProgressProps) {
  const sentCount = results.filter((r) => r.status === "sent").length;
  const failedCount = results.filter((r) => r.status === "failed").length;
  const skippedCount = results.filter((r) => r.status === "skipped").length;
  const sendingCount = results.filter((r) => r.status === "sending").length;
  const total = results.length;
  const completed = sentCount + failedCount + skippedCount;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  // Auto-reset countdown
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (isComplete && autoResetSeconds && autoResetSeconds > 0) {
      setCountdown(autoResetSeconds);
    }
  }, [isComplete, autoResetSeconds]);

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((prev) => (prev ?? 1) - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Estimated time remaining (4s per email)
  const remaining = total - completed;
  const etaSeconds = remaining * 4;
  const etaDisplay =
    etaSeconds >= 60
      ? `~${Math.ceil(etaSeconds / 60)}m remaining`
      : `~${etaSeconds}s remaining`;

  // Current company
  const currentCompany = results.find(
    (r) => r.status === "sending" || r.status === "queued"
  );

  return (
    <div className="space-y-6 animate-fade-in font-mono text-xs text-foreground">
      {/* Header */}
      <div className="text-center py-10 border-2 border-border bg-card rounded-none">
        {isComplete ? (
          <div className="space-y-4">
            <div className="w-12 h-12 border-2 border-emerald-400 bg-emerald-400/5 flex items-center justify-center mx-auto text-emerald-400 rounded-none">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wider">Outbox Transmission Complete</h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Processed {sentCount} of {total} batch dispatches successfully.
              {failedCount > 0 && ` ${failedCount} faults detected.`}
            </p>
            {countdown !== null && countdown > 0 && (
              <div className="flex items-center justify-center gap-2 mt-4 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                <Timer className="w-3.5 h-3.5" />
                Cycling system memory in {countdown}s...
                <button
                  onClick={onReset}
                  className="text-[#ea580c] hover:underline ml-1 cursor-pointer bg-transparent border-0 font-bold"
                >
                  Reset now
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-12 h-12 border-2 border-[#ea580c]/30 bg-[#ea580c]/5 flex items-center justify-center mx-auto text-[#ea580c] rounded-none">
              <Send className="w-5 h-5 animate-pulse" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wider">Dispatching Emails</h2>
            {currentCompany && (
              <p className="text-xs text-muted-foreground max-w-xs mx-auto truncate uppercase tracking-wider">
                Target: <span className="text-foreground font-bold">{currentCompany.company}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="border-2 border-border bg-card p-4 text-center rounded-none">
          <p className="font-pixel text-xl text-emerald-400">{sentCount}</p>
          <p className="text-[10px] text-muted-foreground mt-1.5 uppercase font-bold tracking-wider">Sent</p>
        </div>
        <div className="border-2 border-border bg-card p-4 text-center rounded-none">
          <p className="font-pixel text-xl text-[#ea580c]">{sendingCount}</p>
          <p className="text-[10px] text-muted-foreground mt-1.5 uppercase font-bold tracking-wider">Active</p>
        </div>
        <div className="border-2 border-border bg-card p-4 text-center rounded-none">
          <p className="font-pixel text-xl text-red-400">{failedCount}</p>
          <p className="text-[10px] text-muted-foreground mt-1.5 uppercase font-bold tracking-wider">Failed</p>
        </div>
        <div className="border-2 border-border bg-card p-4 text-center rounded-none">
          <p className="font-pixel text-xl text-muted-foreground">{remaining}</p>
          <p className="text-[10px] text-muted-foreground mt-1.5 uppercase font-bold tracking-wider">Queue</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="border-2 border-border bg-card p-5 rounded-none">
        <div className="flex items-center justify-between mb-3 text-[10px] font-bold uppercase tracking-wider">
          <span>
            {completed} / {total} processed
          </span>
          {isSending && (
            <span className="text-muted-foreground">{etaDisplay}</span>
          )}
        </div>

        <div className="w-full h-3 bg-muted/40 border border-border overflow-hidden">
          <div
            className="h-full transition-all duration-700 ease-out"
            style={{
              width: `${progress}%`,
              backgroundColor: failedCount > 0 ? "var(--state-error)" : "var(--state-success)",
            }}
          />
        </div>
      </div>

      {/* Company list */}
      <div className="border-2 border-border bg-card overflow-hidden rounded-none">
        <div className="max-h-[300px] overflow-y-auto divide-y divide-border">
          {results.map((result) => {
            const config = STATUS_ICONS[result.status];
            const StatusIcon = config.icon;

            return (
              <div
                key={result.companyId}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-foreground/[0.01]"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <p className="font-bold text-foreground truncate uppercase tracking-wider">
                    {result.company}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {result.email}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {result.error && (
                    <span className="text-[10px] text-red-400 max-w-[150px] truncate hidden sm:block font-bold">
                      {result.error}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5">
                    <StatusIcon
                      className={`w-3.5 h-3.5 ${config.color} ${
                        result.status === "sending" ? "animate-spin animate-duration-1000" : ""
                      }`}
                    />
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      {isComplete && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={() => downloadCsv(results)}
            className="px-5 py-3 border-2 border-border hover:border-foreground/20 text-xs font-bold uppercase tracking-widest text-muted-foreground bg-card transition-all rounded-none cursor-pointer flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download CSV Report
          </button>
          <button
            onClick={onReset}
            className="px-6 py-3 bg-foreground text-background text-xs font-bold uppercase tracking-widest hover:bg-[#ea580c] hover:text-background transition-all rounded-none cursor-pointer flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Start New Batch
          </button>
        </div>
      )}
    </div>
  );
}
