"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Loader2, Settings, Trash2, Copy, X, AlertTriangle } from "lucide-react";
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
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [generatedEmails, setGeneratedEmails] = useState<GeneratedEmail[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState({ generated: 0, failed: 0, total: 0, status: "DRAFT" });
  const [generationIndex, setGenerationIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [sendResults, setSendResults] = useState<SendResult[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendComplete, setSendComplete] = useState(false);
  const [useSavedResume, setUseSavedResume] = useState<boolean>(true); // NEW
  const [showPromptHelper, setShowPromptHelper] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deletingLead, setDeletingLead] = useState<Lead | null>(null);
  const [alreadySent, setAlreadySent] = useState<Set<string>>(new Set());
  const [checkingSent, setCheckingSent] = useState(false);
  const [invalidEmails, setInvalidEmails] = useState<Set<string>>(new Set());
  const [isVerifying, setIsVerifying] = useState(false);
  const [autoSend, setAutoSend] = useState(false);

  const handleDeleteLead = useCallback((leadToDelete: Lead) => {
    setDeletingLead(leadToDelete);
  }, []);

  const confirmDeleteLead = useCallback(() => {
    if (deletingLead) {
      setLeads((prev) => prev.filter((l) => l !== deletingLead));
      setDeletingLead(null);
    }
  }, [deletingLead]);

  const handleUpdateLead = useCallback((updatedLead: Lead) => {
    setLeads((prev) => prev.map((l) => l.id === updatedLead.id ? updatedLead : l));
    setEditingLead(null);
  }, []);



  // ── Mounted state for Portals ──
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ── Draft restored flag ──
  const [draftRestored, setDraftRestored] = useState(false);

  // ── Auto-save draft ──
  const hasMeaningfulData = leads.length > 0 || generatedEmails.length > 0;
  const generationPausedAt: number | null = null; // Background generation via Inngest — no client-side pause tracking

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
    userConfig !== null &&
    (useSavedResume ? !!userConfig.savedResume : (resumeText.length > 0 && (resumeFile !== null || draftRestored))) &&
    userConfig.gmailConfigured &&
    userConfig.userName.trim().length > 0;

  // ── Check which leads were already sent & verify domains ──
  const checkAlreadySent = useCallback(async (leadsToCheck: Lead[]) => {
    const emails = leadsToCheck
      .map((l) => l.contact_email)
      .filter(Boolean);
    if (emails.length === 0) return;

    setCheckingSent(true);
    setIsVerifying(true);
    try {
      const [sentRes, verifyRes] = await Promise.all([
        fetch("/api/leads/check-sent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails }),
        }).catch(() => null),
        fetch("/api/leads/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails }),
        }).catch(() => null)
      ]);

      if (sentRes && sentRes.ok) {
        const data = await sentRes.json();
        setAlreadySent(new Set((data.alreadySent || []).map((e: string) => e.toLowerCase())));
      }
      
      if (verifyRes && verifyRes.ok) {
        const data = await verifyRes.json();
        setInvalidEmails(new Set((data.invalidEmails || []).map((e: string) => e.toLowerCase())));
      }
    } catch {
      // ignore — just won't show badges
    } finally {
      setCheckingSent(false);
      setIsVerifying(false);
    }
  }, []);

  // ── Handle JSON upload ──
  const handleJsonUpload = useCallback((parsedLeads: Lead[]) => {
    setLeads(parsedLeads);
    checkAlreadySent(parsedLeads);
  }, [checkAlreadySent]);

  // ── Remove already-sent and invalid leads ──
  const handleRemoveAlreadySent = useCallback(() => {
    setLeads((prev) => prev.filter((l) => !alreadySent.has(l.contact_email?.toLowerCase())));
    setAlreadySent(new Set());
  }, [alreadySent]);

  const handleRemoveInvalid = useCallback(() => {
    setLeads((prev) => prev.filter((l) => !invalidEmails.has(l.contact_email?.toLowerCase())));
    setInvalidEmails(new Set());
  }, [invalidEmails]);

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

  // ── Polling Logic ──
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isGenerating && campaignId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/campaigns/${campaignId}/status`);
          if (!res.ok) return;
          const data = await res.json();
          setPollingStatus(data);

          if (data.generated + data.failed >= data.total && data.total > 0) {
            setIsGenerating(false);
            clearInterval(interval);
            // Fetch the final emails for preview
            const emailsRes = await fetch(`/api/campaigns/${campaignId}/emails`);
            if (emailsRes.ok) {
              const emails = await emailsRes.json();
              setGeneratedEmails(emails);
              setCurrentStep("preview");
            }
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGenerating, campaignId]);

  const handleGenerate = useCallback(async () => {
    if (!userConfig) return;

    // Silently skip invalid and already-sent emails
    const validLeads = leads.filter(l => 
      !invalidEmails.has(l.contact_email?.toLowerCase()) && 
      !alreadySent.has(l.contact_email?.toLowerCase())
    );

    const skippedCount = leads.length - validLeads.length;
    if (skippedCount > 0) {
      // Using standard alert as toast replacement for now since no toast library is imported
      alert(`${skippedCount} invalid or previously sent emails were skipped.`);
    }

    if (validLeads.length === 0) {
      alert("No valid leads left to generate emails for.");
      return;
    }

    setIsGenerating(true);
    setPollingStatus({ generated: 0, failed: 0, total: validLeads.length, status: "DRAFT" });

    try {
      // 1. Create Campaign
      const createRes = await fetch("/api/campaigns/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Campaign ${new Date().toLocaleDateString()}` }),
      });
      if (!createRes.ok) throw new Error("Failed to create campaign");
      const campaign = await createRes.json();
      const cId = campaign._id;
      setCampaignId(cId);

      // 2. Start Generation via Inngest
      const startRes = await fetch("/api/campaign/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: cId,
          leads: validLeads,
          resumeText: useSavedResume ? userConfig.savedResume?.parsedText : resumeText,
          autoSend,
        }),
      });

      if (!startRes.ok) {
        const errData = await startRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to start background generation");
      }
    } catch (error) {
      console.error(error);
      setIsGenerating(false);
      alert(error instanceof Error ? error.message : "Failed to start campaign");
    }
  }, [leads, resumeText, userConfig, useSavedResume, autoSend, invalidEmails, alreadySent]);

  const handleRequeueFailed = useCallback(async () => {
    if (!campaignId || !userConfig) return;
    try {
      const res = await fetch("/api/campaign/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          leads: leads.filter((_, i) => generatedEmails[i]?.status === "failed"),
          resumeText: useSavedResume ? userConfig.savedResume?.parsedText : resumeText,
        }),
      });
      if (res.ok) setIsGenerating(true);
    } catch (error) {
      alert("Failed to re-queue");
    }
  }, [campaignId, leads, generatedEmails, resumeText, userConfig, useSavedResume]);

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
    if (!userConfig.gmailConfigured) issues.push("Gmail not configured");
    if (!userConfig.userName.trim()) issues.push("Name not set in your Google account");

    if (issues.length === 0) {
      return (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-success-dim border border-success/20 text-sm">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="w-4 h-4" />
            Ready — using {userConfig.gmailAddress} with Pitchr AI
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
                  className={`w-8 h-px mx-1 transition-colors ${isCompleted ? "bg-accent-primary" : "bg-border-default"
                    }`}
                />
              )}
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isActive
                  ? "bg-accent-dim text-accent-primary border border-accent-primary/30"
                  : isCompleted
                    ? "text-accent-primary"
                    : "text-text-muted"
                  }`}
              >
                <span
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${isActive
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
            <div className="flex flex-col gap-3">
              <FileUpload
                type="json"
                onJsonParsed={handleJsonUpload}
                fileName={leads.length > 0 ? `${leads.length} companies loaded` : undefined}
              />
              <button
                onClick={() => setShowPromptHelper(true)}
                className="text-xs font-medium text-accent-primary hover:text-accent-primary-hover transition-colors text-center w-full mt-2"
              >
                Don't have a JSON? See prompt to generate one
              </button>

              {/* Modal Overlay rendered via Portal */}
              {showPromptHelper && mounted && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                  <div className="bg-bg-surface border border-border-default rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                    <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-bg-elevated/50">
                      <h3 className="font-semibold text-text-primary">Prompt for ChatGPT/Claude</h3>
                      <button
                        onClick={() => setShowPromptHelper(false)}
                        className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-subtle transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="p-4 flex-1 overflow-y-auto">
                      <pre className="text-sm text-text-primary leading-relaxed font-mono bg-black/40 p-5 rounded-xl border border-border-default whitespace-pre-wrap">
                        {`SYSTEM:
