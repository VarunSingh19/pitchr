"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Clipboard, Check } from "lucide-react"
import { SectionLabel } from "./section-label"

const ease = [0.22, 1, 0.36, 1] as const

const AI_PROMPT_CONTENT = `Search the web for companies actively hiring software engineers or related roles.
For each company:
- Cross-verify HR/careers email from website, LinkedIn, job postings
- Only include verified emails
- Include fit_score explaining match

Return JSON array with fields:
- id, company, location, role, description
- contact_email, alt_email, website
- type, stack, email_verified, fit_score, status`

const SAMPLE_JSON_CONTENT = `[
  {
    "id": 1,
    "company": "Acme Corp",
    "role": "Full Stack Developer",
    "description": "Building scalable SaaS",
    "contact_email": "hr@acmecorp.com",
    "website": "https://acmecorp.com",
    "stack": ["React", "Node.js", "PostgreSQL"],
    "status": "active"
  }
]`

export function HowItWorks() {
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [copiedJson, setCopiedJson] = useState(false)

  const handleCopy = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section id="how-it-works" className="w-full px-6 py-20 lg:px-12 bg-background">
      <SectionLabel label="THREE_STEP_WORKFLOW" number="003" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Step 1: AI Prompt */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, ease }}
          className="flex flex-col border-2 border-foreground bg-background"
        >
          <div className="flex items-center justify-between border-b-2 border-foreground px-4 py-2">
            <span className="text-[10px] tracking-widest text-[#ea580c] uppercase font-mono">
              01 — GENERATE LEADS
            </span>
            <span className="text-[10px] tracking-widest text-muted-foreground uppercase font-mono">
              prompt.txt
            </span>
          </div>
          <div className="p-4 flex-1 flex flex-col justify-between">
            <p className="text-xs font-mono text-muted-foreground mb-4 leading-relaxed">
              Use ChatGPT, Gemini, or Claude to scrape target roles. Copy this prompt to compile verified lead tables.
            </p>
            <div className="relative bg-foreground p-3 border-2 border-foreground mb-4 flex-1 font-mono text-[10px] text-background leading-relaxed overflow-x-auto whitespace-pre-wrap select-all">
              {AI_PROMPT_CONTENT}
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleCopy(AI_PROMPT_CONTENT, setCopiedPrompt)}
              className="w-full py-2 border-2 border-foreground text-xs font-mono tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-foreground hover:text-background transition-colors duration-200"
            >
              {copiedPrompt ? (
                <>
                  <Check size={12} />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Clipboard size={12} />
                  <span>Copy Prompt</span>
                </>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Step 2: Leads format JSON */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, delay: 0.1, ease }}
          className="flex flex-col border-2 border-foreground bg-background"
        >
          <div className="flex items-center justify-between border-b-2 border-foreground px-4 py-2">
            <span className="text-[10px] tracking-widest text-[#ea580c] uppercase font-mono">
              02 — UPLOAD FORMAT
            </span>
            <span className="text-[10px] tracking-widest text-muted-foreground uppercase font-mono">
              leads.json
            </span>
          </div>
          <div className="p-4 flex-1 flex flex-col justify-between">
            <p className="text-xs font-mono text-muted-foreground mb-4 leading-relaxed">
              Save lead lists as structured JSON. Pitchr parses this format to align details with target positions.
            </p>
            <div className="relative bg-foreground p-3 border-2 border-foreground mb-4 flex-1 font-mono text-[10px] text-background leading-relaxed overflow-x-auto whitespace-pre select-all">
              {SAMPLE_JSON_CONTENT}
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleCopy(SAMPLE_JSON_CONTENT, setCopiedJson)}
              className="w-full py-2 border-2 border-foreground text-xs font-mono tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-foreground hover:text-background transition-colors duration-200"
            >
              {copiedJson ? (
                <>
                  <Check size={12} />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Clipboard size={12} />
                  <span>Copy Schema</span>
                </>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Step 3: Run pipeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, delay: 0.2, ease }}
          className="flex flex-col border-2 border-foreground bg-background"
        >
          <div className="flex items-center justify-between border-b-2 border-foreground px-4 py-2">
            <span className="text-[10px] tracking-widest text-[#ea580c] uppercase font-mono">
              03 — RUN ENGINE
            </span>
            <span className="text-[10px] tracking-widest text-muted-foreground uppercase font-mono">
              verify_send.exe
            </span>
          </div>
          <div className="p-4 flex-1 flex flex-col justify-between">
            <div className="flex-1">
              <p className="text-xs font-mono text-muted-foreground mb-4 leading-relaxed">
                Connect your account to kickstart your personalized cold outreach loops.
              </p>
              <div className="space-y-4 font-mono text-[11px] text-foreground leading-relaxed mt-2 pl-2 border-l-2 border-border mb-6">
                <div>
                  <span className="text-[#ea580c] font-bold">1. Upload Context:</span>
                  <p className="text-muted-foreground mt-0.5">Drag-and-drop the generated JSON leads sheet along with your latest PDF resume.</p>
                </div>
                <div>
                  <span className="text-[#ea580c] font-bold">2. Review Drafts:</span>
                  <p className="text-muted-foreground mt-0.5">Check every customized email. Modify wording, check email routing validation, or edit contact parameters.</p>
                </div>
                <div>
                  <span className="text-[#ea580c] font-bold">3. Gmail Dispatch:</span>
                  <p className="text-muted-foreground mt-0.5">Launch your campaign. Pitchr rate-limits email delivery to safeguard sender score reputation.</p>
                </div>
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="p-2 border border-dashed border-foreground/30 text-center text-[10px] text-muted-foreground font-mono">
                [ SMTP-SYNC ENGAGED · DELAY: 90s ]
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
