"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Mail, Menu, X } from "lucide-react";

export function NavbarScroll() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = docHeight > 0 ? scrollTop / docHeight : 0;

      setScrollProgress(scrolled);
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "How It Works", href: "#how-it-works" },
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
  ];

  return (
    <>
      {/* Progress bar */}
      <motion.div
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-accent-primary via-accent-primary to-accent-primary/60 z-40"
        style={{ width: `${scrollProgress * 100}%` }}
      />

      {/* Navbar */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-30 transition-all duration-300"
        style={{
          backgroundColor: isScrolled
            ? "rgba(10, 10, 10, 0.92)"
            : "rgba(10, 10, 10, 0.5)",
          backdropFilter: "blur(16px)",
          borderBottom: isScrolled ? "1px solid rgba(31, 41, 55, 1)" : "1px solid rgba(31, 41, 55, 0.3)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 cursor-pointer group transition-all duration-300 hover:scale-105"
          >
            <div className="w-8 h-8 rounded-lg bg-accent-primary flex items-center justify-center transition-all duration-300 group-hover:shadow-lg group-hover:shadow-accent-primary/30 group-hover:scale-110">
              <Mail className="w-4 h-4 text-white transition-transform duration-300 group-hover:rotate-12" />
            </div>
            <span className="text-lg font-bold text-text-primary tracking-tight transition-all duration-300 group-hover:text-accent-primary hidden sm:inline">
              Pitchr AI
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-text-secondary hover:text-accent-primary text-sm font-medium transition-colors duration-300"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="hidden sm:inline-flex px-6 py-2.5 rounded-lg bg-accent-primary hover:bg-accent-primary-hover text-white text-sm font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-accent-primary/20 hover:scale-105 active:scale-95"
            >
              Get Started
            </Link>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-text-primary hover:text-accent-primary transition-colors duration-300"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <motion.div
            className="md:hidden border-t border-border-default bg-bg-base/95 backdrop-blur-md"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="px-6 py-4 space-y-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block text-text-secondary hover:text-accent-primary text-sm font-medium transition-colors duration-300"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <Link
                href="/login"
                className="block w-full text-center px-6 py-2.5 rounded-lg bg-accent-primary hover:bg-accent-primary-hover text-white text-sm font-semibold transition-all duration-300"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </motion.nav>
    </>
  );
}
