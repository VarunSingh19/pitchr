"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function PromptSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [targetGeography, setTargetGeography] = useState("");
  const [researcherLocation, setResearcherLocation] = useState("");
  const [minJobAgeDays, setMinJobAgeDays] = useState(90);

  const [roles, setRoles] = useState<string[]>([]);
  const [rolesInput, setRolesInput] = useState("");

  const [stack, setStack] = useState<string[]>([]);
  const [stackInput, setStackInput] = useState("");

  const [companyTypes, setCompanyTypes] = useState<string[]>([]);
  const [companyInput, setCompanyInput] = useState("");

  useEffect(() => {
    fetch("/api/user/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.promptConfig) {
          setTargetGeography(data.promptConfig.targetGeography || "");
          setResearcherLocation(data.promptConfig.researcherLocation || "");
          setMinJobAgeDays(data.promptConfig.minJobAgeDays || 90);
          setRoles(data.promptConfig.targetRoles || []);
          setStack(data.promptConfig.targetStack || []);
          setCompanyTypes(data.promptConfig.companyTypes || []);
        }
      })
      .catch(() => {
        setError("Failed to load settings.");
      })
      .finally(() => setLoading(false));
  }, []);

  const addTag = (
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
  };

  const removeTag = (
    tagToRemove: string,
    tags: string[],
    setTags: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    input: string,
    setInput: React.Dispatch<React.SetStateAction<string>>,
    tags: string[],
    setTags: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input, setInput, tags, setTags);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    // Automatically add any remaining text in tag inputs
    let finalRoles = [...roles];
    if (rolesInput.trim() && !finalRoles.includes(rolesInput.trim().replace(/,$/, ""))) {
      finalRoles.push(rolesInput.trim().replace(/,$/, ""));
      setRoles(finalRoles);
      setRolesInput("");
    }

    let finalStack = [...stack];
    if (stackInput.trim() && !finalStack.includes(stackInput.trim().replace(/,$/, ""))) {
      finalStack.push(stackInput.trim().replace(/,$/, ""));
      setStack(finalStack);
      setStackInput("");
    }

    let finalCompanyTypes = [...companyTypes];
    if (companyInput.trim() && !finalCompanyTypes.includes(companyInput.trim().replace(/,$/, ""))) {
      finalCompanyTypes.push(companyInput.trim().replace(/,$/, ""));
      setCompanyTypes(finalCompanyTypes);
      setCompanyInput("");
    }

    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptConfig: {
            targetGeography,
            researcherLocation,
            minJobAgeDays,
            targetRoles: finalRoles,
            targetStack: finalStack,
            companyTypes: finalCompanyTypes,
            hasConfigured: true,
          },
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save prompt settings.");
      }

      setSuccess("Prompt configuration saved successfully!");
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-text-muted">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Prompt Setup</h2>
        <p className="text-sm text-text-muted">
          Configure default search parameters used to generate B2B outbound list research prompts for Claude or ChatGPT.
        </p>
      </div>

      <div className="rounded-2xl border border-border-default bg-bg-surface p-6 space-y-5">
        {error && (
          <div className="flex items-center gap-2 text-sm text-error bg-error-dim px-4 py-3 rounded-xl border border-error/20">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 text-sm text-success bg-success-dim px-4 py-3 rounded-xl border border-success/20">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {success}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-5">
          {/* Target Geography */}
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Target Geography
            </label>
            <textarea
              value={targetGeography}
              onChange={(e) => setTargetGeography(e.target.value)}
              placeholder="e.g. Mumbai — specifically Malad and Andheri areas..."
              rows={3}
              className="w-full px-4 py-3 bg-bg-elevated border border-border-default hover:border-border-subtle focus:border-accent-primary rounded-xl text-sm transition-all focus:outline-none resize-none"
              required
            />
            <p className="text-[11px] text-text-muted">
              Define the target region, specific neighborhoods, and fallback areas.
            </p>
          </div>

          {/* Researcher Location */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Researcher Location Context
            </label>
            <input
              type="text"
              value={researcherLocation}
              onChange={(e) => setResearcherLocation(e.target.value)}
              placeholder="e.g. Mumbai, Maharashtra"
              className="w-full px-4 py-3 bg-bg-elevated border border-border-default hover:border-border-subtle focus:border-accent-primary rounded-xl text-sm transition-all focus:outline-none"
              required
            />
            <p className="text-[11px] text-text-muted">
              Geography context of the B2B researcher.
            </p>
          </div>

          {/* Min Job Age */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Max Posting Age (Days)
            </label>
            <input
              type="number"
              value={minJobAgeDays}
              onChange={(e) => setMinJobAgeDays(parseInt(e.target.value) || 0)}
              min={1}
              className="w-full px-4 py-3 bg-bg-elevated border border-border-default hover:border-border-subtle focus:border-accent-primary rounded-xl text-sm transition-all focus:outline-none"
              required
            />
            <p className="text-[11px] text-text-muted">
              Maximum age of job postings in days.
            </p>
          </div>
        </div>

        <div className="border-t border-border-subtle/50 my-6" />

        {/* Dynamic Tag Fields */}
        <div className="space-y-5">
          {/* Target Roles */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Target Job Roles
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={rolesInput}
                onChange={(e) => setRolesInput(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, rolesInput, setRolesInput, roles, setRoles)}
                placeholder="Type role and press Enter or comma..."
                className="flex-1 px-4 py-2.5 bg-bg-elevated border border-border-default hover:border-border-subtle focus:border-accent-primary rounded-xl text-sm transition-all focus:outline-none"
              />
              <button
                type="button"
                onClick={() => addTag(rolesInput, setRolesInput, roles, setRoles)}
                className="px-4 py-2.5 bg-bg-elevated border border-border-default hover:bg-bg-subtle text-text-secondary rounded-xl text-sm font-medium transition-all flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {roles.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-2 p-3 bg-bg-elevated/40 border border-border-default/40 rounded-xl">
                {roles.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-dim text-accent-primary border border-accent-primary/20 text-xs font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag, roles, setRoles)}
                      className="p-0.5 rounded-full hover:bg-accent-primary/20 text-accent-primary transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-faint italic">No roles added yet.</p>
            )}
          </div>

          {/* Tech Stack */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Target Skills & Technologies
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={stackInput}
                onChange={(e) => setStackInput(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, stackInput, setStackInput, stack, setStack)}
                placeholder="Type skill and press Enter or comma..."
                className="flex-1 px-4 py-2.5 bg-bg-elevated border border-border-default hover:border-border-subtle focus:border-accent-primary rounded-xl text-sm transition-all focus:outline-none"
              />
              <button
                type="button"
                onClick={() => addTag(stackInput, setStackInput, stack, setStack)}
                className="px-4 py-2.5 bg-bg-elevated border border-border-default hover:bg-bg-subtle text-text-secondary rounded-xl text-sm font-medium transition-all flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {stack.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-2 p-3 bg-bg-elevated/40 border border-border-default/40 rounded-xl">
                {stack.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-dim text-accent-primary border border-accent-primary/20 text-xs font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag, stack, setStack)}
                      className="p-0.5 rounded-full hover:bg-accent-primary/20 text-accent-primary transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-faint italic">No technologies added yet.</p>
            )}
          </div>

          {/* Company Types */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Target Company Types
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={companyInput}
                onChange={(e) => setCompanyInput(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, companyInput, setCompanyInput, companyTypes, setCompanyTypes)}
                placeholder="Type company type and press Enter or comma..."
                className="flex-1 px-4 py-2.5 bg-bg-elevated border border-border-default hover:border-border-subtle focus:border-accent-primary rounded-xl text-sm transition-all focus:outline-none"
              />
              <button
                type="button"
                onClick={() => addTag(companyInput, setCompanyInput, companyTypes, setCompanyTypes)}
                className="px-4 py-2.5 bg-bg-elevated border border-border-default hover:bg-bg-subtle text-text-secondary rounded-xl text-sm font-medium transition-all flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {companyTypes.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-2 p-3 bg-bg-elevated/40 border border-border-default/40 rounded-xl">
                {companyTypes.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-dim text-accent-primary border border-accent-primary/20 text-xs font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag, companyTypes, setCompanyTypes)}
                      className="p-0.5 rounded-full hover:bg-accent-primary/20 text-accent-primary transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-faint italic">No company types added yet.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent-primary hover:bg-accent-primary-hover text-white text-sm font-semibold transition-all shadow-md shadow-accent-primary/20 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? "Saving Changes..." : "Save Configuration"}
          </button>
        </div>
      </div>
    </form>
  );
}