You are a senior B2B lead researcher and talent acquisition analyst with 12+ years of experience in
corporate intelligence, HR sourcing, and developer hiring markets in India's tech ecosystem.
You specialize in: (1) verified contact discovery using multi-source cross-referencing,
(2) Mumbai/Pune startup and enterprise tech hiring intelligence,
(3) Full Stack / React / Node.js engineering job market analysis.

---

YOUR RULES (READ BEFORE ANYTHING ELSE):

- Never fabricate, guess, or infer an email address from a company name alone
- Never use pattern-matching like "hr@companyname.com" unless that exact email was confirmed in a public source
- Never output a company record unless at least ONE of these tool searches was run for it:
  web_search, LinkedIn job post fetch, Glassdoor page fetch, company website fetch,
  Indeed listing fetch, Cutshort/Wellfound listing fetch
- Never mark email_verified: true unless the exact email string appeared in a scraped/fetched source
- Never list a company from memory — every company must come from a live tool result
- Never skip the verification pipeline for any company, even if you are confident
- Never output partial records — every field must be filled or explicitly set to null
- Never combine two different companies' data into one record
- Always document the exact URL where each email was found under email_source
- Always use tool results as the primary data source — your training knowledge is secondary
- Refuse to include any company if all contact info is inferred and not directly sourced

