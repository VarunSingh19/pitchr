"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Link from "next/link";

export function HeroScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const element = containerRef.current;
      const elementTop = element.offsetTop;
      const elementHeight = element.offsetHeight;
      const windowHeight = window.innerHeight;
      
      const scrollTop = window.scrollY;
      const elementBottom = elementTop + elementHeight;
      
      if (scrollTop + windowHeight >= elementTop && scrollTop <= elementBottom) {
        const progress = (scrollTop - elementTop + windowHeight) / (elementHeight + windowHeight);
        setScrollProgress(Math.max(0, Math.min(1, progress)));
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fadeInValue = scrollProgress < 0.3 ? scrollProgress / 0.3 : 1;
  const fadeOutValue = scrollProgress > 0.7 ? 1 - (scrollProgress - 0.7) / 0.3 : 1;
  const opacity = Math.min(fadeInValue, fadeOutValue);

  return (
    <div
      ref={containerRef}
      className="relative h-screen flex items-center justify-center overflow-hidden bg-bg-base"
      style={{ height: "500vh" }}
    >
      <div className="sticky top-0 h-screen flex items-center justify-center">
        {/* Background gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg-base/50 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-base via-transparent pointer-events-none" />

        {/* Hero content container */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center space-y-8">
          {/* Subtitle overlay */}
          <motion.div
            className="text-2xl md:text-3xl font-light text-text-secondary"
            style={{
              opacity: scrollProgress < 0.2 ? (0.2 - scrollProgress) / 0.2 : 0,
            }}
          >
            Stop sending generic emails
          </motion.div>

          {/* Main hero content */}
          <motion.div
            className="space-y-6"
            style={{
              opacity: Math.min(Math.max((scrollProgress - 0.15) / 0.3, 0), 1),
            }}
          >
            <h1 className="text-7xl md:text-8xl font-bold tracking-tighter leading-[0.9] text-balance">
              <span className="bg-gradient-to-r from-accent-primary via-accent-primary to-accent-primary/60 bg-clip-text text-transparent">
                PITCHR
              </span>
            </h1>

            <div className="space-y-4 max-w-2xl mx-auto">
              <p className="text-lg md:text-xl text-text-secondary leading-relaxed">
                AI-powered outreach at scale
              </p>
              <p className="text-base text-text-muted leading-relaxed">
                Upload your leads and resume. Let AI craft personalized emails. Send them all in one click.
              </p>
            </div>

            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
              whileHover={{ scale: 1.02 }}
            >
              <Link
                href="/login"
                className="group relative px-8 py-4 rounded-xl bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold transition-all duration-300 hover:shadow-xl hover:shadow-accent-primary/30 flex items-center gap-2"
              >
                <span>Get Started</span>
                <motion.span
                  animate={{ x: 4 }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  →
                </motion.span>
              </Link>

              <a
                href="#how-it-works"
                className="px-8 py-4 rounded-xl border border-border-default hover:border-border-accent text-text-primary hover:text-accent-primary transition-all duration-300 font-medium"
              >
                Learn More
              </a>
            </motion.div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
            animate={{
              y: [0, 12, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
            style={{
              opacity: scrollProgress > 0.8 ? (1 - scrollProgress) / 0.2 : 1,
            }}
          >
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs text-text-muted font-medium uppercase tracking-wider">
                Scroll
              </span>
              <ChevronDown className="w-5 h-5 text-accent-primary" />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
