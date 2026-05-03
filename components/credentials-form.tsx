"use client";

import { useState } from "react";
import {
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from "lucide-react";
import type { Credentials } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CredentialsFormProps {
  credentials: Credentials;
  onCredentialsChange: (creds: Credentials) => void;
  onValidated: (valid: boolean) => void;
  isValidated: boolean;
}

export function CredentialsForm({
  credentials,
  onCredentialsChange,
  onValidated,
  isValidated,
}: CredentialsFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const errors = {
    fullName: credentials.fullName.length > 0 && credentials.fullName.trim().length === 0
      ? "Name cannot be empty"
      : null,
    gmail:
      credentials.gmailAddress.length > 0 &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.gmailAddress)
        ? "Enter a valid email address"
        : null,
    appPassword:
      credentials.appPassword.length > 0 && credentials.appPassword.length !== 16
        ? `App password must be 16 characters (currently ${credentials.appPassword.length})`
        : null,
  };

  const canValidate =
    credentials.fullName.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.gmailAddress) &&
    credentials.appPassword.length === 16 &&
    !isValidated;

  const handleValidate = async () => {
    setIsValidating(true);
    setValidationError(null);
    try {
      const res = await fetch("/api/validate-gmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: credentials.gmailAddress,
          appPassword: credentials.appPassword,
        }),
      });
      const data = await res.json();
      if (data.valid) {
        onValidated(true);
      } else {
        setValidationError(data.error || "Invalid credentials");
        onValidated(false);
      }
    } catch {
      setValidationError("Failed to connect. Please try again.");
      onValidated(false);
    } finally {
      setIsValidating(false);
    }
  };

  const updateField = (field: keyof Credentials, value: string) => {
    onCredentialsChange({ ...credentials, [field]: value });
    // Reset validation when credentials change
    if (isValidated) {
      onValidated(false);
      setValidationError(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border-default bg-bg-surface p-6 space-y-5">
      <h3 className="text-base font-semibold">Gmail Credentials</h3>

      {/* Full Name */}
      <div className="space-y-1.5">
        <label className="text-sm text-text-secondary">Your Full Name</label>
        <input
          type="text"
          value={credentials.fullName}
          onChange={(e) => updateField("fullName", e.target.value)}
          placeholder="John Doe"
          className={cn(
            "w-full px-4 py-2.5 rounded-xl bg-bg-base border text-sm text-text-primary placeholder:text-text-faint outline-none transition-all focus:ring-2 focus:ring-accent-primary/30",
            errors.fullName ? "border-error" : "border-border-default focus:border-accent-primary"
          )}
        />
        {errors.fullName && (
          <p className="text-xs text-error flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.fullName}
          </p>
        )}
      </div>

      {/* Gmail Address */}
      <div className="space-y-1.5">
        <label className="text-sm text-text-secondary">Gmail Address</label>
        <input
          type="email"
          value={credentials.gmailAddress}
          onChange={(e) => updateField("gmailAddress", e.target.value)}
          placeholder="you@gmail.com"
          className={cn(
            "w-full px-4 py-2.5 rounded-xl bg-bg-base border text-sm text-text-primary placeholder:text-text-faint outline-none transition-all focus:ring-2 focus:ring-accent-primary/30",
            errors.gmail ? "border-error" : "border-border-default focus:border-accent-primary"
          )}
        />
        {errors.gmail && (
          <p className="text-xs text-error flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.gmail}
          </p>
        )}
      </div>

      {/* App Password */}
      <div className="space-y-1.5">
        <label className="text-sm text-text-secondary">Gmail App Password</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={credentials.appPassword}
            onChange={(e) => updateField("appPassword", e.target.value.replace(/\s/g, ""))}
            placeholder="xxxx xxxx xxxx xxxx"
            maxLength={16}
            className={cn(
              "w-full px-4 py-2.5 pr-12 rounded-xl bg-bg-base border text-sm font-mono text-text-primary placeholder:text-text-faint outline-none transition-all focus:ring-2 focus:ring-accent-primary/30",
              errors.appPassword
                ? "border-error"
                : "border-border-default focus:border-accent-primary"
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-muted transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.appPassword && (
          <p className="text-xs text-error flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.appPassword}
          </p>
        )}
      </div>

      {/* How to get App Password */}
      <button
        type="button"
        onClick={() => setShowHelp(!showHelp)}
        className="flex items-center gap-2 text-sm text-text-muted hover:text-accent-primary transition-colors"
      >
        <HelpCircle className="w-3.5 h-3.5" />
        How to get a Gmail App Password
        {showHelp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {showHelp && (
        <div className="rounded-xl bg-bg-base border border-border-default p-4 text-sm text-text-secondary space-y-2">
          <ol className="list-decimal list-inside space-y-1.5 text-xs leading-relaxed">
            <li>Go to your <a href="https://myaccount.google.com" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">Google Account</a></li>
            <li>Navigate to <strong>Security → 2-Step Verification</strong> (must be enabled)</li>
            <li>At the bottom, click <strong>App passwords</strong></li>
            <li>Select app: <strong>Mail</strong>, select device: <strong>Other</strong> (enter &quot;ColdMailer&quot;)</li>
            <li>Click <strong>Generate</strong></li>
            <li>Copy the 16-character password (no spaces)</li>
          </ol>
        </div>
      )}

      {/* Validate Button */}
      <div className="flex items-center gap-4 pt-2">
        <button
          type="button"
          onClick={handleValidate}
          disabled={!canValidate || isValidating}
          className={cn(
            "px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
            isValidated
              ? "bg-success-dim text-success border border-success/20"
              : "bg-accent-primary hover:bg-accent-primary-hover text-white disabled:opacity-40 disabled:cursor-not-allowed"
          )}
        >
          {isValidating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Validating...</>
          ) : isValidated ? (
            <><CheckCircle2 className="w-4 h-4" /> Connection Verified</>
          ) : (
            "Validate Connection"
          )}
        </button>

        {validationError && (
          <p className="text-sm text-error flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {validationError}
          </p>
        )}
      </div>
    </div>
  );
}
