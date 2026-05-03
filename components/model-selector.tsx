"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SUPPORTED_MODELS } from "@/lib/models-config";

export function ModelSelector() {
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch current model
  useEffect(() => {
    fetch("/api/user/settings")
      .then((r) => r.json())
      .then((data) => setSelectedModel(data.selectedModel || SUPPORTED_MODELS[0].id))
      .catch(() => setSelectedModel(SUPPORTED_MODELS[0].id))
      .finally(() => setLoading(false));
  }, []);

  // Save model
  const handleSelect = async (modelId: string) => {
    setSelectedModel(modelId);
    setSaving(true);

    try {
      await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedModel: modelId }),
      });
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-text-muted">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Model Selection</h2>
        <p className="text-sm text-text-muted">
          Choose the AI model for email generation
        </p>
      </div>

      <div className="space-y-2">
        {SUPPORTED_MODELS.filter((m) => m.enabled).map((model) => (
          <button
            key={model.id}
            onClick={() => handleSelect(model.id)}
            className={cn(
              "w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all text-left",
              selectedModel === model.id
                ? "border-accent-primary bg-accent-dim"
                : "border-border-default bg-bg-surface hover:bg-bg-elevated hover:border-border-subtle"
            )}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{model.name}</span>
                {model.isDefault && (
                  <span className="px-2 py-0.5 rounded-md bg-bg-elevated text-[10px] font-semibold text-text-faint uppercase tracking-wider">
                    Recommended
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted mt-1">{model.description}</p>
              <p className="text-[11px] text-text-faint font-mono mt-1">{model.id}</p>
            </div>
            {selectedModel === model.id && (
              <div className="flex items-center gap-2">
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin text-accent-primary" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-accent-primary" />
                )}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
