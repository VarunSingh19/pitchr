"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Key,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  Power,
  PowerOff,
  Clock,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SUPPORTED_PROVIDERS, SUPPORTED_MODELS, type ProviderType } from "@/lib/models-config";

interface SystemKeyEntry {
  _id: string;
  provider: ProviderType;
  label: string;
  maskedKey: string;
  supportedModels: string[];
  isActive: boolean;
  usageCount: number;
  lastUsedAt: string;
  rateLimitedUntil: string | null;
  createdAt: string;
}

export default function AdminApiKeysPage() {
  const [keys, setKeys] = useState<SystemKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/api-keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  // Delete key
  const handleDelete = async (keyId: string) => {
    if (!confirm("Permanently delete this system API key?")) return;
    const res = await fetch("/api/admin/api-keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyId }),
    });
    if (res.ok) fetchKeys();
  };

  // Toggle active
  const handleToggle = async (keyId: string, currentlyActive: boolean) => {
    const res = await fetch("/api/admin/api-keys", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyId, isActive: !currentlyActive }),
    });
    if (res.ok) fetchKeys();
  };

  const getStatus = (key: SystemKeyEntry) => {
    if (!key.isActive) return { label: "Disabled", color: "text-text-faint bg-bg-elevated" };
    if (key.rateLimitedUntil && new Date(key.rateLimitedUntil) > new Date()) {
      return { label: "Rate Limited", color: "text-amber-400 bg-amber-500/10" };
    }
    return { label: "Active", color: "text-green-400 bg-green-500/10" };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">System API Keys</h1>
          <p className="text-text-secondary text-sm">
            Manage the pool of API keys used to serve all users
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Key
        </button>
      </div>

      {/* Key list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-text-muted">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : keys.length === 0 ? (
        <div className="rounded-2xl border border-border-default bg-bg-surface p-12 text-center">
          <Key className="w-12 h-12 text-text-faint mx-auto mb-3" />
          <p className="text-sm text-text-muted">No system API keys configured</p>
          <p className="text-xs text-text-faint mt-1">
            Add API keys so users can generate emails without bringing their own
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => {
            const status = getStatus(key);
            return (
              <div
                key={key._id}
                className="rounded-2xl border border-border-default bg-bg-surface p-5 hover:bg-bg-elevated transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Key className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">
                          {key.label || "Untitled Key"}
                        </span>
                        <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider", status.color)}>
                          {status.label}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-bg-elevated text-[10px] font-semibold text-text-faint uppercase tracking-wider">
                          {key.provider}
                        </span>
                      </div>
                      <p className="text-xs text-text-faint font-mono mt-1">
                        {key.maskedKey}
                      </p>

                      {/* Supported models */}
                      <div className="flex items-center flex-wrap gap-1.5 mt-2">
                        {key.supportedModels.map((modelId) => {
                          const modelConfig = SUPPORTED_MODELS.find((m) => m.id === modelId);
                          return (
                            <span
                              key={modelId}
                              className="px-2 py-0.5 rounded-lg bg-bg-subtle border border-border-default text-[10px] text-text-muted"
                            >
                              {modelConfig?.name || modelId}
                            </span>
                          );
                        })}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-text-faint">
                        <span className="flex items-center gap-1">
                          <BarChart3 className="w-3 h-3" />
                          {key.usageCount.toLocaleString()} uses
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {key.lastUsedAt && new Date(key.lastUsedAt).getTime() > 0
                            ? `Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                            : "Never used"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleToggle(key._id, key.isActive)}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        key.isActive
                          ? "text-green-400 hover:bg-green-500/10"
                          : "text-text-faint hover:bg-bg-elevated"
                      )}
                      title={key.isActive ? "Disable key" : "Enable key"}
                    >
                      {key.isActive ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(key._id)}
                      className="p-2 rounded-lg text-text-faint hover:text-error hover:bg-error-dim transition-colors"
                      title="Delete key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Key Modal — rendered via Portal to escape sidebar clipping */}
      {showAddModal && mounted && createPortal(
        <AddKeyModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            fetchKeys();
          }}
        />,
        document.body
      )}
    </div>
  );
}

// ────────────────────────────────────────

function AddKeyModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [provider, setProvider] = useState<ProviderType>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [label, setLabel] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Auto-select all models for the chosen provider
  useEffect(() => {
    const providerModels = SUPPORTED_MODELS.filter(
      (m) => m.provider === provider && m.enabled
    ).map((m) => m.id);
    setSelectedModels(providerModels);
  }, [provider]);

  const toggleModel = (modelId: string) => {
    setSelectedModels((prev) =>
      prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : [...prev, modelId]
    );
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError("API key is required");
      return;
    }
    if (selectedModels.length === 0) {
      setError("Select at least one model");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          key: apiKey,
          label,
          supportedModels: selectedModels,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save key");
        return;
      }

      setSuccess(true);
      setTimeout(onAdded, 600);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const providerModels = SUPPORTED_MODELS.filter(
    (m) => m.provider === provider && m.enabled
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-3xl border border-border-default bg-bg-surface p-6 space-y-5 shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Add System API Key</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Provider */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Provider
          </label>
          <div className="flex gap-2">
            {SUPPORTED_PROVIDERS.map((p) => (
              <button
                key={p.id}
                disabled={!p.enabled}
                onClick={() => setProvider(p.id)}
                className={cn(
                  "flex-1 px-3 py-2 rounded-xl text-xs font-medium border transition-all",
                  provider === p.id
                    ? "border-orange-500 bg-orange-500/10 text-orange-400"
                    : p.enabled
                      ? "border-border-default text-text-muted hover:border-border-subtle"
                      : "border-border-default text-text-faint opacity-40 cursor-not-allowed"
                )}
              >
                {p.name}
                {!p.enabled && " (Soon)"}
              </button>
            ))}
          </div>
        </div>

        {/* API Key */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
            API Key
          </label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
              className="w-full px-4 py-2.5 pr-10 rounded-xl border border-border-default bg-bg-elevated text-sm placeholder:text-text-faint focus:border-orange-500 focus:outline-none transition-colors font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-muted"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Label */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Label
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Production Key #1"
            className="w-full px-4 py-2.5 rounded-xl border border-border-default bg-bg-elevated text-sm placeholder:text-text-faint focus:border-orange-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Supported Models */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Supported Models
          </label>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {providerModels.map((model) => (
              <label
                key={model.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all",
                  selectedModels.includes(model.id)
                    ? "border-orange-500/30 bg-orange-500/5"
                    : "border-border-default hover:bg-bg-elevated"
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedModels.includes(model.id)}
                  onChange={() => toggleModel(model.id)}
                  className="rounded border-border-subtle accent-orange-500"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{model.name}</p>
                  <p className="text-xs text-text-faint font-mono">{model.id}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Error/Success */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-error">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Key saved and validated!
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:bg-bg-elevated transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !apiKey.trim() || selectedModels.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white text-sm font-medium transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
            {saving ? "Validating..." : "Save Key"}
          </button>
        </div>
      </div>
    </div>
  );
}
