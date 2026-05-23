"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { Mail } from "lucide-react"

const LEFT_LABELS = ["Upload Leads", "Attach Resume", "Gmail Setup"]
const RIGHT_LABELS = ["AI Personalize", "Review & Edit", "Bulk Launch"]

interface PillLabelProps {
  label: string
  x: number
  y: number
  delay: number
}

function PillLabel({ label, x, y, delay }: PillLabelProps) {
  return (
    <motion.g
      initial={{ opacity: 0, x: x > 400 ? 20 : -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
    >
      <rect
        x={x}
        y={y}
        width={100}
        height={26}
        rx={0} // Brutalist zero border-radius
        fill="none"
        stroke="hsl(var(--foreground))"
        strokeWidth={1.5}
      />
      <text
        x={x + 50}
        y={y + 17}
        textAnchor="middle"
        fill="hsl(var(--foreground))"
        fontSize={9}
        fontFamily="var(--font-mono), monospace"
        fontWeight={500}
        letterSpacing="0.05em"
      >
        {label.toUpperCase()}
      </text>
    </motion.g>
  )
}

export function PipelineDiagram() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="h-[200px] w-full" />
  }

  const centerX = 400
  const centerY = 100

  return (
    <div className="relative w-full max-w-[800px] mx-auto">
      {/* Desktop Animated SVG version */}
      <div className="hidden md:block">
        <svg
          viewBox="0 0 800 200"
          className="w-full h-auto"
          role="img"
          aria-label="Pitchr Pipeline Flow: Upload Leads, Attach Resume, Gmail Setup connect to AI personalize, Review, and Bulk Launch"
        >
          {/* Left lines from center to left labels */}
          {LEFT_LABELS.map((_, i) => {
            const pillX = 50
            const pillY = 30 + i * 60
            return (
              <motion.line
                key={`left-line-${i}`}
                x1={centerX - 40}
                y1={centerY}
                x2={pillX + 100}
                y2={pillY + 13}
                stroke="hsl(var(--border))"
                strokeWidth={1}
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
              />
            )
          })}

          {/* Right lines from center to right labels */}
          {RIGHT_LABELS.map((_, i) => {
            const pillX = 650
            const pillY = 30 + i * 60
            return (
              <motion.line
                key={`right-line-${i}`}
                x1={centerX + 40}
                y1={centerY}
                x2={pillX}
                y2={pillY + 13}
                stroke="hsl(var(--border))"
                strokeWidth={1}
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
              />
            )
          })}

          {/* Data packets flowing along lines */}
          {LEFT_LABELS.map((_, i) => {
            const pillX = 50
            const pillY = 30 + i * 60
            return (
              <motion.circle
                key={`left-packet-${i}`}
                r={3.5}
                fill="#ea580c"
                initial={{ cx: pillX + 100, cy: pillY + 13 }}
                animate={{
                  cx: [pillX + 100, centerX - 40],
                  cy: [pillY + 13, centerY],
                }}
                transition={{
                  duration: 2,
                  delay: 0.5 + i * 0.6,
                  repeat: Infinity,
                  repeatDelay: 2.5,
                  ease: "linear",
                }}
              />
            )
          })}

          {RIGHT_LABELS.map((_, i) => {
            const pillX = 650
            const pillY = 30 + i * 60
            return (
              <motion.circle
                key={`right-packet-${i}`}
                r={3.5}
                fill="#ea580c"
                initial={{ cx: centerX + 40, cy: centerY }}
                animate={{
                  cx: [centerX + 40, pillX],
                  cy: [centerY, pillY + 13],
                }}
                transition={{
                  duration: 2,
                  delay: 0.8 + i * 0.6,
                  repeat: Infinity,
                  repeatDelay: 2.5,
                  ease: "linear",
                }}
              />
            )
          })}

          {/* Left pill labels */}
          {LEFT_LABELS.map((label, i) => (
            <PillLabel
              key={`left-${label}`}
              label={label}
              x={50}
              y={30 + i * 60}
              delay={0.1 + i * 0.1}
            />
          ))}

          {/* Right pill labels */}
          {RIGHT_LABELS.map((label, i) => (
            <PillLabel
              key={`right-${label}`}
              label={label}
              x={650}
              y={30 + i * 60}
              delay={0.1 + i * 0.1}
            />
          ))}

          {/* Center core square */}
          <motion.g
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <rect
              x={centerX - 36}
              y={centerY - 36}
              width={72}
              height={72}
              fill="hsl(var(--muted))"
              stroke="hsl(var(--foreground))"
              strokeWidth={1.5}
            />
            {/* CPU Core Line patterns */}
            {/* <line x1={centerX} y1={centerY - 22} x2={centerX} y2={centerY + 22} stroke="hsl(var(--foreground))" strokeWidth={2} /> */}
            {/* <line x1={centerX - 22} y1={centerY} x2={centerX + 22} y2={centerY} stroke="hsl(var(--foreground))" strokeWidth={2} /> */}
            
            {/* Centered Small Mail icon */}
            <g transform={`translate(${centerX - 9}, ${centerY - 8}) scale(0.85)`}>
              <rect width={20} height={16} rx={0} fill="none" stroke="hsl(var(--foreground))" strokeWidth={1.5} />
              <path d="M0 0 L10 7 L20 0" fill="none" stroke="hsl(var(--foreground))" strokeWidth={1.5} />
            </g>

            {/* Pulsing orange ring */}
            <circle cx={centerX} cy={centerY} r={32} fill="none" stroke="#ea580c" strokeWidth={1}>
              <animate
                attributeName="r"
                values="32;36;32"
                dur="3s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.6;0.2;0.6"
                dur="3s"
                repeatCount="indefinite"
              />
            </circle>
          </motion.g>
        </svg>
      </div>

      {/* Mobile Flow Vertical Layout */}
      <div className="md:hidden flex flex-col items-center gap-3 font-mono text-[9px] w-full max-w-[280px] mx-auto py-2 text-foreground">
        {/* Section 1: Inputs */}
        <div className="flex flex-col gap-1.5 w-full">
          <span className="text-muted-foreground uppercase text-[8px] tracking-[0.15em] font-bold text-center">// PIPELINE INPUTS</span>
          <div className="grid grid-cols-3 gap-1.5">
            <div className="border border-border p-2 bg-card text-center font-bold uppercase truncate">Leads</div>
            <div className="border border-border p-2 bg-card text-center font-bold uppercase truncate">Resume</div>
            <div className="border border-border p-2 bg-card text-center font-bold uppercase truncate">Gmail</div>
          </div>
        </div>

        {/* Down Arrow connector */}
        <div className="flex flex-col items-center">
          <div className="w-[1px] h-3 bg-[#ea580c] animate-pulse" />
          <span className="text-[#ea580c] font-bold text-xs select-none">↓</span>
        </div>

        {/* Section 2: Core Engine */}
        <div className="border-2 border-[#ea580c] bg-[#ea580c]/5 py-2.5 w-full text-center relative overflow-hidden flex items-center justify-center gap-2">
          <div className="w-1.5 h-1.5 bg-[#ea580c] animate-blink" />
          <span className="font-bold text-[9px] tracking-[0.2em] uppercase text-foreground">PITCHR ENGINE</span>
          <div className="w-1.5 h-1.5 bg-[#ea580c] animate-blink" />
        </div>

        {/* Down Arrow connector */}
        <div className="flex flex-col items-center">
          <div className="w-[1px] h-3 bg-[#ea580c] animate-pulse" />
          <span className="text-[#ea580c] font-bold text-xs select-none">↓</span>
        </div>

        {/* Section 3: Outputs */}
        <div className="flex flex-col gap-1.5 w-full">
          <span className="text-muted-foreground uppercase text-[8px] tracking-[0.15em] font-bold text-center">// ENGINE ACTIONS</span>
          <div className="grid grid-cols-3 gap-1.5">
            <div className="border border-border p-2 bg-card text-center font-bold uppercase truncate">Personalize</div>
            <div className="border border-border p-2 bg-card text-center font-bold uppercase truncate">Review</div>
            <div className="border border-border p-2 bg-card text-center font-bold uppercase truncate">Launch</div>
          </div>
        </div>
      </div>
    </div>
  )
}
