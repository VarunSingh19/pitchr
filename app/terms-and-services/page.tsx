"use client"

import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { SectionLabel } from "@/components/landing/section-label"
import { motion } from "framer-motion"
import { FileText, Cpu, UserCheck, CreditCard, AlertTriangle, Scale } from "lucide-react"

const ease = [0.22, 1, 0.36, 1] as const

const TERMS_SECTIONS = [
  {
    id: "01",
    title: "Scope & Provision of Services",
    icon: Cpu,
    desc: "Pitchr.ai provides a deterministic cold email automation platform designed for personalized career outreach.",
    points: [
      "Core Functions: Services include company lead discovery, automated email text personalization, secure draft reviews, and Gmail inbox dispatching.",
      "Evolution of Utility: We reserve the right to alter interfaces, quota allocations, caching schemas, or AI model vendors to optimize deliverability.",
    ]
  },
  {
    id: "02",
    title: "Authentication & Account Security",
    icon: UserCheck,
    desc: "User access requires OAuth2 authentication via next-auth identity providers.",
    points: [
      "Access Portals: Account creation is verified through Google Auth. You are solely responsible for actions taken using your logged session.",
      "Token Lifetime: Pitchr.ai retains secure token indexes to maintain connection states; you can revoke permissions anytime via your Google Settings dashboard.",
    ]
  },
  {
    id: "03",
    title: "Credit Quotas & Subscriptions",
    icon: CreditCard,
    desc: "Usage is governed by structured monthly plan quotas linked to specific visual user badges.",
    points: [
      "Quota Depletion: Executing a live lead query or sending a dispatch campaign consumes available tier tokens based on your current plan status.",
      "Deduplication Logic: Searching for queries currently verified in our 48-hour shared cache does not consume standard credits unless explicitly forced.",
      "Badge Identity: Subscribing unlocks distinct badges (Starter, Pro, Enterprise) rendering across user workspaces.",
    ]
  },
  {
    id: "04",
    title: "Acceptable Use & Spam Restrictions",
    icon: AlertTriangle,
    desc: "Pitchr.ai enforces strict rules to combat malicious emailing practices and protect domain reputations.",
    points: [
      "Strict Prohibitions: You may not use Pitchr.ai to dispatch spam, marketing campaigns, bulk advertisement scripts, or messages violating CAN-SPAM, GDPR, or similar regional acts.",
      "Rate limits: Outbound queues are governed by safety throttles. Bypassing rate-limiting mechanisms or manipulating headers is ground for account termination.",
    ]
  },
  {
    id: "05",
    title: "Disclaimers & Liability Bounds",
    icon: Scale,
    desc: "Our platform offers tools for job discovery and communication; we do not govern the endpoints.",
    points: [
      "No Guarantee: We make no warrant regarding response rates, interview success, or job recruitment outcomes.",
      "Delivery Risk: Pitchr.ai is not responsible for external provider actions, including Gmail account suspensions, spam folder filtering, or bouncebacks.",
      "As-Is Provision: The software is delivered 'as-is' without liability for uptime delays, network anomalies, or database synchronization lag.",
    ]
  }
]

export default function TermsPage() {
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
          <SectionLabel label="TERMS_OF_SERVICE" number="002" />
          <h1 className="font-pixel text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-none uppercase text-foreground">
            TERMS & SERVICES
          </h1>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-b-2 border-foreground pb-6">
            <p className="text-xs lg:text-sm font-mono text-muted-foreground max-w-2xl leading-relaxed">
              These terms define the contract between user sessions and the Pitchr.ai outreach dashboard. Accessing the service implies agreement with these conditions.
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
                <FileText className="w-5 h-5 text-[#ea580c]" />
                <span className="text-xs font-mono font-bold tracking-widest uppercase">
                  AGREEMENT.OUTLINE
                </span>
              </div>
              <p className="text-[11px] font-mono text-muted-foreground leading-relaxed uppercase">
                By connecting your Gmail channel, you acknowledge that you will not use this tool for bulk commercial spamming, and that you assume full responsibility for email deliverability and compliance.
              </p>
              <div className="mt-4 pt-4 border-t border-dashed border-foreground/20 text-[9px] font-mono text-muted-foreground">
                [ LICENSE: SINGLE USER ]<br />
                [ PROVISION: CLOUD ONLY ]<br />
                [ JURISDICTION: GLOBAL ]
              </div>
            </div>
          </motion.div>

          {/* Policy Document Body */}
          <div className="md:col-span-2 space-y-8">
            {TERMS_SECTIONS.map((section, idx) => {
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
