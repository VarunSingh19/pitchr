"use client";

import { Sparkles, CheckCircle2, AlertCircle, Loader2, Clock } from "lucide-react";

interface GenerationProgressProps {
  pollingStatus: { generated: number; failed: number; total: number; status: string };
  isGenerating: boolean;
  onGenerate: () => void;
  onRequeueFailed?: () => void;
}

const STATUS_CONFIG = {
  QUEUED: { icon: Clock, color: "text-text-faint", bg: "bg-bg-subtle", label: "Queued" },
  GENERATING: { icon: Loader2, color: "text-accent-primary", bg: "bg-accent-dim", label: "Generating" },
  GENERATED: { icon: CheckCircle2, color: "text-success", bg: "bg-success-dim", label: "Generated" },
  FAILED: { icon: AlertCircle, color: "text-error", bg: "bg-error-dim", label: "Failed" },
} as const;

export function GenerationProgress({
  pollingStatus,
  isGenerating,
  onGenerate,
  onRequeueFailed,
}: GenerationProgressProps) {
  const { generated, failed, total, status } = pollingStatus;
  const completedCount = generated + failed;
  const progress = total > 0 ? (completedCount / total) * 100 : 0;
  const isDone = total > 0 && !isGenerating && completedCount === total;

  return (
    <div className="space-y-6">
      {/* Generate Button (initial state) */}
      {total === 0 && !isGenerating && (
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
      {(total > 0 || isGenerating) && (
        <>
          {/* Progress bar + controls */}
          <div className="rounded-2xl border border-border-default bg-bg-surface p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">
                {isGenerating && (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-accent-primary" />
                    Generating emails ({completedCount} of {total} done)...
                  </span>
                )}
                {isDone && (
                  <span>
                    Generation complete — {generated} ready
                    {failed > 0 && `, ${failed} failed`}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted font-mono">
                  {Math.round(progress)}%
                </span>
                {status === "FAILED" && onRequeueFailed && (
                  <button
                    onClick={onRequeueFailed}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error/10 hover:bg-error/20 text-error text-xs font-medium transition-all"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    Retry Failed
                  </button>
                )}
              </div>
            </div>

            <div className="w-full h-2 rounded-full bg-bg-base overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-accent-primary to-accent-primary-hover"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-bg-surface border border-border-default rounded-xl p-4">
              <p className="text-xs text-text-muted font-medium uppercase tracking-wider mb-1">Total</p>
              <p className="text-xl font-bold">{total}</p>
            </div>
            <div className="bg-bg-surface border border-border-default rounded-xl p-4">
              <p className="text-xs text-success font-medium uppercase tracking-wider mb-1">Generated</p>
              <p className="text-xl font-bold text-success">{generated}</p>
            </div>
            <div className="bg-bg-surface border border-border-default rounded-xl p-4">
              <p className="text-xs text-error font-medium uppercase tracking-wider mb-1">Failed</p>
              <p className="text-xl font-bold text-error">{failed}</p>
            </div>
            <div className="bg-bg-surface border border-border-default rounded-xl p-4">
              <p className="text-xs text-accent-primary font-medium uppercase tracking-wider mb-1">Status</p>
              <p className="text-sm font-bold uppercase tracking-tight">{status}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
