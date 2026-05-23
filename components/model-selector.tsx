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
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin text-[#ea580c]" />
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
    <div className="space-y-6 font-mono">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Model Selection</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Choose the default LLM generator. Available models are controlled by administrator telemetry.
        </p>
      </div>

      {availableModels.length === 0 ? (
        <div className="border-2 border-[#FBBF24]/30 bg-[#FBBF24]/5 p-5 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-[#FBBF24] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-[#FBBF24] uppercase tracking-wider">No models available</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Admin has not configured any AI providers yet. Check back shortly.
            </p>
          </div>
        </div>
      ) : (
        Array.from(providers.entries()).map(([provider, models]) => (
          <div key={provider} className="space-y-3">
            {/* Provider header */}
            <div className="flex items-center gap-2">
              <ProviderBadge provider={provider} />
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                {providerNames[provider]}
              </span>
              <span className="px-2 py-0.5 border border-emerald-400/20 bg-emerald-400/5 text-emerald-400 text-[8px] font-bold uppercase tracking-widest">
                Active
              </span>
            </div>

            {/* Model cards */}
            <div className="space-y-2">
              {models.map((model) => {
                const isSelected = selectedModel === model.id;

                return (
                  <button
                    key={model.id}
                    onClick={() => handleSelect(model.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-5 py-4 border-2 transition-all text-left rounded-none",
                      isSelected
                        ? "border-[#ea580c] bg-[#ea580c]/5"
                        : "border-border bg-card hover:bg-foreground/5 hover:border-foreground/20 cursor-pointer"
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                          {model.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {model.description}
                      </p>
                      <p className="text-[9px] text-[#ea580c] mt-1 font-bold">
                        {model.id}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#ea580c]" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-[#ea580c]" />
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
        "w-2.5 h-2.5 inline-block",
        provider === "gemini" && "bg-blue-400",
        provider === "nvidia" && "bg-emerald-400",
        provider === "claude" && "bg-[#ea580c]"
      )}
    />
  );
}
