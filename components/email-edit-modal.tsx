"use client";

import { useState, useRef, useEffect } from "react";
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

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [body]);

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl rounded-3xl border border-border-default bg-bg-surface shadow-2xl max-h-[90vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default">
          <div>
            <h3 className="text-base font-semibold">
              {mode === "edit" ? "Edit Email" : "Email Preview"}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {email.company} — {email.role}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* To */}
          <div>
            <label className="text-xs text-text-muted uppercase tracking-wider">To</label>
            <p className="text-sm text-text-secondary font-mono mt-1">
              {email.contactEmail}
              {email.altEmail && ` (CC: ${email.altEmail})`}
            </p>
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs text-text-muted uppercase tracking-wider">Subject</label>
            {mode === "edit" ? (
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full mt-1 px-4 py-2.5 rounded-xl bg-bg-base border border-border-default text-sm text-text-primary outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/30 transition-all"
              />
            ) : (
              <p className="text-sm text-text-primary font-medium mt-1">{subject}</p>
            )}
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-text-muted uppercase tracking-wider">Body</label>
              <span className="text-xs text-text-faint flex items-center gap-1">
                <Type className="w-3 h-3" />
                {wordCount} words
              </span>
            </div>
            {mode === "edit" ? (
              <textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full mt-1 px-4 py-3 rounded-xl bg-bg-base border border-border-default text-sm text-text-primary leading-relaxed outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/30 transition-all resize-none min-h-[200px]"
              />
            ) : (
              <div className="mt-1 px-4 py-3 rounded-xl bg-bg-base border border-border-default text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                {body}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-default flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-all"
          >
            {mode === "edit" ? "Cancel" : "Close"}
          </button>
          {mode === "edit" && onSave && (
            <button
              onClick={() => onSave(subject, body)}
              className="px-5 py-2 rounded-xl bg-accent-primary hover:bg-accent-primary-hover text-white text-sm font-medium transition-all"
            >
              Save Changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
