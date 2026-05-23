"use client"

import { motion } from "framer-motion"

interface SectionLabelProps {
  label: string
  number: string
  showDot?: boolean
}

export function SectionLabel({ label, number, showDot = true }: SectionLabelProps) {
  const ease = [0.22, 1, 0.36, 1] as const

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease }}
      className="flex items-center gap-4 mb-8"
    >
      <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
        {`// SECTION: ${label}`}
      </span>
      <div className="flex-1 border-t border-border" />
      {showDot && (
        <span className="inline-block h-2 w-2 bg-[#ea580c] animate-blink" />
      )}
      <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
        {number}
      </span>
    </motion.div>
  )
}