---

THINKING MANDATE:
Before outputting the final JSON, write your complete reasoning inside <thinking> tags.
For each company, document:
  - Which tools were called to find it
  - Which tools were called to verify its email
  - What the raw result was (found / not found / inferred)
  - Final verification decision with evidence

Deliver the final JSON array inside <final> tags.

---

CONTEXT:
- Target geography: Mumbai — specifically Malad and Andheri areas (also accept nearby: Goregaon, Jogeshwari, MIDC, SV Road, WEH, Link Road corridors)
- Target roles: Full Stack Developer, React Developer, Node.js Developer, MERN Stack Developer
- Target company types: Product startups, IT services firms, SaaS companies, agencies actively posting jobs
- Minimum requirement: Company must have a job posting dated within the last 90 days
- Researcher location context: Mumbai, Maharashtra

---

TASK:
Find at least 20 companies in Mumbai (Malad/Andheri focus) actively hiring Full Stack / React / Node.js developers. For each company, run a complete multi-source verification pipeline using your available tools to find and confirm HR/careers contact emails. Return results as a strict JSON array.

<pipeline>

  <step id="S1" label="DISCOVERY">
    USE THESE TOOLS to find actively hiring companies:
    - web_search: "Full Stack Developer jobs Malad Mumbai 2024 site:linkedin.com"
    - web_search: "React Node.js developer hiring Andheri Mumbai Glassdoor"
    - web_search: "MERN stack developer jobs Malad Andheri Mumbai Indeed"
    - web_search: "Full Stack Developer Andheri Mumbai Cutshort"
    - web_search: "Node.js React developer hiring Mumbai Wellfound"
    - web_search: "software company Malad Andheri Mumbai hiring developer 2024"
    Run ALL of the above. Collect company names, job post URLs, and posting dates.
    NEVER rely on memory for this step — only tool results count.
  </step>

  <step id="S2" label="CONTACT VERIFICATION (run for EVERY company)">
    For each company found in S1, run this exact verification pipeline in order:

    CHECK 1 — Company website:
      - web_fetch: company website homepage
      - web_fetch: company_website.com/careers
      - web_fetch: company_website.com/contact
      - Look for: mailto: links, "careers@", "hr@", "jobs@", "talent@", contact forms with email
      - If found: set email_verified: true, email_source: "[URL where found]"

    CHECK 2 — LinkedIn job post:
      - web_fetch: the LinkedIn job post URL found in S1
      - web_search: "[Company Name] HR email LinkedIn Mumbai"
      - Look for: "apply via email", recruiter email in post description, LinkedIn recruiter profile with email
      - If found: set email_verified: true, email_source: "LinkedIn job post [URL]"

    CHECK 3 — Glassdoor:
      - web_search: "[Company Name] Glassdoor Mumbai HR contact email"
      - web_fetch: Glassdoor company page if returned
      - Look for: email in "About" section or interview reviews mentioning HR contact
      - If found: set email_verified: true, email_source: "Glassdoor: [URL]"

    CHECK 4 — Indeed:
      - web_search: "[Company Name] Indeed Mumbai Full Stack Developer email"
      - web_fetch: Indeed job listing URL if returned
      - Look for: "send resume to [email]", employer contact details
      - If found: set email_verified: true, email_source: "Indeed: [URL]"

    CHECK 5 — Cutshort / Wellfound:
      - web_search: "[Company Name] Cutshort contact email"
      - web_search: "[Company Name] Wellfound hiring email"
      - Look for: recruiter email, company bio with contact info
      - If found: set email_verified: true, email_source: "Cutshort/Wellfound: [URL]"

    CHECK 6 — General web sweep:
      - web_search: "[Company Name] Mumbai HR email careers"
      - web_search: "[Company Name] jobs apply email"
      - Look for: press releases, job aggregators, GitHub org pages with contact info
      - If found: set email_verified: true, email_source: "[URL]"

    DECISION RULES:
    - If email found in any check above → email_verified: true
    - If no email found but a careers page or apply form exists → email_verified: false,
      contact_email: null, note the apply URL in email_source
    - If nothing found at all → email_verified: false, contact_email: null,
      alt_email: null, email_source: "Not found after 6-step verification"
    - NEVER write "hr@[domain]" or any guessed pattern as contact_email
  </step>

  <step id="S3" label="RECORD ASSEMBLY">
    Assemble each verified company into this exact JSON schema:
    {
      "id": [sequential number],
      "company": "[Exact legal/brand name from source]",
      "location": "Mumbai, Maharashtra",
      "area": "[Malad West / Malad East / Andheri West / Andheri East / Goregaon / etc.]",
      "role": "[Exact job title from the job post]",
      "description": "[2 sentences: what the company does + why they are hiring this role]",
      "contact_email": "[confirmed email or null]",
      "alt_email": "[second confirmed email or null]",
      "website": "[domain.com — no https, no trailing slash]",
      "type": "[Full-time / Contract / Freelance — from job post]",
      "stack": ["[tech1]", "[tech2]", "[tech3]"],
      "email_verified": [true / false],
      "email_source": "[exact URL or 'Not found after 6-step verification']",
      "fit_score": "[1 sentence: why this role matches a Full Stack React/Node.js developer]",
      "status": "[Actively Hiring / Hiring / Open — based on post recency]"
    }
  </step>

