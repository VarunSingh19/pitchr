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
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin text-[#ea580c]" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 font-mono text-xs">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Prompt Setup</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Configure default search criteria for generating outbound lead lists.
        </p>
      </div>

      <div className="border-2 border-border bg-card p-6 space-y-5 rounded-none">
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-400 font-bold uppercase tracking-wider border-2 border-red-500/30 bg-red-500/5 px-4 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold uppercase tracking-wider border-2 border-emerald-500/30 bg-emerald-400/5 px-4 py-3">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {success}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-5">
          {/* Target Geography */}
          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Target Geography
            </label>
            <textarea
              value={targetGeography}
              onChange={(e) => setTargetGeography(e.target.value)}
              placeholder="e.g. Mumbai — specifically Malad and Andheri areas..."
              rows={3}
              className="w-full px-4 py-3 bg-foreground/[0.01] border-2 border-border focus:border-[#ea580c] text-foreground text-xs transition-all focus:outline-none resize-none rounded-none"
              required
            />
            <p className="text-[10px] text-muted-foreground">
              Define the target region, specific neighborhoods, and fallback areas.
            </p>
          </div>

          {/* Researcher Location */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Researcher Location Context
            </label>
            <input
              type="text"
              value={researcherLocation}
              onChange={(e) => setResearcherLocation(e.target.value)}
              placeholder="e.g. Mumbai, Maharashtra"
              className="w-full px-4 py-3 bg-foreground/[0.01] border-2 border-border focus:border-[#ea580c] text-foreground text-xs transition-all focus:outline-none rounded-none"
              required
            />
            <p className="text-[10px] text-muted-foreground">
              Geography context of the B2B researcher.
            </p>
          </div>

          {/* Min Job Age */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Max Posting Age (Days)
            </label>
            <input
              type="number"
              value={minJobAgeDays}
              onChange={(e) => setMinJobAgeDays(parseInt(e.target.value) || 0)}
              min={1}
              className="w-full px-4 py-3 bg-foreground/[0.01] border-2 border-border focus:border-[#ea580c] text-foreground text-xs transition-all focus:outline-none rounded-none"
              required
            />
            <p className="text-[10px] text-muted-foreground">
              Maximum age of job postings in days.
            </p>
          </div>
        </div>

        <div className="border-t-2 border-border/40 my-6" />

        {/* Dynamic Tag Fields */}
        <div className="space-y-5">
          {/* Target Roles */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Target Job Roles
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={rolesInput}
                onChange={(e) => setRolesInput(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, rolesInput, setRolesInput, roles, setRoles)}
                placeholder="Type role and press Enter or comma..."
                className="flex-1 px-4 py-3 bg-foreground/[0.01] border-2 border-border focus:border-[#ea580c] text-foreground text-xs transition-all focus:outline-none rounded-none"
              />
              <button
                type="button"
                onClick={() => addTag(rolesInput, setRolesInput, roles, setRoles)}
                className="px-4 py-3 border-2 border-border hover:bg-foreground/5 text-muted-foreground hover:text-foreground font-bold flex items-center justify-center rounded-none cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {roles.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-2 p-3 bg-foreground/[0.02] border-2 border-border rounded-none">
                {roles.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#ea580c]/5 text-[#ea580c] border border-[#ea580c]/30 text-xs font-bold uppercase tracking-wider rounded-none"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag, roles, setRoles)}
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

          {/* Tech Stack */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Target Skills & Technologies
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={stackInput}
                onChange={(e) => setStackInput(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, stackInput, setStackInput, stack, setStack)}
                placeholder="Type skill and press Enter or comma..."
                className="flex-1 px-4 py-3 bg-foreground/[0.01] border-2 border-border focus:border-[#ea580c] text-foreground text-xs transition-all focus:outline-none rounded-none"
              />
              <button
                type="button"
                onClick={() => addTag(stackInput, setStackInput, stack, setStack)}
                className="px-4 py-3 border-2 border-border hover:bg-foreground/5 text-muted-foreground hover:text-foreground font-bold flex items-center justify-center rounded-none cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {stack.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-2 p-3 bg-foreground/[0.02] border-2 border-border rounded-none">
                {stack.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#ea580c]/5 text-[#ea580c] border border-[#ea580c]/30 text-xs font-bold uppercase tracking-wider rounded-none"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag, stack, setStack)}
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

          {/* Company Types */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Target Company Types
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={companyInput}
                onChange={(e) => setCompanyInput(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, companyInput, setCompanyInput, companyTypes, setCompanyTypes)}
                placeholder="Type company type and press Enter or comma..."
                className="flex-1 px-4 py-3 bg-foreground/[0.01] border-2 border-border focus:border-[#ea580c] text-foreground text-xs transition-all focus:outline-none rounded-none"
              />
              <button
                type="button"
                onClick={() => addTag(companyInput, setCompanyInput, companyTypes, setCompanyTypes)}
                className="px-4 py-3 border-2 border-border hover:bg-foreground/5 text-muted-foreground hover:text-foreground font-bold flex items-center justify-center rounded-none cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {companyTypes.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-2 p-3 bg-foreground/[0.02] border-2 border-border rounded-none">
                {companyTypes.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#ea580c]/5 text-[#ea580c] border border-[#ea580c]/30 text-xs font-bold uppercase tracking-wider rounded-none"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag, companyTypes, setCompanyTypes)}
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
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-foreground text-background text-xs font-bold uppercase tracking-widest hover:bg-[#ea580c] hover:text-background disabled:opacity-40 disabled:hover:bg-foreground disabled:hover:text-background transition-all rounded-none cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? "Saving Changes..." : "Save Configuration"}
          </button>
        </div>
      </div>
    </form>
  );
}
