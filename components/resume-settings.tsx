"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, CheckCircle2, AlertCircle, FileText, Upload, Trash2, File as FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ResumeSettings() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savedResume, setSavedResume] = useState<{ fileName: string } | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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
    if (!confirm("Are you sure you want to delete your saved resume?")) return;

    setDeleting(true);
    setError("");
    setSuccess("");

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
      <div className="flex items-center justify-center py-12 text-text-muted">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Resume Configuration</h2>
        <p className="text-sm text-text-muted">
          Upload your base resume here so you don't have to provide it for every campaign.
        </p>
      </div>

      <div className="rounded-2xl border border-border-default bg-bg-surface p-6 space-y-5">
        {/* Error/Success messages */}
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

        {/* Existing Resume Display */}
        {savedResume ? (
          <div className="flex items-center justify-between p-4 rounded-xl border border-border-default bg-bg-elevated">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent-dim text-accent-primary flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {savedResume.fileName}
                </p>
                <p className="text-xs text-text-muted">Currently active for new campaigns</p>
              </div>
            </div>
            
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-error hover:bg-error-dim rounded-lg transition-colors disabled:opacity-50"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-border-default rounded-xl p-8 flex flex-col items-center justify-center text-center bg-bg-elevated hover:bg-bg-subtle transition-colors relative cursor-pointer"
               onClick={() => fileInputRef.current?.click()}>
             <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileUpload}
             />
             <div className="w-12 h-12 rounded-full bg-accent-dim flex items-center justify-center mb-3">
               {uploading ? (
                 <Loader2 className="w-6 h-6 text-accent-primary animate-spin" />
               ) : (
                 <Upload className="w-6 h-6 text-accent-primary" />
               )}
             </div>
             <p className="text-sm font-medium text-text-primary mb-1">
               {uploading ? "Uploading..." : "Click to upload your Resume (PDF)"}
             </p>
             <p className="text-xs text-text-muted">
               Max 5MB. Must be a text-parseable PDF.
             </p>
          </div>
        )}

        {/* Action Buttons for Replace */}
        {savedResume && (
          <div className="flex justify-end">
             <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-subtle hover:bg-bg-elevated border border-border-default text-sm font-medium transition-colors"
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
