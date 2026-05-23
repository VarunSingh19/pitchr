"use client";

import { Building2, Edit2, Trash2, AlertTriangle } from "lucide-react";
import type { Lead } from "@/lib/types";

interface CompanyTableProps {
  leads: Lead[];
  alreadySent?: Set<string>;
  invalidEmails?: Set<string>;
  onEdit?: (lead: Lead) => void;
  onDelete?: (lead: Lead) => void;
}

export function CompanyTable({ leads, alreadySent, invalidEmails, onEdit, onDelete }: CompanyTableProps) {
  return (
    <div className="border-2 border-border bg-card overflow-hidden rounded-none font-mono text-xs">
      {/* Header */}
      <div className="px-5 py-4 border-b-2 border-border flex items-center justify-between bg-foreground/[0.02]">
        <div className="flex items-center gap-2 font-bold text-foreground uppercase tracking-wider">
          <Building2 className="w-4 h-4 text-[#ea580c]" />
          Outbound Target Leads
        </div>
        <span className="px-2 py-0.5 border border-[#ea580c]/30 bg-[#ea580c]/5 text-[#ea580c] text-[10px] font-bold uppercase tracking-wider">
          {leads.length} loaded
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-[9px] font-bold uppercase tracking-wider">
              <th className="px-5 py-3.5">Company</th>
              <th className="px-5 py-3.5">Role</th>
              <th className="px-5 py-3.5">Email</th>
              <th className="px-5 py-3.5">Stack</th>
              <th className="px-5 py-3.5">Fit Score</th>
              <th className="px-5 py-3.5">MX Route</th>
              {(onEdit || onDelete) && <th className="px-5 py-3.5 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {leads.slice(0, 50).map((lead, idx) => {
              const wasSent = alreadySent?.has(lead.contact_email?.toLowerCase());
              const isInvalid = invalidEmails?.has(lead.contact_email?.toLowerCase());

              return (
                <tr
                  key={lead.id ?? idx}
                  className={`transition-colors ${
                    isInvalid
                      ? "bg-red-500/5 hover:bg-red-500/10"
                      : wasSent
                        ? "bg-amber-500/5 hover:bg-amber-500/10"
                        : "hover:bg-foreground/[0.01]"
                  }`}
                >
                  <td className="px-5 py-3.5 font-bold text-foreground uppercase tracking-wide">
                    {lead.company}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{lead.role}</td>
                  <td className="px-5 py-3.5 text-muted-foreground font-mono text-xs select-all">
                    {lead.contact_email}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(lead.stack) ? lead.stack : [lead.stack])
                        .filter(Boolean)
                        .slice(0, 3)
                        .map((tech) => (
                          <span
                            key={String(tech)}
                            className="px-1.5 py-0.5 text-[9px] font-bold bg-foreground/5 text-muted-foreground border border-border rounded-none uppercase tracking-wider"
                          >
                            {String(tech)}
                          </span>
                        ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        String(lead.fit_score).toLowerCase().includes("high")
                          ? "text-emerald-400"
                          : String(lead.fit_score).toLowerCase().includes("medium")
                            ? "text-amber-500"
                            : "text-muted-foreground"
                      }`}
                    >
                      {lead.fit_score || "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {isInvalid ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-red-500/20 bg-red-500/5 text-red-400 text-[8px] font-bold uppercase tracking-wider rounded-none">
                        <AlertTriangle className="w-3 h-3" />
                        Invalid MX
                      </span>
                    ) : wasSent ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-amber-500/20 bg-amber-500/5 text-amber-500 text-[8px] font-bold uppercase tracking-wider rounded-none">
                        <AlertTriangle className="w-3 h-3" />
                        Sent Previously
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-emerald-400/20 bg-emerald-400/5 text-emerald-400 text-[8px] font-bold uppercase tracking-wider rounded-none">
                        Uncontacted
                      </span>
                    )}
                  </td>
                  {(onEdit || onDelete) && (
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(lead)}
                            className="p-1.5 border border-border bg-card text-muted-foreground hover:text-[#ea580c] hover:border-[#ea580c] transition-colors rounded-none cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(lead)}
                            className="p-1.5 border border-border bg-card text-muted-foreground hover:text-red-400 hover:border-red-400 transition-colors rounded-none cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {leads.length > 50 && (
        <div className="px-5 py-3.5 border-t border-border text-[10px] text-muted-foreground text-center font-bold uppercase tracking-wider bg-foreground/[0.01]">
          Truncated view: showing 50 of {leads.length} companies
        </div>
      )}
    </div>
  );
}
