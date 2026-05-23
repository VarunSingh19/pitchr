"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Send,
  CheckSquare,
  Square,
  Pencil,
  Eye,
  CheckCircle2,
  AlertCircle,
  Trash2,
  X,
} from "lucide-react";
import type { GeneratedEmail } from "@/lib/types";
import { EmailEditModal } from "./email-edit-modal";

interface EmailPreviewTableProps {
  emails: GeneratedEmail[];
  onEmailsChange: (emails: GeneratedEmail[]) => void;
  onSend: () => void;
}

export function EmailPreviewTable({
  emails,
  onEmailsChange,
  onSend,
}: EmailPreviewTableProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [deletingEmail, setDeletingEmail] = useState<GeneratedEmail | null>(null);

  const [mounted, setMounted] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  useEffect(() => setMounted(true), []);

  const confirmDelete = () => {
    if (deletingEmail) {
      onEmailsChange(emails.filter((e) => e.companyId !== deletingEmail.companyId));
      setDeletingEmail(null);
    }
  };

  const readyEmails = emails.filter((e) => e.status === "ready");
  const selectedCount = readyEmails.filter((e) => e.selected).length;
  const allSelected = readyEmails.length > 0 && readyEmails.every((e) => e.selected);

  const toggleAll = () => {
    const newSelected = !allSelected;
    onEmailsChange(
      emails.map((e) =>
        e.status === "ready" ? { ...e, selected: newSelected } : e
      )
    );
  };

  const toggleOne = (companyId: string | number) => {
    onEmailsChange(
      emails.map((e) =>
        e.companyId === companyId ? { ...e, selected: !e.selected } : e
      )
    );
  };

  const handleSave = (index: number, subject: string, body: string) => {
    onEmailsChange(
      emails.map((e, i) => (i === index ? { ...e, subject, body } : e))
    );
    setEditingIndex(null);
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Summary bar */}
      <div className="flex items-center justify-between border-2 border-border bg-card px-5 py-4 rounded-none">
        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wide">
          Selected: <span className="text-[#ea580c] font-black">{selectedCount}</span> /{" "}
          <span className="text-foreground">{readyEmails.length}</span> emails queued
        </span>
        <button
          onClick={onSend}
          disabled={selectedCount === 0}
          className="px-5 py-3 bg-foreground text-background text-xs font-bold uppercase tracking-widest hover:bg-[#ea580c] hover:text-background disabled:opacity-40 disabled:hover:bg-foreground disabled:hover:text-background transition-all flex items-center gap-2 rounded-none cursor-pointer"
        >
          <Send className="w-4 h-4" />
          Send Queue ({selectedCount})
        </button>
      </div>

      {/* Table */}
      <div className="border-2 border-border bg-card overflow-hidden rounded-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-border text-[9px] font-bold text-muted-foreground uppercase tracking-[0.15em] bg-foreground/[0.02]">
                <th className="px-4 py-3.5 w-10">
                  <button onClick={toggleAll} className="text-muted-foreground hover:text-foreground cursor-pointer">
                    {allSelected ? (
                      <CheckSquare className="w-4 h-4 text-[#ea580c]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3.5">Company</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Recipient</th>
                <th className="px-4 py-3.5">Subject</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {emails.map((email, idx) => (
                <tr
                  key={email.companyId}
                  className={`transition-colors ${email.status === "ready"
                      ? "hover:bg-foreground/[0.01]"
                      : "opacity-40"
                    }`}
                >
                  <td className="px-4 py-3">
                    {email.status === "ready" && (
                      <button
                        onClick={() => toggleOne(email.companyId)}
                        className="text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {email.selected ? (
                          <CheckSquare className="w-4 h-4 text-[#ea580c]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold text-foreground uppercase tracking-wide">
                    {email.company}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {email.role}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs select-all">
                    {email.contactEmail}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate" title={email.subject}>
                    {email.subject || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {email.status === "ready" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-emerald-400/20 bg-emerald-400/5 text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded-none">
                        Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-red-500/20 bg-red-500/5 text-red-400 text-[10px] font-bold uppercase tracking-wider rounded-none">
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {email.status === "ready" && (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditingIndex(idx)}
                          className="p-1.5 border border-border bg-card text-muted-foreground hover:text-[#ea580c] hover:border-[#ea580c] transition-colors rounded-none cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setPreviewIndex(idx)}
                          className="p-1.5 border border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/35 transition-colors rounded-none cursor-pointer"
                          title="Preview"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingEmail(email)}
                          className="p-1.5 border border-border bg-card text-muted-foreground hover:text-red-400 hover:border-red-400 transition-colors rounded-none cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingIndex !== null && mounted && createPortal(
        <EmailEditModal
          email={emails[editingIndex]}
          mode="edit"
          onSave={(subject, body) => handleSave(editingIndex, subject, body)}
          onClose={() => setEditingIndex(null)}
        />,
        document.body
      )}

      {/* Preview Modal */}
      {previewIndex !== null && mounted && createPortal(
        <EmailEditModal
          email={emails[previewIndex]}
          mode="preview"
          onClose={() => setPreviewIndex(null)}
        />,
        document.body
      )}

      {/* Delete Email Modal Overlay */}
      {deletingEmail && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border-2 border-border w-full max-w-sm overflow-hidden shadow-2xl flex flex-col rounded-none font-mono">
            <div className="p-6 text-center">
              <div className="w-10 h-10 border-2 border-red-500 bg-red-500/5 text-red-400 flex items-center justify-center mx-auto mb-4 rounded-none">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm uppercase tracking-wider text-foreground mb-2">Delete Email</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Remove the generated email for <span className="font-bold text-foreground uppercase">{deletingEmail.company}</span>?
              </p>
            </div>
            <div className="p-4 border-t-2 border-border bg-foreground/[0.01] flex items-center gap-3">
              <button
                onClick={() => setDeletingEmail(null)}
                className="flex-1 py-2.5 border-2 border-border hover:border-foreground/20 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-all cursor-pointer bg-card rounded-none"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 bg-red-500 text-white text-xs font-bold uppercase tracking-widest hover:bg-red-600 transition-all cursor-pointer rounded-none"
              >
                Delete Email
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
