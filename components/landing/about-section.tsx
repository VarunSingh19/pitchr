"use client"

import { useEffect, useState, useRef } from "react"
import { motion } from "framer-motion"
import { Volume2, VolumeX } from "lucide-react"
import { ScrambleText } from "./scramble-text"
import { SectionLabel } from "./section-label"

const ease = [0.22, 1, 0.36, 1] as const

/* ── live uptime counter ── */
function UptimeCounter() {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const base = 31536000 + Math.floor(Math.random() * 1000000)
    setSeconds(base)
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const format = (n: number) => {
    const d = Math.floor(n / 86400)
    const h = Math.floor((n % 86400) / 3600)
    const m = Math.floor((n % 3600) / 60)
    const s = n % 60
    return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`
  }

  return (
    <span className="font-mono text-[#ea580c]" style={{ fontVariantNumeric: "tabular-nums" }}>
      {format(seconds)}
    </span>
  )
}

/* ── stat block ── */
const STATS = [
  { label: "MODELS_AVAILABLE", value: "12+" },
  { label: "INTEGRATIONS", value: "4" },
  { label: "EMAILS_CRAFTED", value: "50K+" },
  { label: "AVG_FIT_SCORE", value: "0.89" },
]

function StatBlock({ label, value, index }: { label: string; value: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ delay: 0.15 + index * 0.08, duration: 0.5, ease }}
      className="flex flex-col gap-1 border-2 border-foreground px-4 py-3"
    >
      <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
        {label}
      </span>
      <span className="text-xl lg:text-2xl font-mono font-bold tracking-tight">
        <ScrambleText text={value} />
      </span>
    </motion.div>
  )
}

/* ── main about section ── */
export function AboutSection() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(true)

  const toggleAudio = () => {
    const vid = videoRef.current
    if (!vid) return
    vid.muted = !vid.muted
    setMuted(vid.muted)
  }

  return (
    <section className="w-full px-6 py-20 lg:px-12 bg-background">
      <SectionLabel label="OUTREACH_ENGINE" number="002" />

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-0 border-2 border-foreground">
        {/* Left: Video */}
        <motion.div
          initial={{ opacity: 0, x: -30, filter: "blur(6px)" }}
          whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease }}
          className="relative w-full lg:w-1/2 min-h-75 lg:min-h-125 border-b-2 lg:border-b-0 lg:border-r-2 border-foreground overflow-hidden bg-[#0A0A0A]"
        >
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-cover"
          >
            <source src="/video/Pitchr%20AI%20.mp4" type="video/mp4" />
          </video>

          {/* Audio toggle */}
          <button
            onClick={toggleAudio}
            aria-label={muted ? "Unmute video" : "Mute video"}
            className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 border border-foreground/40 bg-background/80 backdrop-blur-sm text-foreground hover:bg-foreground hover:text-background transition-colors duration-150"
          >
            {muted ? <VolumeX size={12} strokeWidth={2} /> : <Volume2 size={12} strokeWidth={2} />}
            <span className="text-[9px] tracking-[0.18em] uppercase font-mono">
              {muted ? "AUDIO OFF" : "AUDIO ON"}
            </span>
          </button>
        </motion.div>

        {/* Right: Content */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay: 0.1, ease }}
          className="flex flex-col w-full lg:w-1/2 bg-background"
        >
          {/* Header bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b-2 border-foreground bg-background">
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
              README.md
            </span>
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
              v1.0.0
            </span>
          </div>

          {/* Content body */}
          <div className="flex-1 flex flex-col justify-between px-5 py-6 lg:py-8">
            <div className="flex flex-col gap-6">
              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ duration: 0.5, delay: 0.2, ease }}
                className="text-2xl lg:text-3xl font-mono font-bold tracking-tight uppercase text-balance"
              >
                Outreach built for
                <br />
                <span className="text-[#ea580c]">raw personalization</span>
              </motion.h2>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ delay: 0.3, duration: 0.5, ease }}
                className="flex flex-col gap-4 text-foreground"
              >
                <p className="text-xs lg:text-sm font-mono text-muted-foreground leading-relaxed">
                  We engineer the personalization layer that sits between your professional story
                  and potential employers. No generic AI templates. No spam behavior. Just custom,
                  context-rich pitches crafted using your resume and their job descriptions,
                  delivered via Gmail at user-controlled rate limits.
                </p>
                <p className="text-xs lg:text-sm font-mono text-muted-foreground leading-relaxed">
                  Designed for job seekers who want quality over spam. We believe cold outreach
                  should be precise, inspectable, and 100% reviewable before a single email is sent.
                </p>
              </motion.div>

              {/* Uptime line */}
              <motion.div
                initial={{ opacity: 0, scaleX: 0.8 }}
                whileInView={{ opacity: 1, scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4, duration: 0.5, ease }}
                style={{ transformOrigin: "left" }}
                className="flex items-center gap-3 py-3 border-t-2 border-b-2 border-foreground"
              >
                <span className="h-1.5 w-1.5 bg-[#ea580c]" />
                <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
                  UPTIME:
                </span>
                <UptimeCounter />
              </motion.div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-0 mt-6 bg-background">
              {STATS.map((stat, i) => (
                <StatBlock key={stat.label} {...stat} index={i} />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
