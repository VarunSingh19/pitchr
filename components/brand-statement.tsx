"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const STATS = [
  { number: "1000+", label: "Emails Sent" },
  { number: "85%", label: "Open Rate" },
  { number: "3", label: "Step Workflow" },
];

function Counter({ target }: { target: number }) {
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasAnimated.current) {
        hasAnimated.current = true;
        let currentCount = 0;
        const increment = target / 30;

        const timer = setInterval(() => {
          currentCount += increment;
          if (currentCount >= target) {
            setCount(target);
            clearInterval(timer);
          } else {
            setCount(Math.floor(currentCount));
          }
        }, 30);

        return () => clearInterval(timer);
      }
    });

    const element = document.querySelector("[data-counter]");
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, [target]);

  return <span>{count}</span>;
}

export function BrandStatement() {
  return (
    <section className="relative py-32 px-6 bg-bg-base border-y border-border-default overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-primary/3 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Headline */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-5xl md:text-6xl font-bold text-text-primary text-balance leading-tight mb-6">
            Not just another tool. Your AI-powered job hunting assistant.
          </h2>
          <p className="text-lg text-text-secondary max-w-3xl mx-auto">
            Pitchr intelligently personalizes every outreach, respects rate limits, and gives you full control before sending.
          </p>
        </motion.div>

        {/* Two-column layout */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left column - Body copy */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="space-y-4 text-text-secondary">
              <p>
                Tired of manually crafting cold emails to hundreds of companies? Pitchr automates the entire process while keeping you in control.
              </p>
              <p>
                Our AI learns from your resume and experience, creating genuinely personalized outreach that feels authentic—not templated.
              </p>
              <p>
                Every email goes through your review before sending, ensuring quality and your peace of mind.
              </p>
            </div>
          </motion.div>

          {/* Right column - Stats */}
          <motion.div
            className="grid grid-cols-3 gap-8"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            data-counter
          >
            {STATS.map((stat, index) => (
              <motion.div
                key={index}
                className="text-center p-6 rounded-2xl bg-bg-surface border border-border-default hover:border-border-accent transition-colors duration-300"
                whileHover={{ scale: 1.05, borderColor: "var(--border-accent)" }}
              >
                <div className="text-3xl md:text-4xl font-bold text-accent-primary mb-2">
                  {stat.number.includes("+") || stat.number.includes("%")
                    ? stat.number
                    : stat.number === "3"
                    ? "3"
                    : ""}
                </div>
                <p className="text-sm text-text-muted uppercase tracking-wider font-medium">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
