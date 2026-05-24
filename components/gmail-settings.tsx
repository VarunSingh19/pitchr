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
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin text-[#ea580c]" />
      </div>
    );
  }

  // Show read-only view when validated and NOT editing
  if (validated && !editing) {
    return (
      <div className="space-y-4 font-mono">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Gmail Configuration</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Configure your Gmail app password for sending emails
          </p>
        </div>

        <div className="border-2 border-border bg-card p-6 space-y-4 rounded-none">
          {/* Status */}
          <div className="flex items-center gap-2 px-4 py-3 border-2 border-emerald-400/30 bg-emerald-400/5 text-emerald-400 text-xs uppercase tracking-wider font-bold">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Gmail is configured and validated
          </div>

          {/* Current email display */}
          <div className="grid md:grid-cols-2 gap-4 p-4 bg-foreground/[0.02] border-2 border-border rounded-none">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Gmail Address</p>
              <p className="text-xs font-bold text-foreground">{address}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">App Password</p>
              <p className="text-xs text-muted-foreground">••••••••••••••••</p>
            </div>
          </div>

          {success && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {success}
            </div>
          )}

          {/* Edit button */}
          <button
            onClick={handleStartEditing}
            className="flex items-center gap-2 px-5 py-3 border-2 border-border hover:border-[#ea580c] hover:bg-[#ea580c]/5 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-[#ea580c] transition-all rounded-none cursor-pointer"
          >
            <Pencil className="w-4 h-4" />
            Update Credentials
          </button>
        </div>
      </div>
    );
  }

  // Show editable form (new setup or editing mode)
  return (
    <div className="space-y-4 font-mono">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Gmail Configuration</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {editing ? "Update your Gmail credentials below" : "Configure your Gmail app password for sending emails"}
        </p>
      </div>

      <div className="border-2 border-border bg-card p-6 space-y-5 rounded-none">
        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Gmail Address
          </label>
          <input
            type="email"
            value={address}
            onChange={(e) => { setAddress(e.target.value); setError(""); }}
            placeholder="your.email@gmail.com"
            className="w-full px-4 py-3 border-2 border-border bg-foreground/[0.02] text-foreground text-xs font-mono placeholder:text-muted-foreground/50 focus:border-[#ea580c] focus:outline-none transition-colors rounded-none"
          />
        </div>

        {/* App Password */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            App Password {editing && "(enter new password)"}
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={appPassword}
              onChange={(e) => { setAppPassword(e.target.value.replace(/\s/g, "")); setError(""); }}
              placeholder="16-character app password"
              maxLength={16}
              className="w-full px-4 py-3 pr-10 border-2 border-border bg-foreground/[0.02] text-foreground text-xs font-mono placeholder:text-muted-foreground/50 focus:border-[#ea580c] focus:outline-none transition-colors rounded-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Generate credentials in Google Account under{" "}
            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#ea580c] hover:underline font-bold"
            >
              App Passwords
            </a>
          </p>
        </div>

        {/* Error/Success */}
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-400 font-bold uppercase tracking-wider">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {success}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleValidateAndSave}
            disabled={validating || saving || !address.trim() || !appPassword.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-foreground text-background text-xs font-bold uppercase tracking-widest hover:bg-[#ea580c] hover:text-background disabled:opacity-40 disabled:hover:bg-foreground disabled:hover:text-background transition-all rounded-none cursor-pointer"
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
              className="px-5 py-3 border-2 border-border text-xs font-bold uppercase tracking-widest text-muted-foreground hover:bg-foreground/5 transition-colors rounded-none cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
