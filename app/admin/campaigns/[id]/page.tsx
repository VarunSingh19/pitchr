"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Search,
  Eye,
  FileCode,
  User as UserIcon,
  X,
  Mail,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CampaignDetail {
  _id: string;
  name: string;
  userId: {
    name: string;
    email: string;
    image?: string;
  };
  totalLeads: number;
  sentCount: number;
  bouncedCount: number;
  failedCount: number;
  status: "DRAFT" | "GENERATING" | "READY" | "SENDING" | "COMPLETED" | "FAILED";
  autoSend: boolean;
  leads?: any[];
  createdAt: string;
  updatedAt: string;
}

interface EmailLogRecord {
  _id: string;
  companyName: string;
  role: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: "QUEUED" | "GENERATED" | "SENT" | "FAILED" | "BOUNCED" | "REPLIED";
  error?: string;
  generationError?: string;
  createdAt: string;
}

export default function AdminCampaignInspectorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [logs, setLogs] = useState<EmailLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // JSON Visualizer state
  const [jsonExpanded, setJsonExpanded] = useState(false);

  // Preview Modal state
  const [previewLog, setPreviewLog] = useState<EmailLogRecord | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCampaign(data.campaign);
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Failed to fetch campaign details:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCopyLeadsJson = () => {
    if (!campaign?.leads) return;
    navigator.clipboard.writeText(JSON.stringify(campaign.leads, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, React.ReactNode> = {
      DRAFT: (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-bg-base border border-border-default text-text-muted">
          <Clock className="w-3 h-3" /> Draft
        </span>
      ),
      GENERATING: (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400">
          <Loader2 className="w-3 h-3 animate-spin" /> Generating
        </span>
      ),
      READY: (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-400">
          <CheckCircle2 className="w-3 h-3" /> Ready
        </span>
      ),
      SENDING: (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <Loader2 className="w-3 h-3 animate-spin" /> Sending
        </span>
      ),
      COMPLETED: (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/10 border border-green-500/20 text-green-400">
          <CheckCircle2 className="w-3 h-3" /> Completed
        </span>
      ),
      FAILED: (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle className="w-3 h-3" /> Failed
        </span>
      ),
    };
    return badges[status] || <span>{status}</span>;
  };

  const getLogStatusBadge = (status: string) => {
    const badges: Record<string, React.ReactNode> = {
      QUEUED: (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-bg-base border border-border-default text-text-faint">
          Queued
        </span>
      ),
      GENERATED: (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-400">
          Draft Generated
        </span>
      ),
      SENT: (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/10 border border-green-500/20 text-green-400">
          Sent
        </span>
      ),
      FAILED: (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 border border-red-500/20 text-red-400">
          Failed
        </span>
      ),
      BOUNCED: (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-600/10 border border-red-600/20 text-red-500">
          Bounced
        </span>
      ),
      REPLIED: (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400">
          Replied
        </span>
      ),
    };
    return badges[status] || <span>{status}</span>;
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.recipientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "" || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-text-muted space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <span className="text-sm font-medium">Loading campaign details...</span>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-20 bg-bg-surface rounded-2xl border border-border-default space-y-4">
        <AlertCircle className="w-12 h-12 text-error mx-auto" />
        <h3 className="text-lg font-bold">Campaign Not Found</h3>
        <p className="text-text-secondary text-sm">The campaign you are looking for does not exist or has been deleted.</p>
        <Link
          href="/admin/campaigns"
          className="inline-flex items-center gap-2 text-sm text-orange-400 font-semibold hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Breadcrumb / Back button */}
      <div>
        <Link
          href="/admin/campaigns"
          className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors mb-4 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Campaigns</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">Campaign Inspector</h1>
            <p className="text-text-secondary text-sm">
              Detailed tracking, logs audit, and raw data for &quot;{campaign.name}&quot;
            </p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(campaign.status)}
            <span className="text-xs text-text-faint font-mono">Run: {new Date(campaign.createdAt).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Overview Metadata Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Campaign Info */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 space-y-3 shadow-sm">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Campaign Metadata</h3>
          <div className="space-y-2.5">
            <div>
              <p className="text-xs text-text-secondary">Campaign Name</p>
              <p className="text-sm font-semibold text-text-primary mt-0.5">{campaign.name}</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Database ID</p>
              <p className="text-xs font-mono text-text-faint mt-0.5 select-all">{campaign._id}</p>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary">Auto Send Enabled</span>
              <span className={cn("font-bold", campaign.autoSend ? "text-green-400" : "text-text-faint")}>
                {campaign.autoSend ? "Yes" : "No"}
              </span>
            </div>
          </div>
        </div>

        {/* Owner Info */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 space-y-3 shadow-sm">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Owner User Account</h3>
          <div className="flex items-center gap-3 py-1">
            {campaign.userId?.image ? (
              <img
                src={campaign.userId.image}
                alt=""
                className="w-10 h-10 rounded-xl object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-bg-elevated border border-border-default flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-text-muted" />
              </div>
            )}
            <div>
              <p className="font-semibold text-sm text-text-primary">{campaign.userId?.name || "Unknown User"}</p>
              <p className="text-xs font-mono text-text-muted mt-0.5">{campaign.userId?.email}</p>
            </div>
          </div>
          <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-xs">
            <span className="text-text-secondary">Admin Quotas Tier</span>
            <Link
              href={`/admin/users?search=${campaign.userId?.email || ""}`}
              className="text-orange-400 hover:underline font-semibold flex items-center gap-1"
            >
              <span>Manage Quotas</span>
            </Link>
          </div>
        </div>

        {/* Deliverability outcomes */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 space-y-3 shadow-sm">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Delivery Outcomes</h3>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-bg-base border border-border-default rounded-xl p-2.5">
              <p className="text-[10px] font-bold text-text-faint uppercase">Leads</p>
              <p className="text-lg font-bold text-text-primary mt-0.5">{campaign.totalLeads}</p>
            </div>
            <div className="bg-bg-base border border-border-default rounded-xl p-2.5">
              <p className="text-[10px] font-bold text-text-faint uppercase">Sent</p>
              <p className="text-lg font-bold text-green-400 mt-0.5">{campaign.sentCount}</p>
            </div>
            <div className="bg-bg-base border border-border-default rounded-xl p-2.5">
              <p className="text-[10px] font-bold text-text-faint uppercase">Bounces</p>
              <p className="text-lg font-bold text-red-500 mt-0.5">{campaign.bouncedCount}</p>
            </div>
            <div className="bg-bg-base border border-border-default rounded-xl p-2.5">
              <p className="text-[10px] font-bold text-text-faint uppercase">Failed</p>
              <p className="text-lg font-bold text-red-400 mt-0.5">{campaign.failedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Raw Leads JSON visualizer */}
      <div className="rounded-2xl border border-border-default bg-bg-surface overflow-hidden shadow-sm">
        <button
          onClick={() => setJsonExpanded(!jsonExpanded)}
          className="w-full flex items-center justify-between px-6 py-4 bg-bg-base/40 hover:bg-bg-base/80 border-b border-border-default transition-all"
        >
          <div className="flex items-center gap-2.5 text-sm font-bold text-text-primary">
            <FileCode className="w-4 h-4 text-orange-400" />
            <span>Raw Uploaded Companies JSON ({campaign.leads?.length || 0} items)</span>
          </div>
          <div className="flex items-center gap-3">
            {campaign.leads && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyLeadsJson();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border-default hover:bg-bg-elevated text-xs font-semibold text-text-secondary transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-green-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy JSON</span>
                  </>
                )}
              </button>
            )}
            {jsonExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </button>

        {jsonExpanded && (
          <div className="p-6 bg-bg-surface">
            {campaign.leads && campaign.leads.length > 0 ? (
              <pre className="max-h-[300px] overflow-y-auto text-xs font-mono text-text-muted bg-bg-base p-4 rounded-xl border border-border-default overflow-x-auto select-all leading-relaxed whitespace-pre-wrap">
                {JSON.stringify(campaign.leads, null, 2)}
              </pre>
            ) : (
              <p className="text-xs text-text-faint text-center py-4">No lead configuration data stored for this campaign</p>
            )}
          </div>
        )}
      </div>

      {/* Email Outcomes Table */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-text-secondary flex items-center gap-2">
          <Mail className="w-4 h-4 text-orange-400" />
          Individual Lead Generation & Delivery Logs
        </h3>

        {/* Table Filters */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-bg-surface border border-border-default p-4 rounded-2xl shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint" />
            <input
              type="text"
              placeholder="Search logs by company, role or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-base border border-border-default focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-text-faint"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-bg-base border border-border-default rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none cursor-pointer focus:border-orange-500/50 hover:bg-bg-elevated transition-colors"
            >
              <option value="">All Statuses</option>
              <option value="QUEUED">Queued</option>
              <option value="GENERATED">Draft Generated</option>
              <option value="SENT">Sent</option>
              <option value="FAILED">Failed</option>
              <option value="BOUNCED">Bounced</option>
              <option value="REPLIED">Replied</option>
            </select>
          </div>
        </div>

        {/* Table Logs */}
        <div className="overflow-x-auto rounded-2xl border border-border-default bg-bg-surface shadow-sm">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-16 p-6">
              <Mail className="w-12 h-12 text-text-faint mx-auto mb-3" />
              <p className="text-sm font-medium text-text-secondary">No log records match filters</p>
              <p className="text-xs text-text-faint mt-1">Try resetting search query or status filter</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-default text-xs font-semibold text-text-muted bg-bg-base/40">
                  <th className="p-4 pl-6">Company</th>
                  <th className="p-4">Target Contact</th>
                  <th className="p-4">Delivery Status</th>
                  <th className="p-4">Details / Errors</th>
                  <th className="p-4">Created On</th>
                  <th className="p-4 pr-6 text-right">Inspect Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default text-sm">
                {filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-bg-base/20 transition-colors">
                    <td className="p-4 pl-6">
                      <p className="font-semibold text-text-primary">{log.companyName}</p>
                      <p className="text-[10px] text-text-faint mt-0.5">{log.role}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-mono text-xs text-text-muted">{log.recipientEmail}</p>
                    </td>
                    <td className="p-4">
                      {getLogStatusBadge(log.status)}
                    </td>
                    <td className="p-4">
                      {log.status === "FAILED" && (
                        <p className="text-xs text-red-400 font-medium max-w-xs break-words" title={log.error || log.generationError}>
                          {log.error || log.generationError || "Unknown processing error"}
                        </p>
                      )}
                      {log.status === "BOUNCED" && (
                        <p className="text-xs text-red-500 font-medium max-w-xs break-words">
                          {log.error || "SMTP Mail Delivery Bounce-back"}
                        </p>
                      )}
                      {log.status === "SENT" && (
                        <p className="text-xs text-text-faint font-medium">Delivered to recipient mail server</p>
                      )}
                      {log.status === "REPLIED" && (
                        <p className="text-xs text-blue-400 font-semibold">User received thread reply</p>
                      )}
                      {log.status === "GENERATED" && (
                        <p className="text-xs text-purple-400 font-medium">Draft complete, awaiting manual send</p>
                      )}
                      {log.status === "QUEUED" && (
                        <p className="text-xs text-text-faint">In generation queue</p>
                      )}
                    </td>
                    <td className="p-4 text-xs text-text-faint font-mono">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      {["GENERATED", "SENT", "REPLIED", "BOUNCED"].includes(log.status) ? (
                        <button
                          onClick={() => setPreviewLog(log)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-bg-base hover:bg-bg-elevated border border-border-default rounded-xl text-xs font-semibold text-text-secondary transition-all"
                          title="View message payload"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      ) : (
                        <span className="text-xs text-text-faint font-medium">Unavailable</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Log Message Viewer Modal Overlay */}
      {previewLog && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-bg-surface border border-border-default rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border-default">
              <div>
                <h3 className="text-lg font-bold text-text-primary">Email Draft Inspector</h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Generated for {previewLog.companyName} ({previewLog.role})
                </p>
              </div>
              <button
                onClick={() => setPreviewLog(null)}
                className="p-1.5 rounded-xl hover:bg-bg-elevated text-text-faint hover:text-text-muted transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-sm">
              <div className="space-y-2 border border-border-default bg-bg-base p-4 rounded-xl">
                <div className="flex border-b border-border-subtle/40 pb-2">
                  <span className="w-16 font-semibold text-text-faint text-xs">To:</span>
                  <span className="font-mono text-xs text-text-muted select-all">{previewLog.recipientEmail}</span>
                </div>
                <div className="flex pt-1">
                  <span className="w-16 font-semibold text-text-faint text-xs">Subject:</span>
                  <span className="font-semibold text-xs text-text-primary select-all">{previewLog.subject}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-faint uppercase tracking-wider">Email Body</label>
                <div className="bg-bg-base border border-border-default p-4 rounded-xl min-h-[200px] whitespace-pre-wrap font-sans text-xs text-text-muted leading-relaxed select-all overflow-y-auto">
                  {previewLog.body}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end px-6 py-4 border-t border-border-default bg-bg-base/40">
              <button
                onClick={() => setPreviewLog(null)}
                className="px-5 py-2 bg-orange-500 hover:bg-orange-400 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-orange-500/10 active:scale-[0.98]"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
