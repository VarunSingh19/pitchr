"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SUPPORTED_MODELS,
  SUPPORTED_PROVIDERS,
  getModelsByProvider,
  type ProviderType,
} from "@/lib/models-config";

interface UserKeyInfo {
  provider: string;
}

export function ModelSelector() {
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userKeyProviders, setUserKeyProviders] = useState<Set<string>>(
    new Set()
  );

  // Fetch current model + user's API key providers
  useEffect(() => {
    Promise.all([
      fetch("/api/user/settings").then((r) => r.json()),
      fetch("/api/user/api-keys").then((r) => r.json()),
    ])
      .then(([settings, keysData]) => {
        setSelectedModel(
          settings.selectedModel || SUPPORTED_MODELS[0].id
        );
        const providers = new Set<string>(
          (keysData.keys || []).map((k: UserKeyInfo) => k.provider)
        );
        setUserKeyProviders(providers);
      })
      .catch(() => {
        setSelectedModel(SUPPORTED_MODELS[0].id);
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Model Selection</h2>
        <p className="text-sm text-text-muted">
          Choose the AI model for email generation. Models are grouped by
          provider — add an API key in the API Keys tab to unlock a provider.
        </p>
      </div>

      {SUPPORTED_PROVIDERS.filter((p) => p.enabled).map((provider) => {
        const models = getModelsByProvider(provider.id);
        const hasKey = userKeyProviders.has(provider.id);

        return (
          <div key={provider.id} className="space-y-2">
            {/* Provider header */}
            <div className="flex items-center gap-2">
              <ProviderBadge provider={provider.id} />
              <span className="text-sm font-semibold text-text-primary">
                {provider.name}
              </span>
              {!hasKey && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-bg-elevated text-[10px] font-semibold text-text-faint uppercase tracking-wider">
                  <Lock className="w-3 h-3" />
                  No API Key
                </span>
              )}
              {hasKey && (
                <span className="px-2 py-0.5 rounded-md bg-success-dim text-success text-[10px] font-semibold uppercase tracking-wider">
                  Active
                </span>
              )}
            </div>

            {/* Model cards */}
            <div className="space-y-1.5">
              {models.map((model) => {
                const isSelected = selectedModel === model.id;
                const isDisabled = !hasKey;

                return (
                  <button
                    key={model.id}
                    onClick={() => !isDisabled && handleSelect(model.id)}
                    disabled={isDisabled}
                    className={cn(
                      "w-full flex items-center justify-between px-5 py-3.5 rounded-2xl border transition-all text-left",
                      isSelected
                        ? "border-accent-primary bg-accent-dim"
                        : isDisabled
                          ? "border-border-default bg-bg-surface opacity-50 cursor-not-allowed"
                          : "border-border-default bg-bg-surface hover:bg-bg-elevated hover:border-border-subtle cursor-pointer"
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {model.name}
                        </span>
                        {model.isDefault && (
                          <span className="px-2 py-0.5 rounded-md bg-bg-elevated text-[10px] font-semibold text-text-faint uppercase tracking-wider">
                            Recommended
                          </span>
                        )}
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
                    {isDisabled && !isSelected && (
                      <Lock className="w-4 h-4 text-text-faint flex-shrink-0 ml-4" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProviderBadge({ provider }: { provider: ProviderType }) {
  const colors: Record<ProviderType, string> = {
    gemini: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    nvidia: "bg-green-500/15 text-green-400 border-green-500/30",
    claude: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  };

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
