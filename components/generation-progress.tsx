"use client";

import { Sparkles, CheckCircle2, AlertCircle, Loader2, Clock, Send } from "lucide-react";

interface GenerationProgressProps {
  pollingStatus: { generated: number; failed: number; pending?: number; total: number; status: string };
  isGenerating: boolean;
  onGenerate: () => void;
  onRequeueFailed?: () => void;
  autoSend?: boolean;
  onAutoSendChange?: (val: boolean) => void;
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
  autoSend = false,
  onAutoSendChange,
}: GenerationProgressProps) {
  const { generated, failed, pending = 0, total, status } = pollingStatus;
  const completedCount = generated + failed;
  const progress = total > 0 ? (completedCount / total) * 100 : 0;
  const isDone = total > 0 && !isGenerating && completedCount === total;
  const allPending = isGenerating && total > 0 && completedCount === 0 && pending > 0;

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

          {onAutoSendChange && (
            <div className="max-w-md mx-auto mb-8 text-left bg-bg-surface border border-border-default rounded-xl p-4 transition-all duration-300">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-text-primary flex items-center gap-2">
                    ⚡ Auto Send <span className="text-xs bg-accent-dim text-accent-primary px-2 py-0.5 rounded-full font-semibold">NEW</span>
                  </h4>
                  <p className="text-xs text-text-secondary mt-1">
                    Emails will be sent automatically once generated. You can close the browser — we'll email you when it's done.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={autoSend}
                    onChange={(e) => onAutoSendChange(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-primary"></div>
                </label>
              </div>
              {autoSend && (
                <div className="mt-3 text-xs text-amber-500 font-medium flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  Warning: Emails will be sent without manual review.
                </div>
              )}
            </div>
          )}

          <button
            onClick={onGenerate}
            className={`px-8 py-3.5 rounded-2xl ${autoSend ? 'bg-amber-600 hover:bg-amber-700' : 'bg-accent-primary hover:bg-accent-primary-hover'} text-white font-semibold transition-all hover:shadow-xl hover:shadow-accent-primary/25 flex items-center gap-2 mx-auto`}
          >
            {autoSend ? <Send className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            {autoSend ? "Generate & Auto Send" : "Generate All Emails"}
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
                {allPending && (
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-text-faint animate-pulse" />
                    <span>Waiting in queue... <span className="text-text-muted font-normal">({pending} emails queued)</span></span>
                  </span>
                )}
                {isGenerating && !allPending && (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-accent-primary" />
                    <span>
                      Generating emails ({completedCount} of {total} done)
                      {pending > 0 && <span className="text-text-muted font-normal ml-1">· {pending} in queue</span>}
                    </span>
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
              {allPending ? (
                <div className="h-full rounded-full bg-text-faint/30 animate-pulse" style={{ width: '100%' }} />
              ) : (
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-accent-primary to-accent-primary-hover"
                  style={{ width: `${progress}%` }}
                />
              )}
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
              <p className="text-xs text-accent-primary font-medium uppercase tracking-wider mb-1">
                {pending > 0 ? "In Queue" : "Status"}
              </p>
              <p className="text-sm font-bold uppercase tracking-tight">
                {pending > 0 ? pending : status}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
