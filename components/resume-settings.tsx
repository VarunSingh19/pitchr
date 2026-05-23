"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, CheckCircle2, AlertCircle, FileText, Upload, Trash2, File as FileIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ResumeSettings() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savedResume, setSavedResume] = useState<{ fileName: string } | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/user/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.resume) {
          setSavedResume({ fileName: data.resume.fileName });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Please select a PDF file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File must be smaller than 5MB.");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/user/resume", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      setSavedResume({ fileName: data.resume.fileName });
      setSuccess("Resume saved successfully! It will be used for all new campaigns.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    setSuccess("");
    setShowConfirmDelete(false);

    try {
      const res = await fetch("/api/user/resume", { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Deletion failed");
      }
      setSavedResume(null);
      setSuccess("Resume deleted successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setDeleting(false);
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
    <div className="space-y-4 font-mono">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Resume Configuration</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Upload your base resume here so you don't have to provide it for every campaign.
        </p>
      </div>

      <div className="border-2 border-border bg-card p-6 space-y-5 rounded-none">
        {/* Error/Success messages */}
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

        {/* Custom Confirmation Modal overlay (instead of window.confirm) */}
        {showConfirmDelete && (
          <div className="border-2 border-red-500 bg-red-500/5 p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Confirm Resume Deletion</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  Are you absolutely sure you want to delete your saved resume? This cannot be undone and will require uploading it again for future campaigns.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="px-4 py-2 border border-border hover:bg-foreground/5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider cursor-pointer"
              >
                Delete File
              </button>
            </div>
          </div>
        )}

        {/* Existing Resume Display */}
        {savedResume ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-2 border-border bg-foreground/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border-2 border-[#ea580c]/30 bg-[#ea580c]/5 text-[#ea580c] flex items-center justify-center rounded-none">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">
                  {savedResume.fileName}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Currently active for new campaigns</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowConfirmDelete(true)}
              disabled={deleting}
              className="mt-3 sm:mt-0 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-border text-xs font-bold uppercase tracking-widest text-red-400 hover:border-red-400 hover:bg-red-400/5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete Resume
            </button>
          </div>
        ) : (
          <div
            className="border-2 border-dashed border-border p-8 flex flex-col items-center justify-center text-center bg-foreground/[0.01] hover:bg-foreground/[0.03] transition-colors relative cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
             <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileUpload}
             />
             <div className="w-12 h-12 border-2 border-[#ea580c]/30 bg-[#ea580c]/5 flex items-center justify-center mb-3">
               {uploading ? (
                 <Loader2 className="w-5 h-5 text-[#ea580c] animate-spin" />
               ) : (
                 <Upload className="w-5 h-5 text-[#ea580c]" />
               )}
             </div>
             <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-1">
               {uploading ? "Uploading Document..." : "Click to upload Resume (PDF)"}
             </p>
             <p className="text-[10px] text-muted-foreground">
               Max size 5MB. Must be a parseable text document.
             </p>
          </div>
        )}

        {/* Action Buttons for Replace */}
        {savedResume && !showConfirmDelete && (
          <div className="flex justify-end">
             <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-5 py-3 border-2 border-border hover:border-foreground/20 text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer bg-card"
             >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileIcon className="w-4 h-4" />}
                Replace File
             </button>
             <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileUpload}
             />
          </div>
        )}
      </div>
    </div>
  );
}
