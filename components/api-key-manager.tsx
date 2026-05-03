"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Key,
  Plus,
  Trash2,
  Star,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SUPPORTED_PROVIDERS, type ProviderType } from "@/lib/models-config";

interface ApiKeyEntry {
  _id: string;
  provider: ProviderType;
  label: string;
  maskedKey: string;
  isDefault: boolean;
  addedAt: string;
}

export function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch keys
  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/user/api-keys");
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

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  // Delete key
  const handleDelete = async (keyId: string) => {
    if (!confirm("Delete this API key?")) return;
    const res = await fetch("/api/user/api-keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyId }),
    });
    if (res.ok) fetchKeys();
  };

  // Set default
  const handleSetDefault = async (keyId: string) => {
    const res = await fetch("/api/user/api-keys", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyId, isDefault: true }),
    });
    if (res.ok) fetchKeys();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">API Keys</h2>
          <p className="text-sm text-text-muted">
            Add your Gemini API keys to power email generation
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-primary hover:bg-accent-primary-hover text-white text-sm font-medium transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Key
        </button>
      </div>

      {/* Key list */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-text-muted">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : keys.length === 0 ? (
        <div className="rounded-2xl border border-border-default bg-bg-surface p-10 text-center">
          <Key className="w-10 h-10 text-text-faint mx-auto mb-3" />
          <p className="text-sm text-text-muted">No API keys added yet</p>
          <p className="text-xs text-text-faint mt-1">
            Add a Gemini API key to start generating emails
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <div
              key={key._id}
              className="flex items-center justify-between px-5 py-4 rounded-2xl border border-border-default bg-bg-surface hover:bg-bg-elevated transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent-dim flex items-center justify-center">
                  <Key className="w-5 h-5 text-accent-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {key.label || "Untitled Key"}
                    </span>
                    {key.isDefault && (
                      <span className="px-2 py-0.5 rounded-md bg-accent-dim text-accent-primary text-[10px] font-semibold uppercase tracking-wider">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-faint font-mono mt-0.5">
                    {key.maskedKey}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!key.isDefault && (
                  <button
                    onClick={() => handleSetDefault(key._id)}
                    className="p-2 rounded-lg text-text-faint hover:text-accent-primary hover:bg-accent-dim transition-colors"
                    title="Set as default"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(key._id)}
                  className="p-2 rounded-lg text-text-faint hover:text-error hover:bg-error-dim transition-colors"
                  title="Delete key"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Key Modal */}
      {showAddModal && (
        <AddKeyModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            fetchKeys();
          }}
        />
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
  const [isDefault, setIsDefault] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError("API key is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/user/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, key: apiKey, label, isDefault }),
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl border border-border-default bg-bg-surface p-6 space-y-5 shadow-2xl animate-fade-in-up">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Add API Key</h3>
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
                    ? "border-accent-primary bg-accent-dim text-accent-primary"
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
              className="w-full px-4 py-2.5 pr-10 rounded-xl border border-border-default bg-bg-elevated text-sm placeholder:text-text-faint focus:border-accent-primary focus:outline-none transition-colors font-mono"
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
            Label (optional)
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. My Main Key"
            className="w-full px-4 py-2.5 rounded-xl border border-border-default bg-bg-elevated text-sm placeholder:text-text-faint focus:border-accent-primary focus:outline-none transition-colors"
          />
        </div>

        {/* Set as default */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="rounded border-border-subtle accent-accent-primary"
          />
          <span className="text-sm text-text-secondary">Set as default key</span>
        </label>

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
            disabled={saving || !apiKey.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-primary hover:bg-accent-primary-hover disabled:opacity-40 text-white text-sm font-medium transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
            {saving ? "Validating..." : "Save Key"}
          </button>
        </div>
      </div>
    </div>
  );
}
