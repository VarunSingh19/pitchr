"use client"

import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { SectionLabel } from "@/components/landing/section-label"
import { motion } from "framer-motion"
import { ShieldCheck, Mail, Key, Sparkles, RefreshCw, Trash2 } from "lucide-react"

const ease = [0.22, 1, 0.36, 1] as const

const POLICY_SECTIONS = [
  {
    id: "01",
    title: "Data Collection & Ingestion",
    icon: Mail,
    desc: "We collect and process the minimal amount of information required to deliver deterministic cold outreach services.",
    points: [
      "Account Data: Primary email, name, and profile icon synchronized securely via Google OAuth.",
      "Resume Documents: User-uploaded PDF resume files containing professional history, education, and credentials.",
      "Leads Databases: Bulk uploaded JSON spreadsheets including names, target roles, and verified corporate contact emails.",
    ]
  },
  {
    id: "02",
    title: "Google API & Gmail Integration",
    icon: Key,
    desc: "Our outbound email dispatch capability operates directly through authorized Google API integrations under standard user consent policies.",
    points: [
      "Access Scopes: We request limited-access scopes (including Gmail API send permissions) to sync inbox channels and automate outreach campaigns.",
      "Strict Restriction: We never read personal inboxes, train models on your emails, or sell/distribute email content to third parties.",
      "Compliance: Pitchr AI's use of information received from Google APIs adheres strictly to the Google API Services User Data Policy, including the Limited Use requirements.",
    ]
  },
  {
    id: "03",
    title: "Gen-AI Processing Layer",
    icon: Sparkles,
    desc: "Pitchr AI utilizes advanced LLM models (including Google Gemini) to craft high-context cold pitches.",
    points: [
      "Processing Bounds: AI generation is restricted to synthesizing your uploaded PDF resume data with the specific target job description.",
      "Data Sandboxing: Processing inputs are sent via secure API channels and are not used by model providers to train foundation models.",
    ]
  },
  {
    id: "04",
    title: "Smart Caching & TTL Retention",
    icon: RefreshCw,
    desc: "To scale API operations efficiently and respect resource constraints, we implement strict caching lifetimes.",
    points: [
      "Search Results Caching: Shared query outputs are cached for a strict 48-hour Time-To-Live (TTL) period before automated purging.",
      "Exclusion Capping: Per-user history lists tracking previously-seen job postings are capped at a maximum of 500 entries.",
      "Deduplication Storage: Normalized query tokens (e.g. dev/developer synonym maps) are cached locally to minimize outer API load.",
    ]
  },
  {
    id: "05",
    title: "Account Deletion & Data Rights",
    icon: Trash2,
    desc: "Users maintain full autonomy over their authentication credentials, database objects, and document indexes.",
    points: [
      "Instant Revocation: Disconnecting Google OAuth immediately terminates active Gmail syncing loops and invalidates refresh tokens.",
      "Permanent Purging: Requesting account deletion triggers database cleanup scripts to completely drop profile tables, resume indexes, and cached history records.",
    ]
  }
]

export default function PolicyPage() {
  return (
    <div className="min-h-screen flex flex-col dot-grid-bg bg-background text-foreground transition-colors duration-200">
      <Navbar />

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-12 lg:py-20 space-y-12">
        {/* Header Block */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="space-y-4 text-center md:text-left"
        >
          <SectionLabel label="LEGAL_COMPLIANCE" number="001" />
          <h1 className="font-pixel text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-none uppercase text-foreground">
            PRIVACY POLICY
          </h1>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-b-2 border-foreground pb-6">
            <p className="text-xs lg:text-sm font-mono text-muted-foreground max-w-2xl leading-relaxed">
              This document details how Pitchr.ai manages user profiles, document assets, Gen-AI synthesizers, and Google API integrations to protect privacy rights.
            </p>
            <span className="shrink-0 self-center md:self-auto px-3 py-1.5 border-2 border-foreground text-[10px] font-mono tracking-widest bg-foreground text-background uppercase">
              LAST UPDATE: 2026.05.24
            </span>
          </div>
        </motion.div>

        {/* Two-Column Grid: Summary Card + Full Document */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          
          {/* Sticky Left Info Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease }}
            className="md:sticky md:top-24 space-y-6"
          >
            <div className="border-2 border-foreground bg-background p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
              <div className="flex items-center gap-2 border-b border-foreground pb-3 mb-4">
                <ShieldCheck className="w-5 h-5 text-[#ea580c]" />
                <span className="text-xs font-mono font-bold tracking-widest uppercase">
                  SECURITY.SUMMARY
                </span>
              </div>
              <p className="text-[11px] font-mono text-muted-foreground leading-relaxed uppercase">
                Pitchr.ai operates on zero-trust principles. We do not store email credentials, we do not train models on your resume, and we enforce a strict 48-hour TTL cache limit on all queries.
              </p>
              <div className="mt-4 pt-4 border-t border-dashed border-foreground/20 text-[9px] font-mono text-muted-foreground">
                [ SERVICE STATUS: SECURE ]<br />
                [ PORT ROUTING: HTTPS/TLS ]<br />
                [ OAUTH SCOPE: Gmail.send ]
              </div>
            </div>
          </motion.div>

          {/* Policy Document Body */}
          <div className="md:col-span-2 space-y-8">
            {POLICY_SECTIONS.map((section, idx) => {
              const Icon = section.icon
              return (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: idx * 0.05, ease }}
                  className="border-2 border-foreground bg-background"
                >
                  {/* Header Bar */}
                  <div className="flex items-center justify-between border-b-2 border-foreground px-4 py-2 bg-muted/5 select-none">
                    <span className="text-[10px] tracking-widest text-[#ea580c] uppercase font-mono font-bold">
                      SECTION {section.id}
                    </span>
                    <span className="text-[10px] tracking-widest text-muted-foreground uppercase font-mono">
                      {section.title.replace(/\s+/g, "_").toLowerCase()}.sys
                    </span>
                  </div>

                  {/* Section Content */}
                  <div className="p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 shrink-0 bg-[#ea580c]/10 border border-[#ea580c]/30 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-[#ea580c]" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xs font-mono font-bold tracking-widest uppercase text-foreground">
                          {section.title}
                        </h3>
                        <p className="text-xs font-mono text-muted-foreground leading-relaxed">
                          {section.desc}
                        </p>
                      </div>
                    </div>

                    {/* Bullet Points */}
                    <div className="space-y-3 pl-11 border-l-2 border-border">
                      {section.points.map((pt, pIdx) => (
                        <div key={pIdx} className="flex gap-2">
                          <span className="text-[#ea580c] font-bold font-mono text-xs shrink-0 select-none">↳</span>
                          <p className="text-[11px] font-mono text-muted-foreground leading-relaxed">
                            {pt}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
