"use client";

import { useState } from "react";
import { Mail, FileText, ChevronDown, Sparkles, Sliders } from "lucide-react";
import { cn } from "@/lib/utils";
import { GmailSettings } from "@/components/gmail-settings";
import { ResumeSettings } from "@/components/resume-settings";
import { ModelSelector } from "@/components/model-selector";
import { PromptSettings } from "@/components/prompt-settings";

type SettingsSection = "gmail" | "resume" | "model" | "prompt";

const SECTIONS = [
  { key: "gmail", label: "Gmail Configuration", icon: Mail, description: "Set up your Gmail app password for sending emails." },
  { key: "resume", label: "Resume Configuration", icon: FileText, description: "Upload a persistent resume for all campaigns." },
  { key: "model", label: "Model Selection", icon: Sparkles, description: "Choose the default AI model for email generation." },
  { key: "prompt", label: "Prompt Setup", icon: Sliders, description: "Configure custom criteria for your B2B candidate lead lists." },
] as const;

export default function SettingsPage() {
  const [openSection, setOpenSection] = useState<SettingsSection | null>("gmail");

  const toggleSection = (section: SettingsSection) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-2.5 h-2.5 bg-[#ea580c] animate-blink" />
          <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
            // TELEMETRY &amp; CONFIG
          </span>
        </div>
        <h1 className="font-pixel text-3xl sm:text-4xl tracking-tight text-foreground">
          SETTINGS
        </h1>
        <p className="text-xs font-mono text-muted-foreground mt-1 tracking-wide">
          Configure credentials, persistent assets, and pipeline prompts
        </p>
      </div>

      <div className="space-y-4">
        {SECTIONS.map(({ key, label, icon: Icon, description }) => {
          const isOpen = openSection === key;

          return (
            <div
              key={key}
              className={cn(
                "border-2 transition-all duration-200 bg-card rounded-none",
                isOpen ? "border-[#ea580c]" : "border-border hover:border-foreground/20"
              )}
            >
              <button
                onClick={() => toggleSection(key)}
                className="w-full flex items-center justify-between p-5 text-left font-mono"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 border-2 flex items-center justify-center transition-colors rounded-none",
                    isOpen ? "border-[#ea580c] bg-[#ea580c]/5 text-[#ea580c]" : "border-border bg-foreground/5 text-muted-foreground"
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm uppercase tracking-wider text-foreground">{label}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5 tracking-wide">{description}</p>
                  </div>
                </div>
                <ChevronDown className={cn(
                  "w-5 h-5 text-muted-foreground transition-transform duration-200",
                  isOpen && "transform rotate-180 text-[#ea580c]"
                )} />
              </button>

              <div className={cn(
                "grid transition-all duration-200 ease-in-out",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}>
                <div className="overflow-hidden">
                  <div className="p-5 pt-0 border-t-2 border-border/45 mt-2">
                    <div className="pt-4">
                      {key === "gmail" && <GmailSettings />}
                      {key === "resume" && <ResumeSettings />}
                      {key === "model" && <ModelSelector />}
                      {key === "prompt" && <PromptSettings />}
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