</pipeline>

---

FEW-SHOT EXAMPLE (Required reasoning depth):

INPUT: Found "Bluebirds Tech Pvt Ltd" hiring React Developer in Andheri East on LinkedIn.

REASONING:
  - S1 source: LinkedIn job post URL linkedin.com/jobs/view/123456 — post dated 12 days ago ✓
  - CHECK 1: Fetched bluebirdstech.com/careers — found "send your resume to careers@bluebirdstech.com" ✓
  - CHECK 2: LinkedIn post says "Apply on site" — no email in post body
  - Decision: email_verified: true — confirmed from company careers page
  - fit_score: Hiring React + Node.js for SaaS dashboard product — direct stack match

OUTPUT:
{
  "id": 1,
  "company": "Bluebirds Tech Pvt Ltd",
  "location": "Mumbai, Maharashtra",
  "area": "Andheri East",
  "role": "React Developer",
  "description": "Bluebirds Tech builds B2B SaaS dashboards for logistics companies. They are expanding their frontend team to handle new client integrations.",
  "contact_email": "careers@bluebirdstech.com",
  "alt_email": null,
  "website": "bluebirdstech.com",
  "type": "Full-time",
  "stack": ["React", "Node.js", "MongoDB", "AWS"],
  "email_verified": true,
  "email_source": "https://bluebirdstech.com/careers — direct email in page text",
  "fit_score": "Exact React + Node.js stack match; SaaS product work with real user scale",
  "status": "Actively Hiring"
}

