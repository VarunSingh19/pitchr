"use client"

import { useEffect, useState } from "react"

const SERVICES = [
  { name: "GMAIL-API", status: "ONLINE", latency: "42ms" },
  { name: "AI-ENGINE", status: "ONLINE", latency: "128ms" },
  { name: "RATE-LIMIT", status: "ACTIVE", latency: "---" },
  { name: "SMTP-SYNC", status: "ONLINE", latency: "18ms" },
]

export function StatusCard() {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col h-full select-none">
      <div className="flex items-center justify-between border-b-2 border-foreground px-4 py-2">
        <span className="text-[10px] tracking-widest text-muted-foreground uppercase font-mono">
          pipeline.status
        </span>
        <span className="text-[10px] tracking-widest text-muted-foreground font-mono">
          {`TICK:${String(tick).padStart(4, "0")}`}
        </span>
      </div>
      <div className="flex-1 flex flex-col p-4 gap-0">
        {/* Table header */}
        <div className="grid grid-cols-3 gap-2 border-b border-border pb-2 mb-2">
          <span className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground font-mono">Service</span>
          <span className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground font-mono">Status</span>
          <span className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground text-right font-mono">Latency</span>
        </div>
        {SERVICES.map((srv) => (
          <div
            key={srv.name}
            className="grid grid-cols-3 gap-2 py-2 border-b border-border last:border-none"
          >
            <span className="text-xs font-mono text-foreground">{srv.name}</span>
            <div className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5"
                style={{
                  backgroundColor: srv.status === "ONLINE" || srv.status === "ACTIVE" ? "#ea580c" : "hsl(var(--muted-foreground))",
                }}
              />
              <span className="text-xs font-mono text-muted-foreground">{srv.status}</span>
            </div>
            <span className="text-xs font-mono text-foreground text-right">{srv.latency}</span>
          </div>
        ))}
        {/* Throughput bar */}
        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground font-mono">
              Campaign Throughput
            </span>
            <span className="text-[9px] font-mono text-foreground">92%</span>
          </div>
          <div className="h-2 w-full border border-foreground">
            <div className="h-full bg-foreground" style={{ width: "92%" }} />
          </div>
        </div>
      </div>
    </div>
  )
}
