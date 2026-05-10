"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function CtaSection() {
  return (
    <section className="relative py-32 px-6 bg-bg-surface border-y border-border-default overflow-hidden">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-accent-primary/10 via-transparent to-accent-primary/5 opacity-50" />
      <div className="absolute inset-0">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-accent-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-accent-primary/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left column - Content */}
          <motion.div
            className="space-y-8"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="space-y-4">
              <h2 className="text-5xl md:text-6xl font-bold text-text-primary text-balance leading-tight">
                Ready to scale your outreach?
              </h2>
              <p className="text-lg text-text-secondary">
                Join hundreds of job seekers using Pitchr to land more interviews with AI-powered
                personalization.
              </p>
            </div>

            {/* Trust badges */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-accent-primary" />
                <span className="text-text-secondary">24/7 Support</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-accent-primary" />
                <span className="text-text-secondary">1000+ Users</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-accent-primary" />
                <span className="text-text-secondary">Secure Gmail Integration</span>
              </div>
            </div>
          </motion.div>

          {/* Right column - CTA */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="relative rounded-2xl bg-gradient-to-br from-accent-primary/20 to-accent-primary/5 border border-border-accent p-8 space-y-6 overflow-hidden group">
              {/* Animated background glow */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-accent-primary/30 to-transparent opacity-0 group-hover:opacity-20 transition-all duration-300 rounded-2xl"
                animate={{
                  backgroundPosition: ["0% 0%", "100% 100%"],
                }}
                transition={{ duration: 3, repeat: Infinity }}
              />

              <div className="relative z-10 space-y-4">
                <h3 className="text-2xl font-bold text-text-primary">
                  Get started free
                </h3>
                <p className="text-text-secondary">
                  No credit card required. Access all features for your first 10 outreach campaigns.
                </p>

                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold transition-all duration-300 hover:shadow-xl hover:shadow-accent-primary/30 hover:scale-105 active:scale-95 group/btn"
                >
                  <span>Start Outreaching</span>
                  <motion.span
                    animate={{ x: 4 }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </motion.span>
                </Link>

                <p className="text-xs text-text-muted">
                  ✓ Instant access • ✓ All features • ✓ No setup required
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
