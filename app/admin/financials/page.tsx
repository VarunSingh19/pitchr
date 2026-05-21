"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Coins,
  TrendingUp,
  BarChart3,
  Key,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Power,
  PowerOff,
  Clock,
  Activity,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SUPPORTED_MODELS } from "@/lib/models-config";

interface Totals {
  totalSpend: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
}

interface ModelStat {
  modelId: string;
  provider: string;
  totalSpend: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
}

interface DailySpend {
  date: string;
  spend: number;
  calls: number;
}

interface SystemKeyEntry {
  _id: string;
  provider: string;
  label: string;
  maskedKey: string;
  supportedModels: string[];
  isActive: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  rateLimitedUntil: string | null;
  consecutiveFailures: number;
  averageLatencyMs: number;
  lastError: string;
  latencyHistory: number[];
  createdAt: string;
}

interface FinancialsData {
  totals: Totals;
  byModel: ModelStat[];
  dailySpend: DailySpend[];
  keys: SystemKeyEntry[];
}

export default function AdminFinancialsPage() {
  const [data, setData] = useState<FinancialsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [activeChartPoint, setActiveChartPoint] = useState<DailySpend | null>(null);

  const fetchFinancials = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/financials");
      if (!res.ok) {
        throw new Error(`Failed to load financials: ${res.statusText}`);
      }
      const json = await res.json();
      setData(json);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFinancials();
  }, [fetchFinancials]);

  // Toggle API key active state
  const handleToggleKey = async (keyId: string, currentActive: boolean) => {
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId, isActive: !currentActive }),
      });
      if (res.ok) {
        fetchFinancials(true);
      } else {
        alert("Failed to toggle API key status");
      }
    } catch (err) {
      console.error(err);
      alert("Error toggling API key status");
    }
  };

  // Reset API key health status
  const handleResetHealth = async (keyId: string) => {
    if (!confirm("Are you sure you want to reset health metrics for this API key? This clears consecutive failures and latency logs.")) {
      return;
    }
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId, resetHealth: true }),
      });
      if (res.ok) {
        fetchFinancials(true);
      } else {
        alert("Failed to reset API key health");
      }
    } catch (err) {
      console.error(err);
      alert("Error resetting API key health");
    }
  };

  const getKeyStatus = (key: SystemKeyEntry) => {
    if (!key.isActive) {
      return { label: "Disabled", color: "text-text-muted bg-bg-elevated border-border-default" };
    }
    if (key.rateLimitedUntil && new Date(key.rateLimitedUntil) > new Date()) {
      return { label: "Rate Limited", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    }
    if (key.consecutiveFailures >= 3) {
      return { label: "Degraded / Failing", color: "text-red-400 bg-red-500/10 border-red-500/20" };
    }
    return { label: "Healthy", color: "text-green-400 bg-green-500/10 border-green-500/20" };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-text-muted space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
        <span className="text-sm font-medium">Loading AI financial analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 bg-bg-surface rounded-2xl border border-border-default space-y-4 max-w-xl mx-auto">
        <AlertCircle className="w-12 h-12 text-error mx-auto" />
        <h3 className="text-lg font-bold">Failed to Load Financials</h3>
        <p className="text-text-secondary text-sm">{error}</p>
        <button
          onClick={() => fetchFinancials()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white rounded-xl text-sm font-semibold transition-all"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const totals = data?.totals || {
    totalSpend: 0,
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalCalls: 0,
    successCalls: 0,
    failedCalls: 0,
  };

  const successRate = totals.totalCalls > 0
    ? (totals.successCalls / totals.totalCalls) * 100
    : 100;

  const avgCostPer100 = totals.totalCalls > 0
    ? (totals.totalSpend / totals.totalCalls) * 100
    : 0;

  // Render SVG Chart calculations
  const chartWidth = 700;
  const chartHeight = 160;
  const paddingLeft = 40;
  const paddingRight = 10;
  const paddingTop = 15;
  const paddingBottom = 25;

  const dailyData = data?.dailySpend || [];
  const maxSpend = dailyData.length > 0
    ? Math.max(...dailyData.map((d) => d.spend), 0.001)
    : 0.001;

  // Helper to map daily spends to SVG coordinates
  const getCoordinates = () => {
    if (dailyData.length === 0) return "";
    const points: string[] = [];
    const interval = (chartWidth - paddingLeft - paddingRight) / Math.max(dailyData.length - 1, 1);

    dailyData.forEach((d, i) => {
      const x = paddingLeft + i * interval;
      const y = chartHeight - paddingBottom - (d.spend / maxSpend) * (chartHeight - paddingTop - paddingBottom);
      points.push(`${x},${y}`);
    });
    return points.join(" ");
  };

  const areaCoordinates = () => {
    const lineCoords = getCoordinates();
    if (!lineCoords) return "";
    const points = lineCoords.split(" ");
    const startX = paddingLeft;
    const endX = paddingLeft + (dailyData.length - 1) * ((chartWidth - paddingLeft - paddingRight) / Math.max(dailyData.length - 1, 1));
    const baseY = chartHeight - paddingBottom;
    return `${startX},${baseY} ${lineCoords} ${endX},${baseY}`;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">AI Financials & Cost Tracking</h1>
          <p className="text-text-secondary text-sm">
            Monitor spend, token counts, and system-wide API key health indicators.
          </p>
        </div>
        <button
          onClick={() => fetchFinancials(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border-default hover:bg-bg-elevated text-xs font-semibold text-text-secondary disabled:opacity-50 transition-all self-start sm:self-center"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
          <span>{refreshing ? "Refreshing..." : "Refresh Data"}</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Spend */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Coins className="w-5 h-5 text-orange-400" />
            </div>
            <span className="text-[10px] font-bold text-text-faint uppercase tracking-wider">USD Spend</span>
          </div>
          <p className="text-2xl font-bold text-text-primary" title={`$${totals.totalSpend.toFixed(6)}`}>
            ${totals.totalSpend.toFixed(4)}
          </p>
          <p className="text-xs text-text-muted mt-0.5">Total platform AI costs</p>
        </div>

        {/* Total Calls */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-[10px] font-bold text-text-faint uppercase tracking-wider">API Calls</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {totals.totalCalls.toLocaleString()}
          </p>
          <div className="flex items-center gap-2 mt-0.5 text-xs">
            <span className="text-green-400 font-semibold">{successRate.toFixed(1)}% Success</span>
            <span className="text-text-faint">({totals.failedCalls} failed)</span>
          </div>
        </div>

        {/* Total Tokens */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-[10px] font-bold text-text-faint uppercase tracking-wider">Token Count</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {totals.totalTokens.toLocaleString()}
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            {totals.promptTokens.toLocaleString()} in / {totals.completionTokens.toLocaleString()} out
          </p>
        </div>

        {/* Avg Cost per 100 */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-[10px] font-bold text-text-faint uppercase tracking-wider">Efficiency</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">
            ${avgCostPer100.toFixed(4)}
          </p>
          <p className="text-xs text-text-muted mt-0.5">Average spend per 100 calls</p>
        </div>
      </div>

      {/* SVG Chart - Spend Trend */}
      <div className="rounded-2xl border border-border-default bg-bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-text-primary">Daily API Spend (Last 30 Days)</h3>
            <p className="text-xs text-text-muted mt-0.5">
              {activeChartPoint
                ? `Spend on ${activeChartPoint.date}: $${activeChartPoint.spend.toFixed(5)} (${activeChartPoint.calls} calls)`
                : "Hover over the chart to inspect daily details"}
            </p>
          </div>
          <span className="text-xs font-semibold text-text-faint bg-bg-base px-2.5 py-1 rounded-lg border border-border-default">
            Max Daily: ${maxSpend.toFixed(4)}
          </span>
        </div>

        <div className="w-full overflow-x-auto select-none">
          <div className="min-w-[650px] relative">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-auto overflow-visible font-sans"
            >
              {/* Gradient def */}
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(249, 115, 22, 0.25)" />
                  <stop offset="100%" stopColor="rgba(249, 115, 22, 0.0)" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => {
                const y = paddingTop + r * (chartHeight - paddingTop - paddingBottom);
                const value = maxSpend * (1 - r);
                return (
                  <g key={idx} className="opacity-40">
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={chartWidth - paddingRight}
                      y2={y}
                      stroke="var(--border-default)"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={paddingLeft - 8}
                      y={y + 4}
                      fill="var(--text-faint)"
                      fontSize="9"
                      textAnchor="end"
                      fontWeight="600"
                    >
                      ${value.toFixed(4)}
                    </text>
                  </g>
                );
              })}

              {/* Gradient Area under line */}
              {dailyData.length > 1 && (
                <polygon points={areaCoordinates()} fill="url(#chartGradient)" />
              )}

              {/* Main Line path */}
              {dailyData.length > 1 && (
                <polyline
                  points={getCoordinates()}
                  fill="none"
                  stroke="rgba(249, 115, 22, 0.85)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Dots on Line */}
              {dailyData.map((d, i) => {
                const interval = (chartWidth - paddingLeft - paddingRight) / Math.max(dailyData.length - 1, 1);
                const x = paddingLeft + i * interval;
                const y = chartHeight - paddingBottom - (d.spend / maxSpend) * (chartHeight - paddingTop - paddingBottom);
                const isHovered = activeChartPoint?.date === d.date;

                return (
                  <circle
                    key={d.date}
                    cx={x}
                    cy={y}
                    r={isHovered ? 5.5 : 3.5}
                    fill={isHovered ? "#f97316" : "var(--bg-surface)"}
                    stroke="#f97316"
                    strokeWidth="2"
                    className="transition-all duration-150 cursor-pointer"
                    onMouseEnter={() => setActiveChartPoint(d)}
                  />
                );
              })}

              {/* X Axis Date Labels */}
              {dailyData.map((d, i) => {
                // Render labels at 1st, 10th, 20th, 30th elements to avoid overlap
                if (i % 6 !== 0 && i !== dailyData.length - 1) return null;
                const interval = (chartWidth - paddingLeft - paddingRight) / Math.max(dailyData.length - 1, 1);
                const x = paddingLeft + i * interval;
                const formattedDate = new Date(d.date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                });

                return (
                  <text
                    key={d.date}
                    x={x}
                    y={chartHeight - 8}
                    fill="var(--text-muted)"
                    fontSize="9"
                    fontWeight="500"
                    textAnchor="middle"
                  >
                    {formattedDate}
                  </text>
                );
              })}
            </svg>

            {/* Overlay invis bars for interactive inspection */}
            <div
              className="absolute inset-0 flex"
              style={{
                left: `${paddingLeft}px`,
                right: `${paddingRight}px`,
                top: `${paddingTop}px`,
                bottom: `${paddingBottom}px`,
              }}
              onMouseLeave={() => setActiveChartPoint(null)}
            >
              {dailyData.map((d) => (
                <div
                  key={d.date}
                  className="flex-1 h-full cursor-crosshair"
                  onMouseEnter={() => setActiveChartPoint(d)}
                />
              ))}
            </div>
          </div>
        </div>

        {dailyData.length === 0 && (
          <p className="text-xs text-text-faint text-center py-10">No spend history recorded in the last 30 days.</p>
        )}
      </div>

      {/* Model spend stats */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-text-secondary">Spend Breakdown by AI Model</h3>
        <div className="overflow-x-auto rounded-2xl border border-border-default bg-bg-surface shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-default text-xs font-semibold text-text-muted bg-bg-base/40">
                <th className="p-4 pl-6">Model ID</th>
                <th className="p-4">Provider</th>
                <th className="p-4">Total Tokens</th>
                <th className="p-4">Prompt / Completion</th>
                <th className="p-4">API Requests</th>
                <th className="p-4">Success Rate</th>
                <th className="p-4 pr-6 text-right">Aggregated Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default text-sm">
              {(data?.byModel || []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-xs text-text-faint">
                    No token logs recorded yet. Run campaigns to populate statistics.
                  </td>
                </tr>
              ) : (
                data?.byModel.map((model) => {
                  const modelConfig = SUPPORTED_MODELS.find((m) => m.id === model.modelId);
                  const rate = model.totalCalls > 0
                    ? (model.successCalls / model.totalCalls) * 100
                    : 100;
                  return (
                    <tr key={model.modelId} className="hover:bg-bg-base/20 transition-colors">
                      <td className="p-4 pl-6">
                        <p className="font-semibold text-text-primary">
                          {modelConfig?.name || model.modelId}
                        </p>
                        <p className="text-[10px] text-text-faint font-mono mt-0.5">{model.modelId}</p>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-bg-elevated text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                          {model.provider}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-text-primary">
                        {model.totalTokens.toLocaleString()}
                      </td>
                      <td className="p-4 text-xs text-text-muted">
                        {model.promptTokens.toLocaleString()} / {model.completionTokens.toLocaleString()}
                      </td>
                      <td className="p-4 font-mono text-xs">
                        {model.totalCalls.toLocaleString()} calls
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "inline-flex items-center gap-1 text-xs font-semibold",
                          rate >= 95 ? "text-green-400" : rate >= 80 ? "text-amber-400" : "text-red-400"
                        )}>
                          {rate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right font-semibold text-text-primary font-mono" title={`$${model.totalSpend.toFixed(6)}`}>
                        ${model.totalSpend.toFixed(4)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Health Monitor */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-text-secondary">System Key Load Balancer & Health Monitor</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Real-time status of pooled API keys. The system uses key load balancing and flags bad keys dynamically.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {(data?.keys || []).map((key) => {
            const status = getKeyStatus(key);
            const hasFailures = key.consecutiveFailures > 0;
            return (
              <div
                key={key._id}
                className={cn(
                  "rounded-2xl border border-border-default bg-bg-surface p-5 hover:bg-bg-elevated transition-all flex flex-col justify-between shadow-sm",
                  !key.isActive && "opacity-60 border-dashed"
                )}
              >
                <div>
                  {/* Top line: Label, status, provider */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-text-primary truncate">{key.label || "Unnamed Key"}</h4>
                      <p className="text-[10px] text-text-faint font-mono mt-0.5 select-all">{key.maskedKey}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-semibold border", status.color)}>
                        {status.label}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-bg-base border border-border-default text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                        {key.provider}
                      </span>
                    </div>
                  </div>

                  {/* Latency History Sparklines */}
                  <div className="mt-4 pt-3 border-t border-border-default/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-muted">Avg Latency</span>
                      <span className="font-bold text-text-primary font-mono">
                        {key.averageLatencyMs > 0 ? `${key.averageLatencyMs}ms` : "—"}
                      </span>
                    </div>

                    {/* Sparkline block rendering */}
                    <div className="flex items-center gap-1 h-8 pt-1">
                      {key.latencyHistory && key.latencyHistory.length > 0 ? (
                        <>
                          {/* Render up to 10 latency markers */}
                          {key.latencyHistory.slice(-10).map((l, i) => {
                            const isFast = l < 400;
                            const isMedium = l >= 400 && l < 1000;
                            return (
                              <div
                                key={i}
                                className={cn(
                                  "flex-1 rounded-sm transition-all hover:scale-y-110",
                                  isFast
                                    ? "bg-green-500/30 hover:bg-green-500"
                                    : isMedium
                                      ? "bg-amber-500/30 hover:bg-amber-500"
                                      : "bg-red-500/30 hover:bg-red-500"
                                )}
                                style={{
                                  // Normalize height relative to average latency or 1200ms max
                                  height: `${Math.min(Math.max((l / 1200) * 100, 20), 100)}%`,
                                }}
                                title={`Call #${i + 1}: ${l}ms`}
                              />
                            );
                          })}
                          {/* Pad out to 10 elements */}
                          {Array.from({ length: Math.max(0, 10 - key.latencyHistory.length) }).map((_, i) => (
                            <div
                              key={`pad-${i}`}
                              className="flex-1 h-2 rounded-sm bg-bg-base/30 border border-dashed border-border-default/40"
                              title="No logs yet"
                            />
                          ))}
                        </>
                      ) : (
                        <div className="w-full flex items-center justify-center text-[10px] text-text-faint h-full border border-dashed border-border-default/40 rounded-lg">
                          No latency logs recorded
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Failure Metrics */}
                  <div className="mt-3.5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-muted">Consecutive Failures</span>
                      <span className={cn(
                        "font-mono font-bold",
                        hasFailures ? "text-error" : "text-text-faint"
                      )}>
                        {key.consecutiveFailures}
                      </span>
                    </div>

                    {key.lastError && (
                      <div className="bg-red-500/5 border border-red-500/10 p-2.5 rounded-xl text-[10px] font-mono text-red-400 break-all leading-normal max-h-[60px] overflow-y-auto">
                        <strong>Last Error:</strong> {key.lastError}
                      </div>
                    )}

                    {key.rateLimitedUntil && new Date(key.rateLimitedUntil) > new Date() && (
                      <div className="bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-xl text-[10px] font-mono text-amber-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span>Rate limited until {new Date(key.rateLimitedUntil).toLocaleTimeString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Key Footer / Actions */}
                <div className="mt-4 pt-3.5 border-t border-border-default/60 flex items-center justify-between gap-4">
                  <span className="text-[10px] text-text-faint font-mono">
                    Total Uses: {key.usageCount}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleResetHealth(key._id)}
                      className="px-2.5 py-1.5 rounded-lg border border-border-default hover:bg-bg-elevated text-[10px] font-semibold text-text-secondary transition-all flex items-center gap-1"
                      title="Reset Key failure history & latency rolling stats"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reset Health</span>
                    </button>

                    <button
                      onClick={() => handleToggleKey(key._id, key.isActive)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all flex items-center gap-1 border",
                        key.isActive
                          ? "border-green-500/20 bg-green-500/5 hover:bg-green-500/10 text-green-400"
                          : "border-border-default hover:bg-bg-elevated text-text-muted"
                      )}
                    >
                      {key.isActive ? (
                        <>
                          <Power className="w-3 h-3" />
                          <span>Disable</span>
                        </>
                      ) : (
                        <>
                          <PowerOff className="w-3 h-3" />
                          <span>Enable</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {(data?.keys || []).length === 0 && (
            <div className="col-span-2 rounded-2xl border border-dashed border-border-default bg-bg-surface/50 p-8 text-center text-text-faint text-xs">
              No API Keys registered in the system API Key pool. Go to <a href="/admin/api-keys" className="text-orange-400 hover:underline">API Keys</a> to add keys.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
