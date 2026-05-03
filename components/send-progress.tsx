"use client";

import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Send,
  Download,
  RotateCcw,
  Pause,
  XCircle,
} from "lucide-react";
import type { SendResult } from "@/lib/types";
import { downloadCsv } from "@/lib/csv-export";

interface SendProgressProps {
  results: SendResult[];
  isSending: boolean;
  isComplete: boolean;
  onReset: () => void;
}

const STATUS_ICONS = {
  queued: { icon: Clock, color: "text-text-faint", label: "Queued" },
  sending: { icon: Loader2, color: "text-accent-primary", label: "Sending" },
  sent: { icon: CheckCircle2, color: "text-success", label: "Sent" },
  failed: { icon: AlertCircle, color: "text-error", label: "Failed" },
  skipped: { icon: XCircle, color: "text-warning", label: "Skipped" },
} as const;

export function SendProgress({
  results,
  isSending,
  isComplete,
  onReset,
}: SendProgressProps) {
  const sentCount = results.filter((r) => r.status === "sent").length;
  const failedCount = results.filter((r) => r.status === "failed").length;
  const skippedCount = results.filter((r) => r.status === "skipped").length;
  const total = results.length;
  const completed = sentCount + failedCount + skippedCount;
  const progress = total > 0 ? (completed / total) * 100 : 0;

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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        {isComplete ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-success-dim flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold mb-1">Batch Complete</h2>
            <p className="text-text-secondary text-sm">
              All emails have been processed.
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-accent-dim flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-accent-primary animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold mb-1">Sending Emails</h2>
            {currentCompany && (
              <p className="text-text-secondary text-sm">
                Sending to{" "}
                <span className="text-text-primary font-medium">
                  {currentCompany.company}
                </span>{" "}
                — {currentCompany.role}
              </p>
            )}
          </>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-bg-surface border border-border-default p-4 text-center">
          <p className="text-2xl font-bold text-success">{sentCount}</p>
          <p className="text-xs text-text-muted mt-1">Sent</p>
        </div>
        <div className="rounded-xl bg-bg-surface border border-border-default p-4 text-center">
          <p className="text-2xl font-bold text-error">{failedCount}</p>
          <p className="text-xs text-text-muted mt-1">Failed</p>
        </div>
        <div className="rounded-xl bg-bg-surface border border-border-default p-4 text-center">
          <p className="text-2xl font-bold text-text-muted">{remaining}</p>
          <p className="text-xs text-text-muted mt-1">Remaining</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="rounded-2xl border border-border-default bg-bg-surface p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">
            {completed} / {total} processed
          </span>
          {isSending && (
            <span className="text-xs text-text-muted">{etaDisplay}</span>
          )}
        </div>

        <div className="w-full h-3 rounded-full bg-bg-base overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, var(--accent-primary) 0%, ${
                failedCount > 0 ? "var(--state-error)" : "var(--state-success)"
              } 100%)`,
            }}
          />
        </div>
      </div>

      {/* Company list */}
      <div className="rounded-2xl border border-border-default bg-bg-surface overflow-hidden">
        <div className="max-h-[350px] overflow-y-auto divide-y divide-border-default">
          {results.map((result) => {
            const config = STATUS_ICONS[result.status];
            const StatusIcon = config.icon;

            return (
              <div
                key={result.companyId}
                className="flex items-center justify-between px-5 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {result.company}
                  </p>
                  <p className="text-xs text-text-muted truncate">
                    {result.email}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {result.error && (
                    <span className="text-xs text-error max-w-[150px] truncate hidden sm:block">
                      {result.error}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5">
                    <StatusIcon
                      className={`w-3.5 h-3.5 ${config.color} ${
                        result.status === "sending" ? "animate-spin" : ""
                      }`}
                    />
                    <span className={`text-xs font-medium ${config.color}`}>
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
            className="px-5 py-2.5 rounded-xl border border-border-default hover:border-border-subtle text-sm font-medium text-text-secondary hover:text-text-primary transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download CSV Report
          </button>
          <button
            onClick={onReset}
            className="px-5 py-2.5 rounded-xl bg-accent-primary hover:bg-accent-primary-hover text-white text-sm font-medium transition-all flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Start New Batch
          </button>
        </div>
      )}
    </div>
  );
}
