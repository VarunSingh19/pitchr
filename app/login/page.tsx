"use client"

import { signIn } from "next-auth/react"
import { useEffect, useState } from "react"
import { Mail, ArrowRight, Zap, ArrowLeft, Check } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ScrambleText } from "@/components/landing/scramble-text"
import { SectionLabel } from "@/components/landing/section-label"
import { ThemeToggle } from "@/components/landing/theme-toggle"

const ease = [0.22, 1, 0.36, 1] as const

const FEATURES = [
  "AI-powered personalized pitches at scale",
  "Secure Gmail integration with rate-limiting",
  "Real-time campaign tracking & read pixels",
  "Upload resumes and leads in bulk (JSON)",
  "Review every single email draft before sending"
]

export default function LoginPage() {
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePolicy, setAgreePolicy] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="min-h-screen dot-grid-bg bg-background" />
  }

  return (
    <div className="min-h-screen flex flex-col dot-grid-bg bg-background text-foreground transition-colors duration-200">
      {/* Navbar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="w-full px-4 pt-4 lg:px-6 lg:pt-6 z-50"
      >
        <nav className="w-full border border-foreground/20 bg-background/80 backdrop-blur-md px-6 py-3 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-6 h-6 bg-[#ea580c] flex items-center justify-center">
                <Mail className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs font-mono tracking-[0.15em] uppercase font-bold">
                PITCHR.AI
              </span>
            </Link>

            {/* Back link */}
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Link
                href="/"
                className="flex items-center text-xs font-mono tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors duration-200 group"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
                <span>Back to home</span>
              </Link>
            </div>
          </div>
        </nav>
      </motion.div>

      {/* Main container */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:py-16">
        <div className="w-full max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-stretch">
            {/* Left Column: Info Desk */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease }}
              className="flex flex-col justify-between"
            >
              <div className="space-y-6">
                <SectionLabel label="OUTBOUND_AUTHENTICATION" number="001" />

                <h1 className="font-pixel text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-none uppercase text-foreground">
                  START AUTOMATING.
                </h1>

                <p className="text-xs lg:text-sm font-mono text-muted-foreground leading-relaxed max-w-md">
                  Authenticate your account to orchestrate bulk campaigns, evaluate alignment quotients, and customize cold mail loops.
                </p>

                {/* Features checklist */}
                <div className="space-y-3 pt-4 border-l-2 border-border pl-4">
                  {FEATURES.map((feat, fi) => (
                    <motion.div
                      key={feat}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: fi * 0.08 + 0.2, duration: 0.4, ease }}
                      className="flex items-center gap-2.5 text-xs font-mono text-muted-foreground"
                    >
                      <span className="h-1.5 w-1.5 bg-[#ea580c]" />
                      <span>{feat.toUpperCase()}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-0 mt-8 border-2 border-foreground bg-background">
                <div className="p-4 border-r-2 border-foreground flex flex-col gap-1">
                  <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
                    EMAILS_PERSONALIZED
                  </span>
                  <span className="text-xl lg:text-2xl font-mono font-bold text-foreground">
                    <ScrambleText text="50K+" />
                  </span>
                </div>
                <div className="p-4 flex flex-col gap-1">
                  <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
                    DELIVERY_SUCCESS
                  </span>
                  <span className="text-xl lg:text-2xl font-mono font-bold text-foreground">
                    <ScrambleText text="98.7%" />
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Right Column: Brutalist Login Card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease }}
              className="flex items-center justify-center"
            >
              <div className="w-full border-2 border-foreground bg-background text-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                {/* Card Window Controls Bar */}
                <div className="flex items-center gap-2 border-b-2 border-foreground px-4 py-3 bg-muted/10">
                  <span className="h-2.5 w-2.5 bg-[#ea580c]" />
                  <span className="h-2.5 w-2.5 bg-foreground" />
                  <span className="h-2.5 w-2.5 border border-foreground" />
                  <span className="ml-auto text-[10px] tracking-widest text-muted-foreground uppercase font-mono">
                    auth_provider.exe
                  </span>
                </div>

                <div className="p-6 lg:p-8 space-y-6">
                  {/* Headline */}
                  <div className="space-y-2">
                    <h2 className="text-lg font-mono font-bold tracking-widest uppercase">
                      SYS.LOGIN
                    </h2>
                    <p className="text-xs font-mono text-muted-foreground leading-relaxed">
                      Pitchr uses OAuth2 credentials to link Gmail dispatch loops. Agree to our policies below to continue.
                    </p>
                  </div>

                  {/* Legal Agreements Checkboxes */}
                  <div className="space-y-3 pt-2 font-mono text-[11px] text-muted-foreground select-none">
                    <label className="flex items-start gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 border-2 border-foreground shrink-0 flex items-center justify-center transition-colors duration-150 ${agreeTerms ? 'bg-[#ea580c] border-[#ea580c]' : 'bg-background hover:border-[#ea580c]'}`}>
                        {agreeTerms && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3.5} />}
                      </div>
                      <span className="leading-tight text-left">
                        I ACCEPT THE{" "}
                        <Link href="/terms-and-services" target="_blank" className="text-foreground hover:text-[#ea580c] underline transition-colors font-bold">
                          TERMS & SERVICES
                        </Link>
                      </span>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={agreePolicy}
                        onChange={(e) => setAgreePolicy(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 border-2 border-foreground shrink-0 flex items-center justify-center transition-colors duration-150 ${agreePolicy ? 'bg-[#ea580c] border-[#ea580c]' : 'bg-background hover:border-[#ea580c]'}`}>
                        {agreePolicy && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3.5} />}
                      </div>
                      <span className="leading-tight text-left">
                        I ACCEPT THE{" "}
                        <Link href="/policy" target="_blank" className="text-foreground hover:text-[#ea580c] underline transition-colors font-bold">
                          PRIVACY POLICY
                        </Link>
                      </span>
                    </label>
                  </div>

                  {/* Google Authenticator CTA button */}
                  <motion.button
                    whileHover={(!agreeTerms || !agreePolicy || isRedirecting) ? {} : { scale: 1.02 }}
                    whileTap={(!agreeTerms || !agreePolicy || isRedirecting) ? {} : { scale: 0.98 }}
                    disabled={isRedirecting || !agreeTerms || !agreePolicy}
                    onClick={() => {
                      setIsRedirecting(true)
                      signIn("google", { callbackUrl: "/dashboard" })
                    }}
                    className="group/btn w-full flex items-center bg-foreground text-background text-xs font-mono tracking-widest uppercase select-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="bg-background w-12 h-12 flex items-center justify-center border-r border-foreground shrink-0">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                    </span>
                    <span className="flex-1 flex items-center justify-center gap-2 py-3.5 font-bold tracking-widest text-center">
                      {isRedirecting && (
                        <span className="h-3.5 w-3.5 border-2 border-background border-t-transparent animate-spin rounded-full shrink-0" />
                      )}
                      {isRedirecting ? "CONNECTING..." : "SIGN IN WITH GOOGLE"}
                    </span>
                  </motion.button>

                  <div className="p-3 border border-dashed border-foreground/20 text-center font-mono text-[9px] text-muted-foreground uppercase">
                    [ GMAIL-API · SECURE INTEGRATED · SANDBOXED ]
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
