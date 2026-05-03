"use client";

import { useState } from "react";
import {
  Send,
  CheckSquare,
  Square,
  Pencil,
  Eye,
  CheckCircle2,
  AlertCircle,
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
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between rounded-xl bg-bg-surface border border-border-default px-5 py-3">
        <span className="text-sm text-text-secondary">
          <span className="text-text-primary font-semibold">{selectedCount}</span> of{" "}
          <span className="text-text-primary font-semibold">{readyEmails.length}</span>{" "}
          emails selected for sending
        </span>
        <button
          onClick={onSend}
          disabled={selectedCount === 0}
          className="px-5 py-2 rounded-xl bg-accent-primary hover:bg-accent-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-all flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          Send Selected ({selectedCount})
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border-default bg-bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default text-left text-text-muted text-xs uppercase tracking-wider">
                <th className="px-4 py-3 w-10">
                  <button onClick={toggleAll} className="text-text-muted hover:text-text-primary transition-colors">
                    {allSelected ? (
                      <CheckSquare className="w-4 h-4 text-accent-primary" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Email To</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {emails.map((email, idx) => (
                <tr
                  key={email.companyId}
                  className={`transition-colors ${email.status === "ready"
                      ? "hover:bg-bg-elevated/50"
                      : "opacity-50"
                    }`}
                >
                  <td className="px-4 py-3">
                    {email.status === "ready" && (
                      <button
                        onClick={() => toggleOne(email.companyId)}
                        className="text-text-muted hover:text-text-primary transition-colors"
                      >
                        {email.selected ? (
                          <CheckSquare className="w-4 h-4 text-accent-primary" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-text-primary">
                    {email.company}
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    {email.role}
                  </td>
                  <td className="px-4 py-3 text-text-secondary font-mono text-xs">
                    {email.contactEmail}
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs max-w-[200px] truncate">
                    {email.subject || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {email.status === "ready" ? (
                      <span className="flex items-center gap-1 text-xs text-success">
                        <CheckCircle2 className="w-3 h-3" /> Ready
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-error">
                        <AlertCircle className="w-3 h-3" /> Failed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {email.status === "ready" && (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingIndex(idx)}
                          className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setPreviewIndex(idx)}
                          className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
                          title="Preview"
                        >
                          <Eye className="w-3.5 h-3.5" />
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
      {editingIndex !== null && (
        <EmailEditModal
          email={emails[editingIndex]}
          mode="edit"
          onSave={(subject, body) => handleSave(editingIndex, subject, body)}
          onClose={() => setEditingIndex(null)}
        />
      )}

      {/* Preview Modal */}
      {previewIndex !== null && (
        <EmailEditModal
          email={emails[previewIndex]}
          mode="preview"
          onClose={() => setPreviewIndex(null)}
        />
      )}
    </div>
  );
}
