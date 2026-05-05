"use client";

import { useState } from "react";
import { Key, Cpu, Mail, FileText, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiKeyManager } from "@/components/api-key-manager";
import { ModelSelector } from "@/components/model-selector";
import { GmailSettings } from "@/components/gmail-settings";
import { ResumeSettings } from "@/components/resume-settings";

type SettingsSection = "api-keys" | "gmail" | "resume";

const SECTIONS = [
  { key: "api-keys", label: "API Keys & Models", icon: Key, description: "Configure API keys and choose your generation model." },
  { key: "gmail", label: "Gmail Configuration", icon: Mail, description: "Set up your Gmail app password for sending emails." },
  { key: "resume", label: "Resume Configuration", icon: FileText, description: "Upload a persistent resume for all campaigns." },
] as const;

export default function SettingsPage() {
  const [openSection, setOpenSection] = useState<SettingsSection | null>("api-keys");

  const toggleSection = (section: SettingsSection) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-text-secondary text-sm">
          Manage your credentials, AI model, and base resume.
        </p>
      </div>

      <div className="space-y-4">
        {SECTIONS.map(({ key, label, icon: Icon, description }) => {
          const isOpen = openSection === key;

          return (
            <div key={key} className="rounded-2xl border border-border-default bg-bg-surface overflow-hidden transition-all duration-300">
              <button
                onClick={() => toggleSection(key)}
                className="w-full flex items-center justify-between p-5 hover:bg-bg-elevated transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                    isOpen ? "bg-accent-dim text-accent-primary" : "bg-bg-subtle text-text-muted"
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary">{label}</h3>
                    <p className="text-xs text-text-muted mt-0.5">{description}</p>
                  </div>
                </div>
                <ChevronDown className={cn(
                  "w-5 h-5 text-text-muted transition-transform duration-300",
                  isOpen && "transform rotate-180 text-accent-primary"
                )} />
              </button>

              <div className={cn(
                "grid transition-all duration-300 ease-in-out",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}>
                <div className="overflow-hidden">
                  <div className="p-5 pt-0 border-t border-border-default/50 mt-2">
                    <div className="pt-4">
                      {key === "api-keys" && (
                        <div className="space-y-8">
                          <ApiKeyManager />
                          <div className="h-px w-full bg-border-default" />
                          <ModelSelector />
                        </div>
                      )}
                      {key === "gmail" && <GmailSettings />}
                      {key === "resume" && <ResumeSettings />}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
