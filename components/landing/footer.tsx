"use client"

import { Mail } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"

const ease = [0.22, 1, 0.36, 1] as const

export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, ease }}
      className="w-full border-t-2 border-foreground px-6 py-8 lg:px-12 bg-background select-none"
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-[#ea580c] flex items-center justify-center">
              <Mail className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs font-mono tracking-[0.15em] uppercase font-bold text-foreground">
              PITCHR.AI
            </span>
          </div>
          <span className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase">
            {"© 2026 PITCHR AI. BUILT WITH ❤️ FOR JOB SEEKERS."}
          </span>
        </div>
        <div className="flex items-center gap-6">
          {[
            { label: "GitHub", href: "https://github.com/VarunSingh19" },
            { label: "LinkedIn", href: "https://www.linkedin.com/in/varun-s-80b719249" },
            { label: "Launch App", href: "/login" },
          ].map((link, i) => (
            <motion.a
              key={link.label}
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 + i * 0.06, duration: 0.4, ease }}
              className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              {link.label}
            </motion.a>
          ))}
        </div>
      </div>
    </motion.footer>
  )
}
