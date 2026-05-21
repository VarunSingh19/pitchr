"use client";

import { useEffect, useState } from "react";
import { Ban, Search, Trash2, Plus, Loader2, AlertCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BlacklistItem {
  _id: string;
  domainOrEmail: string;
  addedBy: string;
  reason?: string;
  createdAt: string;
}

export default function AdminBlacklistPage() {
  const [blacklist, setBlacklist] = useState<BlacklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Form State
  const [domainOrEmail, setDomainOrEmail] = useState("");
  const [reason, setReason] = useState("");
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchBlacklist = async () => {
    try {
      const res = await fetch("/api/admin/blacklist");
      if (res.ok) {
        const data = await res.json();
        setBlacklist(data.blacklist || []);
      }
    } catch (error) {
      console.error("Failed to fetch blacklist:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlacklist();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!domainOrEmail.trim()) {
      setFormError("Domain or email address is required");
      return;
    }

    setAdding(true);
    try {
      const res = await fetch("/api/admin/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domainOrEmail: domainOrEmail.trim(),
          reason: reason.trim(),
        }),
      });

      if (res.ok) {
        setDomainOrEmail("");
        setReason("");
        await fetchBlacklist();
      } else {
        const err = await res.json().catch(() => ({}));
        setFormError(err.error || "Failed to add domain/email to blacklist");
      }
    } catch {
      setFormError("Failed to make the request");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string, domainOrEmail: string) => {
    if (!confirm(`Are you sure you want to remove "${domainOrEmail}" from the system blacklist?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/blacklist?id=${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        await fetchBlacklist();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to delete item");
      }
    } catch {
      alert("Failed to delete item");
    }
  };

  const filteredItems = blacklist.filter((item) =>
    item.domainOrEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.reason || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-1">System-Wide Blacklist</h1>
        <p className="text-text-secondary text-sm">
          Define email addresses or domains that users are globally blocked from sending emails to
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 items-start">
        {/* Add Entry Card */}
        <div className="md:col-span-1 rounded-2xl border border-border-default bg-bg-surface p-5 space-y-4">
          <div>
            <h3 className="font-bold text-text-primary">Add Blocker</h3>
            <p className="text-xs text-text-muted mt-0.5">
              Blocked records will be automatically skipped during campaign generation.
            </p>
          </div>

          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted">Domain or Email</label>
              <input
                type="text"
                placeholder="e.g. competitor.com or spam@target.com"
                value={domainOrEmail}
                onChange={(e) => setDomainOrEmail(e.target.value)}
                className="w-full bg-bg-base border border-border-default focus:border-orange-500/50 rounded-xl px-3.5 py-2 text-sm outline-none font-medium transition-colors placeholder:text-text-faint"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted">Reason / Note</label>
              <textarea
                placeholder="Why is this domain or email blocked?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full bg-bg-base border border-border-default focus:border-orange-500/50 rounded-xl px-3.5 py-2 text-sm outline-none font-medium transition-colors placeholder:text-text-faint resize-none"
              />
            </div>

            {formError && (
              <div className="rounded-xl bg-error-dim border border-error/20 p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
                <p className="text-xs text-error font-medium leading-relaxed">{formError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={adding}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-orange-500/10 active:scale-[0.98]"
            >
              {adding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Add Blocker</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* List Card */}
        <div className="md:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint" />
            <input
              type="text"
              placeholder="Search blacklisted domains or emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-surface border border-border-default focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-text-faint shadow-sm"
            />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border-default bg-bg-surface shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-text-muted">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500 mr-2" />
                <span>Loading blacklist records...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-16 p-6">
                <Ban className="w-12 h-12 text-text-faint mx-auto mb-3" />
                <p className="text-sm font-medium text-text-secondary">No blacklisted items found</p>
                <p className="text-xs text-text-faint mt-1">
                  {searchQuery ? "Try refining your search query" : "Active blocked items will appear here."}
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-default text-xs font-semibold text-text-muted bg-bg-base/40">
                    <th className="p-4 pl-6">Domain / Email Address</th>
                    <th className="p-4">Reason</th>
                    <th className="p-4">Blocked By</th>
                    <th className="p-4">Added On</th>
                    <th className="p-4 pr-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default text-sm">
                  {filteredItems.map((item) => (
                    <tr key={item._id} className="hover:bg-bg-base/20 transition-colors">
                      <td className="p-4 pl-6 font-semibold font-mono text-xs text-text-primary">
                        {item.domainOrEmail}
                      </td>
                      <td className="p-4 text-xs text-text-secondary max-w-xs truncate" title={item.reason}>
                        {item.reason || <span className="text-text-faint">No reason specified</span>}
                      </td>
                      <td className="p-4 text-xs text-text-muted font-medium">
                        {item.addedBy}
                      </td>
                      <td className="p-4 text-xs text-text-faint font-mono">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <button
                          onClick={() => handleDelete(item._id, item.domainOrEmail)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-error hover:bg-error/10 transition-colors"
                          title="Remove block"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
