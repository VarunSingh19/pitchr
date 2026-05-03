"use client";

import { Building2 } from "lucide-react";
import type { Lead } from "@/lib/types";

interface CompanyTableProps {
  leads: Lead[];
}

export function CompanyTable({ leads }: CompanyTableProps) {
  return (
    <div className="rounded-2xl border border-border-default bg-bg-surface overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border-default flex items-center justify-between bg-bg-elevated/50">
        <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <Building2 className="w-4 h-4 text-accent-primary" />
          Companies
        </div>
        <span className="px-2.5 py-0.5 rounded-lg bg-accent-dim text-accent-primary text-xs font-semibold">
          {leads.length} loaded
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default text-left text-text-muted text-xs uppercase tracking-wider">
              <th className="px-5 py-3 font-medium">Company</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Stack</th>
              <th className="px-5 py-3 font-medium">Fit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {leads.slice(0, 50).map((lead, idx) => (
              <tr
                key={lead.id ?? idx}
                className="hover:bg-bg-elevated/50 transition-colors"
              >
                <td className="px-5 py-3 font-medium text-text-primary">
                  {lead.company}
                </td>
                <td className="px-5 py-3 text-text-secondary">{lead.role}</td>
                <td className="px-5 py-3 text-text-secondary font-mono text-xs">
                  {lead.contact_email}
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(Array.isArray(lead.stack) ? lead.stack : [lead.stack])
                      .filter(Boolean)
                      .slice(0, 3)
                      .map((tech) => (
                        <span
                          key={String(tech)}
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-bg-subtle text-text-muted border border-border-default"
                        >
                          {String(tech)}
                        </span>
                      ))}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`text-xs font-medium ${
                      String(lead.fit_score).toLowerCase().includes("high")
                        ? "text-success"
                        : String(lead.fit_score).toLowerCase().includes("medium")
                          ? "text-warning"
                          : "text-text-muted"
                    }`}
                  >
                    {lead.fit_score || "—"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {leads.length > 50 && (
        <div className="px-5 py-2 border-t border-border-default text-xs text-text-faint text-center">
          Showing 50 of {leads.length} companies
        </div>
      )}
    </div>
  );
}
