"use client"

import { Mail } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"

const ease = [0.22, 1, 0.36, 1] as const

// Inline SVG components for social networks because brand icons are not exported in this lucide-react version.
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  )
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, ease }}
      className="w-full border-t-2 border-foreground px-6 py-8 lg:px-12 bg-background select-none"
    >
      <div className="flex flex-col md:flex-row items-start justify-between gap-8">
        
        {/* Left Side: Brand & Social Icons */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <img src="/icon.png" alt="Pitchr Logo" className="w-6 h-6 object-contain flex-shrink-0" />
            <span className="text-xs font-mono tracking-[0.15em] uppercase font-bold text-foreground">
              PITCHR.AI
            </span>
          </div>
          <span className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase">
            {"© 2026 PITCHR AI. BUILT WITH ❤️ FOR JOB SEEKERS."}
          </span>
          
          {/* Social Icons Row */}
          <div className="flex items-center gap-2 mt-1">
            {[
              { icon: GithubIcon, href: "https://github.com/VarunSingh19", label: "GitHub" },
              { icon: LinkedinIcon, href: "https://www.linkedin.com/in/varun-s-80b719249", label: "LinkedIn" },
              { icon: InstagramIcon, href: "https://www.instagram.com/pitchrai/", label: "Instagram" },
            ].map((social, i) => {
              const Icon = social.icon
              return (
                <motion.a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.05 * i, duration: 0.3 }}
                  whileHover={{ y: -2, borderColor: "rgba(var(--foreground), 0.8)" }}
                  whileTap={{ scale: 0.95 }}
                  className="w-7 h-7 border border-foreground/20 hover:border-foreground flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-200"
                  title={social.label}
                >
                  <Icon className="w-3.5 h-3.5" />
                </motion.a>
              )
            })}
          </div>
        </div>

        {/* Right Side: Contact & Navigation */}
        <div className="flex flex-col gap-6 md:items-end">
          {/* Contact block */}
          <div className="flex flex-col gap-2 md:items-end">
            <span className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground uppercase">
              // SUPPORT_CHANNEL
            </span>
            <a
              href="mailto:pitchraijobs@gmail.com"
              className="inline-block text-xs font-mono font-bold tracking-widest uppercase border border-foreground/20 hover:border-[#ea580c] bg-foreground/[0.01] hover:bg-[#ea580c]/5 px-4 py-2 text-foreground hover:text-[#ea580c] transition-all duration-200"
            >
              pitchraijobs@gmail.com
            </a>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 md:justify-end">
            {[
              { label: "Privacy Policy", href: "/policy" },
              { label: "Terms of Service", href: "/terms-and-services" },
              { label: "Launch App", href: "/login" },
            ].map((link, i) => (
              <motion.div
                key={link.label}
                initial={{ opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.06 * i, duration: 0.4, ease }}
              >
                <Link href={link.href} className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors duration-200">
                  {link.label}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </motion.footer>
  )
}
