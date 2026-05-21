"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Mail,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Eye,
  FileSpreadsheet,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CampaignStats {
  totalCampaigns: number;
  statusBreakdown: Record<string, number>;
  emails: {
    total: number;
    sent: number;
    bounced: number;
    replied: number;
    failed: number;
  };
}

interface DomainStats {
  total: number;
  sent: number;
  bounced: number;
  replied: number;
  failed: number;
}

interface CampaignRecord {
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
  createdAt: string;
}

export default function AdminCampaignsPage() {
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [domainBreakdown, setDomainBreakdown] = useState<Record<string, DomainStats> | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        search: searchQuery,
        status: statusFilter,
      });

      const res = await fetch(`/api/admin/campaigns?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setDomainBreakdown(data.domainBreakdown);
        setCampaigns(data.campaigns || []);
        setTotalPages(data.pagination.totalPages || 1);
        setTotalCount(data.pagination.totalCount || 0);
      }
    } catch (error) {
      console.error("Failed to fetch campaigns statistics:", error);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, statusFilter]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Reset pagination when filter or search changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

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

  // Helper metrics calculations
  const totalAttempted = stats ? stats.emails.sent + stats.emails.bounced : 0;
  const deliveryRate = totalAttempted > 0 ? Math.round((stats!.emails.sent / totalAttempted) * 100) : 100;
  const bounceRate = totalAttempted > 0 ? Math.round((stats!.emails.bounced / totalAttempted) * 100) : 0;
  const replyRate = stats && stats.emails.sent > 0 ? Math.round((stats.emails.replied / stats.emails.sent) * 100) : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-1">Global Campaigns Monitor</h1>
        <p className="text-text-secondary text-sm">
          Platform outreach pipeline, delivery statistics, and email provider performance (last 30 days)
        </p>
      </div>

      {/* Delivery KPIs Grid */}
      {stats && (
        <div className="grid sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border-default bg-bg-surface p-5 hover:shadow-lg transition-all duration-300">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Total Campaigns</p>
            <p className="text-3xl font-extrabold text-text-primary mt-1.5">{stats.totalCampaigns}</p>
            <div className="flex items-center gap-2 mt-2.5 text-[11px] text-text-faint">
              <span className="text-green-400 font-bold">{stats.statusBreakdown.COMPLETED || 0} completed</span>
              <span>•</span>
              <span className="text-amber-400 font-bold">{stats.statusBreakdown.SENDING || 0} active</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border-default bg-bg-surface p-5 hover:shadow-lg transition-all duration-300">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Delivery Success Rate</p>
            <p className="text-3xl font-extrabold text-green-400 mt-1.5">{deliveryRate}%</p>
            <div className="w-full bg-bg-base h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-green-400 h-full rounded-full" style={{ width: `${deliveryRate}%` }} />
            </div>
            <p className="text-[10px] text-text-faint mt-1.5">{stats.emails.sent} of {totalAttempted} delivered</p>
          </div>

          <div className="rounded-2xl border border-border-default bg-bg-surface p-5 hover:shadow-lg transition-all duration-300">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Overall Bounce Rate</p>
            <p className="text-3xl font-extrabold text-red-400 mt-1.5">{bounceRate}%</p>
            <div className="w-full bg-bg-base h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-red-400 h-full rounded-full" style={{ width: `${bounceRate}%` }} />
            </div>
            <p className="text-[10px] text-text-faint mt-1.5">{stats.emails.bounced} bounces detected</p>
          </div>

          <div className="rounded-2xl border border-border-default bg-bg-surface p-5 hover:shadow-lg transition-all duration-300">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Reply Engagement Rate</p>
            <p className="text-3xl font-extrabold text-blue-400 mt-1.5">{replyRate}%</p>
            <div className="w-full bg-bg-base h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-blue-400 h-full rounded-full" style={{ width: `${replyRate}%` }} />
            </div>
            <p className="text-[10px] text-text-faint mt-1.5">{stats.emails.replied} prospects replied</p>
          </div>
        </div>
      )}

      {/* Email Providers Breakdown */}
      {domainBreakdown && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-text-secondary flex items-center gap-2">
            <Layers className="w-4 h-4 text-orange-400" />
            Deliverability Breakdown by Target Domain
          </h3>
          <div className="grid sm:grid-cols-4 gap-4">
            {Object.entries(domainBreakdown).map(([provider, providerStats]) => {
              const pAttempted = providerStats.sent + providerStats.bounced;
              const pDeliveryRate = pAttempted > 0 ? Math.round((providerStats.sent / pAttempted) * 100) : 100;
              const pBounceRate = pAttempted > 0 ? Math.round((providerStats.bounced / pAttempted) * 100) : 0;
              const pReplyRate = providerStats.sent > 0 ? Math.round((providerStats.replied / providerStats.sent) * 100) : 0;

              return (
                <div
                  key={provider}
                  className="rounded-2xl border border-border-default bg-bg-surface p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-primary font-mono bg-bg-base border border-border-default px-2 py-0.5 rounded-lg">
                        {provider}
                      </span>
                      <span className="text-[10px] text-text-faint font-semibold">{providerStats.total} total</span>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted">Delivery Rate</span>
                        <span className="font-semibold text-green-400">{pDeliveryRate}%</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted">Bounce Rate</span>
                        <span className="font-semibold text-red-400">{pBounceRate}%</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted">Reply Rate</span>
                        <span className="font-semibold text-blue-400">{pReplyRate}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border-subtle mt-4 pt-3 flex items-center justify-between text-[10px] text-text-faint font-mono">
                    <span>Sent: {providerStats.sent}</span>
                    <span>Bounced: {providerStats.bounced}</span>
                    <span>Replies: {providerStats.replied}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Campaigns Registry Title */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-text-secondary flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-orange-400" />
          System-Wide Campaigns Registry
        </h3>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-bg-surface border border-border-default p-4 rounded-2xl shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint" />
            <input
              type="text"
              placeholder="Search campaigns by name, owner name or email..."
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
              <option value="DRAFT">Draft</option>
              <option value="GENERATING">Generating</option>
              <option value="READY">Ready</option>
              <option value="SENDING">Sending</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>

        {/* Registry Table */}
        <div className="overflow-x-auto rounded-2xl border border-border-default bg-bg-surface shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-text-muted">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500 mr-2" />
              <span>Fetching campaigns...</span>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-16 p-6">
              <Mail className="w-12 h-12 text-text-faint mx-auto mb-3" />
              <p className="text-sm font-medium text-text-secondary">No campaigns found</p>
              <p className="text-xs text-text-faint mt-1">
                {searchQuery || statusFilter ? "Try relaxing search query or filter" : "No campaigns have been run yet."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-default text-xs font-semibold text-text-muted bg-bg-base/40">
                  <th className="p-4 pl-6">Campaign Info</th>
                  <th className="p-4">Owner</th>
                  <th className="p-4">Leads</th>
                  <th className="p-4">Outcomes</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Run Date</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default text-sm">
                {campaigns.map((camp) => (
                  <tr key={camp._id} className="hover:bg-bg-base/20 transition-colors group">
                    <td className="p-4 pl-6">
                      <p className="font-semibold text-text-primary group-hover:text-orange-400 transition-colors">
                        {camp.name}
                      </p>
                      <p className="text-[10px] text-text-faint font-mono mt-0.5">ID: {camp._id}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {camp.userId?.image ? (
                          <img
                            src={camp.userId.image}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-bg-elevated border border-border-default flex items-center justify-center">
                            <UserIcon className="w-3.5 h-3.5 text-text-muted" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-xs text-text-muted">{camp.userId?.name || "Unknown User"}</p>
                          <p className="text-[10px] text-text-faint font-mono">{camp.userId?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-xs font-medium text-text-secondary">
                      {camp.totalLeads}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-xs text-text-muted">
                        <span className="text-green-400 font-semibold">{camp.sentCount} sent</span>
                        {camp.bouncedCount > 0 && (
                          <span className="text-red-400 font-semibold">• {camp.bouncedCount} bounced</span>
                        )}
                        {camp.failedCount > 0 && (
                          <span className="text-red-400 font-semibold">• {camp.failedCount} failed</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(camp.status)}
                    </td>
                    <td className="p-4 text-xs text-text-faint font-mono">
                      {new Date(camp.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <Link
                        href={`/admin/campaigns/${camp._id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-white rounded-xl text-xs font-semibold transition-all shadow-sm shadow-orange-500/10 active:scale-[0.98]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border-default pt-4 text-xs">
            <span className="text-text-muted font-medium">
              Showing page {page} of {totalPages} ({totalCount} campaigns)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 border border-border-default hover:bg-bg-elevated rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 border border-border-default hover:bg-bg-elevated rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
