"use client";

import Link from "next/link";
import { Mail, Globe, Share2 } from "lucide-react";

export function FooterScroll() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    Product: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "How It Works", href: "#how-it-works" },
    ],
    Company: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "mailto:hello@pitchr.ai" },
    ],
    Legal: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Security", href: "/security" },
    ],
  };

  return (
    <footer className="relative bg-bg-base border-t border-border-default">
      <div className="max-w-7xl mx-auto px-6 py-16 space-y-12">
        {/* Top section */}
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent-primary flex items-center justify-center">
                <Mail className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-text-primary">Pitchr AI</span>
            </Link>
            <p className="text-text-secondary text-sm">
              Built with heart for job seekers everywhere.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com"
                className="p-2 rounded-lg bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-accent-primary transition-all duration-300"
                aria-label="GitHub"
              >
                <Globe className="w-4 h-4" />
              </a>
              <a
                href="https://linkedin.com"
                className="p-2 rounded-lg bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-accent-primary transition-all duration-300"
                aria-label="LinkedIn"
              >
                <Share2 className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category} className="space-y-4">
              <h4 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                {category}
              </h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-text-secondary hover:text-accent-primary text-sm transition-colors duration-300"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-border-default via-border-accent to-border-default" />

        {/* Bottom section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-text-muted text-sm">
            © {currentYear} Pitchr AI. All rights reserved.
          </p>
          <p className="text-text-secondary text-sm text-center md:text-right">
            Helping job seekers scale their outreach, one personalized email at a time.
          </p>
        </div>
      </div>
    </footer>
  );
}
