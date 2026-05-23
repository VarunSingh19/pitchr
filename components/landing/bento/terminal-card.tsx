"use client"

import { useEffect, useState } from "react"

const LOG_LINES = [
  "> Initializing Pitchr pipeline...",
  "> Loading target leads from leads.json...",
  "> Found 24 company targets",
  "> Parsing resume context: profile.pdf",
  "> Personalizing target 1/24: Acme Corp...",
  "> Matching tech stack: [React, Node.js]",
  "> FIT_SCORE: 0.92 (High alignment)",
  "> Drafted: cold_pitch_acme.txt",
  "> Personalizing target 2/24: CloudScale...",
  "> Matching tech stack: [Python, AWS, Go]",
  "> FIT_SCORE: 0.87 (High alignment)",
  "> Drafted: cold_pitch_cloudscale.txt",
  "> Verifying SMTP delivery routes...",
  "> Gmail API connectivity: OK",
  "> Rate Limiter engaged (anti-spam delay: 90s)...",
  "> Sending pipeline started...",
  "> 100% Emails successfully delivered",
  "> Tracking pixels activated",
  "> --------- PIPELINE CYCLE COMPLETE ---------"
]

export function TerminalCard() {
  const [lines, setLines] = useState<string[]>([])
  const [currentLine, setCurrentLine] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLine((prev) => {
        const next = prev + 1
        if (next >= LOG_LINES.length) {
          setLines([])
          return 0
        }
        setLines((l) => [...l.slice(-8), LOG_LINES[next]])
        return next
      })
    }, 800)

    setLines([LOG_LINES[0]])

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col h-full select-none">
      <div className="flex items-center gap-2 border-b-2 border-foreground px-4 py-2">
        <span className="h-2 w-2 bg-[#ea580c]" />
        <span className="h-2 w-2 bg-foreground" />
        <span className="h-2 w-2 border border-foreground" />
        <span className="ml-auto text-[10px] tracking-widest text-muted-foreground uppercase font-mono">
          outreach_log.sys
        </span>
      </div>
      <div className="flex-1 bg-foreground p-4 overflow-hidden min-h-[200px]">
        <div className="flex flex-col gap-1">
          {lines.map((line, i) => (
            <span
              key={`${currentLine}-${i}`}
              className="text-xs text-background font-mono block leading-relaxed"
              style={{ opacity: i === lines.length - 1 ? 1 : 0.6 }}
            >
              {line}
            </span>
          ))}
          <span className="text-xs text-[#ea580c] font-mono animate-blink">{"_"}</span>
        </div>
      </div>
    </div>
  )
}
