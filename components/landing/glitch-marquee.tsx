"use client"

import { motion } from "framer-motion"
import { SectionLabel } from "./section-label"

const ease = [0.22, 1, 0.36, 1] as const

const INTEGRATIONS = [
  "GMAIL",
  "GEMINI",
  "CLAUDE",
  "LLAMA",
  "DEEPSEEK",
  "MISTRAL",
  "MONGODB",
  "NODE.JS",
]

interface LogoBlockProps {
  name: string
  glitch: boolean
}

function LogoBlock({ name, glitch }: LogoBlockProps) {
  return (
    <div
      className={`flex items-center justify-center px-8 py-4 border-r-2 border-foreground shrink-0 ${
        glitch ? "animate-glitch" : ""
      }`}
    >
      <span className="text-sm font-mono tracking-[0.15em] uppercase text-foreground whitespace-nowrap">
        {name}
      </span>
    </div>
  )
}

export function GlitchMarquee() {
  const glitchIndices = [2, 5]

  return (
    <section className="w-full py-16 px-6 lg:px-12 bg-background">
      <SectionLabel label="INTEGRATIONS_MARQUEE" number="005" />

      {/* Marquee Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.6, ease }}
        className="overflow-hidden border-2 border-foreground"
      >
        <div className="flex animate-marquee" style={{ width: "max-content" }}>
          {[...INTEGRATIONS, ...INTEGRATIONS, ...INTEGRATIONS].map((name, i) => (
            <LogoBlock
              key={`${name}-${i}`}
              name={name}
              glitch={glitchIndices.includes(i % INTEGRATIONS.length)}
            />
          ))}
        </div>
      </motion.div>
    </section>
  )
}
