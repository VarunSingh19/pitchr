"use client"

import { PipelineDiagram } from "./pipeline-diagram"
import { ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import { Typewriter } from "./typewriter"
import Link from "next/link"

const ease = [0.22, 1, 0.36, 1] as const

export function HeroSection() {
  return (
    <section className="relative w-full px-6 pt-12 pb-16 lg:px-12 lg:pt-20 lg:pb-24 overflow-hidden">
      <div className="flex flex-col items-center text-center">
        {/* Top headline: CRAFT. PITCH. */}
        <motion.h1
          initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease }}
          className="font-pixel text-3xl min-[360px]:text-4xl sm:text-6xl lg:text-7xl xl:text-8xl tracking-tight text-foreground mb-2 select-none"
        >
          CRAFT. PITCH.
        </motion.h1>

        {/* Central Pipeline Diagram */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15, ease }}
          className="w-full max-w-2xl my-4 lg:my-6"
        >
          <PipelineDiagram />
        </motion.div>

        {/* Bottom headline: LAND. */}
        <motion.h1
          initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, delay: 0.25, ease }}
          className="font-pixel text-3xl min-[360px]:text-4xl sm:text-6xl lg:text-7xl xl:text-8xl tracking-tight text-foreground mb-6 select-none"
        >
          LAND.
        </motion.h1>

        {/* Sub-headline */}
        <div className="min-h-[80px] sm:min-h-[50px] max-w-lg mb-8">
          <p className="text-xs lg:text-sm text-muted-foreground leading-relaxed font-mono">
            <Typewriter
              text="PITCHR.AI IS THE DETERMINISTIC OUTREACH SYSTEM BETWEEN YOUR RESUME AND YOUR TARGET TIER-1 JOBS. PERSONALIZED BY GEN-AI. DELIVERED SECURELY BY GMAIL. OBSERVED IN REAL-TIME."
              speed={25}
            />
          </p>
        </div>

        {/* CTA Button */}
        <Link href="/login">
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6, ease }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="group flex items-center gap-0 bg-foreground text-background text-xs font-mono tracking-widest uppercase"
          >
            <span className="flex items-center justify-center w-10 h-10 bg-[#ea580c]">
              <motion.span
                className="inline-flex"
                whileHover={{ x: 3 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <ArrowRight size={16} strokeWidth={2.5} className="text-background" />
              </motion.span>
            </span>
            <span className="px-5 py-2.5">
              Start Pitching Free
            </span>
          </motion.button>
        </Link>
      </div>
    </section>
  )
}
