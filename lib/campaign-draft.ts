/**
 * Campaign Draft Persistence
 * Auto-saves campaign state to localStorage so users can close the browser
 * and resume exactly where they left off.
 */

import { useEffect, useCallback, useRef } from "react";
import type { Lead, GeneratedEmail } from "@/lib/types";

const DRAFT_KEY = "pitchr_campaign_draft";
const DRAFT_VERSION = 2;

export interface CampaignDraft {
  version: number;
  step: "upload" | "generate" | "preview" | "send";
  leads: Lead[];
  resumeText: string;
  resumeFileName: string;
  generatedEmails: GeneratedEmail[];
  /** Index where generation was paused (so we can resume from here) */
  generationPausedAt: number | null;
  savedAt: string;
  campaignId: string | null;
  isGenerating: boolean;
  isSending: boolean;
  autoSend: boolean;
  pollingStatus: {
    generated: number;
    failed: number;
    total: number;
    status: string;
  };
}

/** Save draft to localStorage */
export function saveDraft(draft: Omit<CampaignDraft, "version" | "savedAt">) {
  try {
    const payload: CampaignDraft = {
      ...draft,
      version: DRAFT_VERSION,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch {
    // localStorage might be full or disabled — silently ignore
  }
}

/** Load draft from localStorage */
export function loadDraft(): CampaignDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;

    const draft: CampaignDraft = JSON.parse(raw);

    // Version check — discard stale drafts
    if (draft.version !== DRAFT_VERSION) {
      clearDraft();
      return null;
    }

    // Discard drafts older than 24 hours
    const age = Date.now() - new Date(draft.savedAt).getTime();
    if (age > 24 * 60 * 60 * 1000) {
      clearDraft();
      return null;
    }

    return draft;
  } catch {
    clearDraft();
    return null;
  }
}

/** Clear the draft */
export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

/**
 * Hook that auto-saves campaign state whenever it changes.
 * Call this from the campaign page with the current state.
 */
export function useAutoSaveDraft(
  step: CampaignDraft["step"],
  leads: Lead[],
  resumeText: string,
  resumeFileName: string,
  generatedEmails: GeneratedEmail[],
  generationPausedAt: number | null,
  campaignId: string | null,
  isGenerating: boolean,
  isSending: boolean,
  autoSend: boolean,
  pollingStatus: CampaignDraft["pollingStatus"],
  isActive: boolean // only save when there's meaningful data
) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSave = useCallback(() => {
    if (!isActive) return;
    saveDraft({
      step,
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
    });
  }, [
    step,
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
    isActive,
  ]);

  useEffect(() => {
    if (!isActive) return;

    // Debounce saves to avoid thrashing localStorage
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(doSave, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [doSave, isActive]);

  // Also save on page unload
  useEffect(() => {
    if (!isActive) return;

    const handleUnload = () => doSave();
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [doSave, isActive]);
}
