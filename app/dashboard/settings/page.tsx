"use client";

import { useState } from "react";
import { Key, Cpu, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiKeyManager } from "@/components/api-key-manager";
import { ModelSelector } from "@/components/model-selector";
import { GmailSettings } from "@/components/gmail-settings";

type SettingsTab = "api-keys" | "model" | "gmail";

const TABS: { key: SettingsTab; label: string; icon: typeof Key }[] = [
  { key: "api-keys", label: "API Keys", icon: Key },
  { key: "model", label: "Model Selection", icon: Cpu },
  { key: "gmail", label: "Gmail Config", icon: Mail },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("api-keys");

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-text-secondary text-sm">
          Manage your API keys, AI model, and email configuration
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-2xl bg-bg-surface border border-border-default w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
              activeTab === key
                ? "bg-accent-dim text-accent-primary shadow-sm"
                : "text-text-muted hover:text-text-primary hover:bg-bg-elevated"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in">
        {activeTab === "api-keys" && <ApiKeyManager />}
        {activeTab === "model" && <ModelSelector />}
        {activeTab === "gmail" && <GmailSettings />}
      </div>
    </div>
  );
}