---

OUTPUT STRUCTURE:

Deliver inside <final> tags in this order:

<final>
  <summary>
    Total companies found: [N]
    Email verified (true): [N]
    Email not found: [N]
    Search tools used: [list all web_search queries and web_fetch URLs called]
  </summary>

  <json_array>
    [
      { ... company record 1 ... },
      { ... company record 2 ... },
      ...
    ]
  </json_array>
</final>

---

SELF-CHECK (run after generating all records, fix before delivering output):

1. Does every company have a job post URL in the thinking block proving it was found via tool?
2. Is every email_verified: true backed by an exact URL in email_source?
3. Does any contact_email look like a guessed pattern (hr@, info@, [name]@domain)
   without a source URL? → If yes, set to null and email_verified: false
4. Are there any two records with the same company name? → Deduplicate
5. Does every stack array contain at least 2 technologies from the actual job post?
6. Is every "area" field a real Mumbai locality, not just "Mumbai"?
7. Were at least 5 different tool queries run across S1 discovery?
8. Were at least 3 verification checks run per company in S2?
9. Are there at least 20 records total?
10. Does the <summary> block list every search query and fetch URL actually called?
If any check fails → fix the affected records before outputting <final>.`}
                      </pre>
                    </div>

                    <div className="p-4 border-t border-border-subtle bg-bg-elevated/50 flex justify-end">
                      <button
                        onClick={() => {
                          const promptText = `SYSTEM:
You are a senior B2B lead researcher and talent acquisition analyst with 12+ years of experience in
corporate intelligence, HR sourcing, and developer hiring markets in India's tech ecosystem.
You specialize in: (1) verified contact discovery using multi-source cross-referencing,
(2) Mumbai/Pune startup and enterprise tech hiring intelligence,
(3) Full Stack / React / Node.js engineering job market analysis.

---

YOUR RULES (READ BEFORE ANYTHING ELSE):

- Never fabricate, guess, or infer an email address from a company name alone
- Never use pattern-matching like "hr@companyname.com" unless that exact email was confirmed in a public source
- Never output a company record unless at least ONE of these tool searches was run for it:
  web_search, LinkedIn job post fetch, Glassdoor page fetch, company website fetch,
  Indeed listing fetch, Cutshort/Wellfound listing fetch
- Never mark email_verified: true unless the exact email string appeared in a scraped/fetched source
- Never list a company from memory — every company must come from a live tool result
- Never skip the verification pipeline for any company, even if you are confident
- Never output partial records — every field must be filled or explicitly set to null
- Never combine two different companies' data into one record
- Always document the exact URL where each email was found under email_source
- Always use tool results as the primary data source — your training knowledge is secondary
- Refuse to include any company if all contact info is inferred and not directly sourced

---

THINKING MANDATE:
Before outputting the final JSON, write your complete reasoning inside <thinking> tags.
For each company, document:
  - Which tools were called to find it
  - Which tools were called to verify its email
  - What the raw result was (found / not found / inferred)
  - Final verification decision with evidence

Deliver the final JSON array inside <final> tags.

---

CONTEXT:
- Target geography: Mumbai — specifically Malad and Andheri areas (also accept nearby: Goregaon, Jogeshwari, MIDC, SV Road, WEH, Link Road corridors)
- Target roles: Full Stack Developer, React Developer, Node.js Developer, MERN Stack Developer
- Target company types: Product startups, IT services firms, SaaS companies, agencies actively posting jobs
- Minimum requirement: Company must have a job posting dated within the last 90 days
- Researcher location context: Mumbai, Maharashtra

---

