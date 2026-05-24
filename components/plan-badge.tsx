import React from "react";
import { cn } from "@/lib/utils";

interface PlanBadgeProps {
  plan: string;
  className?: string;
}

export function PlanBadge({ plan, className }: PlanBadgeProps) {
  const p = plan.toLowerCase().trim();

  // Custom styling per plan with neo-brutalist monospace design
  let badgeStyles = "";
  let label = "";

  if (p === "starter") {
    badgeStyles = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[1px_1px_0px_0px_rgba(16,185,129,0.2)]";
    label = "Starter";
  } else if (p === "pro" || p === "pro outbound" || p === "pro_outbound") {
    badgeStyles = "bg-[#ea580c]/10 text-[#ea580c] border-[#ea580c]/30 shadow-[1px_1px_0px_0px_rgba(234,88,12,0.2)]";
    label = "Pro";
  } else if (p === "enterprise" || p === "ent") {
    badgeStyles = "bg-purple-500/10 text-purple-400 border-purple-500/30 ring-1 ring-purple-500/40 shadow-[1px_1px_0px_0px_rgba(168,85,247,0.2)] animate-pulse";
    label = "Enterprise";
  } else {
    // Free / Trial plan
    badgeStyles = "bg-zinc-500/10 text-zinc-400 border-zinc-500/30 shadow-[1px_1px_0px_0px_rgba(113,113,122,0.15)]";
    label = "Trial";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[8px] font-mono font-bold border uppercase tracking-wider rounded-none select-none flex-shrink-0 leading-none",
        badgeStyles,
        className
      )}
    >
      {label}
    </span>
  );
}
