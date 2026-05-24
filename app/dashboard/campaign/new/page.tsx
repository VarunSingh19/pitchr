"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Loader2, Settings, Trash2, Copy, X, AlertTriangle, Plus, Terminal } from "lucide-react";
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
  { key: "generate", label: "Personalize", num: 2 },
  { key: "preview", label: "Review & Edit", num: 3 },
  { key: "send", label: "Send Outbox", num: 4 },
];

const cleanWebsiteUrl = (url: string) => {
  if (!url) return "";
  return url.replace(/^https?:\/\/(www\.)?/, "");
};

interface PromptConfig {
  targetGeography: string;
  targetRoles: string[];
  targetStack: string[];
  companyTypes: string[];
  minJobAgeDays: number;
  researcherLocation: string;
  hasConfigured?: boolean;
}

interface UserConfig {
  userName: string;
  plan: string;
  role?: string;
  gmailConfigured: boolean;
  gmailAddress: string;
  selectedModel: string;
  savedResume: {
    fileName: string;
    parsedText: string;
  } | null;
  promptConfig: PromptConfig;
  discoveryRemaining?: number;
  discoveryLimit?: number;
}

export default function NewCampaignPage() {
  const [currentStep, setCurrentStep] = useState<Step>("upload");

  // ── User config (loaded from Settings) ──
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  // ── Upload state ──
  const [leads, setLeads] = useState<Lead[]>([]);
  const [uploadTab, setUploadTab] = useState<"upload" | "discover">("upload");
  const [sourcingSubTab, setSourcingSubTab] = useState<"jobs" | "leads">("jobs");
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discoverLocation, setDiscoverLocation] = useState("");
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredLeads, setDiscoveredLeads] = useState<any[]>([]);
  const [selectedDiscoveredIds, setSelectedDiscoveredIds] = useState<Set<string>>(new Set());
  const [discoveryStatus, setDiscoveryStatus] = useState("");
  const [isPollingDiscovery, setIsPollingDiscovery] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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
  const [useSavedResume, setUseSavedResume] = useState<boolean>(true);
  const [showPromptHelper, setShowPromptHelper] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deletingLead, setDeletingLead] = useState<Lead | null>(null);
  const [alreadySent, setAlreadySent] = useState<Set<string>>(new Set());
  const [checkingSent, setCheckingSent] = useState(false);
  const [invalidEmails, setInvalidEmails] = useState<Set<string>>(new Set());
  const [isVerifying, setIsVerifying] = useState(false);
  const [autoSend, setAutoSend] = useState(false);

  // ── Custom Confirm States (UX improvements replacing window.confirm) ──
  const [billingRedirectMessage, setBillingRedirectMessage] = useState<string | null>(null);
  const [showDiscardDraftConfirm, setShowDiscardDraftConfirm] = useState(false);

  // ── Prompt Helper Wizard State ──
  const [wizardStep, setWizardStep] = useState<number>(0); // 0 = closed, 1-4 = steps
  const [wizardGeography, setWizardGeography] = useState("");
  const [wizardResearcherLocation, setWizardResearcherLocation] = useState("");
  const [wizardMinJobAgeDays, setWizardMinJobAgeDays] = useState(90);
  const [wizardRoles, setWizardRoles] = useState<string[]>([]);
  const [wizardRolesInput, setWizardRolesInput] = useState("");
  const [wizardStack, setWizardStack] = useState<string[]>([]);
  const [wizardStackInput, setWizardStackInput] = useState("");
  const [wizardCompanyTypes, setWizardCompanyTypes] = useState<string[]>([]);
  const [wizardCompanyInput, setWizardCompanyInput] = useState("");
  const [wizardSaveDefault, setWizardSaveDefault] = useState(false);
  const [savingDefault, setSavingDefault] = useState(false);
  const [isEditingWizard, setIsEditingWizard] = useState(false);

  const openPromptWizard = useCallback(() => {
    if (userConfig?.promptConfig) {
      setWizardGeography(userConfig.promptConfig.targetGeography || "");
      setWizardResearcherLocation(userConfig.promptConfig.researcherLocation || "");
      setWizardMinJobAgeDays(userConfig.promptConfig.minJobAgeDays || 90);
      setWizardRoles(userConfig.promptConfig.targetRoles || []);
      setWizardStack(userConfig.promptConfig.targetStack || []);
      setWizardCompanyTypes(userConfig.promptConfig.companyTypes || []);
    } else {
      setWizardGeography("Mumbai — specifically Malad and Andheri areas (also accept nearby: Goregaon, Jogeshwari, MIDC, SV Road, WEH, Link Road corridors)");
      setWizardResearcherLocation("Mumbai, Maharashtra");
      setWizardMinJobAgeDays(90);
      setWizardRoles(["Full Stack Developer", "React Developer", "Node.js Developer", "MERN Stack Developer"]);
      setWizardStack(["React", "Node.js", "MongoDB", "Express", "JavaScript", "TypeScript"]);
      setWizardCompanyTypes(["Product startups", "IT services firms", "SaaS companies", "agencies actively posting jobs"]);
    }
    setWizardSaveDefault(false);
    
    if (userConfig?.promptConfig?.hasConfigured) {
      setWizardStep(4);
      setIsEditingWizard(false);
    } else {
      setWizardStep(1);
      setIsEditingWizard(true);
    }
  }, [userConfig]);

  const addWizardTag = useCallback((
    input: string,
    setInput: React.Dispatch<React.SetStateAction<string>>,
    tags: string[],
    setTags: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const trimmed = input.trim().replace(/,$/, "");
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setInput("");
  }, []);

  const removeWizardTag = useCallback((
    tagToRemove: string,
    tags: string[],
    setTags: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  }, []);

  const handleWizardKeyDown = useCallback((
    e: React.KeyboardEvent<HTMLInputElement>,
    input: string,
    setInput: React.Dispatch<React.SetStateAction<string>>,
    tags: string[],
    setTags: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addWizardTag(input, setInput, tags, setTags);
    }
  }, [addWizardTag]);

  const generateDynamicPromptText = useCallback(() => {
    const geo = wizardGeography || "Mumbai";
    const shortGeo = geo.split(/[—,-]/)[0].trim() || "Mumbai";
    const rolesStr = wizardRoles.join(" / ") || "Full Stack Developer";
    const rolesList = wizardRoles.join(", ") || "Full Stack Developer";
    const stackStr = wizardStack.join(", ") || "React, Node.js";
    const companyStr = wizardCompanyTypes.join(", ") || "Product startups, SaaS companies";
    const jobAge = wizardMinJobAgeDays || 90;
    const location = wizardResearcherLocation || "Mumbai, Maharashtra";

    const role1 = wizardRoles[0] || "Developer";
    const role2 = wizardRoles[1] || role1;
    const tech1 = wizardStack[0] || "React";
    const tech2 = wizardStack[1] || "Node.js";
    
    return `SYSTEM:
You are a senior B2B lead researcher and talent acquisition analyst with 12+ years of experience in
corporate intelligence, HR sourcing, and developer hiring markets in India's tech ecosystem.
You specialize in: (1) verified contact discovery using multi-source cross-referencing,
(2) ${shortGeo} startup and enterprise tech hiring intelligence,
(3) ${rolesStr} engineering job market analysis.

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
- Target geography: ${geo}
- Target roles: ${rolesList}
- Target company types: ${companyStr}
- Minimum requirement: Company must have a job posting dated within the last ${jobAge} days
- Researcher location context: ${location}

---

TASK:
Find at least 20 companies in ${shortGeo} actively hiring ${rolesStr} developers. For each company, run a complete multi-source verification pipeline using your available tools to find and confirm HR/careers contact emails. Return results as a strict JSON array.

<pipeline>

  <step id="S1" label="DISCOVERY">
    USE THESE TOOLS to find actively hiring companies:
    - web_search: "${role1} jobs in ${shortGeo} site:linkedin.com"
    - web_search: "${tech1} ${tech2} developer hiring ${shortGeo} Glassdoor"
    - web_search: "${role2} jobs in ${shortGeo} Indeed"
    - web_search: "${role1} in ${shortGeo} Cutshort"
    - web_search: "${tech1} developer hiring ${shortGeo} Wellfound"
    - web_search: "software company in ${shortGeo} hiring developer 2026"
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
      - web_search: "[Company Name] HR email LinkedIn ${shortGeo}"
      - Look for: "apply via email", recruiter email in post description, LinkedIn recruiter profile with email
      - If found: set email_verified: true, email_source: "LinkedIn job post [URL]"

    CHECK 3 — Glassdoor:
      - web_search: "[Company Name] Glassdoor ${shortGeo} HR contact email"
      - web_fetch: Glassdoor company page if returned
      - Look for: email in font-mono or interview reviews mentioning HR contact
      - If found: set email_verified: true, email_source: "Glassdoor: [URL]"

    CHECK 4 — Indeed:
      - web_search: "[Company Name] Indeed ${shortGeo} ${role1} email"
      - web_fetch: Indeed job listing URL if returned
      - Look for: "send resume to [email]", employer contact details
      - If found: set email_verified: true, email_source: "Indeed: [URL]"

    CHECK 5 — Cutshort / Wellfound:
      - web_search: "[Company Name] Cutshort contact email"
      - web_search: "[Company Name] Wellfound hiring email"
      - Look for: recruiter email, company bio with contact info
      - If found: set email_verified: true, email_source: "Cutshort/Wellfound: [URL]"

    CHECK 6 — General web sweep:
      - web_search: "[Company Name] ${shortGeo} HR email careers"
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
      "location": "${location}",
      "area": "[Specific neighborhood or corridor from job post/map]",
      "role": "[Exact job title from the job post]",
      "description": "[2 sentences: what the company does + why they are hiring this role]",
      "contact_email": "[confirmed email or null]",
      "alt_email": "[second confirmed email or null]",
      "website": "[domain.com — no https, no trailing slash]",
      "type": "[Full-time / Contract / Freelance — from job post]",
      "stack": ["${tech1}", "${tech2}"],
      "email_verified": [true / false],
      "email_source": "[exact URL or 'Not found after 6-step verification']",
      "fit_score": "[1 sentence: why this role matches a ${rolesStr} developer]",
      "status": "[Actively Hiring / Hiring / Open — based on post recency]"
    }
  </step>

</pipeline>

---

FEW-SHOT EXAMPLE (Required reasoning depth):

INPUT: Found "Bluebirds Tech Pvt Ltd" hiring ${role1} in ${shortGeo} on LinkedIn.

REASONING:
  - S1 source: LinkedIn job post URL linkedin.com/jobs/view/123456 — post dated 12 days ago ✓
  - CHECK 1: Fetched bluebirdstech.com/careers — found "send your resume to careers@bluebirdstech.com" ✓
  - CHECK 2: LinkedIn post says "Apply on site" — no email in post body
  - Decision: email_verified: true — confirmed from company careers page
  - fit_score: Hiring ${role1} with ${tech1} + ${tech2} stack — direct match

OUTPUT:
{
  "id": 1,
  "company": "Bluebirds Tech Pvt Ltd",
  "location": "${location}",
  "area": "Local Area",
  "role": "${role1}",
  "description": "Bluebirds Tech builds B2B SaaS dashboards for logistics companies. They are expanding their team to handle new client integrations.",
  "contact_email": "careers@bluebirdstech.com",
  "alt_email": null,
  "website": "bluebirdstech.com",
  "type": "Full-time",
  "stack": ["${tech1}", "${tech2}"],
  "email_verified": true,
  "email_source": "https://bluebirdstech.com/careers — direct email in page text",
  "fit_score": "Exact ${rolesStr} stack match; SaaS product work with real user scale",
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
6. Is every "area" field a real local area in ${shortGeo}?
7. Were at least 5 different tool queries run across S1 discovery?
8. Were at least 3 verification checks run per company in S2?
9. Are there at least 20 records total?
10. Does the <summary> block list every search query and fetch URL actually called?
If any check fails → fix the affected records before outputting <final>.`;
  }, [
    wizardGeography,
    wizardResearcherLocation,
    wizardMinJobAgeDays,
    wizardRoles,
    wizardStack,
    wizardCompanyTypes
  ]);

  const handleCopyPrompt = useCallback(async () => {
    const text = generateDynamicPromptText();
    await navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => {
      setCopiedPrompt(false);
      setWizardStep(0);
    }, 1500);
  }, [generateDynamicPromptText]);

  const handleFinishWizard = useCallback(async () => {
    if (wizardSaveDefault) {
      setSavingDefault(true);
      try {
        const res = await fetch("/api/user/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            promptConfig: {
              targetGeography: wizardGeography,
              researcherLocation: wizardResearcherLocation,
              minJobAgeDays: wizardMinJobAgeDays,
              targetRoles: wizardRoles,
              targetStack: wizardStack,
              companyTypes: wizardCompanyTypes,
              hasConfigured: true,
            },
          }),
        });
        if (res.ok) {
          setUserConfig((prev) => prev ? {
            ...prev,
            promptConfig: {
              targetGeography: wizardGeography,
              researcherLocation: wizardResearcherLocation,
              minJobAgeDays: wizardMinJobAgeDays,
              targetRoles: wizardRoles,
              targetStack: wizardStack,
              companyTypes: wizardCompanyTypes,
              hasConfigured: true,
            }
          } : null);
        }
      } catch (err) {
        console.error("Failed to save wizard settings as default", err);
      } finally {
        setSavingDefault(false);
      }
    }

    const text = generateDynamicPromptText();
    await navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => {
      setCopiedPrompt(false);
      setWizardStep(0);
    }, 1500);
  }, [
    wizardSaveDefault,
    wizardGeography,
    wizardResearcherLocation,
    wizardMinJobAgeDays,
    wizardRoles,
    wizardStack,
    wizardCompanyTypes,
    generateDynamicPromptText
  ]);

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
  const hasMeaningfulData = leads.length > 0 || generatedEmails.length > 0 || isGenerating || !!campaignId;
  const generationPausedAt: number | null = null;

  useAutoSaveDraft(
    currentStep,
    leads,
    resumeText,
    resumeFileName,
    generatedEmails,
    generationPausedAt,
    campaignId,
    isGenerating,
    isSending,
    autoSend,
    pollingStatus,
    hasMeaningfulData
  );

  // ── Restore draft on mount ──
  useEffect(() => {
    const draft = loadDraft();
    if (draft && (draft.leads.length > 0 || draft.generatedEmails.length > 0 || draft.isGenerating || draft.campaignId)) {
      setLeads(draft.leads);
      setResumeText(draft.resumeText);
      setResumeFileName(draft.resumeFileName);
      setGeneratedEmails(draft.generatedEmails);
      setCurrentStep(draft.step === "send" ? "preview" : draft.step);
      setDraftRestored(true);
      if (draft.resumeText) setUseSavedResume(false);

      if (draft.campaignId) {
        setCampaignId(draft.campaignId);
      }
      if (draft.isGenerating) {
        setIsGenerating(true);
      }
      if (draft.isSending) {
        setIsSending(true);
      }
      if (draft.autoSend) {
        setAutoSend(draft.autoSend);
      }
      if (draft.pollingStatus) {
        setPollingStatus(draft.pollingStatus);
      }
    }
  }, []);

  // ── Load user config on mount ──
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
          plan: data.plan || "free",
          role: session?.user?.role || "user",
          gmailConfigured: data.gmailConfigured ?? false,
          gmailAddress: data.gmailConfig?.address || "",
          selectedModel: data.selectedModel || "",
          savedResume: data.resume || null,
          promptConfig: data.promptConfig || {
            targetGeography: "Mumbai — specifically Malad and Andheri areas (also accept nearby: Goregaon, Jogeshwari, MIDC, SV Road, WEH, Link Road corridors)",
            targetRoles: ["Full Stack Developer", "React Developer", "Node.js Developer", "MERN Stack Developer"],
            targetStack: ["React", "Node.js", "MongoDB", "Express", "JavaScript", "TypeScript"],
            companyTypes: ["Product startups", "IT services firms", "SaaS companies", "agencies actively posting jobs"],
            minJobAgeDays: 90,
            researcherLocation: "Mumbai, Maharashtra",
            hasConfigured: false
          },
          discoveryRemaining: data.discoveryRemaining,
          discoveryLimit: data.discoveryLimit
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
      // ignore
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

  // ── Reset ──
  const handleReset = useCallback(() => {
    setLeads([]);
    setUploadTab("upload");
    setSourcingSubTab("jobs");
    setDiscoverQuery("");
    setDiscoverLocation("");
    setIsDiscovering(false);
    setDiscoveredLeads([]);
    setSelectedDiscoveredIds(new Set());
    setDiscoveryStatus("");
    setIsPollingDiscovery(false);
    setShowUpgradeModal(false);
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
    setCampaignId("");
    setPollingStatus({ generated: 0, failed: 0, total: 0, status: "DRAFT" });
    setAlreadySent(new Set());
    setInvalidEmails(new Set());
    setAutoSend(false);
    setUseSavedResume(true);
    setEditingLead(null);
    setDeletingLead(null);
    setShowDiscardDraftConfirm(false);
    setBillingRedirectMessage(null);
    clearDraft();
  }, []);

  // ── Leads Discovery Sourcing & Polling Callbacks ──
  const handleStartDiscovery = useCallback(async () => {
    const queryTrimmed = discoverQuery.trim();
    if (!queryTrimmed) return;

    setIsDiscovering(true);
    setDiscoveredLeads([]);
    setSelectedDiscoveredIds(new Set());
    setDiscoveryStatus("Connecting to sourcing agent...");

    try {
      const res = await fetch("/api/leads/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryTrimmed,
          location: discoverLocation.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `Discovery failed with status ${res.status}`);
      }

      const data = await res.json();
      if (typeof data.discoveryRemaining === "number") {
        setUserConfig((prev) => prev ? { ...prev, discoveryRemaining: data.discoveryRemaining } : null);
      }

      // Case 1: All cached results already seen, no new data available
      if (data.allSeen && data.noNewData) {
        setIsDiscovering(false);
        setDiscoveryStatus("No new leads found. Try a different search.");
        toast.info("No new leads found for this query. Try a different search.");
      // Case 2: Unseen results from shared cache (no quota deducted)
      } else if (data.cached && data.leads) {
        setDiscoveredLeads(data.leads);
        setSelectedDiscoveredIds(new Set(data.leads.map((l: any) => l.jobUrl)));
        setIsDiscovering(false);
        const cacheLabel = data.fromSharedCache ? "shared cache" : "cache";
        setDiscoveryStatus(`Loaded ${data.leads.length} new results from ${cacheLabel} — no quota used.`);
        toast.success(`Found ${data.leads.length} new leads from ${cacheLabel}!`);
      // Case 3: Background discovery triggered (quota deducted)
      } else if (data.trigger === "inngest" || data.trigger === "background") {
        setDiscoveryStatus("Starting background discovery agents...");
        setIsPollingDiscovery(true);
      }
    } catch (err: any) {
      console.error("Start discovery error:", err);
      setIsDiscovering(false);
      toast.error(err.message || "Failed to start discovery");
    }
  }, [discoverQuery, discoverLocation]);

  // ── Find More Leads (force refresh — burns 1 quota credit) ──
  const handleFindMoreLeads = useCallback(async () => {
    const queryTrimmed = discoverQuery.trim();
    if (!queryTrimmed) return;

    setIsDiscovering(true);
    setDiscoveryStatus("Fetching next page of results...");

    try {
      const res = await fetch("/api/leads/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryTrimmed,
          location: discoverLocation.trim(),
          forceRefresh: true,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `Discovery failed with status ${res.status}`);
      }

      const data = await res.json();
      if (typeof data.discoveryRemaining === "number") {
        setUserConfig((prev) => prev ? { ...prev, discoveryRemaining: data.discoveryRemaining } : null);
      }

      if (data.trigger === "inngest" || data.trigger === "background") {
        setDiscoveryStatus("Sourcing new leads from job boards...");
        setIsPollingDiscovery(true);
      }
    } catch (err: any) {
      console.error("Find more leads error:", err);
      setIsDiscovering(false);
      toast.error(err.message || "Failed to fetch more leads");
    }
  }, [discoverQuery, discoverLocation]);

  const handleImportSelection = useCallback(() => {
    const selectedJobs = discoveredLeads.filter((l) => selectedDiscoveredIds.has(l.jobUrl));
    if (selectedJobs.length === 0) return;

    const mapped: Lead[] = selectedJobs.map((job, idx) => ({
      id: `discovered-${Date.now()}-${idx}`,
      company: job.companyName,
      role: job.jobTitle,
      description: job.description || `Hiring for ${job.jobTitle} at ${job.companyName}`,
      contact_email: job.contactEmail || "",
      website: job.website || "",
      type: "Full-time",
      stack: [discoverQuery.trim()],
      fit_score: job.fitScore || "Discovered from active job board posting.",
      status: "Actively Hiring"
    }));

    setLeads((prev) => {
      const seenEmails = new Set(prev.map((l) => l.contact_email?.toLowerCase()).filter(Boolean));
      const uniqueNew = mapped.filter((l) => !seenEmails.has(l.contact_email?.toLowerCase()));
      const updated = [...prev, ...uniqueNew];
      checkAlreadySent(updated);
      return updated;
    });

    setSourcingSubTab("leads");

    toast.success(`Imported ${mapped.length} leads to campaign session.`);
  }, [discoveredLeads, selectedDiscoveredIds, discoverQuery, checkAlreadySent, setSourcingSubTab]);

  const handleToggleSelectAllDiscovered = useCallback(() => {
    if (selectedDiscoveredIds.size === discoveredLeads.length) {
      setSelectedDiscoveredIds(new Set());
    } else {
      setSelectedDiscoveredIds(new Set(discoveredLeads.map((l) => l.jobUrl)));
    }
  }, [discoveredLeads, selectedDiscoveredIds]);

  const handleToggleSelectDiscovered = useCallback((jobUrl: string) => {
    setSelectedDiscoveredIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobUrl)) {
        next.delete(jobUrl);
      } else {
        next.add(jobUrl);
      }
      return next;
    });
  }, []);

  const handleDeselectNoEmails = useCallback(() => {
    setSelectedDiscoveredIds((prev) => {
      const next = new Set(prev);
      discoveredLeads.forEach((job) => {
        if (!job.contactEmail) {
          next.delete(job.jobUrl);
        }
      });
      return next;
    });
    toast.success("Unselected targets with missing emails.");
  }, [discoveredLeads]);

  // ── Leads Discovery 3s Polling Effect ──
  useEffect(() => {
    if (!isPollingDiscovery) return;

    const startTime = Date.now();
    let lastCount = 0;
    let noIncreaseStreak = 0;

    const poll = async () => {
      if (Date.now() - startTime >= 60000) {
        console.log("[DiscoverPoll] 60s timeout reached. Stopping.");
        setIsPollingDiscovery(false);
        setIsDiscovering(false);
        toast.info("Discovery finished (timeout).");
        return;
      }

      try {
        const res = await fetch(`/api/leads/discover?query=${encodeURIComponent(discoverQuery)}`);
        if (!res.ok) return;
        const data = await res.json();
        const leads = data.leads || [];

        setDiscoveredLeads(leads);
        
        setSelectedDiscoveredIds((prev) => {
          const next = new Set(prev);
          leads.forEach((l: any) => {
            if (!prev.has(l.jobUrl)) {
              next.add(l.jobUrl);
            }
          });
          return next;
        });

        const currentCount = leads.length;
        setDiscoveryStatus(`Sourced ${currentCount} leads so far...`);

        if (currentCount > 0 && currentCount === lastCount) {
          noIncreaseStreak += 1;
        } else {
          noIncreaseStreak = 0;
        }

        lastCount = currentCount;

        if (noIncreaseStreak >= 2) {
          console.log("[DiscoverPoll] Count static for 2 consecutive polls. Stopping.");
          setIsPollingDiscovery(false);
          setIsDiscovering(false);
          toast.success(`Discovery finished. Sourced ${currentCount} leads.`);
        }
      } catch (err) {
        console.error("[DiscoverPoll] Error polling:", err);
      }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [isPollingDiscovery, discoverQuery]);

  // ── Polling Logic ──
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let autoResetTimer: NodeJS.Timeout;

    if ((isGenerating || (autoSend && isSending)) && campaignId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/campaigns/${campaignId}/status`);
          if (!res.ok) return;
          const data = await res.json();
          setPollingStatus(data);

          if (autoSend && data.generated + data.failed >= data.total && data.total > 0 && isGenerating) {
            setIsGenerating(false);

            if (data.emailDetails) {
              const results: SendResult[] = data.emailDetails.map((e: any) => ({
                companyId: e.companyId,
                company: e.company,
                role: e.role,
                email: e.email,
                subject: e.subject,
                status: e.status as SendResult["status"],
                error: e.error,
              }));
              setSendResults(results);
            }

            setIsSending(true);
            setCurrentStep("send");
          }

          if (autoSend && isSending && data.emailDetails) {
            const results: SendResult[] = data.emailDetails.map((e: any) => ({
              companyId: e.companyId,
              company: e.company,
              role: e.role,
              email: e.email,
              subject: e.subject,
              status: e.status as SendResult["status"],
              error: e.error,
            }));
            setSendResults(results);
          }

          if (autoSend && (data.status === "COMPLETED" || data.status === "FAILED") && isSending) {
            setIsSending(false);
            setSendComplete(true);
            clearInterval(interval);
            clearDraft();

            autoResetTimer = setTimeout(() => {
              handleReset();
            }, 8000);
          }

          if (!autoSend && data.generated + data.failed >= data.total && data.total > 0) {
            setIsGenerating(false);
            clearInterval(interval);
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
      if (autoResetTimer) clearTimeout(autoResetTimer);
    };
  }, [isGenerating, isSending, campaignId, autoSend, handleReset]);

  const handleGenerate = useCallback(async () => {
    if (!userConfig) return;

    const validLeads = leads.filter(l => 
      !invalidEmails.has(l.contact_email?.toLowerCase()) && 
      !alreadySent.has(l.contact_email?.toLowerCase())
    );

    const skippedCount = leads.length - validLeads.length;
    if (skippedCount > 0) {
      toast.info(`${skippedCount} invalid or contacted leads were skipped.`);
    }

    if (validLeads.length === 0) {
      toast.error("No valid leads available to personalise.");
      return;
    }

    setIsGenerating(true);
    setPollingStatus({ generated: 0, failed: 0, total: validLeads.length, status: "DRAFT" });

    try {
      const createRes = await fetch("/api/campaigns/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Campaign ${new Date().toLocaleDateString()}` }),
      });
      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create campaign");
      }
      const campaign = await createRes.json();
      const cId = campaign._id;
      setCampaignId(cId);

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
      const msg = error instanceof Error ? error.message : "Failed to start campaign";
      
      if (
        msg.toLowerCase().includes("quota") ||
        msg.toLowerCase().includes("plan") ||
        msg.toLowerCase().includes("limit")
      ) {
        // Trigger Custom Modal Confirmation (replacing window.confirm)
        setBillingRedirectMessage(msg);
      } else {
        alert(msg);
      }
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
    clearDraft();
  }, [generatedEmails, userConfig, resumeFile, useSavedResume]);

  const handleDiscardDraft = useCallback(() => {
    setShowDiscardDraftConfirm(true);
  }, []);

  const confirmDiscardDraft = useCallback(() => {
    handleReset();
  }, [handleReset]);

  const renderConfigStatus = () => {
    if (configLoading) {
      return (
        <div className="flex items-center gap-2 px-4 py-3 border-2 border-border bg-card text-xs font-mono text-muted-foreground rounded-none">
          <Loader2 className="w-4 h-4 animate-spin text-[#ea580c]" />
          Verifying settings configuration...
        </div>
      );
    }

    if (!userConfig) return null;

    const issues: string[] = [];
    if (!userConfig.gmailConfigured) issues.push("Gmail app password not saved");
    if (!userConfig.userName.trim()) issues.push("Google account name is missing");

    if (issues.length === 0) {
      return (
        <div className="flex items-center justify-between px-4 py-3 border-2 border-emerald-400/30 bg-emerald-400/5 text-xs font-mono rounded-none">
          <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" />
            Ready: active outbox routing via {userConfig.gmailAddress}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2 p-4 border-2 border-amber-500/30 bg-amber-500/5 text-xs font-mono text-amber-500 rounded-none">
        <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
          <AlertCircle className="w-4 h-4" />
          Outbox Route Configuration Pending
        </div>
        <ul className="list-disc pl-5 mt-1 space-y-0.5">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
        <p className="mt-1 text-[10px] text-muted-foreground uppercase font-bold">
          Please configure these parameters in <a href="/dashboard/settings" className="underline hover:text-[#ea580c]">Settings</a> to enable campaign dispatching.
        </p>
      </div>
    );
  };

  const renderJobsList = () => {
    return (
      <div className="space-y-3 animate-fade-in font-mono text-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center border-b-2 border-border pb-2">
  <h3 className="font-bold text-xs uppercase tracking-wider text-foreground leading-relaxed">
    Discovered Targets ({selectedDiscoveredIds.size} / {discoveredLeads.length} Selected)
  </h3>

  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
    <button
      onClick={handleDeselectNoEmails}
      className="
        w-full sm:w-auto
        px-3 py-2
        border-2 border-border
        hover:border-[#ea580c] hover:text-[#ea580c]
        text-muted-foreground
        text-xs font-bold uppercase tracking-widest
        transition-colors rounded-none cursor-pointer
      "
    >
      Exclude No-Email
    </button>

    <button
      onClick={handleImportSelection}
      disabled={selectedDiscoveredIds.size === 0}
      className="
        w-full sm:w-auto
        px-4 py-2
        bg-[#ea580c] text-white
        text-xs font-bold uppercase tracking-widest
        hover:bg-[#d94e08]
        disabled:opacity-50
        transition-colors rounded-none cursor-pointer
        flex items-center justify-center gap-1.5
      "
    >
      <Plus className="w-4 h-4" />
      Import Selection
    </button>
  </div>
</div>

        {discoveredLeads.length > 0 ? (
          <div className="border-2 border-border bg-card rounded-none select-none">
            {/* Table Header (Desktop only) */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 border-b-2 border-border bg-foreground/[0.02] font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <div className="col-span-1 flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={discoveredLeads.length > 0 && selectedDiscoveredIds.size === discoveredLeads.length}
                  onChange={handleToggleSelectAllDiscovered}
                  className="w-4 h-4 border-2 border-border bg-card text-[#ea580c] focus:ring-0 focus:outline-none cursor-pointer"
                />
              </div>
              <div className="col-span-3 text-foreground">Company</div>
              <div className="col-span-2">Job Title</div>
              <div className="col-span-2">Location</div>
              <div className="col-span-2">Website</div>
              <div className="col-span-2">Contact Email</div>
              <div className="col-span-1 text-right">Source</div>
            </div>

            {/* Table Header / Selection Bar (Mobile only) */}
            <div className="flex md:hidden items-center justify-between px-4 py-3 border-b-2 border-border bg-foreground/[0.02] font-mono text-[11px]">
              <label className="flex items-center gap-2.5 font-bold uppercase tracking-wider cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={discoveredLeads.length > 0 && selectedDiscoveredIds.size === discoveredLeads.length}
                  onChange={handleToggleSelectAllDiscovered}
                  className="w-4 h-4 border-2 border-border bg-card text-[#ea580c] focus:ring-0 focus:outline-none cursor-pointer"
                />
                Select All
              </label>
              <span className="font-bold text-muted-foreground uppercase text-[10px]">
                {selectedDiscoveredIds.size} / {discoveredLeads.length} Selected
              </span>
            </div>

            {/* Table Body / Rows */}
            <div className="divide-y divide-border">
              {discoveredLeads.map((job) => {
                const isSelected = selectedDiscoveredIds.has(job.jobUrl);
                return (
                  <div
                    key={job.jobUrl}
                    onClick={() => handleToggleSelectDiscovered(job.jobUrl)}
                    className={`grid grid-cols-12 gap-3 md:gap-4 py-3.5 px-4 items-start md:items-center transition-colors cursor-pointer ${
                      isSelected ? "bg-[#ea580c]/5 hover:bg-[#ea580c]/10" : "hover:bg-foreground/[0.01]"
                    }`}
                  >
                    {/* Checkbox Column */}
                    <div className="col-span-1 flex items-center justify-start md:justify-center pt-0.5 md:pt-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectDiscovered(job.jobUrl)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 border-2 border-border bg-card text-[#ea580c] focus:ring-0 focus:outline-none cursor-pointer"
                      />
                    </div>

                    {/* Mobile Layout */}
                    <div className="col-span-11 md:hidden flex flex-col gap-1 min-w-0 font-mono text-[11px]">
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-extrabold text-[12px] uppercase tracking-wide truncate text-foreground">
                          {job.companyName}
                        </span>
                        <span className="text-[9px] font-bold border border-border bg-foreground/[0.04] px-1.5 py-0.5 uppercase tracking-wider rounded-none shrink-0">
                          {job.source}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
                        <span className="font-medium text-foreground truncate max-w-[170px]">{job.jobTitle}</span>
                        <span className="text-border/50">•</span>
                        <span className="uppercase text-[10px]">{job.location}</span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5 pt-1.5 border-t border-border/30">
                        {job.contactEmail ? (
                          <div className="flex items-center gap-1 truncate max-w-[65%]" onClick={(e) => e.stopPropagation()}>
                            <span className="font-bold select-all truncate text-foreground">{job.contactEmail}</span>
                            {job.emailVerified ? (
                              <span className="text-emerald-400 text-[8px] border border-emerald-400/30 bg-emerald-400/5 px-1 font-bold uppercase rounded-none shrink-0">
                                ✓
                              </span>
                            ) : (
                              <span className="text-amber-400 text-[8px] border border-amber-400/30 bg-amber-400/5 px-1 font-bold uppercase rounded-none shrink-0">
                                ?
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">no email found</span>
                        )}
                        <div className="truncate max-w-[32%]">
                          {job.website ? (
                            <a
                              href={job.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[#ea580c] hover:underline font-bold truncate block"
                            >
                              {cleanWebsiteUrl(job.website)}
                            </a>
                          ) : (
                            <span className="text-muted-foreground italic">no site</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Desktop Columns */}
                    <div className="hidden md:block col-span-3 font-bold uppercase tracking-wide truncate">
                      {job.companyName}
                    </div>
                    <div className="hidden md:block col-span-2 text-foreground truncate">
                      {job.jobTitle}
                    </div>
                    <div className="hidden md:block col-span-2 text-muted-foreground uppercase truncate">
                      {job.location}
                    </div>
                    <div className="hidden md:block col-span-2 truncate">
                      {job.website ? (
                        <a
                          href={job.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[#ea580c] hover:underline break-all"
                        >
                          {cleanWebsiteUrl(job.website)}
                        </a>
                      ) : isDiscovering ? (
                        <span className="text-muted-foreground italic flex items-center gap-1">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ea580c]" />
                          resolving...
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">not found</span>
                      )}
                    </div>
                    <div className="hidden md:block col-span-2 truncate" onClick={(e) => e.stopPropagation()}>
                      {job.contactEmail ? (
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-bold select-all truncate">{job.contactEmail}</span>
                          {job.emailVerified ? (
                            <span className="text-emerald-400 font-bold uppercase text-[9px] border border-emerald-400/30 bg-emerald-400/5 px-1 rounded-none shrink-0">
                              verified
                            </span>
                          ) : (
                            <span className="text-amber-400 font-bold uppercase text-[9px] border border-amber-400/30 bg-amber-400/5 px-1 rounded-none shrink-0">
                              unverified
                            </span>
                          )}
                        </div>
                      ) : isDiscovering ? (
                        <span className="text-muted-foreground italic flex items-center gap-1">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ea580c]" />
                          harvesting...
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">not found</span>
                      )}
                    </div>
                    <div className="hidden md:block col-span-1 text-right">
                      <span className="text-[9px] font-bold border border-border bg-foreground/[0.04] px-1.5 py-0.5 uppercase tracking-wider rounded-none">
                        {job.source}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-8 border-2 border-border border-dashed text-center bg-foreground/[0.01]">
            <p className="text-muted-foreground text-xs uppercase font-bold">No jobs discovered in this session.</p>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase">Adjust your query above and search to find more targets.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in font-mono text-xs">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-2.5 h-2.5 bg-[#ea580c] animate-blink" />
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              // PIPELINE DISCOVERY
            </span>
          </div>
          <h1 className="font-pixel text-3xl sm:text-4xl tracking-tight text-foreground">
            LAUNCH CAMPAIGN
          </h1>
          <p className="text-xs text-muted-foreground mt-1 tracking-wide">
            Process targets, construct context-guided copy, and dispatch outreach
          </p>
        </div>
        <div className="flex items-center gap-3">
          {draftRestored && (
            <button
              onClick={handleDiscardDraft}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border bg-card text-muted-foreground hover:text-red-400 hover:border-red-400 transition-colors uppercase font-bold text-[10px] rounded-none cursor-pointer"
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
        <div className="flex items-center gap-2 px-4 py-3 border-2 border-[#ea580c]/30 bg-[#ea580c]/5 text-[#ea580c] font-bold uppercase tracking-wider rounded-none animate-fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          Restored previous campaign state from auto-save.
        </div>
      )}

      {/* Step indicators */}
      <div className="flex flex-wrap items-center gap-2">
        {STEPS.map((step, idx) => {
          const stepIdx = STEPS.findIndex((s) => s.key === currentStep);
          const isActive = step.key === currentStep;
          const isCompleted = idx < stepIdx;

          return (
            <div key={step.key} className="flex items-center gap-2">
              {idx > 0 && (
                <div
                  className={`w-4 h-px transition-colors hidden sm:block ${isCompleted ? "bg-[#ea580c]" : "bg-border"}`}
                />
              )}
              <div
                className={`flex items-center gap-2 px-3 py-2 border-2 uppercase font-bold text-[10px] tracking-wider rounded-none transition-all ${isActive
                  ? "border-[#ea580c] bg-[#ea580c]/5 text-[#ea580c]"
                  : isCompleted
                    ? "border-border text-foreground bg-foreground/5"
                    : "border-border text-muted-foreground bg-card"
                  }`}
              >
                <span
                  className={`w-4.5 h-4.5 flex items-center justify-center font-bold text-[9px] border ${isActive
                    ? "border-[#ea580c] bg-[#ea580c] text-background"
                    : isCompleted
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-foreground/5 text-muted-foreground"
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

          {/* Brutalist Tab Selection */}
          <div className="flex border-b-2 border-border mb-6">
            <button
              onClick={() => setUploadTab("upload")}
              className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-none cursor-pointer transition-colors ${
                uploadTab === "upload"
                  ? "border-t-2 border-x-2 border-border border-b-background -mb-[2px] bg-card text-[#ea580c]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Upload Lead JSON
            </button>
            <button
              onClick={() => {
                const isPaid = userConfig && (userConfig.plan !== "free" || userConfig.role === "admin");
                if (isPaid) {
                  setUploadTab("discover");
                } else {
                  setShowUpgradeModal(true);
                }
              }}
              className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-none cursor-pointer transition-colors ${
                uploadTab === "discover"
                  ? "border-t-2 border-x-2 border-border border-b-background -mb-[2px] bg-card text-[#ea580c]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Auto Discover Leads
            </button>
          </div>

          {uploadTab === "upload" ? (
            <div className="grid lg:grid-cols-2 gap-6">
            <div className="flex flex-col gap-3">
              <FileUpload
                type="json"
                onJsonParsed={handleJsonUpload}
                fileName={leads.length > 0 ? `${leads.length} targets loaded` : undefined}
              />
              <button
                onClick={openPromptWizard}
                className="text-[10px] font-bold text-[#ea580c] hover:underline uppercase tracking-wider text-left bg-transparent border-0 cursor-pointer"
              >
                Need target list JSON? Copy prompt schema wizard
                {userConfig?.promptConfig?.hasConfigured && (
                  <span className="block text-[9px] text-muted-foreground lowercase font-normal mt-0.5">saved parameters active — inspect template</span>
                )}
              </button>

              {/* Prompt Wizard Modal Overlay (Portal) */}
              {wizardStep > 0 && mounted && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in font-mono text-xs text-foreground">
                  <div className="bg-card border-2 border-border rounded-none w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                    {!isEditingWizard ? (
                      <>
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b-2 border-border bg-foreground/[0.02]">
                          <div>
                            <h3 className="font-bold text-sm uppercase tracking-wider text-foreground">Lead Sourcing Prompt</h3>
                            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase font-bold tracking-wide">Copy and execute inside ChatGPT/Claude to gather targets</p>
                          </div>
                          <button
                            onClick={() => setWizardStep(0)}
                            className="p-1.5 border border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors rounded-none cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Step Body */}
                        <div className="p-6 flex-1 overflow-y-auto space-y-4">
                          <div className="space-y-4 animate-fade-in">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                Target prompt output criteria
                              </label>
                              <span className="text-[9px] font-bold border border-[#ea580c]/30 bg-[#ea580c]/5 text-[#ea580c] px-2 py-0.5 uppercase tracking-wider rounded-none">
                                Dynamic
                              </span>
                            </div>

                            <pre className="text-[11px] text-foreground leading-relaxed font-mono bg-foreground/[0.02] p-4 border-2 border-border whitespace-pre-wrap max-h-[50vh] overflow-y-auto rounded-none">
                              {generateDynamicPromptText()}
                            </pre>
                          </div>
                        </div>

                        {/* Footer Navigation */}
                        <div className="p-4 border-t-2 border-border bg-foreground/[0.02] flex justify-between items-center">
                          <div>
                            <button
                              onClick={() => {
                                setIsEditingWizard(true);
                                setWizardStep(1);
                              }}
                              className="px-4 py-2.5 border-2 border-border hover:border-foreground/20 text-xs font-bold uppercase tracking-widest text-muted-foreground bg-card transition-colors rounded-none cursor-pointer flex items-center gap-1.5"
                            >
                              <Settings className="w-4 h-4" />
                              Configure Search
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleCopyPrompt}
                              className="px-5 py-3 bg-foreground text-background text-xs font-bold uppercase tracking-widest hover:bg-[#ea580c] hover:text-background transition-colors rounded-none cursor-pointer flex items-center gap-2"
                            >
                              {copiedPrompt ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  Copy &amp; Close
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b-2 border-border bg-foreground/[0.02]">
                          <div>
                            <h3 className="font-bold text-sm uppercase tracking-wider text-foreground font-pixel">Search Criteria Wizard</h3>
                            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase font-bold tracking-wide">Configure local search fields for lead agent</p>
                          </div>
                          <button
                            onClick={() => setWizardStep(0)}
                            className="p-1.5 border border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors rounded-none cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Wizard Progress Bar */}
                        <div className="px-6 py-4 border-b border-border bg-foreground/[0.01] flex flex-wrap items-center gap-4">
                          {[
                            { num: 1, label: "Geography" },
                            { num: 2, label: "Job Stack" },
                            { num: 3, label: "Industries" },
                            { num: 4, label: "Verify Prompt" }
                          ].map((item) => {
                            const isActive = item.num === wizardStep;
                            const isDone = item.num < wizardStep;

                            const handleStepJump = () => {
                              if (wizardStep === 2) {
                                if (wizardRolesInput.trim()) {
                                  addWizardTag(wizardRolesInput, setWizardRolesInput, wizardRoles, setWizardRoles);
                                }
                                if (wizardStackInput.trim()) {
                                  addWizardTag(wizardStackInput, setWizardStackInput, wizardStack, setWizardStack);
                                }
                              } else if (wizardStep === 3) {
                                if (wizardCompanyInput.trim()) {
                                  addWizardTag(wizardCompanyInput, setWizardCompanyInput, wizardCompanyTypes, setWizardCompanyTypes);
                                }
                              }
                              setWizardStep(item.num);
                            };

                            return (
                              <button
                                key={item.num}
                                type="button"
                                onClick={handleStepJump}
                                className={`flex items-center gap-1.5 hover:opacity-85 transition-opacity text-left cursor-pointer border-0 bg-transparent py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-[#ea580c]' : 'text-muted-foreground'}`}
                              >
                                <span
                                  className={`w-5 h-5 border flex items-center justify-center text-[9px] font-bold transition-all rounded-none ${
                                    isActive
                                      ? "border-[#ea580c] bg-[#ea580c] text-background"
                                      : isDone || wizardStep === 4
                                        ? "border-foreground bg-foreground text-background"
                                        : "border-border bg-card text-muted-foreground"
                                  }`}
                                >
                                  {(isDone || (wizardStep === 4 && item.num < 4)) ? <CheckCircle2 className="w-3 h-3" /> : item.num}
                                </span>
                                {item.label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Step Body */}
                        <div className="p-6 flex-1 overflow-y-auto space-y-4">
                          {wizardStep === 1 && (
                            <div className="space-y-4 animate-fade-in">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                  Target Geography Details
                                </label>
                                <textarea
                                  value={wizardGeography}
                                  onChange={(e) => setWizardGeography(e.target.value)}
                                  placeholder="e.g. Mumbai — specifically Malad and Andheri areas..."
                                  rows={4}
                                  className="w-full px-4 py-3 bg-foreground/[0.01] border-2 border-border focus:border-[#ea580c] text-xs transition-all focus:outline-none resize-none rounded-none"
                                />
                                <p className="text-[10px] text-muted-foreground">
                                  Be specific about neighborhoods, corridors, or regions.
                                </p>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                  Researcher Location Context
                                </label>
                                <input
                                  type="text"
                                  value={wizardResearcherLocation}
                                  onChange={(e) => setWizardResearcherLocation(e.target.value)}
                                  placeholder="e.g. Mumbai, Maharashtra"
                                  className="w-full px-4 py-3 bg-foreground/[0.01] border-2 border-border focus:border-[#ea580c] text-xs transition-all focus:outline-none rounded-none"
                                />
                                <p className="text-[10px] text-muted-foreground">
                                  Local region reference context.
                                </p>
                              </div>
                            </div>
                          )}

                          {wizardStep === 2 && (
                            <div className="space-y-5 animate-fade-in">
                              {/* Roles */}
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                  Target Job Roles
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={wizardRolesInput}
                                    onChange={(e) => setWizardRolesInput(e.target.value)}
                                    onKeyDown={(e) => handleWizardKeyDown(e, wizardRolesInput, setWizardRolesInput, wizardRoles, setWizardRoles)}
                                    placeholder="Type role and press Enter or comma..."
                                    className="flex-1 px-4 py-3 bg-foreground/[0.01] border-2 border-border focus:border-[#ea580c] text-xs transition-all focus:outline-none rounded-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => addWizardTag(wizardRolesInput, setWizardRolesInput, wizardRoles, setWizardRoles)}
                                    className="px-4 py-3 border-2 border-border hover:bg-foreground/5 text-muted-foreground hover:text-foreground font-bold flex items-center justify-center rounded-none cursor-pointer"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                                {wizardRoles.length > 0 ? (
                                  <div className="flex flex-wrap gap-2 mt-2 p-3 bg-foreground/[0.02] border border-border rounded-none">
                                    {wizardRoles.map((tag) => (
                                      <span
                                        key={tag}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#ea580c]/5 text-[#ea580c] border border-[#ea580c]/30 text-xs font-bold uppercase tracking-wider rounded-none"
                                      >
                                        {tag}
                                        <button
                                          type="button"
                                          onClick={() => removeWizardTag(tag, wizardRoles, setWizardRoles)}
                                          className="p-0.5 hover:bg-[#ea580c]/20 text-[#ea580c] transition-colors cursor-pointer"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-muted-foreground italic">No roles added yet.</p>
                                )}
                              </div>

                              {/* Skills / Tech Stack */}
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                  Skills &amp; Technologies
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={wizardStackInput}
                                    onChange={(e) => setWizardStackInput(e.target.value)}
                                    onKeyDown={(e) => handleWizardKeyDown(e, wizardStackInput, setWizardStackInput, wizardStack, setWizardStack)}
                                    placeholder="Type skill and press Enter or comma..."
                                    className="flex-1 px-4 py-3 bg-foreground/[0.01] border-2 border-border focus:border-[#ea580c] text-xs transition-all focus:outline-none rounded-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => addWizardTag(wizardStackInput, setWizardStackInput, wizardStack, setWizardStack)}
                                    className="px-4 py-3 border-2 border-border hover:bg-foreground/5 text-muted-foreground hover:text-foreground font-bold flex items-center justify-center rounded-none cursor-pointer"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                                {wizardStack.length > 0 ? (
                                  <div className="flex flex-wrap gap-2 mt-2 p-3 bg-foreground/[0.02] border border-border rounded-none">
                                    {wizardStack.map((tag) => (
                                      <span
                                        key={tag}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#ea580c]/5 text-[#ea580c] border border-[#ea580c]/30 text-xs font-bold uppercase tracking-wider rounded-none"
                                      >
                                        {tag}
                                        <button
                                          type="button"
                                          onClick={() => removeWizardTag(tag, wizardStack, setWizardStack)}
                                          className="p-0.5 hover:bg-[#ea580c]/20 text-[#ea580c] transition-colors cursor-pointer"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-muted-foreground italic">No technologies added yet.</p>
                                )}
                              </div>
                            </div>
                          )}

                          {wizardStep === 3 && (
                            <div className="space-y-5 animate-fade-in">
                              {/* Company Types */}
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                  Target Company Types
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={wizardCompanyInput}
                                    onChange={(e) => setWizardCompanyInput(e.target.value)}
                                    onKeyDown={(e) => handleWizardKeyDown(e, wizardCompanyInput, setWizardCompanyInput, wizardCompanyTypes, setWizardCompanyTypes)}
                                    placeholder="Type company type and press Enter or comma..."
                                    className="flex-1 px-4 py-3 bg-foreground/[0.01] border-2 border-border focus:border-[#ea580c] text-xs transition-all focus:outline-none rounded-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => addWizardTag(wizardCompanyInput, setWizardCompanyInput, wizardCompanyTypes, setWizardCompanyTypes)}
                                    className="px-4 py-3 border-2 border-border hover:bg-foreground/5 text-muted-foreground hover:text-foreground font-bold flex items-center justify-center rounded-none cursor-pointer"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                                {wizardCompanyTypes.length > 0 ? (
                                  <div className="flex flex-wrap gap-2 mt-2 p-3 bg-foreground/[0.02] border border-border rounded-none">
                                    {wizardCompanyTypes.map((tag) => (
                                      <span
                                        key={tag}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#ea580c]/5 text-[#ea580c] border border-[#ea580c]/30 text-xs font-bold uppercase tracking-wider rounded-none"
                                      >
                                        {tag}
                                        <button
                                          type="button"
                                          onClick={() => removeWizardTag(tag, wizardCompanyTypes, setWizardCompanyTypes)}
                                          className="p-0.5 hover:bg-[#ea580c]/20 text-[#ea580c] transition-colors cursor-pointer"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-muted-foreground italic">No company types added yet.</p>
                                )}
                              </div>

                              {/* Min Job Age */}
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                  Max Job Posting Age (Days)
                                </label>
                                <input
                                  type="number"
                                  value={wizardMinJobAgeDays}
                                  onChange={(e) => setWizardMinJobAgeDays(parseInt(e.target.value) || 0)}
                                  min={1}
                                  className="w-full px-4 py-3 bg-foreground/[0.01] border-2 border-border focus:border-[#ea580c] text-xs transition-all focus:outline-none rounded-none"
                                />
                                <p className="text-[10px] text-muted-foreground">
                                  Filter parameters for lead database.
                                </p>
                              </div>
                            </div>
                          )}

                          {wizardStep === 4 && (
                            <div className="space-y-4 animate-fade-in">
                              <div className="flex justify-between items-center">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                  Final Dynamic Sourcing Prompt
                                </label>
                                <span className="text-[9px] font-bold border border-[#ea580c]/30 bg-[#ea580c]/5 text-[#ea580c] px-2 py-0.5 uppercase tracking-wider rounded-none">
                                  Ready
                                </span>
                              </div>

                              <pre className="text-[11px] text-foreground leading-relaxed font-mono bg-foreground/[0.02] p-4 border-2 border-border whitespace-pre-wrap max-h-[40vh] overflow-y-auto rounded-none">
                                {generateDynamicPromptText()}
                              </pre>

                              <div className="flex items-center gap-2.5 p-3 border-2 border-border bg-foreground/[0.02] mt-2 select-none cursor-pointer rounded-none" onClick={() => setWizardSaveDefault(!wizardSaveDefault)}>
                                <input
                                  type="checkbox"
                                  checked={wizardSaveDefault}
                                  onChange={(e) => setWizardSaveDefault(e.target.checked)}
                                  className="w-4 h-4 border-2 border-border bg-card text-[#ea580c] focus:ring-0 focus:outline-none cursor-pointer"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div>
                                  <p className="font-bold text-foreground uppercase tracking-wide">Save parameters to Settings</p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">Make these parameters your active template default</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Footer Navigation */}
                        <div className="p-4 border-t-2 border-border bg-foreground/[0.02] flex justify-between items-center">
                          <div>
                            {wizardStep > 1 ? (
                              <button
                                onClick={() => setWizardStep((prev) => prev - 1)}
                                className="px-4 py-2.5 border-2 border-border hover:border-foreground/20 text-xs font-bold uppercase tracking-widest text-muted-foreground bg-card transition-colors rounded-none cursor-pointer flex items-center gap-1.5"
                              >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                              </button>
                            ) : (
                              <div />
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {wizardStep < 4 ? (
                              <button
                                onClick={() => {
                                  if (wizardStep === 2) {
                                    if (wizardRolesInput.trim()) {
                                      addWizardTag(wizardRolesInput, setWizardRolesInput, wizardRoles, setWizardRoles);
                                    }
                                    if (wizardStackInput.trim()) {
                                      addWizardTag(wizardStackInput, setWizardStackInput, wizardStack, setWizardStack);
                                    }
                                  } else if (wizardStep === 3) {
                                    if (wizardCompanyInput.trim()) {
                                      addWizardTag(wizardCompanyInput, setWizardCompanyInput, wizardCompanyTypes, setWizardCompanyTypes);
                                    }
                                  }
                                  setWizardStep((prev) => prev + 1);
                                }}
                                className="px-5 py-3 bg-foreground text-background text-xs font-bold uppercase tracking-widest hover:bg-[#ea580c] hover:text-background transition-colors rounded-none cursor-pointer flex items-center gap-1.5"
                              >
                                Next
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={handleFinishWizard}
                                disabled={savingDefault}
                                className="px-5 py-3 bg-foreground text-background text-xs font-bold uppercase tracking-widest hover:bg-[#ea580c] hover:text-background transition-colors rounded-none cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                              >
                                {savingDefault ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving profile...
                                  </>
                                ) : copiedPrompt ? (
                                  <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-4 h-4" />
                                    Copy &amp; Close
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>,
                document.body
              )}
            </div>
            {useSavedResume && userConfig?.savedResume ? (
              <div className="border-2 border-border bg-card p-8 flex flex-col items-center justify-center text-center rounded-none font-mono">
                <div className="w-12 h-12 border-2 border-emerald-400 bg-emerald-400/5 text-emerald-400 flex items-center justify-center mb-3 rounded-none">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-1">Resume</h3>
                <p className="text-[10px] text-muted-foreground mb-4 uppercase">{userConfig.savedResume.fileName}</p>
                <button
                  onClick={() => setUseSavedResume(false)}
                  className="text-[10px] font-bold text-[#ea580c] hover:underline uppercase tracking-wider bg-transparent border-0 cursor-pointer"
                >
                  Upload alternate PDF file for this run
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
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Job Designation / Search Query
                  </label>
                  <input
                    type="text"
                    value={discoverQuery}
                    onChange={(e) => setDiscoverQuery(e.target.value)}
                    placeholder="e.g. React Developer"
                    className="w-full bg-foreground/[0.01] border-2 border-border px-3 py-2 text-xs focus:outline-none focus:border-[#ea580c] rounded-none font-mono text-foreground"
                    disabled={isDiscovering}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Target Location
                  </label>
                  <input
                    type="text"
                    value={discoverLocation}
                    onChange={(e) => setDiscoverLocation(e.target.value)}
                    placeholder="e.g. Mumbai, Bangalore, Remote"
                    className="w-full bg-foreground/[0.01] border-2 border-border px-3 py-2 text-xs focus:outline-none focus:border-[#ea580c] rounded-none font-mono text-foreground"
                    disabled={isDiscovering}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center mt-3">
                <div className="flex flex-col gap-1.5">
                  {isDiscovering && (
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#ea580c]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{discoveryStatus}</span>
                    </div>
                  )}
                  {userConfig && typeof userConfig.discoveryRemaining === "number" && (
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Monthly Queries Remaining: <span className="text-[#ea580c]">{userConfig.discoveryRemaining}</span> / {userConfig.discoveryLimit}
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
  {isDiscovering && (
    <button
      onClick={() => {
        setIsPollingDiscovery(false);
        setIsDiscovering(false);
        setDiscoveryStatus("Stopped by user.");
      }}
      className="
        w-full sm:w-auto
        px-4 py-2
        border-2 border-red-500/30 hover:border-red-500
        text-red-500 bg-card
        text-xs font-bold uppercase tracking-widest
        transition-colors rounded-none cursor-pointer
      "
    >
      Cancel Search
    </button>
  )}

  <button
    onClick={handleStartDiscovery}
    disabled={isDiscovering || !discoverQuery.trim()}
    className="
      w-full sm:w-auto
      px-5 py-3
      bg-foreground text-background
      text-xs font-bold uppercase tracking-widest
      hover:bg-[#ea580c] hover:text-background
      disabled:opacity-50
      transition-colors rounded-none cursor-pointer
    "
  >
    {isDiscovering ? "Searching..." : "Start Sourcing"}
  </button>

  {/* Find More Leads — force refresh, burns 1 quota credit */}
  {discoveredLeads.length > 0 && !isDiscovering && (
    <button
      onClick={handleFindMoreLeads}
      disabled={isDiscovering || !discoverQuery.trim()}
      className="
        w-full sm:w-auto
        px-4 py-2.5
        border-2 border-[#ea580c]/30 hover:border-[#ea580c]
        text-[#ea580c] bg-card
        text-xs font-bold uppercase tracking-widest
        hover:bg-[#ea580c]/5
        disabled:opacity-50
        transition-colors rounded-none cursor-pointer
        flex items-center justify-center gap-1.5
      "
      title="Uses 1 quota credit to fetch the next page of results from job boards"
    >
      <ArrowRight className="w-3.5 h-3.5" />
      Find More Leads
    </button>
  )}
</div>
              </div>

              {/* Sourcing Sub-Tabs or Sourced Targets List */}
              {(discoveredLeads.length > 0 || leads.length > 0) && (
                <div className="space-y-3 mt-6 animate-fade-in">
                  {leads.length > 0 ? (
                    <>
                      {/* Sub-tab Headers */}
                      <div className="flex border-b-2 border-border mb-4 font-mono">
                        <button
                          type="button"
                          onClick={() => setSourcingSubTab("jobs")}
                          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-t-2 border-l-2 border-r-2 border-b-0 -mb-[2px] transition-colors rounded-none cursor-pointer ${
                            sourcingSubTab === "jobs"
                              ? "border-border bg-card text-[#ea580c]"
                              : "border-transparent text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Jobs ({discoveredLeads.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSourcingSubTab("leads")}
                          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-t-2 border-l-2 border-r-2 border-b-0 -mb-[2px] ml-1 transition-colors rounded-none cursor-pointer ${
                            sourcingSubTab === "leads"
                              ? "border-border bg-card text-[#ea580c]"
                              : "border-transparent text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Leads ({leads.length})
                        </button>
                      </div>

                      {/* Sub-tab Contents */}
                      {sourcingSubTab === "jobs" ? (
                        renderJobsList()
                      ) : (
                        /* Leads List Content */
                        <div className="space-y-3 animate-fade-in font-mono">
                          {alreadySent.size > 0 && (
                            <div className="flex items-center justify-between px-4 py-3 border-2 border-amber-500/30 bg-amber-500/5 text-xs font-mono rounded-none animate-fade-in">
                              <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                <span>
                                  {alreadySent.size} target {alreadySent.size === 1 ? "email is" : "emails are"} already contacted
                                </span>
                              </div>
                              <button
                                onClick={handleRemoveAlreadySent}
                                className="flex items-center gap-1.5 px-3 py-1.5 border border-amber-500/30 hover:border-amber-400 bg-card text-amber-400 text-[10px] font-bold uppercase tracking-wider rounded-none cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Remove Contacted
                              </button>
                            </div>
                          )}
                          {invalidEmails.size > 0 && (
                            <div className="flex items-center justify-between px-4 py-3 border-2 border-red-500/30 bg-red-500/5 text-xs font-mono rounded-none animate-fade-in">
                              <div className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-wider">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                <span>
                                  {invalidEmails.size} target {invalidEmails.size === 1 ? "email has" : "emails have"} invalid domain MX records
                                </span>
                              </div>
                              <button
                                onClick={handleRemoveInvalid}
                                className="flex items-center gap-1.5 px-3 py-1.5 border border-red-500/30 hover:border-red-400 bg-card text-red-400 text-[10px] font-bold uppercase tracking-wider rounded-none cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Remove Invalid
                              </button>
                            </div>
                          )}
                          {checkingSent || isVerifying ? (
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-1 font-mono">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ea580c]" />
                              Scanning outbox records and resolving MX routes...
                            </div>
                          ) : null}
                          <CompanyTable
                            leads={leads}
                            alreadySent={alreadySent}
                            invalidEmails={invalidEmails}
                            onEdit={setEditingLead}
                            onDelete={handleDeleteLead}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    /* If no leads imported yet, show Jobs content directly without tabs */
                    renderJobsList()
                  )}
                </div>
              )}
            </div>
          )}

          {leads.length > 0 && uploadTab === "upload" && (
            <>
              {alreadySent.size > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-2 border-amber-500/30 bg-amber-500/5 text-xs font-mono rounded-none animate-fade-in mb-3">
                  <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>
                      {alreadySent.size} target {alreadySent.size === 1 ? "email is" : "emails are"} already contacted
                    </span>
                  </div>
                  <button
                    onClick={handleRemoveAlreadySent}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-amber-500/30 hover:border-amber-400 bg-card text-amber-400 text-[10px] font-bold uppercase tracking-wider rounded-none cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove Contacted
                  </button>
                </div>
              )}
              {invalidEmails.size > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-2 border-red-500/30 bg-red-500/5 text-xs font-mono rounded-none animate-fade-in">
                  <div className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>
                      {invalidEmails.size} target {invalidEmails.size === 1 ? "email has" : "emails have"} invalid domain MX records
                    </span>
                  </div>
                  <button
                    onClick={handleRemoveInvalid}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-red-500/30 hover:border-red-400 bg-card text-red-400 text-[10px] font-bold uppercase tracking-wider rounded-none cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove Invalid
                  </button>
                </div>
              )}
              {checkingSent || isVerifying ? (
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ea580c]" />
                  Scanning outbox records and resolving MX routes...
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

          {/* Edit Lead Modal Overlay (Portal) */}
          {editingLead && mounted && createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in font-mono text-xs text-foreground">
              <div className="bg-card border-2 border-border w-full max-w-md overflow-hidden shadow-2xl flex flex-col rounded-none">
                <div className="flex items-center justify-between p-4 border-b-2 border-border bg-foreground/[0.02]">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-foreground">Edit Target Parameters</h3>
                  <button
                    onClick={() => setEditingLead(null)}
                    className="p-1.5 border border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors rounded-none cursor-pointer"
                  >
                    <X className="w-4 h-4" />
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
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Company Name</label>
                    <input
                      name="company"
                      defaultValue={editingLead.company}
                      className="w-full bg-foreground/[0.01] border-2 border-border px-3 py-2 text-xs focus:outline-none focus:border-[#ea580c] rounded-none font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Role</label>
                    <input
                      name="role"
                      defaultValue={editingLead.role}
                      className="w-full bg-foreground/[0.01] border-2 border-border px-3 py-2 text-xs focus:outline-none focus:border-[#ea580c] rounded-none font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Recipient Email</label>
                    <input
                      name="contact_email"
                      defaultValue={editingLead.contact_email}
                      type="email"
                      className="w-full bg-foreground/[0.01] border-2 border-border px-3 py-2 text-xs focus:outline-none focus:border-[#ea580c] rounded-none font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tech Stack (comma split)</label>
                    <input
                      name="stack"
                      defaultValue={(Array.isArray(editingLead.stack) ? editingLead.stack : [editingLead.stack]).filter(Boolean).join(", ")}
                      className="w-full bg-foreground/[0.01] border-2 border-border px-3 py-2 text-xs focus:outline-none focus:border-[#ea580c] rounded-none font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Fit Score Rating</label>
                    <input
                      name="fit_score"
                      defaultValue={editingLead.fit_score}
                      className="w-full bg-foreground/[0.01] border-2 border-border px-3 py-2 text-xs focus:outline-none focus:border-[#ea580c] rounded-none font-mono"
                    />
                  </div>
                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingLead(null)}
                      className="px-4 py-2.5 border-2 border-border text-xs font-bold uppercase tracking-widest text-muted-foreground bg-card transition-all rounded-none cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-foreground text-background text-xs font-bold uppercase tracking-widest hover:bg-[#ea580c] hover:text-background transition-all rounded-none cursor-pointer animate-fade-in"
                    >
                      Save Target
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )}

          {/* Delete Lead Modal Overlay (Portal) */}
          {deletingLead && mounted && createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in font-mono text-xs text-foreground">
              <div className="bg-card border-2 border-border w-full max-w-sm overflow-hidden shadow-2xl flex flex-col rounded-none">
                <div className="p-6 text-center">
                  <div className="w-10 h-10 border-2 border-red-500 bg-red-500/5 text-red-400 flex items-center justify-center mx-auto mb-4 rounded-none">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm uppercase tracking-wider text-foreground mb-2">Remove Target</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Remove <span className="font-bold text-foreground uppercase">{deletingLead.company}</span> from current outreach pipeline queue?
                  </p>
                </div>
                <div className="p-4 border-t-2 border-border bg-foreground/[0.01] flex items-center gap-3">
                  <button
                    onClick={() => setDeletingLead(null)}
                    className="flex-1 py-2.5 border-2 border-border hover:border-foreground/20 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-all cursor-pointer bg-card rounded-none"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteLead}
                    className="flex-1 py-2.5 bg-red-500 text-white text-xs font-bold uppercase tracking-widest hover:bg-red-600 transition-all cursor-pointer rounded-none"
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
              className="group px-6 py-3.5 bg-foreground text-background text-xs font-bold uppercase tracking-widest hover:bg-[#ea580c] hover:text-background disabled:opacity-40 disabled:hover:bg-foreground disabled:hover:text-background transition-all flex items-center gap-2 rounded-none cursor-pointer"
            >
              Next: Personalise
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Generate ── */}
      {currentStep === "generate" && (
        <div className="space-y-8 animate-fade-in font-mono text-xs">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">
              AI personalizer is processing batch pipeline...
            </p>
            <button
              onClick={() => setCurrentStep("upload")}
              disabled={isGenerating}
              className="flex items-center gap-2 border border-border bg-card px-3 py-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 rounded-none cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
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
                className="group px-6 py-3.5 bg-foreground text-background text-xs font-bold uppercase tracking-widest hover:bg-[#ea580c] hover:text-background transition-all flex items-center gap-2 rounded-none cursor-pointer"
              >
                Next: Review &amp; Edit
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Step: Preview ── */}
      {currentStep === "preview" && (
        <div className="space-y-8 animate-fade-in font-mono text-xs">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">
              Inspect generated outbound drafts. Check checkboxes to active queue send.
            </p>
            <button
              onClick={() => setCurrentStep("generate")}
              className="flex items-center gap-2 border border-border bg-card px-3 py-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors rounded-none cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
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
          autoResetSeconds={autoSend ? 8 : undefined}
        />
      )}

      {/* Custom Discard Draft Confirmation Modal (Portal) */}
      {showDiscardDraftConfirm && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in font-mono text-xs text-foreground">
          <div className="bg-card border-2 border-border w-full max-w-sm overflow-hidden shadow-2xl flex flex-col rounded-none">
            <div className="p-6 text-center">
              <div className="w-10 h-10 border-2 border-red-500 bg-red-500/5 text-red-400 flex items-center justify-center mx-auto mb-4 rounded-none">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm uppercase tracking-wider text-foreground mb-2">Discard Draft</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Are you absolutely sure you want to discard this campaign draft? This will clear all parsed leads and generated copy.
              </p>
            </div>
            <div className="p-4 border-t-2 border-border bg-foreground/[0.01] flex items-center gap-3">
              <button
                onClick={() => setShowDiscardDraftConfirm(false)}
                className="flex-1 py-2.5 border-2 border-border hover:border-foreground/20 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-all cursor-pointer bg-card rounded-none"
              >
                Cancel
              </button>
              <button
                onClick={confirmDiscardDraft}
                className="flex-1 py-2.5 bg-red-500 text-white text-xs font-bold uppercase tracking-widest hover:bg-red-600 transition-all cursor-pointer rounded-none"
              >
                Discard Draft
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Custom Billing Redirect Confirmation Modal (Portal) */}
      {billingRedirectMessage && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in font-mono text-xs text-foreground">
          <div className="bg-card border-2 border-border w-full max-w-md overflow-hidden shadow-2xl flex flex-col rounded-none">
            <div className="p-6 text-center">
              <div className="w-10 h-10 border-2 border-amber-500 bg-amber-500/5 text-amber-500 flex items-center justify-center mx-auto mb-4 rounded-none">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm uppercase tracking-wider text-foreground mb-2">Pipeline Limit Exceeded</h3>
              <p className="text-xs text-muted-foreground leading-relaxed break-words">
                {billingRedirectMessage}
              </p>
              <p className="text-[11px] text-[#ea580c] mt-2 font-bold uppercase tracking-wider">
                Upgrade your subscription plan to increase sending quotas.
              </p>
            </div>
            <div className="p-4 border-t-2 border-border bg-foreground/[0.01] flex items-center gap-3">
              <button
                onClick={() => setBillingRedirectMessage(null)}
                className="flex-1 py-2.5 border-2 border-border hover:border-foreground/20 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-all cursor-pointer bg-card rounded-none"
              >
                Stay Here
              </button>
              <button
                onClick={() => {
                  window.location.href = "/dashboard/billing";
                }}
                className="flex-1 py-2.5 bg-foreground text-background text-xs font-bold uppercase tracking-widest hover:bg-[#ea580c] hover:text-background transition-all cursor-pointer rounded-none"
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Custom Upgrade Modal for Leads Discovery (Portal) */}
      {showUpgradeModal && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in font-mono text-xs text-foreground font-bold">
          <div className="bg-card border-2 border-border w-full max-w-md overflow-hidden shadow-2xl flex flex-col rounded-none">
            <div className="p-6 text-center">
              <div className="w-10 h-10 border-2 border-[#ea580c] bg-[#ea580c]/5 text-[#ea580c] flex items-center justify-center mx-auto mb-4 rounded-none">
                <Settings className="w-5 h-5 animate-spin" />
              </div>
              <h3 className="font-bold text-sm uppercase tracking-wider text-foreground mb-2">Premium Feature Locked</h3>
              <p className="text-xs text-muted-foreground leading-relaxed normal-case font-normal">
                Leads Discovery is a premium feature. Upgrade to <span className="font-bold text-foreground">Starter</span>, <span className="font-bold text-foreground">Pro</span>, or <span className="font-bold text-foreground">Enterprise</span> plan to automatically search, scrape websites, resolve domains, and harvest verified contacts.
              </p>
              <div className="mt-4 p-3 border border-border bg-foreground/[0.01] text-left space-y-1.5 text-[10px] text-muted-foreground uppercase font-bold tracking-wide">
                <p>✓ Starter: 30 Sourcing queries / month</p>
                <p>✓ Pro: 90 Sourcing queries / month</p>
                <p>✓ Enterprise: 500 Sourcing queries / month</p>
              </div>
            </div>
            <div className="p-4 border-t-2 border-border bg-foreground/[0.01] flex items-center gap-3">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 py-2.5 border-2 border-border hover:border-foreground/20 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-all cursor-pointer bg-card rounded-none"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  window.location.href = "/dashboard/billing";
                }}
                className="flex-1 py-2.5 bg-foreground text-background text-xs font-bold uppercase tracking-widest hover:bg-[#ea580c] hover:text-background transition-all cursor-pointer rounded-none"
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        </div>,
        document.body
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
