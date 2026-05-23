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
    <div className="space-y-2 font-mono text-xs">
      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-[#ea580c]" />
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
          "relative border-2 border-dashed p-8 text-center transition-all cursor-pointer rounded-none",
          isDragging
            ? "border-[#ea580c] bg-[#ea580c]/5 scale-[1.01]"
            : hasFile
              ? "border-border bg-foreground/[0.01] cursor-default"
              : "border-border bg-card hover:border-foreground/20"
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
            <div className="w-10 h-10 border border-[#ea580c]/30 bg-[#ea580c]/5 flex items-center justify-center rounded-none">
              <div className="w-4 h-4 border-2 border-[#ea580c] border-t-transparent animate-spin" />
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Parsing file...</p>
          </div>
        ) : hasFile ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border border-emerald-400/30 bg-emerald-400/5 flex items-center justify-center rounded-none">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">{fileName}</p>
              {resumeWordCount && (
                <p className="text-[10px] text-muted-foreground mt-0.5 font-bold">
                  {resumeWordCount} WORDS EXTRACTED
                </p>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border bg-card text-muted-foreground hover:text-red-400 hover:border-red-400 transition-colors text-[10px] font-bold uppercase tracking-wider rounded-none cursor-pointer mt-1"
            >
              <X className="w-3.5 h-3.5" />
              Remove File
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border border-border bg-foreground/5 flex items-center justify-center rounded-none">
              <Upload className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground uppercase tracking-wider">
                Drop your <span className="text-[#ea580c]">{accept}</span> file here
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">or click to browse local folders</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 font-bold uppercase tracking-wider px-1">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
