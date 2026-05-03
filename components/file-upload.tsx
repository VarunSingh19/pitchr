"use client";

import { useCallback, useRef, useState } from "react";
import { FileJson, FileText, Upload, CheckCircle2, AlertCircle, X } from "lucide-react";
import type { Lead } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  type: "json" | "pdf";
  onJsonParsed?: (leads: Lead[]) => void;
  onFileSelected?: (file: File) => void;
  fileName?: string;
  resumeWordCount?: number;
}

export function FileUpload({
  type,
  onJsonParsed,
  onFileSelected,
  fileName,
  resumeWordCount,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = type === "json" ? ".json" : ".pdf";
  const Icon = type === "json" ? FileJson : FileText;
  const label = type === "json" ? "Leads JSON" : "Resume PDF";

  const processFile = useCallback(
    async (file: File) => {
      setError(null);

      if (type === "json") {
        if (!file.name.endsWith(".json")) {
          setError("Please upload a .json file");
          return;
        }
        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          if (!Array.isArray(parsed) || parsed.length === 0) {
            setError("JSON must be a non-empty array");
            return;
          }
          const hasEmail = parsed.some(
            (item: Record<string, unknown>) =>
              item.contact_email && typeof item.contact_email === "string"
          );
          if (!hasEmail) {
            setError("At least one company must have a contact_email");
            return;
          }
          // Ensure every entry has an id
          const withIds = parsed.map((item: Record<string, unknown>, idx: number) => ({
            ...item,
            id: item.id ?? idx + 1,
          }));
          onJsonParsed?.(withIds as Lead[]);
        } catch {
          setError("Invalid JSON file — could not parse");
        }
      } else {
        if (!file.name.toLowerCase().endsWith(".pdf")) {
          setError("Please upload a .pdf file");
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          setError("PDF must be under 5MB");
          return;
        }
        setIsLoading(true);
        try {
          await onFileSelected?.(file);
        } finally {
          setIsLoading(false);
        }
      }
    },
    [type, onJsonParsed, onFileSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      // Reset input so the same file can be re-selected
      e.target.value = "";
    },
    [processFile]
  );

  const handleClear = useCallback(() => {
    setError(null);
    if (type === "json") {
      onJsonParsed?.([]);
    } else {
      // For PDF, parent manages the state — we just signal with a null-like
      onFileSelected?.(new File([], ""));
    }
  }, [type, onJsonParsed, onFileSelected]);

  const hasFile = !!fileName && fileName !== "0 companies loaded";

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-text-secondary flex items-center gap-2">
        <Icon className="w-4 h-4" />
        {label}
      </label>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !hasFile && inputRef.current?.click()}
        className={cn(
          "relative rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 cursor-pointer",
          isDragging
            ? "border-accent-primary bg-accent-dim scale-[1.01]"
            : hasFile
              ? "border-border-subtle bg-bg-surface cursor-default"
              : "border-border-default bg-bg-surface hover:border-border-subtle hover:bg-bg-elevated"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-dim flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-sm text-text-muted">Parsing resume...</p>
          </div>
        ) : hasFile ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success-dim flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">{fileName}</p>
              {resumeWordCount && (
                <p className="text-xs text-text-muted mt-0.5">
                  {resumeWordCount} words extracted
                </p>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="flex items-center gap-1 text-xs text-text-faint hover:text-error transition-colors mt-1"
            >
              <X className="w-3 h-3" />
              Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-bg-elevated flex items-center justify-center">
              <Upload className="w-5 h-5 text-text-muted" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">
                Drop your <span className="font-medium text-text-primary">{accept}</span> file here
              </p>
              <p className="text-xs text-text-faint mt-1">or click to browse</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-error px-1">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