TASK:
Find at least 20 companies in Mumbai (Malad/Andheri focus) actively hiring Full Stack / React / Node.js developers. For each company, run a complete multi-source verification pipeline using your available tools to find and confirm HR/careers contact emails. Return results as a strict JSON array.

<pipeline>

  <step id="S1" label="DISCOVERY">
    USE THESE TOOLS to find actively hiring companies:
    - web_search: "Full Stack Developer jobs Malad Mumbai 2024 site:linkedin.com"
    - web_search: "React Node.js developer hiring Andheri Mumbai Glassdoor"
    - web_search: "MERN stack developer jobs Malad Andheri Mumbai Indeed"
    - web_search: "Full Stack Developer Andheri Mumbai Cutshort"
    - web_search: "Node.js React developer hiring Mumbai Wellfound"
    - web_search: "software company Malad Andheri Mumbai hiring developer 2024"
    Run ALL of the above. Collect company names, job post URLs, and posting dates.
    NEVER rely on memory for this step — only tool results count.
  </step>

  <step id="S2" label="CONTACT VERIFICATION (run for EVERY company)">
    For each company found in S1, run this exact verification pipeline in order:

    CHECK 1 — Company website:
      - web_fetch: company website homepage
      - web_fetch: company_website.com/careers
      - web_fetch: company_website.com/contact
      - Look for: mailto: links, "careers@", "hr@", "jobs@", "talent@", contact forms with email
      - If found: set email_verified: true, email_source: "[URL where found]"

    CHECK 2 — LinkedIn job post:
      - web_fetch: the LinkedIn job post URL found in S1
      - web_search: "[Company Name] HR email LinkedIn Mumbai"
      - Look for: "apply via email", recruiter email in post description, LinkedIn recruiter profile with email
      - If found: set email_verified: true, email_source: "LinkedIn job post [URL]"

    CHECK 3 — Glassdoor:
      - web_search: "[Company Name] Glassdoor Mumbai HR contact email"
      - web_fetch: Glassdoor company page if returned
      - Look for: email in "About" section or interview reviews mentioning HR contact
      - If found: set email_verified: true, email_source: "Glassdoor: [URL]"

    CHECK 4 — Indeed:
      - web_search: "[Company Name] Indeed Mumbai Full Stack Developer email"
      - web_fetch: Indeed job listing URL if returned
      - Look for: "send resume to [email]", employer contact details
      - If found: set email_verified: true, email_source: "Indeed: [URL]"

    CHECK 5 — Cutshort / Wellfound:
      - web_search: "[Company Name] Cutshort contact email"
      - web_search: "[Company Name] Wellfound hiring email"
      - Look for: recruiter email, company bio with contact info
      - If found: set email_verified: true, email_source: "Cutshort/Wellfound: [URL]"

    CHECK 6 — General web sweep:
      - web_search: "[Company Name] Mumbai HR email careers"
      - web_search: "[Company Name] jobs apply email"
      - Look for: press releases, job aggregators, GitHub org pages with contact info
      - If found: set email_verified: true, email_source: "[URL]"

    DECISION RULES:
    - If email found in any check above → email_verified: true
    - If no email found but a careers page or apply form exists → email_verified: false,
      contact_email: null, note the apply URL in email_source
    - If nothing found at all → email_verified: false, contact_email: null,
      alt_email: null, email_source: "Not found after 6-step verification"
    - NEVER write "hr@[domain]" or any guessed pattern as contact_email
  </step>

  <step id="S3" label="RECORD ASSEMBLY">
    Assemble each verified company into this exact JSON schema:
    {
      "id": [sequential number],
      "company": "[Exact legal/brand name from source]",
      "location": "Mumbai, Maharashtra",
      "area": "[Malad West / Malad East / Andheri West / Andheri East / Goregaon / etc.]",
      "role": "[Exact job title from the job post]",
      "description": "[2 sentences: what the company does + why they are hiring this role]",
      "contact_email": "[confirmed email or null]",
      "alt_email": "[second confirmed email or null]",
      "website": "[domain.com — no https, no trailing slash]",
      "type": "[Full-time / Contract / Freelance — from job post]",
      "stack": ["[tech1]", "[tech2]", "[tech3]"],
      "email_verified": [true / false],
      "email_source": "[exact URL or 'Not found after 6-step verification']",
      "fit_score": "[1 sentence: why this role matches a Full Stack React/Node.js developer]",
      "status": "[Actively Hiring / Hiring / Open — based on post recency]"
    }
  </step>

