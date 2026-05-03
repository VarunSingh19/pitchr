"use client";

import { useState, useCallback } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Lead, GeneratedEmail, SendResult, Credentials } from "@/lib/types";
import { FileUpload } from "@/components/file-upload";
import { CredentialsForm } from "@/components/credentials-form";
import { CompanyTable } from "@/components/company-table";
import { EmailPreviewTable } from "@/components/email-preview-table";
import { GenerationProgress } from "@/components/generation-progress";
import { SendProgress } from "@/components/send-progress";

type Step = "upload" | "generate" | "preview" | "send";

const STEPS: { key: Step; label: string; num: number }[] = [
  { key: "upload", label: "Upload & Configure", num: 1 },
  { key: "generate", label: "Generate Emails", num: 2 },
  { key: "preview", label: "Review & Edit", num: 3 },
  { key: "send", label: "Send", num: 4 },
];

export default function NewCampaignPage() {
  const [currentStep, setCurrentStep] = useState<Step>("upload");

  // ── Upload state ──
  const [leads, setLeads] = useState<Lead[]>([]);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState<string>("");
  const [credentials, setCredentials] = useState<Credentials>({
    fullName: "",
    gmailAddress: "",
    appPassword: "",
  });
  const [gmailValidated, setGmailValidated] = useState(false);

  // ── Generation state ──
  const [generatedEmails, setGeneratedEmails] = useState<GeneratedEmail[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationIndex, setGenerationIndex] = useState(0);

  // ── Send state ──
  const [sendResults, setSendResults] = useState<SendResult[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendComplete, setSendComplete] = useState(false);

  // ── Upload validation ──
  const isUploadReady =
    leads.length > 0 &&
    resumeFile !== null &&
    resumeText.length > 0 &&
    credentials.fullName.trim().length > 0 &&
    credentials.gmailAddress.trim().length > 0 &&
    credentials.appPassword.length === 16 &&
    gmailValidated;

  // ── Handle JSON upload ──
  const handleJsonUpload = useCallback((parsedLeads: Lead[]) => {
    setLeads(parsedLeads);
  }, []);

  // ── Handle Resume upload ──
  const handleResumeUpload = useCallback(async (file: File) => {
    setResumeFile(file);
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
    }
  }, []);

  // ── Generate emails ──
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setGenerationIndex(0);
    setGeneratedEmails([]);

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

    for (let i = 0; i < leads.length; i++) {
      setGenerationIndex(i);
      setGeneratedEmails((prev) =>
        prev.map((e, idx) =>
          idx === i ? { ...e, status: "generating" as const } : e
        )
      );

      try {
        const res = await fetch("/api/generate-emails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company: leads[i],
            resumeText,
            userName: credentials.fullName,
          }),
        });

        if (!res.ok) throw new Error("API error");
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
      } catch {
        setGeneratedEmails((prev) =>
          prev.map((e, idx) =>
            idx === i
              ? { ...e, status: "failed" as const, error: "Generation failed" }
              : e
          )
        );
      }
    }

    setIsGenerating(false);
    setCurrentStep("preview");
  }, [leads, resumeText, credentials.fullName]);

  // ── Send emails ──
  const handleSend = useCallback(async () => {
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

    const resumeBase64 = resumeFile ? await fileToBase64(resumeFile) : "";

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
          senderName: credentials.fullName,
          senderEmail: credentials.gmailAddress,
          appPassword: credentials.appPassword,
          resumeBase64,
          resumeFileName: resumeFile?.name || "Resume.pdf",
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
              // skip invalid JSON
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
  }, [generatedEmails, credentials, resumeFile]);

  // ── Reset ──
  const handleReset = useCallback(() => {
    setLeads([]);
    setResumeFile(null);
    setResumeText("");
    setCredentials({ fullName: "", gmailAddress: "", appPassword: "" });
    setGmailValidated(false);
    setGeneratedEmails([]);
    setIsGenerating(false);
    setGenerationIndex(0);
    setSendResults([]);
    setIsSending(false);
    setSendComplete(false);
    setCurrentStep("upload");
  }, []);

  return (
    <div className="space-y-6">
      {/* ── Step Progress Bar ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">New Campaign</h1>
          <p className="text-text-secondary text-sm">
            Generate and send personalized cold emails
          </p>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>
      </div>

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
        <div className="space-y-8 animate-fade-in">
          <div className="grid lg:grid-cols-2 gap-6">
            <FileUpload
              type="json"
              onJsonParsed={handleJsonUpload}
              fileName={leads.length > 0 ? `${leads.length} companies loaded` : undefined}
            />
            <FileUpload
              type="pdf"
              onFileSelected={handleResumeUpload}
              fileName={resumeFile?.name}
              resumeWordCount={resumeText ? resumeText.split(/\s+/).length : undefined}
            />
          </div>

          {leads.length > 0 && <CompanyTable leads={leads} />}

          <CredentialsForm
            credentials={credentials}
            onCredentialsChange={setCredentials}
            onValidated={setGmailValidated}
            isValidated={gmailValidated}
          />

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
              className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>

          <GenerationProgress
            emails={generatedEmails}
            isGenerating={isGenerating}
            currentIndex={generationIndex}
            totalCount={leads.length}
            onGenerate={handleGenerate}
          />
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
