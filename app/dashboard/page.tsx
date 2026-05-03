"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PlusCircle,
  Key,
  Mail,
  Sparkles,
  Settings,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Cpu,
} from "lucide-react";

interface UserSettings {
  apiKeysCount: number;
  selectedModel: string;
  gmailConfigured: boolean;
}

export default function DashboardPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings({
          apiKeysCount: data.apiKeysCount ?? 0,
          selectedModel: data.selectedModel ?? "gemini-2.5-flash",
          gmailConfigured: data.gmailConfigured ?? false,
        });
      })
      .catch(() => setSettings(null))
      .finally(() => setLoading(false));
  }, []);

  const readiness = settings
    ? [
        settings.apiKeysCount > 0,
        settings.gmailConfigured,
      ].filter(Boolean).length
    : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
        <p className="text-text-secondary text-sm">
          Your cold email automation command center
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        {/* API Keys */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-accent-dim flex items-center justify-center">
              <Key className="w-5 h-5 text-accent-primary" />
            </div>
            {!loading && settings && (
              settings.apiKeysCount > 0 ? (
                <CheckCircle2 className="w-4 h-4 text-success" />
              ) : (
                <AlertCircle className="w-4 h-4 text-warning" />
              )
            )}
          </div>
          <p className="text-2xl font-bold">
            {loading ? "—" : settings?.apiKeysCount ?? 0}
          </p>
          <p className="text-xs text-text-muted mt-0.5">API Keys configured</p>
        </div>

        {/* Model */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-accent-dim flex items-center justify-center">
              <Cpu className="w-5 h-5 text-accent-primary" />
            </div>
            <CheckCircle2 className="w-4 h-4 text-success" />
          </div>
          <p className="text-sm font-semibold truncate">
            {loading ? "—" : settings?.selectedModel ?? "gemini-2.5-flash"}
          </p>
          <p className="text-xs text-text-muted mt-0.5">Selected model</p>
        </div>

        {/* Gmail */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-accent-dim flex items-center justify-center">
              <Mail className="w-5 h-5 text-accent-primary" />
            </div>
            {!loading && settings && (
              settings.gmailConfigured ? (
                <CheckCircle2 className="w-4 h-4 text-success" />
              ) : (
                <AlertCircle className="w-4 h-4 text-warning" />
              )
            )}
          </div>
          <p className="text-sm font-semibold">
            {loading ? "—" : settings?.gmailConfigured ? "Connected" : "Not set up"}
          </p>
          <p className="text-xs text-text-muted mt-0.5">Gmail SMTP</p>
        </div>
      </div>

      {/* Setup prompt if incomplete */}
      {!loading && readiness < 2 && (
        <div className="rounded-2xl border border-warning/20 bg-warning-dim p-5 flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-warning mb-1">
              Complete your setup
            </h3>
            <p className="text-sm text-text-secondary">
              {settings?.apiKeysCount === 0 && "Add a Gemini API key. "}
              {!settings?.gmailConfigured && "Configure your Gmail credentials. "}
              <Link href="/dashboard/settings" className="text-accent-primary hover:underline">
                Go to Settings →
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* New Campaign CTA */}
      <div className="rounded-2xl border border-border-default bg-bg-surface p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-accent-dim flex items-center justify-center mx-auto mb-5">
          <Sparkles className="w-8 h-8 text-accent-primary" />
        </div>
        <h2 className="text-xl font-bold mb-2">Start a New Campaign</h2>
        <p className="text-sm text-text-secondary max-w-md mx-auto mb-6">
          Upload your leads, let AI craft personalized emails, review every
          message, then send them all with your resume attached.
        </p>
        <Link
          href="/dashboard/campaign/new"
          className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold transition-all hover:shadow-xl hover:shadow-accent-primary/25 hover:scale-[1.02]"
        >
          <PlusCircle className="w-4 h-4" />
          New Campaign
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Quick links */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/dashboard/settings"
          className="rounded-2xl border border-border-default bg-bg-surface p-5 hover:border-border-subtle hover:bg-bg-elevated transition-all group"
        >
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-text-muted group-hover:text-accent-primary transition-colors" />
            <div>
              <p className="text-sm font-medium group-hover:text-text-primary transition-colors">
                Manage Settings
              </p>
              <p className="text-xs text-text-faint">
                API keys, model selection, Gmail config
              </p>
            </div>
          </div>
        </Link>
        <Link
          href="/dashboard/campaign/new"
          className="rounded-2xl border border-border-default bg-bg-surface p-5 hover:border-border-subtle hover:bg-bg-elevated transition-all group"
        >
          <div className="flex items-center gap-3">
            <PlusCircle className="w-5 h-5 text-text-muted group-hover:text-accent-primary transition-colors" />
            <div>
              <p className="text-sm font-medium group-hover:text-text-primary transition-colors">
                Create Campaign
              </p>
              <p className="text-xs text-text-faint">
                Upload leads and generate emails
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