</pipeline>

---

FEW-SHOT EXAMPLE (Required reasoning depth):

INPUT: Found "Bluebirds Tech Pvt Ltd" hiring React Developer in Andheri East on LinkedIn.

REASONING:
  - S1 source: LinkedIn job post URL linkedin.com/jobs/view/123456 — post dated 12 days ago ✓
  - CHECK 1: Fetched bluebirdstech.com/careers — found "send your resume to careers@bluebirdstech.com" ✓
  - CHECK 2: LinkedIn post says "Apply on site" — no email in post body
  - Decision: email_verified: true — confirmed from company careers page
  - fit_score: Hiring React + Node.js for SaaS dashboard product — direct stack match

OUTPUT:
{
  "id": 1,
  "company": "Bluebirds Tech Pvt Ltd",
  "location": "Mumbai, Maharashtra",
  "area": "Andheri East",
  "role": "React Developer",
  "description": "Bluebirds Tech builds B2B SaaS dashboards for logistics companies. They are expanding their frontend team to handle new client integrations.",
  "contact_email": "careers@bluebirdstech.com",
  "alt_email": null,
  "website": "bluebirdstech.com",
  "type": "Full-time",
  "stack": ["React", "Node.js", "MongoDB", "AWS"],
  "email_verified": true,
  "email_source": "https://bluebirdstech.com/careers — direct email in page text",
  "fit_score": "Exact React + Node.js stack match; SaaS product work with real user scale",
  "status": "Actively Hiring"
}

---

OUTPUT STRUCTURE:

Deliver inside <final> tags in this order:

<final>
  <summary>
    Total companies found: [N]
    Email verified (true): [N]
    Email not found: [N]
    Search tools used: [list all web_search queries and web_fetch URLs called]
  </summary>

  <json_array>
    [
      { ... company record 1 ... },
      { ... company record 2 ... },
      ...
    ]
  </json_array>
</final>

---

SELF-CHECK (run after generating all records, fix before delivering output):

1. Does every company have a job post URL in the thinking block proving it was found via tool?
2. Is every email_verified: true backed by an exact URL in email_source?
3. Does any contact_email look like a guessed pattern (hr@, info@, [name]@domain)
   without a source URL? → If yes, set to null and email_verified: false
