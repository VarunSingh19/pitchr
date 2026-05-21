"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { type ProviderType } from "@/lib/models-config";

interface AvailableModel {
  id: string;
  name: string;
  provider: ProviderType;
  description: string;
}

export function ModelSelector() {
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);

  // Fetch current model + available models from system pool
  useEffect(() => {
    Promise.all([
      fetch("/api/user/settings").then((r) => r.json()),
      fetch("/api/models/available").then((r) => r.json()),
    ])
      .then(([settings, modelsData]) => {
        const available = modelsData.models || [];
        setAvailableModels(available);

        const currentModel = settings.selectedModel;
        const isValid = available.some((m: any) => m.id === currentModel);

        if (isValid) {
          setSelectedModel(currentModel);
        } else if (available.length > 0) {
          setSelectedModel(available[0].id);
          fetch("/api/user/settings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ selectedModel: available[0].id }),
          }).catch(() => {});
        } else {
          setSelectedModel("gemini-2.5-flash");
        }
      })
      .catch(() => {
        setSelectedModel("gemini-2.5-flash");
      })
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

  // Group available models by provider
  const providers = new Map<ProviderType, AvailableModel[]>();
  for (const model of availableModels) {
    const list = providers.get(model.provider) || [];
    list.push(model);
    providers.set(model.provider, list);
  }

  const providerNames: Record<ProviderType, string> = {
    gemini: "Google Gemini",
    nvidia: "NVIDIA NIM",
    claude: "Anthropic Claude",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Model Selection</h2>
        <p className="text-sm text-text-muted">
          Choose the AI model for email generation. Available models are
          managed by the system administrator.
        </p>
      </div>

      {availableModels.length === 0 ? (
        <div className="rounded-2xl border border-warning/20 bg-warning-dim p-5 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-warning">No models available</p>
            <p className="text-xs text-text-muted mt-0.5">
              The system administrator hasn&apos;t configured any AI keys yet. Please check back later.
            </p>
          </div>
        </div>
      ) : (
        Array.from(providers.entries()).map(([provider, models]) => (
          <div key={provider} className="space-y-2">
            {/* Provider header */}
            <div className="flex items-center gap-2">
              <ProviderBadge provider={provider} />
              <span className="text-sm font-semibold text-text-primary">
                {providerNames[provider]}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-success-dim text-success text-[10px] font-semibold uppercase tracking-wider">
                Available
              </span>
            </div>

            {/* Model cards */}
            <div className="space-y-1.5">
              {models.map((model) => {
                const isSelected = selectedModel === model.id;

                return (
                  <button
                    key={model.id}
                    onClick={() => handleSelect(model.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-5 py-3.5 rounded-2xl border transition-all text-left",
                      isSelected
                        ? "border-accent-primary bg-accent-dim"
                        : "border-border-default bg-bg-surface hover:bg-bg-elevated hover:border-border-subtle cursor-pointer"
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {model.name}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        {model.description}
                      </p>
                      <p className="text-[11px] text-text-faint font-mono mt-0.5">
                        {model.id}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin text-accent-primary" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-accent-primary" />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ProviderBadge({ provider }: { provider: ProviderType }) {
  return (
    <span
      className={cn(
        "w-2 h-2 rounded-full",
        provider === "gemini" && "bg-blue-400",
        provider === "nvidia" && "bg-green-400",
        provider === "claude" && "bg-orange-400"
      )}
    />
  );
}
