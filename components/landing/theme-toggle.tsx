"use client"

import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div className="w-8 h-8 border border-foreground/20" aria-hidden="true" />
    )
  }

  const isDark = theme === "dark"

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const nextTheme = isDark ? "light" : "dark"
    const doc = typeof document !== "undefined" ? (document as any) : null

    if (
      !doc ||
      !doc.startViewTransition ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setTheme(nextTheme)
      return
    }

    const x = e.clientX
    const y = e.clientY
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )

    const isDarkToLight = isDark

    if (isDarkToLight) {
      doc.documentElement.classList.add("dark-to-light-transition")
    }

    const transition = doc.startViewTransition(() => {
      setTheme(nextTheme)
      if (typeof document !== "undefined") {
        const root = document.documentElement
        if (nextTheme === "dark") {
          root.classList.add("dark")
        } else {
          root.classList.remove("dark")
        }
      }
    })

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`,
      ]

      doc.documentElement.animate(
        {
          clipPath: isDarkToLight ? [...clipPath].reverse() : clipPath,
        },
        {
          duration: 750, // Cinematic transition speed
          easing: "ease-in-out",
          pseudoElement: isDarkToLight
            ? "::view-transition-old(root)"
            : "::view-transition-new(root)",
        }
      )
    })

    transition.finished.then(() => {
      if (isDarkToLight) {
        doc.documentElement.classList.remove("dark-to-light-transition")
      }
    })
  }

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      onClick={handleToggle}
      className="relative w-8 h-8 flex items-center justify-center border border-foreground/20 bg-background/50 hover:bg-foreground/5 text-foreground transition-colors duration-200"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span
            key="sun"
            initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <Sun size={14} strokeWidth={1.5} />
          </motion.span>
        ) : (
          <motion.span
            key="moon"
            initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <Moon size={14} strokeWidth={1.5} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
