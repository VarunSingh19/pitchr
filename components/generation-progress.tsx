"use client";

import { Sparkles, CheckCircle2, AlertCircle, Loader2, Clock, Pause, Play } from "lucide-react";
import type { GeneratedEmail } from "@/lib/types";

interface GenerationProgressProps {
  emails: GeneratedEmail[];
  isGenerating: boolean;
  isPaused: boolean;
  currentIndex: number;
  totalCount: number;
  onGenerate: () => void;
  onPause: () => void;
  onResume: () => void;
}

const STATUS_CONFIG = {
  pending: { icon: Clock, color: "text-text-faint", bg: "bg-bg-subtle", label: "Pending" },
  generating: { icon: Loader2, color: "text-accent-primary", bg: "bg-accent-dim", label: "Generating" },
  ready: { icon: CheckCircle2, color: "text-success", bg: "bg-success-dim", label: "Ready" },
  failed: { icon: AlertCircle, color: "text-error", bg: "bg-error-dim", label: "Failed" },
} as const;

export function GenerationProgress({
  emails,
  isGenerating,
  isPaused,
  currentIndex,
  totalCount,
  onGenerate,
  onPause,
  onResume,
}: GenerationProgressProps) {
  const readyCount = emails.filter((e) => e.status === "ready").length;
  const failedCount = emails.filter((e) => e.status === "failed").length;
  const completedCount = readyCount + failedCount;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isDone = emails.length > 0 && !isGenerating && !isPaused && completedCount === totalCount;
  const hasPartialResults = emails.length > 0 && readyCount > 0 && !isGenerating && !isPaused && completedCount < totalCount;

  return (
    <div className="space-y-6">
      {/* Generate Button (initial state) */}
      {emails.length === 0 && !isGenerating && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-accent-dim flex items-center justify-center mx-auto mb-5">
            <Sparkles className="w-8 h-8 text-accent-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Ready to Generate</h3>
          <p className="text-sm text-text-secondary max-w-md mx-auto mb-8">
            AI will craft a personalized email for each company using your resume
            and their job details. This takes a few seconds per email.
          </p>
          <button
            onClick={onGenerate}
            className="px-8 py-3.5 rounded-2xl bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold transition-all hover:shadow-xl hover:shadow-accent-primary/25 flex items-center gap-2 mx-auto"
          >
            <Sparkles className="w-4 h-4" />
            Generate All Emails
          </button>
        </div>
      )}

      {/* Progress section */}
      {(emails.length > 0 || isGenerating) && (
        <>
          {/* Progress bar + controls */}
          <div className="rounded-2xl border border-border-default bg-bg-surface p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">
                {isGenerating && !isPaused && (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-accent-primary" />
                    Generating email {currentIndex + 1} of {totalCount}...
                  </span>
                )}
                {isPaused && (
                  <span className="flex items-center gap-2 text-amber-400">
                    <Pause className="w-4 h-4" />
                    Paused at {completedCount} of {totalCount}
                  </span>
                )}
                {isDone && (
                  <span>
                    Generation complete — {readyCount} ready
                    {failedCount > 0 && `, ${failedCount} failed`}
                  </span>
                )}
                {hasPartialResults && (
                  <span className="flex items-center gap-2 text-amber-400">
                    <Pause className="w-4 h-4" />
                    Stopped at {completedCount} of {totalCount} — resume to continue
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted font-mono">
                  {Math.round(progress)}%
                </span>

                {/* Pause / Resume buttons */}
                {isGenerating && !isPaused && (
                  <button
                    onClick={onPause}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-xs font-medium transition-all"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    Pause
                  </button>
                )}
                {isPaused && (
                  <button
                    onClick={onResume}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-dim hover:bg-accent-primary/20 text-accent-primary text-xs font-medium transition-all"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Resume
                  </button>
                )}
                {hasPartialResults && (
                  <button
                    onClick={onResume}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-dim hover:bg-accent-primary/20 text-accent-primary text-xs font-medium transition-all"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Resume
                  </button>
                )}
              </div>
            </div>

            <div className="w-full h-2 rounded-full bg-bg-base overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  isPaused
                    ? "bg-amber-500"
                    : "bg-gradient-to-r from-accent-primary to-accent-primary-hover"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Company list with status */}
          <div className="rounded-2xl border border-border-default bg-bg-surface overflow-hidden">
            <div className="max-h-[400px] overflow-y-auto divide-y divide-border-default">
              {emails.map((email, idx) => {
                const config = STATUS_CONFIG[email.status];
                const StatusIcon = config.icon;

                return (
                  <div
                    key={email.companyId}
                    className={`flex items-center justify-between px-5 py-3 transition-colors ${
                      idx === currentIndex && isGenerating && !isPaused ? "bg-accent-dim/30" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {email.company}
                      </p>
                      <p className="text-xs text-text-muted truncate">{email.role}</p>
                    </div>

                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${config.bg}`}>
                      <StatusIcon
                        className={`w-3.5 h-3.5 ${config.color} ${
                          email.status === "generating" ? "animate-spin" : ""
                        }`}
                      />
                      <span className={`text-xs font-medium ${config.color}`}>
                        {config.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
