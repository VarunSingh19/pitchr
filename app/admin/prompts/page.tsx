"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Sliders,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Clock,
  User,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PromptConfig {
  promptId: string;
  name: string;
  description: string;
  content: string;
  defaultContent: string;
  isOverridden: boolean;
  updatedBy: string | null;
  updatedAt: string | null;
}

export default function AdminPromptsPage() {
  const [prompts, setPrompts] = useState<PromptConfig[]>([]);
  const [activePromptId, setActivePromptId] = useState<string>("email_system");
  const [editorContent, setEditorContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showDefaultCompare, setShowDefaultCompare] = useState<boolean>(false);

  const fetchPrompts = useCallback(async (selectId?: string) => {
    try {
      const res = await fetch("/api/admin/prompts");
      if (!res.ok) {
        throw new Error("Failed to load prompts");
      }
      const data = await res.json();
      setPrompts(data.prompts || []);

      // If activePromptId is specified, or falls back to the current active
      const targetId = selectId || activePromptId;
      const active = (data.prompts as PromptConfig[]).find((p) => p.promptId === targetId);
      if (active) {
        setEditorContent(active.content);
        setActivePromptId(targetId);
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to load system prompts" });
    } finally {
      setLoading(false);
    }
  }, [activePromptId]);

  useEffect(() => {
    fetchPrompts();
  }, []);

  const activePrompt = prompts.find((p) => p.promptId === activePromptId);

  // Switch tabs
  const handleTabChange = (promptId: string) => {
    setActivePromptId(promptId);
    const selected = prompts.find((p) => p.promptId === promptId);
    if (selected) {
      setEditorContent(selected.content);
      setMessage(null);
    }
  };

  // Save prompt override
  const handleSaveOverride = async () => {
    if (!activePrompt) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptId: activePromptId,
          content: editorContent,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save override");
      }

      setMessage({ type: "success", text: `Override saved successfully for "${activePrompt.name}"!` });
      await fetchPrompts(activePromptId);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Error saving override" });
    } finally {
      setSaving(false);
    }
  };

  // Restore defaults
  const handleRestoreDefault = async () => {
    if (!activePrompt) return;
    if (!confirm(`Are you sure you want to delete the custom override for "${activePrompt.name}" and restore system defaults?`)) {
      return;
    }

    setRestoring(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/prompts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptId: activePromptId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to restore default");
      }

      setMessage({ type: "success", text: `Restored default template for "${activePrompt.name}"!` });
      await fetchPrompts(activePromptId);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Error restoring default" });
    } finally {
      setRestoring(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-text-muted space-y-4">
        <Clock className="w-8 h-8 animate-spin text-orange-500" />
        <span className="text-sm font-medium">Loading prompt templates...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-1">System Prompts & Templates</h1>
        <p className="text-text-secondary text-sm">
          Modify AI generation rules, negative instructions, and few-shot examples without redeploying.
        </p>
      </div>

      {/* Tabs and Editor Layout */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Sidebar Tabs selector */}
        <div className="lg:col-span-4 space-y-2">
          <span className="text-xs font-bold text-text-faint uppercase tracking-wider block px-1">
            Prompt Categories
          </span>
          <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible gap-1.5 pb-2 lg:pb-0 scrollbar-none">
            {prompts.map((p) => (
              <button
                key={p.promptId}
                onClick={() => handleTabChange(p.promptId)}
                className={cn(
                  "flex-shrink-0 lg:w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all border flex items-center justify-between gap-3",
                  p.promptId === activePromptId
                    ? "bg-orange-500/10 border-orange-500/35 text-orange-400"
                    : "bg-bg-surface border-border-default hover:bg-bg-elevated text-text-secondary hover:text-text-primary"
                )}
              >
                <div className="min-w-0">
                  <p className="font-semibold truncate">{p.name}</p>
                  <p className="text-[10px] text-text-faint font-mono truncate mt-0.5">{p.promptId}</p>
                </div>
                {p.isOverridden && (
                  <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 text-[9px] font-bold uppercase tracking-wider flex-shrink-0">
                    Custom
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right column: Main Editor Workspace */}
        <div className="lg:col-span-8 space-y-4">
          {activePrompt && (
            <div className="rounded-2xl border border-border-default bg-bg-surface p-6 space-y-5 shadow-sm">
              {/* Prompt Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-4 border-b border-border-default">
                <div>
                  <h3 className="text-base font-bold text-text-primary">{activePrompt.name}</h3>
                  <p className="text-xs text-text-secondary mt-1 max-w-xl">{activePrompt.description}</p>
                </div>

                {/* State Pill / Meta */}
                <div className="flex flex-wrap items-center gap-1.5 self-start">
                  {activePrompt.isOverridden ? (
                    <div className="flex flex-col items-end text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/10 border border-orange-500/20 text-orange-400">
                        Active Override
                      </span>
                      {activePrompt.updatedAt && (
                        <span className="text-[9px] text-text-faint font-mono mt-1 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(activePrompt.updatedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-bg-base border border-border-default text-text-faint">
                      System Default
                    </span>
                  )}
                </div>
              </div>

              {/* Warnings / Success Feedback */}
              {message && (
                <div className={cn(
                  "p-3 rounded-xl border text-xs flex items-start gap-2.5 animate-fade-in",
                  message.type === "success"
                    ? "bg-green-500/10 border-green-500/20 text-green-400"
                    : "bg-red-500/10 border-red-500/20 text-red-400"
                )}>
                  {message.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                  )}
                  <span className="font-medium leading-relaxed">{message.text}</span>
                </div>
              )}

              {/* Impersonation info or audit tracking */}
              {activePrompt.isOverridden && activePrompt.updatedBy && (
                <div className="bg-bg-base/40 border border-border-default px-4 py-2.5 rounded-xl flex flex-wrap items-center gap-4 text-xs text-text-muted">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-text-faint" />
                    Last Edited By: <strong className="text-text-secondary select-all font-mono ml-0.5">{activePrompt.updatedBy}</strong>
                  </span>
                  {activePrompt.updatedAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-text-faint" />
                      Updated At: <strong className="text-text-secondary font-mono ml-0.5">{new Date(activePrompt.updatedAt).toLocaleString()}</strong>
                    </span>
                  )}
                </div>
              )}

              {/* Side-by-side or stacked editor and comparison view */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-text-faint uppercase tracking-wider">
                    Instruction Editor Template
                  </label>
                  <button
                    onClick={() => setShowDefaultCompare(!showDefaultCompare)}
                    className="inline-flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 font-semibold"
                  >
                    {showDefaultCompare ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hide System Reference</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Compare with Default</span>
                      </>
                    )}
                  </button>
                </div>

                <div className={cn(
                  "grid gap-4",
                  showDefaultCompare ? "md:grid-cols-2" : "grid-cols-1"
                )}>
                  {/* Custom Input Editor */}
                  <div className="space-y-1">
                    <div className="relative">
                      <textarea
                        value={editorContent}
                        onChange={(e) => setEditorContent(e.target.value)}
                        placeholder="Write your custom system prompt overrides here..."
                        rows={16}
                        className="w-full bg-bg-base border border-border-default focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 rounded-xl p-4 text-xs font-mono text-text-muted leading-relaxed outline-none transition-all placeholder:text-text-faint resize-y select-all whitespace-pre"
                      />
                      <span className="absolute bottom-3 right-3 text-[10px] text-text-faint font-mono bg-bg-surface px-2 py-0.5 rounded border border-border-default">
                        {editorContent.length.toLocaleString()} chars
                      </span>
                    </div>
                  </div>

                  {/* Read-Only System Default Comparison */}
                  {showDefaultCompare && (
                    <div className="space-y-1 flex flex-col h-full animate-slide-in-right">
                      <div className="bg-bg-base/40 border border-dashed border-border-default rounded-xl p-4 text-xs font-mono text-text-faint leading-relaxed select-all overflow-y-auto whitespace-pre max-h-[360px] md:max-h-[none] flex-1">
                        <span className="text-[10px] text-text-muted font-sans font-bold uppercase tracking-wider block border-b border-border-default/60 pb-1.5 mb-2.5">
                          Read-Only System Default
                        </span>
                        {activePrompt.defaultContent}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleRestoreDefault}
                  disabled={restoring || !activePrompt.isOverridden}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border-default hover:bg-bg-elevated disabled:opacity-30 disabled:hover:bg-transparent text-xs font-semibold text-text-secondary transition-all"
                  title="Revert custom prompt modifications and return to code baseline"
                >
                  <RotateCcw className={cn("w-3.5 h-3.5", restoring && "animate-spin")} />
                  <span>Restore Default</span>
                </button>

                <button
                  onClick={handleSaveOverride}
                  disabled={saving || editorContent.trim() === activePrompt.content && activePrompt.isOverridden}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white text-xs font-semibold transition-all shadow-md shadow-orange-500/10 active:scale-[0.98]"
                >
                  <Save className={cn("w-3.5 h-3.5", saving && "animate-spin")} />
                  <span>{saving ? "Saving..." : "Save Custom Override"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
