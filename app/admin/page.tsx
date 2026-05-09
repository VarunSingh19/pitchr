"use client";

import { useEffect, useState } from "react";
import { Key, Activity, AlertTriangle } from "lucide-react";

interface OverviewStats {
  totalKeys: number;
  activeKeys: number;
  rateLimitedKeys: number;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/api-keys")
      .then((r) => r.json())
      .then((data) => {
        const keys = data.keys || [];
        setStats({
          totalKeys: keys.length,
          activeKeys: keys.filter((k: { isActive: boolean }) => k.isActive).length,
          rateLimitedKeys: keys.filter(
            (k: { rateLimitedUntil: string | null }) =>
              k.rateLimitedUntil && new Date(k.rateLimitedUntil) > new Date()
          ).length,
        });
      })
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    {
      label: "Total API Keys",
      value: stats?.totalKeys ?? 0,
      icon: Key,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Active Keys",
      value: stats?.activeKeys ?? 0,
      icon: Activity,
      color: "text-green-400",
      bg: "bg-green-500/10",
    },
    {
      label: "Rate Limited",
      value: stats?.rateLimitedKeys ?? 0,
      icon: AlertTriangle,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold mb-1">Admin Overview</h1>
        <p className="text-text-secondary text-sm">
          System-wide API key pool status
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-border-default bg-bg-surface p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}
              >
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold">
              {loading ? "—" : card.value}
            </p>
            <p className="text-xs text-text-muted mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
