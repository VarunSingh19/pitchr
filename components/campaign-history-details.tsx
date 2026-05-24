"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, Eye, Search, Filter, Mail, Building2, User, ChevronRight, MessageSquareCode } from "lucide-react";
import { EmailEditModal } from "@/components/email-edit-modal";
import type { GeneratedEmail } from "@/lib/types";

interface LogEntry {
  _id: string;
  recipientEmail: string;
  companyName: string;
  role?: string;
  subject: string;
  body: string;
  status: string;
  error?: string;
  generationError?: string;
  messageId?: string;
  updatedAt: string;
}

interface CampaignHistoryDetailsProps {
  logs: LogEntry[];
}

export function CampaignHistoryDetails({ logs }: CampaignHistoryDetailsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [previewEmail, setPreviewEmail] = useState<GeneratedEmail | null>(null);

  // Filter logs based on search and status
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.recipientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.subject.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "SENT" && log.status === "SENT") ||
      (statusFilter === "FAILED" && log.status === "FAILED") ||
      (statusFilter === "BOUNCED" && log.status === "BOUNCED") ||
      (statusFilter === "QUEUED" && ["QUEUED", "SENDING", "GENERATED"].includes(log.status));

    return matchesSearch && matchesStatus;
  });

  const handleOpenPreview = (log: LogEntry) => {
    // Map LogEntry to GeneratedEmail format for the modal
    const emailData: GeneratedEmail = {
      companyId: log._id,
      company: log.companyName,
      role: log.role || "Role",
      contactEmail: log.recipientEmail,
      subject: log.subject,
      body: log.body,
      status: log.status === "SENT" ? "ready" : "failed",
      error: log.error || log.generationError || undefined,
      selected: true,
    };
    setPreviewEmail(emailData);
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Search & Filters bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="FILTER BY COMPANY, RECIPIENT OR SUBJECT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-border bg-card text-foreground font-mono placeholder:text-muted-foreground/50 focus:border-[#ea580c] focus:outline-none transition-all rounded-none uppercase text-[10px] tracking-wider"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-muted-foreground hidden sm:inline" />
          {(["ALL", "SENT", "FAILED", "BOUNCED", "QUEUED"] as const).map((filter) => {
            const count = logs.filter((l) => {
              if (filter === "ALL") return true;
              if (filter === "SENT") return l.status === "SENT";
              if (filter === "FAILED") return l.status === "FAILED";
              if (filter === "BOUNCED") return l.status === "BOUNCED";
              return ["QUEUED", "SENDING", "GENERATED"].includes(l.status);
            }).length;

            const isSelected = statusFilter === filter;

            return (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-2 border-2 text-[9px] font-bold uppercase tracking-wider transition-all rounded-none cursor-pointer ${
                  isSelected
                    ? "border-[#ea580c] bg-[#ea580c] text-background font-black"
                    : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/20"
                }`}
              >
                {filter} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Main logs display - Table (Desktop) / Cards (Mobile) */}
      <div className="border-2 border-border bg-card rounded-none overflow-hidden">
        {/* Header telemetry info */}
        <div className="px-5 py-4 border-b-2 border-border flex items-center justify-between bg-foreground/[0.02]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <MessageSquareCode className="w-4 h-4 text-[#ea580c]" />
            Telemetry Outbox Log
          </span>
          <span className="text-[9px] font-bold px-2 py-0.5 border border-[#ea580c]/30 bg-[#ea580c]/5 text-[#ea580c] uppercase tracking-wider">
            Showing {filteredLogs.length} of {logs.length} entries
          </span>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-muted-foreground uppercase tracking-wider text-[9px] font-bold bg-foreground/[0.01]">
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Company</th>
                <th className="px-5 py-4">Recipient</th>
                <th className="px-5 py-4">Subject</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground italic uppercase tracking-wider">
                    No matching records located in this campaign outbox.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const statusColors = {
                    SENT: "border-emerald-400/20 bg-emerald-400/5 text-emerald-400",
                    FAILED: "border-red-500/20 bg-red-500/5 text-red-400",
                    BOUNCED: "border-amber-500/20 bg-amber-500/5 text-amber-500",
                    QUEUED: "border-[#ea580c]/20 bg-[#ea580c]/5 text-[#ea580c]",
                    SENDING: "border-[#ea580c]/20 bg-[#ea580c]/5 text-[#ea580c]",
                    GENERATED: "border-indigo-500/20 bg-indigo-500/5 text-indigo-400",
                  } as Record<string, string>;

                  return (
                    <tr key={log._id} className="hover:bg-foreground/[0.01] transition-all group">
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 border text-[9px] font-bold uppercase tracking-wider rounded-none ${
                          statusColors[log.status] || "border-border text-muted-foreground"
                        }`}>
                          {log.status === "SENT" && <CheckCircle2 className="w-3 h-3" />}
                          {["FAILED", "BOUNCED"].includes(log.status) && <AlertCircle className="w-3 h-3" />}
                          {log.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-foreground truncate max-w-[150px] uppercase tracking-wide">
                          {log.companyName}
                        </div>
                        <div className="text-[9px] text-muted-foreground mt-0.5 uppercase">
                          {log.role || "Role unspecified"}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono select-all text-muted-foreground">
                        {log.recipientEmail}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground max-w-[200px] truncate" title={log.subject}>
                        {log.subject}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleOpenPreview(log)}
                          className="px-3 py-1.5 border border-border bg-card hover:border-[#ea580c] hover:text-[#ea580c] text-muted-foreground inline-flex items-center gap-1.5 transition-all rounded-none cursor-pointer font-bold uppercase tracking-widest text-[9px]"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="block md:hidden p-4 space-y-4 bg-foreground/[0.01]">
          {filteredLogs.length === 0 ? (
            <div className="border-2 border-dashed border-border p-8 text-center text-muted-foreground italic uppercase tracking-wider bg-card">
              No matching records located in this campaign outbox.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const statusColors = {
                SENT: "border-emerald-400/20 bg-emerald-400/5 text-emerald-400",
                FAILED: "border-red-500/20 bg-red-500/5 text-red-400",
                BOUNCED: "border-amber-500/20 bg-amber-500/5 text-amber-500",
                QUEUED: "border-[#ea580c]/20 bg-[#ea580c]/5 text-[#ea580c]",
                SENDING: "border-[#ea580c]/20 bg-[#ea580c]/5 text-[#ea580c]",
                GENERATED: "border-indigo-500/20 bg-indigo-500/5 text-indigo-400",
              } as Record<string, string>;

              return (
                <div 
                  key={log._id} 
                  className="border-2 border-border bg-card p-4 space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.03)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.01)] hover:border-[#ea580c]/40 transition-all rounded-none"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-3">
                    <div className="min-w-0">
                      <div className="font-black text-foreground uppercase tracking-wide text-xs truncate">
                        {log.companyName}
                      </div>
                      <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5 flex items-center gap-1.5">
                        <User className="w-3 h-3 text-muted-foreground/60" />
                        {log.role || "Role unspecified"}
                      </div>
                    </div>

                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 border text-[9px] font-bold uppercase tracking-wider rounded-none shrink-0 ${
                      statusColors[log.status] || "border-border text-muted-foreground"
                    }`}>
                      {log.status === "SENT" && <CheckCircle2 className="w-2.5 h-2.5" />}
                      {["FAILED", "BOUNCED"].includes(log.status) && <AlertCircle className="w-2.5 h-2.5" />}
                      {log.status}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="space-y-2.5 py-1">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                      <div className="font-mono text-muted-foreground select-all truncate text-[10px] tracking-tight">
                        {log.recipientEmail}
                      </div>
                    </div>

                    <div className="text-[10px] text-muted-foreground flex items-start gap-1.5 leading-relaxed">
                      <span className="font-bold text-foreground shrink-0">SUBJ:</span> 
                      <span className="truncate text-muted-foreground/80" title={log.subject}>{log.subject}</span>
                    </div>
                  </div>

                  {/* Diagnostic / Error Message */}
                  {(log.error || log.generationError) && (
                    <div className="p-2.5 border border-red-500/25 bg-red-500/5 text-red-400 font-mono text-[9px] leading-relaxed break-words uppercase">
                      <span className="font-bold">TELEMETRY DIAGNOSTIC ERR:</span> {log.error || log.generationError}
                    </div>
                  )}

                  {/* Action Link */}
                  <button
                    onClick={() => handleOpenPreview(log)}
                    className="w-full py-2.5 border-2 border-border bg-card text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:border-[#ea580c] hover:text-[#ea580c] hover:bg-[#ea580c]/5 inline-flex items-center justify-center gap-1.5 transition-all rounded-none cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Inspect Generated Email
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Render the Preview Modal */}
      {previewEmail && (
        <EmailEditModal
          email={previewEmail}
          mode="preview"
          onClose={() => setPreviewEmail(null)}
        />
      )}
    </div>
  );
}
