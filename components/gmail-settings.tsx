"use client";

import { useEffect, useState } from "react";
import {
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Pencil,
} from "lucide-react";

export function GmailSettings() {
  const [address, setAddress] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load existing config
  useEffect(() => {
    fetch("/api/user/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.gmailConfig) {
          setAddress(data.gmailConfig.address || "");
          setValidated(data.gmailConfig.validated || false);
          // Don't populate password — it's encrypted server-side
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleValidateAndSave = async () => {
    if (!address.trim() || !appPassword.trim()) {
      setError("Both fields are required");
      return;
    }

    if (appPassword.length !== 16) {
      setError("App password must be exactly 16 characters");
      return;
    }

    setValidating(true);
    setError("");
    setSuccess("");

    try {
      // First validate the SMTP connection
      const validateRes = await fetch("/api/validate-gmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gmailAddress: address,
          appPassword: appPassword,
        }),
      });

      if (!validateRes.ok) {
        const data = await validateRes.json();
        setError(data.error || "Gmail validation failed");
        return;
      }

      // Save to user profile
      const saveRes = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gmailConfig: {
            address,
            appPassword,
            validated: true,
          },
        }),
      });

      if (!saveRes.ok) {
        setError("Failed to save configuration");
        return;
      }

      setValidated(true);
      setEditing(false);
      setSuccess("Gmail configuration saved and validated!");
      setAppPassword(""); // Clear from UI after saving
    } catch {
      setError("Network error");
    } finally {
      setValidating(false);
      setSaving(false);
    }
  };

  const handleStartEditing = () => {
    setEditing(true);
    setAppPassword("");
    setError("");
    setSuccess("");
  };

  const handleCancelEditing = () => {
    setEditing(false);
    setAppPassword("");
    setError("");
    setSuccess("");
    // Re-load original address
    fetch("/api/user/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.gmailConfig) {
          setAddress(data.gmailConfig.address || "");
        }
      })
      .catch(() => {});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-text-muted">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  // Show read-only view when validated and NOT editing
  if (validated && !editing) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Gmail Configuration</h2>
          <p className="text-sm text-text-muted">
            Configure your Gmail app password for sending emails
          </p>
        </div>

        <div className="rounded-2xl border border-border-default bg-bg-surface p-6 space-y-4">
          {/* Status */}
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-success-dim text-success text-sm">
            <CheckCircle2 className="w-4 h-4" />
            Gmail is configured and validated
          </div>

          {/* Current email display */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-bg-elevated border border-border-default">
            <div>
              <p className="text-xs text-text-faint uppercase tracking-wider font-medium mb-0.5">Gmail Address</p>
              <p className="text-sm font-medium">{address}</p>
            </div>
            <div>
              <p className="text-xs text-text-faint uppercase tracking-wider font-medium mb-0.5">App Password</p>
              <p className="text-sm font-mono text-text-muted">••••••••••••••••</p>
            </div>
          </div>

          {success && (
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {success}
            </div>
          )}

          {/* Edit button */}
          <button
            onClick={handleStartEditing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border-default hover:bg-bg-elevated text-sm font-medium text-text-muted hover:text-text-primary transition-all"
          >
            <Pencil className="w-4 h-4" />
            Update Gmail Configuration
          </button>
        </div>
      </div>
    );
  }

  // Show editable form (new setup or editing mode)
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Gmail Configuration</h2>
        <p className="text-sm text-text-muted">
          {editing ? "Update your Gmail credentials below" : "Configure your Gmail app password for sending emails"}
        </p>
      </div>

      <div className="rounded-2xl border border-border-default bg-bg-surface p-6 space-y-5">
        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Gmail Address
          </label>
          <input
            type="email"
            value={address}
            onChange={(e) => { setAddress(e.target.value); setError(""); }}
            placeholder="your.email@gmail.com"
            className="w-full px-4 py-2.5 rounded-xl border border-border-default bg-bg-elevated text-sm placeholder:text-text-faint focus:border-accent-primary focus:outline-none transition-colors"
          />
        </div>

        {/* App Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
            App Password {editing && "(enter new password)"}
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={appPassword}
              onChange={(e) => { setAppPassword(e.target.value.replace(/\s/g, "")); setError(""); }}
              placeholder="16-character app password"
              maxLength={16}
              className="w-full px-4 py-2.5 pr-10 rounded-xl border border-border-default bg-bg-elevated text-sm placeholder:text-text-faint focus:border-accent-primary focus:outline-none transition-colors font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-muted"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-text-faint">
            Generate at{" "}
            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline"
            >
              myaccount.google.com/apppasswords
            </a>
          </p>
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
            {success}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleValidateAndSave}
            disabled={validating || saving || !address.trim() || !appPassword.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-primary hover:bg-accent-primary-hover disabled:opacity-40 text-white text-sm font-medium transition-all"
          >
            {validating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mail className="w-4 h-4" />
            )}
            {validating ? "Validating..." : "Validate & Save"}
          </button>

          {editing && (
            <button
              onClick={handleCancelEditing}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:bg-bg-elevated transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
