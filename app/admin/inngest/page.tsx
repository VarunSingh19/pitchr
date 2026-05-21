"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Zap,
  RefreshCw,
  Search,
  Filter,
  Trash2,
  Play,
  XOctagon,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Loader2,
  StopCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface InngestRun {
  id: string;
  functionId: string;
  status: string;
  event: string;
  error: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export default function InngestQueuePage() {
  const [runs, setRuns] = useState<InngestRun[]>([]);
  const [status, setStatus] = useState<"ONLINE" | "OFFLINE">("ONLINE");
  const [environment, setEnvironment] = useState<"development" | "production">("development");
  const [source, setSource] = useState<"orchestrator-api" | "database-mirror">("orchestrator-api");
  const [error, setError] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterFunction, setFilterFunction] = useState("ALL");
  
  // Track action states
  const [actionRunId, setActionRunId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchQueueData = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/inngest");
      if (!res.ok) {
        throw new Error(`Failed to load queue data (HTTP ${res.status})`);
      }
      const data = await res.json();
      
      setStatus(data.status);
      setEnvironment(data.environment);
      setSource(data.source || "orchestrator-api");
      setRuns(data.runs || []);
      setError(data.error || null);
    } catch (err) {
      setStatus("OFFLINE");
      setError(err instanceof Error ? err.message : "Inngest API is unreachable");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Poll for updates if autoRefresh is enabled
  useEffect(() => {
    fetchQueueData();
  }, [fetchQueueData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchQueueData(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchQueueData]);

  // Cancel individual run
  const handleCancelRun = async (runId: string) => {
    if (!confirm(`Are you sure you want to terminate Inngest run: ${runId}?`)) {
      return;
    }
    
    setActionRunId(runId);
    setNotification(null);
    
    try {
      const res = await fetch("/api/admin/inngest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel run");
      }
      
      setNotification({
        type: "success",
        text: `Run ${runId.slice(0, 8)}... terminated successfully.`,
      });
      await fetchQueueData(true);
    } catch (err) {
      setNotification({
        type: "error",
        text: err instanceof Error ? err.message : "Error cancelling run",
      });
    } finally {
      setActionRunId(null);
    }
  };

  // Bulk cancel all active runs
  const handleBulkCancel = async () => {
    const activeCount = runs.filter((r) =>
      ["Running", "Paused", "Retrying", "running", "paused", "retrying"].includes(r.status)
    ).length;
    
    if (activeCount === 0) {
      alert("No active runs to terminate.");
      return;
    }

    if (
      !confirm(
        `WARNING: You are about to abort all ${activeCount} active/pending jobs in this app. This might leave campaigns in an incomplete state. Proceed?`
      )
    ) {
      return;
    }

    setBulkLoading(true);
    setNotification(null);

    try {
      const res = await fetch("/api/admin/inngest", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed bulk cancellation");
      }

      const countMsg = data.cancelledCount !== undefined ? ` (${data.cancelledCount} runs)` : "";
      setNotification({
        type: "success",
        text: `Bulk termination triggered successfully${countMsg}!`,
      });
      await fetchQueueData(true);
    } catch (err) {
      setNotification({
        type: "error",
        text: err instanceof Error ? err.message : "Error executing bulk cancellation",
      });
    } finally {
      setBulkLoading(false);
    }
  };

  // Format age/time elapsed helper
  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
      
      if (seconds < 60) return "Just now";
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      return date.toLocaleDateString();
    } catch {
      return "Unknown";
    }
  };

  // Unique function ids list for filter selection
  const uniqueFunctions = Array.from(new Set(runs.map((r) => r.functionId).filter(Boolean)));

  // Filter runs based on search and selected filters
  const filteredRuns = runs.filter((run) => {
    const matchesSearch =
      (run.id && run.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (run.functionId && run.functionId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (run.event && run.event.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      filterStatus === "ALL" ||
      run.status.toUpperCase() === filterStatus.toUpperCase();

    const matchesFunction =
      filterFunction === "ALL" || run.functionId === filterFunction;

    return matchesSearch && matchesStatus && matchesFunction;
  });

  const activeJobs = runs.filter((r) =>
    ["Running", "Paused", "Retrying", "running", "paused", "retrying"].includes(r.status)
  );

  // Status Badge classes helper
  const getStatusBadge = (statusName: string) => {
    const s = statusName.toUpperCase();
    if (s === "RUNNING") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 border border-green-500/20 text-green-400">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Running
        </span>
      );
    }
    if (s === "PAUSED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Paused
        </span>
      );
    }
    if (s === "RETRYING") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400">
          <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
          Retrying
        </span>
      );
    }
    if (s === "COMPLETED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-bg-base border border-border-default text-text-muted">
          <CheckCircle2 className="w-3 h-3 text-text-faint" />
          Completed
        </span>
      );
    }
    if (s === "CANCELLED" || s === "CANCELED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-bg-base border border-border-default text-text-faint">
          <StopCircle className="w-3 h-3 text-text-faint" />
          Cancelled
        </span>
      );
    }
    // Default to Failed / Error
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400">
        <XOctagon className="w-3 h-3 text-red-400" />
        {statusName}
      </span>
    );
  };

  if (loading && !refreshing) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-text-muted space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <span className="text-sm font-medium">Connecting to Inngest Dev Server & Cloud APIs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <Zap className="w-6 h-6 text-orange-400" />
            Inngest Queue Monitor
          </h1>
          <p className="text-text-secondary text-sm">
            Monitor current task queues, active retries, and abort stuck background jobs.
            {source === "database-mirror" && (
              <span className="block text-[11px] text-blue-400 font-semibold mt-0.5">
                ℹ️ Showing synthetic queue data tracked in MongoDB (Inngest orchestrator fallback)
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-bg-surface border border-border-default rounded-xl px-3 py-1.5">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-border-default text-orange-500 bg-bg-base focus:ring-orange-500/30"
            />
            <label htmlFor="autoRefresh" className="text-xs font-semibold text-text-secondary select-none cursor-pointer">
              Auto Refresh (5s)
            </label>
          </div>

          <button
            onClick={() => fetchQueueData()}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-border-default bg-bg-surface hover:bg-bg-elevated transition-all text-text-muted hover:text-text-primary disabled:opacity-50"
            title="Refresh statistics now"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* System Status Indicators */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Card */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm space-y-2">
          <p className="text-xs font-bold text-text-faint uppercase tracking-wider">
            Connection Status
          </p>
          <div className="flex items-center justify-between">
            <span className={cn(
              "text-lg font-bold tracking-tight",
              status === "ONLINE" ? "text-green-400" : "text-red-400"
            )}>
              {status}
            </span>
            <div className={cn(
              "w-2.5 h-2.5 rounded-full",
              status === "ONLINE" ? "bg-green-400 animate-pulse" : "bg-red-400"
            )} />
          </div>
        </div>

        {/* Environment Card */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm space-y-2">
          <p className="text-xs font-bold text-text-faint uppercase tracking-wider">
            Active Orchestrator
          </p>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold tracking-tight text-text-primary capitalize">
              {source === "database-mirror" ? "DB Mirror" : environment}
            </span>
            <span className={cn(
              "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
              source === "database-mirror"
                ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                : environment === "development"
                  ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                  : "bg-orange-500/10 border border-orange-500/20 text-orange-400"
            )}>
              {source === "database-mirror" ? "DB Fallback" : environment === "development" ? "Dev Port 8288" : "Inngest Cloud"}
            </span>
          </div>
        </div>

        {/* Active Runs Count */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm space-y-2">
          <p className="text-xs font-bold text-text-faint uppercase tracking-wider">
            Active Tasks in Queue
          </p>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold tracking-tight text-orange-400">
              {activeJobs.length}
            </span>
            <span className="text-xs text-text-faint">
              of {runs.length} total runs
            </span>
          </div>
        </div>

        {/* Sync failures / Retries card */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm space-y-2">
          <p className="text-xs font-bold text-text-faint uppercase tracking-wider">
            Active Retries / Errors
          </p>
          <div className="flex items-center justify-between">
            <span className={cn(
              "text-lg font-bold tracking-tight",
              runs.filter((r) => r.status === "Retrying" || r.error).length > 0
                ? "text-red-400"
                : "text-text-muted"
            )}>
              {runs.filter((r) => r.status === "Retrying" || r.error).length}
            </span>
            {runs.filter((r) => r.status === "Retrying" || r.error).length > 0 && (
              <AlertTriangle className="w-4 h-4 text-red-400 animate-bounce" />
            )}
          </div>
        </div>
      </div>

      {/* Notifications banner */}
      {notification && (
        <div className={cn(
          "p-4 rounded-xl border text-sm flex items-start gap-3 animate-fade-in",
          notification.type === "success"
            ? "bg-green-500/10 border-green-500/20 text-green-400"
            : "bg-red-500/10 border-red-500/20 text-red-400"
        )}>
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-semibold">{notification.type === "success" ? "Success" : "Failed"}</p>
            <p className="text-xs opacity-90 mt-0.5 leading-relaxed">{notification.text}</p>
          </div>
        </div>
      )}

      {/* Offline message */}
      {status === "OFFLINE" && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 space-y-3">
          <div className="flex items-center gap-3">
            <XOctagon className="w-6 h-6 text-red-400 flex-shrink-0" />
            <h3 className="font-bold text-red-400">Orchestrator Unreachable</h3>
          </div>
          <p className="text-text-muted text-xs leading-relaxed max-w-2xl">
            Pitchr could not reach the Inngest local development server on port 8288, and no production 
            <strong className="font-mono text-text-primary px-1 select-all">INNGEST_SIGNING_KEY</strong> 
            variable was configured for Cloud API failover. Ensure your local dev runner is running via 
            <code className="font-mono bg-bg-base px-2 py-0.5 rounded border border-border-default ml-1">npx inngest-cli dev</code>.
          </p>
          {error && (
            <div className="bg-bg-base/50 p-3 rounded-xl border border-border-default/50 font-mono text-[10px] text-text-faint overflow-x-auto">
              Error Details: {error}
            </div>
          )}
        </div>
      )}

      {/* Search & Filters Controls */}
      <div className="rounded-2xl border border-border-default bg-bg-surface p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-text-faint absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by Run ID, Function ID, triggered event..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-bg-base border border-border-default focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none transition-all placeholder:text-text-faint"
            />
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-48 relative">
            <Filter className="w-3.5 h-3.5 text-text-faint absolute left-3 top-3.5 pointer-events-none" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-bg-base border border-border-default focus:border-orange-500/50 rounded-xl pl-8 pr-8 py-2.5 text-xs outline-none transition-all appearance-none cursor-pointer text-text-secondary hover:text-text-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="RUNNING">Running</option>
              <option value="PAUSED">Paused</option>
              <option value="RETRYING">Retrying</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {/* Function Filter */}
          <div className="w-full md:w-56 relative">
            <Filter className="w-3.5 h-3.5 text-text-faint absolute left-3 top-3.5 pointer-events-none" />
            <select
              value={filterFunction}
              onChange={(e) => setFilterFunction(e.target.value)}
              className="w-full bg-bg-base border border-border-default focus:border-orange-500/50 rounded-xl pl-8 pr-8 py-2.5 text-xs outline-none transition-all appearance-none cursor-pointer text-text-secondary hover:text-text-primary"
            >
              <option value="ALL">All Functions</option>
              {uniqueFunctions.map((fn) => (
                <option key={fn} value={fn}>
                  {fn}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bulk Cancellation Bar */}
        {activeJobs.length > 0 && (
          <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-2">
              <StopCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-xs text-text-secondary">
                Admins can terminate all active queue runs at once to clear stuck background workflows.
              </span>
            </div>
            <button
              onClick={handleBulkCancel}
              disabled={bulkLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all disabled:opacity-40 shadow-sm active:scale-[0.98] cursor-pointer"
            >
              {bulkLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>Bulk Terminate {activeJobs.length} Active Runs</span>
            </button>
          </div>
        )}
      </div>

      {/* Queue Job Table */}
      <div className="rounded-2xl border border-border-default bg-bg-surface overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-default bg-bg-base/30 text-text-faint text-[10px] font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Background Function</th>
                <th className="px-6 py-4">Run ID / Trigger Event</th>
                <th className="px-6 py-4">Triggered</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default text-xs text-text-secondary">
              {filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-text-faint font-medium">
                    No matching background runs found in the current Inngest log pool.
                  </td>
                </tr>
              ) : (
                filteredRuns.map((run) => {
                  const isCancelable = ["Running", "Paused", "Retrying", "running", "paused", "retrying"].includes(run.status);
                  const isDoingAction = actionRunId === run.id;

                  return (
                    <tr key={run.id} className="hover:bg-bg-elevated/40 transition-colors group">
                      <td className="px-6 py-4.5">
                        <div className="font-semibold text-text-primary flex items-center gap-2">
                          <code className="text-[11px] font-mono bg-bg-base px-2 py-0.5 rounded border border-border-default">
                            {run.functionId}
                          </code>
                        </div>
                      </td>
                      <td className="px-6 py-4.5 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-text-muted font-medium select-all">
                            {run.id}
                          </span>
                          {environment === "development" && (
                            <a
                              href={`http://localhost:8288/functions/${run.functionId}/${run.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-text-faint hover:text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Inspect run in Inngest Dev Console"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <div className="text-[10px] text-text-faint font-mono">
                          Event: {run.event}
                        </div>
                        {run.error && (
                          <p className="text-[10px] text-red-400/90 font-mono mt-1 max-w-sm line-clamp-1 truncate" title={run.error}>
                            Err: {run.error}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4.5 text-text-muted whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-text-faint" />
                          {formatTimeAgo(run.createdAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        {getStatusBadge(run.status)}
                      </td>
                      <td className="px-6 py-4.5 text-right whitespace-nowrap">
                        {isCancelable ? (
                          <button
                            onClick={() => handleCancelRun(run.id)}
                            disabled={isDoingAction}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/20 hover:border-red-500 bg-red-500/5 hover:bg-red-500 text-red-400 hover:text-white transition-all text-xs font-semibold disabled:opacity-40 active:scale-[0.98] cursor-pointer"
                          >
                            {isDoingAction ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <StopCircle className="w-3 h-3" />
                            )}
                            <span>Terminate</span>
                          </button>
                        ) : (
                          <span className="text-text-faint text-[10px] italic px-2">No Actions</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
