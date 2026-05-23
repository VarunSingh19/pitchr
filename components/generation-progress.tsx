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
  QUEUED: { icon: Clock, color: "text-muted-foreground", bg: "bg-muted/30", label: "Queued" },
  GENERATING: { icon: Loader2, color: "text-[#ea580c]", bg: "bg-[#ea580c]/5", label: "Generating" },
  GENERATED: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/5", label: "Generated" },
  FAILED: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-400/5", label: "Failed" },
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
    <div className="space-y-6 font-mono text-xs text-foreground">
      {/* Generate Button (initial state) */}
      {total === 0 && !isGenerating && (
        <div className="text-center py-16 border-2 border-border bg-card rounded-none">
          <div className="w-16 h-16 border-2 border-[#ea580c]/30 bg-[#ea580c]/5 flex items-center justify-center mx-auto mb-5 rounded-none">
            <Sparkles className="w-8 h-8 text-[#ea580c]" />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-wider mb-2">Ready to Personalize</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-8 leading-relaxed">
            AI will parse company targets and write customized outbound emails using your resume.
          </p>

          {onAutoSendChange && (
            <div className="max-w-md mx-auto mb-8 text-left border-2 border-border bg-foreground/[0.01] p-4 transition-all duration-200 rounded-none">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-foreground flex items-center gap-2 uppercase tracking-wide">
                    ⚡ Auto Send <span className="text-[9px] border border-[#ea580c]/30 bg-[#ea580c]/5 text-[#ea580c] px-2 py-0.5 font-bold uppercase tracking-wider rounded-none">System</span>
                  </h4>
                  <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                    Trigger sending automatically upon generation complete. You can close this viewport.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    className="w-5 h-5 border-2 border-border bg-card text-[#ea580c] focus:ring-0 focus:outline-none cursor-pointer"
                    checked={autoSend}
                    onChange={(e) => onAutoSendChange(e.target.checked)}
                  />
                </label>
              </div>
              {autoSend && (
                <div className="mt-3 text-[10px] text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  No manual review step will be processed.
                </div>
              )}
            </div>
          )}

          <button
            onClick={onGenerate}
            className={`px-8 py-3.5 ${autoSend ? 'bg-[#ea580c] hover:bg-[#ea580c]/80 text-background' : 'bg-foreground text-background hover:bg-[#ea580c] hover:text-background'} text-xs font-bold uppercase tracking-widest transition-all rounded-none cursor-pointer`}
          >
            {autoSend ? "Generate & Auto Send" : "Generate All"}
          </button>
        </div>
      )}

      {/* Progress section */}
      {(total > 0 || isGenerating) && (
        <>
          {/* Progress bar + controls */}
          <div className="border-2 border-border bg-card p-5 rounded-none">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold uppercase tracking-wider">
                {allPending && (
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground animate-pulse" />
                    <span>Waiting in queue... <span className="text-muted-foreground font-normal">({pending} emails queued)</span></span>
                  </span>
                )}
                {isGenerating && !allPending && (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#ea580c]" />
                    <span>
                      Generating ({completedCount} of {total} done)
                      {pending > 0 && <span className="text-muted-foreground font-normal ml-1.5">· {pending} pending</span>}
                      {autoSend && <span className="text-amber-500 font-bold ml-1.5">· Auto-send active</span>}
                    </span>
                  </span>
                )}
                {isDone && (
                  <span>
                    Generation complete — {generated} ready
                    {failed > 0 && `, ${failed} failed`}
                    {autoSend && <span className="text-amber-500 font-bold ml-1.5">· Auto-sending...</span>}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-bold">
                  {Math.round(progress)}%
                </span>
                {status === "FAILED" && onRequeueFailed && (
                  <button
                    onClick={onRequeueFailed}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-red-500 bg-red-500/5 text-red-400 text-[10px] font-bold uppercase tracking-wider rounded-none cursor-pointer"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    Retry Failed
                  </button>
                )}
              </div>
            </div>

            <div className="w-full h-3 bg-muted/40 border border-border overflow-hidden">
              {allPending ? (
                <div className="h-full bg-muted animate-pulse" style={{ width: '100%' }} />
              ) : (
                <div
                  className="h-full bg-[#ea580c] transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="border-2 border-border bg-card p-4 rounded-none">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1.5">Total</p>
              <p className="font-pixel text-xl text-foreground">{total}</p>
            </div>
            <div className="border-2 border-border bg-card p-4 rounded-none">
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1.5">Generated</p>
              <p className="font-pixel text-xl text-emerald-400">{generated}</p>
            </div>
            <div className="border-2 border-border bg-card p-4 rounded-none">
              <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest mb-1.5">Failed</p>
              <p className="font-pixel text-xl text-red-400">{failed}</p>
            </div>
            <div className="border-2 border-border bg-card p-4 rounded-none">
              <p className="text-[10px] text-[#ea580c] font-bold uppercase tracking-widest mb-1.5">
                {pending > 0 ? "Queue size" : "Status"}
              </p>
              <p className="text-xs font-bold uppercase tracking-wider text-foreground">
                {pending > 0 ? pending : status}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
