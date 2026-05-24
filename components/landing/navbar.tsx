"use client"

import { Mail } from "lucide-react"
import { motion } from "framer-motion"
import { ThemeToggle } from "./theme-toggle"
import Link from "next/link"

export function Navbar() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full px-4 pt-4 lg:px-6 lg:pt-6 sticky top-0 z-50"
    >
      <nav className="w-full border border-foreground/20 bg-background/80 backdrop-blur-md px-4 sm:px-6 py-2.5 sm:py-3 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex items-center gap-3"
          >
            <Link href="/" className="flex items-center gap-2">
              <img src="/icon.png" alt="Pitchr Logo" className="w-7 h-7 object-contain flex-shrink-0" />
              <span className="text-xs font-mono tracking-[0.15em] uppercase font-bold">
                PITCHR.AI
              </span>
            </Link>
          </motion.div>

          {/* Center nav links */}
          <div className="hidden md:flex items-center gap-8">
            {[
              { label: "Platform", href: "#platform" },
              { label: "Pricing", href: "#pricing" },
              { label: "How It Works", href: "#how-it-works" },
            ].map((link, i) => (
              <motion.a
                key={link.label}
                href={link.href}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="text-xs font-mono tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                {link.label}
              </motion.a>
            ))}
          </div>

          {/* Right side: Login + CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="flex items-center gap-3 sm:gap-4"
          >
            <ThemeToggle />
            <Link
              href="/login"
              className="hidden sm:inline-block text-xs font-mono tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Log In
            </Link>
            
            {/* Split CTA button */}
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center bg-foreground text-background text-[10px] sm:text-xs font-mono tracking-widest uppercase"
              >
                <span className="bg-[#ea580c] text-white w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center border-r border-background/20">
                  →
                </span>
                <span className="px-3 py-1.5 sm:px-4 sm:py-2">
                  Get Started
                </span>
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </nav>
    </motion.div>
  )
}