4. Are there any two records with the same company name? → Deduplicate
5. Does every stack array contain at least 2 technologies from the actual job post?
6. Is every "area" field a real Mumbai locality, not just "Mumbai"?
7. Were at least 5 different tool queries run across S1 discovery?
8. Were at least 3 verification checks run per company in S2?
9. Are there at least 20 records total?
10. Does the <summary> block list every search query and fetch URL actually called?
If any check fails → fix the affected records before outputting <final>.`;
                          navigator.clipboard.writeText(promptText);
                          setCopiedPrompt(true);
                          setTimeout(() => setCopiedPrompt(false), 2000);
                        }}
                        className="px-4 py-2 rounded-lg bg-accent-primary hover:bg-accent-primary-hover text-white text-sm font-medium transition-all flex items-center gap-2"
                      >
                        {copiedPrompt ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copiedPrompt ? "Copied to Clipboard!" : "Copy Full Prompt"}
                      </button>
                    </div>
                  </div>
                </div>,
                document.body
              )}
            </div>
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

          {leads.length > 0 && (
            <>
              {alreadySent.size > 0 && (
                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm animate-fade-in mb-3">
                  <div className="flex items-center gap-2 text-amber-400">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>
                      <strong>{alreadySent.size}</strong> {alreadySent.size === 1 ? "company has" : "companies have"} already been contacted
                    </span>
                  </div>
                  <button
                    onClick={handleRemoveAlreadySent}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove Already Sent
                  </button>
                </div>
              )}
              {invalidEmails.size > 0 && (
                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-error/10 border border-error/20 text-sm animate-fade-in">
                  <div className="flex items-center gap-2 text-error">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>
                      <strong>{invalidEmails.size}</strong> {invalidEmails.size === 1 ? "email has" : "emails have"} invalid or missing domain MX records
                    </span>
                  </div>
                  <button
                    onClick={handleRemoveInvalid}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error/20 hover:bg-error/30 text-error text-xs font-medium transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove Invalid Leads
                  </button>
                </div>
              )}
              {checkingSent || isVerifying ? (
                <div className="flex items-center gap-2 text-xs text-text-faint">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Verifying domains and checking history...
                </div>
              ) : null}
              <CompanyTable
                leads={leads}
                alreadySent={alreadySent}
                invalidEmails={invalidEmails}
                onEdit={setEditingLead}
                onDelete={handleDeleteLead}
              />
            </>
          )}

          {/* Edit Lead Modal Overlay */}
          {editingLead && mounted && createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-bg-surface border border-border-default rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-bg-elevated/50">
                  <h3 className="font-semibold text-text-primary">Edit Lead</h3>
                  <button
                    onClick={() => setEditingLead(null)}
                    className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-subtle transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form
                  className="p-4 flex flex-col gap-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleUpdateLead({
                      ...editingLead,
                      company: formData.get("company") as string,
                      role: formData.get("role") as string,
                      contact_email: formData.get("contact_email") as string,
                      stack: (formData.get("stack") as string).split(",").map(s => s.trim()).filter(Boolean),
                      fit_score: formData.get("fit_score") as string,
                    });
                  }}
                >
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-text-secondary">Company Name</label>
                    <input
                      name="company"
                      defaultValue={editingLead.company}
                      className="w-full bg-bg-subtle border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-text-secondary">Role</label>
                    <input
                      name="role"
                      defaultValue={editingLead.role}
                      className="w-full bg-bg-subtle border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-text-secondary">Email</label>
                    <input
                      name="contact_email"
                      defaultValue={editingLead.contact_email}
                      type="email"
                      className="w-full bg-bg-subtle border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-text-secondary">Stack (comma separated)</label>
                    <input
                      name="stack"
                      defaultValue={(Array.isArray(editingLead.stack) ? editingLead.stack : [editingLead.stack]).filter(Boolean).join(", ")}
                      className="w-full bg-bg-subtle border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-text-secondary">Fit Score</label>
                    <input
                      name="fit_score"
                      defaultValue={editingLead.fit_score}
                      className="w-full bg-bg-subtle border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
                    />
                  </div>
                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingLead(null)}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-subtle transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-accent-primary hover:bg-accent-primary-hover text-white text-sm font-medium transition-all"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )}

          {/* Delete Lead Modal Overlay */}
          {deletingLead && mounted && createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-bg-surface border border-border-default rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col">
                <div className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-text-primary mb-2">Delete Lead</h3>
                  <p className="text-sm text-text-secondary">
                    Are you sure you want to remove <span className="font-medium text-text-primary">{deletingLead.company}</span> from this campaign? This action cannot be undone.
                  </p>
                </div>
                <div className="p-4 border-t border-border-subtle bg-bg-elevated/50 flex items-center gap-3">
                  <button
                    onClick={() => setDeletingLead(null)}
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-subtle transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteLead}
                    className="flex-1 px-4 py-2 rounded-lg bg-error hover:bg-error/90 text-white text-sm font-medium transition-all"
                  >
                    Delete Lead
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

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
            pollingStatus={pollingStatus}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
            onRequeueFailed={handleRequeueFailed}
            autoSend={autoSend}
            onAutoSendChange={setAutoSend}
          />

          {generatedEmails.length > 0 && !isGenerating && (
            <div className="flex justify-end pt-4">
              <button
                onClick={() => setCurrentStep("preview")}
                className="group px-6 py-3 rounded-xl bg-accent-primary hover:bg-accent-primary-hover text-white font-medium transition-all flex items-center gap-2 shadow-sm"
              >
                Next: Review & Edit
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
