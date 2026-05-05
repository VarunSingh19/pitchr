"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Loader2, Settings, Trash2 } from "lucide-react";
import Link from "next/link";
import type { Lead, GeneratedEmail, SendResult } from "@/lib/types";
import { FileUpload } from "@/components/file-upload";
import { CompanyTable } from "@/components/company-table";
import { EmailPreviewTable } from "@/components/email-preview-table";
import { GenerationProgress } from "@/components/generation-progress";
import { SendProgress } from "@/components/send-progress";
import { loadDraft, clearDraft, useAutoSaveDraft } from "@/lib/campaign-draft";

type Step = "upload" | "generate" | "preview" | "send";

const STEPS: { key: Step; label: string; num: number }[] = [
  { key: "upload", label: "Upload Leads", num: 1 },
  { key: "generate", label: "Generate Emails", num: 2 },
  { key: "preview", label: "Review & Edit", num: 3 },
  { key: "send", label: "Send", num: 4 },
];

interface UserConfig {
  userName: string;
  gmailConfigured: boolean;
  gmailAddress: string;
  apiKeysCount: number;
  selectedModel: string;
  savedResume: {
    fileName: string;
    parsedText: string;
  } | null;
}

export default function NewCampaignPage() {
  const [currentStep, setCurrentStep] = useState<Step>("upload");

  // ── User config (loaded from Settings) ──
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  // ── Upload state ──
  const [leads, setLeads] = useState<Lead[]>([]);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState<string>("");
  const [resumeFileName, setResumeFileName] = useState<string>("");
  const [useSavedResume, setUseSavedResume] = useState<boolean>(true); // NEW

  // ── Generation state ──
  const [generatedEmails, setGeneratedEmails] = useState<GeneratedEmail[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [generationIndex, setGenerationIndex] = useState(0);
  const pauseRef = useRef(false); // ref for the async loop to check

  // ── Send state ──
  const [sendResults, setSendResults] = useState<SendResult[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendComplete, setSendComplete] = useState(false);

  // ── Draft restored flag ──
  const [draftRestored, setDraftRestored] = useState(false);

  // ── Auto-save draft ──
  const hasMeaningfulData = leads.length > 0 || generatedEmails.length > 0;
  const generationPausedAt =
    isPaused || (generatedEmails.length > 0 && !isGenerating && generatedEmails.some((e) => e.status === "pending"))
      ? generatedEmails.findIndex((e) => e.status === "pending" || e.status === "generating")
      : null;

  useAutoSaveDraft(
    currentStep,
    leads,
    resumeText,
    resumeFileName,
    generatedEmails,
    generationPausedAt,
    hasMeaningfulData
  );

  // ── Restore draft on mount ──
  useEffect(() => {
    const draft = loadDraft();
    if (draft && (draft.leads.length > 0 || draft.generatedEmails.length > 0)) {
      setLeads(draft.leads);
      setResumeText(draft.resumeText);
      setResumeFileName(draft.resumeFileName);
      setGeneratedEmails(draft.generatedEmails);
      setCurrentStep(draft.step === "send" ? "preview" : draft.step);
      setDraftRestored(true);
      if (draft.resumeText) setUseSavedResume(false); // If draft had resume text, assume it wasn't the default saved resume or it doesn't matter
    }
  }, []);

  // ── Load user config from Settings on mount ──
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/user/settings");
        if (!res.ok) throw new Error("Failed to load settings");
        const data = await res.json();

        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();

        setUserConfig({
          userName: session?.user?.name || "",
          gmailConfigured: data.gmailConfigured ?? false,
          gmailAddress: data.gmailConfig?.address || "",
          apiKeysCount: data.apiKeysCount ?? 0,
          selectedModel: data.selectedModel || "",
          savedResume: data.resume || null,
        });
      } catch {
        setUserConfig(null);
      } finally {
        setConfigLoading(false);
      }
    }
    loadConfig();
  }, []);

  // ── Upload validation ──
  const isUploadReady =
    leads.length > 0 &&
    (useSavedResume ? !!userConfig?.savedResume : (resumeText.length > 0 && (resumeFile !== null || draftRestored))) &&
    userConfig !== null &&
    userConfig.apiKeysCount > 0 &&
    userConfig.gmailConfigured &&
    userConfig.userName.trim().length > 0;

  // ── Handle JSON upload ──
  const handleJsonUpload = useCallback((parsedLeads: Lead[]) => {
    setLeads(parsedLeads);
  }, []);

  // ── Handle Resume upload ──
  const handleResumeUpload = useCallback(async (file: File) => {
    setResumeFile(file);
    setResumeFileName(file.name);
    setUseSavedResume(false);
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/parse-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileBase64: base64 }),
      });
      if (!res.ok) throw new Error("Failed to parse resume");
      const data = await res.json();
      setResumeText(data.text);
    } catch {
      setResumeText("");
      setResumeFile(null);
      setResumeFileName("");
    }
  }, []);

  // ── Generate emails with pause support ──
  const runGeneration = useCallback(
    async (startFrom: number) => {
      if (!userConfig) return;

      pauseRef.current = false;
      setIsGenerating(true);
      setIsPaused(false);

      // If starting fresh, initialize the email array
      if (startFrom === 0) {
        const initial: GeneratedEmail[] = leads.map((lead) => ({
          companyId: lead.id,
          company: lead.company,
          role: lead.role,
          contactEmail: lead.contact_email,
          altEmail: lead.alt_email,
          subject: "",
          body: "",
          status: "pending" as const,
          selected: true,
        }));
        setGeneratedEmails(initial);
      }

      for (let i = startFrom; i < leads.length; i++) {
        // ── Check pause flag ──
        if (pauseRef.current) {
          setIsGenerating(false);
          setIsPaused(true);
          return; // exit loop — user can resume later
        }

        setGenerationIndex(i);
        setGeneratedEmails((prev) =>
          prev.map((e, idx) =>
            idx === i ? { ...e, status: "generating" as const } : e
          )
        );

        try {
          const textToUse = useSavedResume ? userConfig.savedResume?.parsedText : resumeText;
          
          const res = await fetch("/api/generate-emails", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              company: leads[i],
              resumeText: textToUse,
              userName: userConfig.userName,
            }),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "API error");
          }
          const data = await res.json();

          setGeneratedEmails((prev) =>
            prev.map((e, idx) =>
              idx === i
                ? {
                    ...e,
                    subject: data.subject,
                    body: data.body,
                    status: "ready" as const,
                  }
                : e
            )
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Generation failed";
          setGeneratedEmails((prev) =>
            prev.map((e, idx) =>
              idx === i
                ? { ...e, status: "failed" as const, error: msg }
                : e
            )
          );
        }
      }

      setIsGenerating(false);
      setIsPaused(false);
      setCurrentStep("preview");
    },
    [leads, resumeText, userConfig]
  );

  const handleGenerate = useCallback(() => {
    runGeneration(0);
  }, [runGeneration]);

  const handlePause = useCallback(() => {
    pauseRef.current = true;
    // The loop will check this flag and stop after the current email finishes
  }, []);

  const handleResume = useCallback(() => {
    // Find the first pending email to resume from
    const resumeIdx = generatedEmails.findIndex(
      (e) => e.status === "pending"
    );
    if (resumeIdx >= 0) {
      runGeneration(resumeIdx);
    }
  }, [generatedEmails, runGeneration]);

  // ── Send emails ──
  const handleSend = useCallback(async () => {
    if (!userConfig) return;
    const selected = generatedEmails.filter((e) => e.selected && e.status === "ready");
    if (selected.length === 0) return;

    setIsSending(true);
    setSendComplete(false);
    setCurrentStep("send");

    const initialResults: SendResult[] = selected.map((e) => ({
      companyId: e.companyId,
      company: e.company,
      role: e.role,
      email: e.contactEmail,
      subject: e.subject,
      status: "queued" as const,
    }));
    setSendResults(initialResults);

    const base64ToSend = useSavedResume ? "" : (resumeFile ? await fileToBase64(resumeFile) : "");
    const fileNameToSend = useSavedResume ? (userConfig.savedResume?.fileName || "") : (resumeFile?.name || "Resume.pdf");

    try {
      const res = await fetch("/api/send-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companies: selected.map((e) => ({
            companyId: e.companyId,
            company: e.company,
            role: e.role,
            contactEmail: e.contactEmail,
            altEmail: e.altEmail,
            subject: e.subject,
            body: e.body,
          })),
          resumeBase64: base64ToSend,
          resumeFileName: fileNameToSend,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Send request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === "status") {
                setSendResults((prev) =>
                  prev.map((r) =>
                    r.companyId === event.companyId
                      ? {
                          ...r,
                          status: event.status,
                          error: event.error,
                          timestamp: event.timestamp,
                        }
                      : r
                  )
                );
              }
            } catch {
              // skip
            }
          }
        }
      }
    } catch {
      setSendResults((prev) =>
        prev.map((r) =>
          r.status === "queued" || r.status === "sending"
            ? { ...r, status: "failed" as const, error: "Connection lost" }
            : r
        )
      );
    }

    setIsSending(false);
    setSendComplete(true);
    clearDraft(); // Campaign complete — clear the draft
  }, [generatedEmails, userConfig, resumeFile]);

  // ── Reset ──
  const handleReset = useCallback(() => {
    setLeads([]);
    setResumeFile(null);
    setResumeText("");
    setResumeFileName("");
    setGeneratedEmails([]);
    setIsGenerating(false);
    setIsPaused(false);
    setGenerationIndex(0);
    setSendResults([]);
    setIsSending(false);
    setSendComplete(false);
    setCurrentStep("upload");
    setDraftRestored(false);
    clearDraft();
  }, []);

  // ── Discard draft ──
  const handleDiscardDraft = useCallback(() => {
    if (confirm("Discard this saved campaign draft? This cannot be undone.")) {
      handleReset();
    }
  }, [handleReset]);

  // ── Config status banner ──
  const renderConfigStatus = () => {
    if (configLoading) {
      return (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-bg-surface border border-border-default text-sm text-text-muted">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading your configuration...
        </div>
      );
    }

    if (!userConfig) return null;

    const issues: string[] = [];
    if (userConfig.apiKeysCount === 0) issues.push("No API key configured");
    if (!userConfig.gmailConfigured) issues.push("Gmail not configured");
    if (!userConfig.userName.trim()) issues.push("Name not set in your Google account");

    if (issues.length === 0) {
      return (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-success-dim border border-success/20 text-sm">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="w-4 h-4" />
            Ready — using {userConfig.gmailAddress} with {userConfig.selectedModel}
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm">
        <div className="flex items-center gap-2 text-amber-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{issues.join(" · ")}</span>
        </div>
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-primary hover:bg-accent-primary-hover text-white text-xs font-medium transition-all"
        >
          <Settings className="w-3.5 h-3.5" />
          Go to Settings
        </Link>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">New Campaign</h1>
          <p className="text-text-secondary text-sm">
            Generate and send personalized cold emails
          </p>
        </div>
        <div className="flex items-center gap-3">
          {draftRestored && (
            <button
              onClick={handleDiscardDraft}
              className="flex items-center gap-1.5 text-xs text-text-faint hover:text-error transition-colors"
              title="Discard saved draft"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Discard Draft
            </button>
          )}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </div>

      {/* Draft restored banner */}
      {draftRestored && currentStep === "upload" && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-accent-dim border border-accent-primary/20 text-sm text-accent-primary animate-fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          Restored your previous campaign draft — pick up where you left off!
        </div>
      )}

      {/* Step indicators */}
      <div className="flex items-center gap-1">
        {STEPS.map((step, idx) => {
          const stepIdx = STEPS.findIndex((s) => s.key === currentStep);
          const isActive = step.key === currentStep;
          const isCompleted = idx < stepIdx;

          return (
            <div key={step.key} className="flex items-center">
              {idx > 0 && (
                <div
                  className={`w-8 h-px mx-1 transition-colors ${
                    isCompleted ? "bg-accent-primary" : "bg-border-default"
                  }`}
                />
              )}
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-accent-dim text-accent-primary border border-accent-primary/30"
                    : isCompleted
                      ? "text-accent-primary"
                      : "text-text-muted"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                    isActive
                      ? "bg-accent-primary text-white"
                      : isCompleted
                        ? "bg-accent-primary/20 text-accent-primary"
                        : "bg-bg-elevated text-text-faint"
                  }`}
                >
                  {step.num}
                </span>
                {step.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Step: Upload ── */}
      {currentStep === "upload" && (
        <div className="space-y-6 animate-fade-in">
          {renderConfigStatus()}

          <div className="grid lg:grid-cols-2 gap-6">
            <FileUpload
              type="json"
              onJsonParsed={handleJsonUpload}
              fileName={leads.length > 0 ? `${leads.length} companies loaded` : undefined}
            />
            {useSavedResume && userConfig?.savedResume ? (
              <div className="border border-border-default rounded-xl p-8 flex flex-col items-center justify-center text-center bg-bg-surface">
                <div className="w-12 h-12 rounded-full bg-accent-dim text-accent-primary flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-text-primary mb-1">Saved Resume Active</h3>
                <p className="text-sm text-text-secondary mb-4">{userConfig.savedResume.fileName}</p>
                <button
                  onClick={() => setUseSavedResume(false)}
                  className="text-xs font-medium text-accent-primary hover:text-accent-primary-hover transition-colors"
                >
                  Use a different file for this campaign
                </button>
              </div>
            ) : (
              <FileUpload
                type="pdf"
                onFileSelected={handleResumeUpload}
                fileName={resumeFile?.name || (draftRestored && resumeFileName ? `${resumeFileName} (cached)` : undefined)}
                resumeWordCount={resumeText ? resumeText.split(/\s+/).length : undefined}
              />
            )}
          </div>

          {leads.length > 0 && <CompanyTable leads={leads} />}

          <div className="flex justify-end">
            <button
              disabled={!isUploadReady}
              onClick={() => setCurrentStep("generate")}
              className="group px-6 py-3 rounded-xl bg-accent-primary hover:bg-accent-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-all flex items-center gap-2"
            >
              Next: Generate Emails
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Generate ── */}
      {currentStep === "generate" && (
        <div className="space-y-8 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="text-text-secondary text-sm">
              AI will create personalized emails for each company using your resume.
            </p>
            <button
              onClick={() => setCurrentStep("upload")}
              disabled={isGenerating}
              className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors disabled:opacity-40"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>

          <GenerationProgress
            emails={generatedEmails}
            isGenerating={isGenerating}
            isPaused={isPaused}
            currentIndex={generationIndex}
            totalCount={leads.length}
            onGenerate={handleGenerate}
            onPause={handlePause}
            onResume={handleResume}
          />

          {generatedEmails.length > 0 && !isGenerating && (
            <div className="flex justify-end pt-4">
              <button
                onClick={() => setCurrentStep("preview")}
                className="group px-6 py-3 rounded-xl bg-accent-primary hover:bg-accent-primary-hover text-white font-medium transition-all flex items-center gap-2 shadow-sm"
              >
                {generatedEmails.some(e => e.status === "pending") ? "Proceed with Generated Emails" : "Next: Review & Edit"}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Step: Preview ── */}
      {currentStep === "preview" && (
        <div className="space-y-8 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="text-text-secondary text-sm">
              Review generated emails, edit if needed, then select which to send.
            </p>
            <button
              onClick={() => setCurrentStep("generate")}
              className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>

          <EmailPreviewTable
            emails={generatedEmails}
            onEmailsChange={setGeneratedEmails}
            onSend={handleSend}
          />
        </div>
      )}

      {/* ── Step: Send ── */}
      {currentStep === "send" && (
        <SendProgress
          results={sendResults}
          isSending={isSending}
          isComplete={sendComplete}
          onReset={handleReset}
        />
      )}
    </div>
  );
}

/** Convert a File to base64 string */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
