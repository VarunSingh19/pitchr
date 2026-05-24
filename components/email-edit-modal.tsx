"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Type } from "lucide-react";
import type { GeneratedEmail } from "@/lib/types";

interface EmailEditModalProps {
  email: GeneratedEmail;
  mode: "edit" | "preview";
  onSave?: (subject: string, body: string) => void;
  onClose: () => void;
}

export function EmailEditModal({
  email,
  mode,
  onSave,
  onClose,
}: EmailEditModalProps) {
  const [subject, setSubject] = useState(email.subject);
  const [body, setBody] = useState(email.body);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mounted, setMounted] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [body]);

  // Handle client mount and lock scrolling
  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in font-mono text-xs">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-transparent"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl border-2 border-border bg-card shadow-2xl max-h-[90vh] flex flex-col animate-fade-in rounded-none">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-border bg-foreground/[0.02]">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              {mode === "edit" ? "Edit Email Template" : "Email Preview Mode"}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase font-bold tracking-wide">
              {email.company} — {email.role}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 border border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors rounded-none cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* To */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Recipient</label>
            <p className="text-xs font-bold text-foreground font-mono mt-1">
              {email.contactEmail}
              {email.altEmail && ` (CC: ${email.altEmail})`}
            </p>
          </div>

          {/* Subject */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Subject Line</label>
            {mode === "edit" ? (
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full mt-1.5 px-4 py-3 border-2 border-border bg-foreground/[0.01] text-xs text-foreground focus:border-[#ea580c] focus:outline-none transition-all rounded-none font-mono"
              />
            ) : (
              <p className="text-xs font-bold text-foreground mt-1.5">{subject}</p>
            )}
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Email Body</label>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                <Type className="w-3.5 h-3.5" />
                {wordCount} words
              </span>
            </div>
            {mode === "edit" ? (
              <textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full mt-1.5 px-4 py-3 border-2 border-border bg-foreground/[0.01] text-xs text-foreground leading-relaxed focus:border-[#ea580c] focus:outline-none transition-all resize-none min-h-[200px] font-mono rounded-none"
              />
            ) : (
              <div className="mt-1.5 px-4 py-3 border-2 border-border bg-foreground/[0.01] text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap font-sans">
                {body}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t-2 border-border flex items-center justify-end gap-3 bg-foreground/[0.01]">
          <button
            onClick={onClose}
            className="px-5 py-3 border-2 border-border hover:border-foreground/20 text-xs font-bold uppercase tracking-widest text-muted-foreground bg-card transition-all rounded-none cursor-pointer"
          >
            {mode === "edit" ? "Cancel" : "Close"}
          </button>
          {mode === "edit" && onSave && (
            <button
              onClick={() => onSave(subject, body)}
              className="px-6 py-3 bg-foreground text-background text-xs font-bold uppercase tracking-widest hover:bg-[#ea580c] hover:text-background transition-all rounded-none cursor-pointer"
            >
              Save Template Changes
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
