"use client"

import { TerminalCard } from "./bento/terminal-card"
import { DitherCard } from "./bento/dither-card"
import { MetricsCard } from "./bento/metrics-card"
import { StatusCard } from "./bento/status-card"
import { motion } from "framer-motion"
import { SectionLabel } from "./section-label"

const ease = [0.22, 1, 0.36, 1] as const

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease },
  }),
}

export function FeatureGrid() {
  return (
    <section id="platform" className="w-full px-6 py-20 lg:px-12">
      <SectionLabel label="RAW_METRICS" number="001" />

      {/* 2x2 Bento Grid */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        className="grid grid-cols-1 md:grid-cols-2 border-2 border-foreground bg-background"
      >
        {/* Terminal */}
        <motion.div
          custom={0}
          variants={cardVariants}
          className="border-b-2 md:border-b-0 md:border-r-2 border-foreground min-h-[280px]"
        >
          <TerminalCard />
        </motion.div>

        {/* Dither */}
        <motion.div
          custom={1}
          variants={cardVariants}
          className="border-b-2 md:border-b-0 border-foreground min-h-[280px]"
        >
          <DitherCard />
        </motion.div>

        {/* Metrics */}
        <motion.div
          custom={2}
          variants={cardVariants}
          className="border-t-2 md:border-r-2 border-foreground min-h-[280px]"
        >
          <MetricsCard />
        </motion.div>

        {/* Status */}
        <motion.div
          custom={3}
          variants={cardVariants}
          className="border-t-2 border-foreground min-h-[280px]"
        >
          <StatusCard />
        </motion.div>
      </motion.div>
    </section>
  )
}
