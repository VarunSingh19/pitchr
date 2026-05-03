"use client";

import {
  Mail,
  FileJson,
  Sparkles,
  Send,
  ArrowRight,
  Copy,
  Check,
  Zap,
  Shield,
  Clock,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";

const SAMPLE_JSON = `[
  {
    "id": 1,
    "company": "Acme Corp",
    "role": "Full Stack Developer",
    "description": "Building scalable SaaS platform",
    "contact_email": "hr@acmecorp.com",
    "alt_email": "careers@acmecorp.com",
    "website": "https://acmecorp.com",
    "type": "startup",
    "stack": ["React", "Node.js", "PostgreSQL"],
    "fit_score": "High",
    "status": "active"
  }
]`;

const LEADS_PROMPT = `
Search the web for companies in [YOUR CITY] actively hiring [YOUR ROLE e.g. Full Stack Developer / React / Node.js].
For each company found:
- Cross-verify their HR/careers email by checking their website, LinkedIn, job postings, and Glassdoor
- Only include companies where an email can be confirmed or reasonably inferred from their domain
- Mark email_verified: true only if the email was directly found in a public source (job post, LinkedIn, website)
- Include fit_score explaining why this company is a good match

Return a JSON array with these exact fields per company:
{
  "id": number,
  "company": "Company Name",
  "location": "City, State",
  "area": "Specific area/district",
  "role": "Exact role they are hiring for",
  "description": "2-3 sentence company description and why they are hiring",
  "contact_email": "primary email",
  "alt_email": "backup email or null",
  "website": "domain.com",
  "type": "Full-time / Freelance / Contract",
  "stack": ["Tech1", "Tech2"],
  "email_verified": true/false,
  "email_source": "Where this email was found",
  "fit_score": "Why this is a good match for me",
  "status": "Actively Hiring / Hiring / Open"
}

Find at least 20 companies. Do deep web search across Indeed, Glassdoor, LinkedIn, Cutshort, Wellfound, and company websites.
`;

export default function Home() {
  const [copied, setCopied] = useState<"prompt" | "json" | null>(null);

  const handleCopy = (text: string, type: "prompt" | "json") => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 border-b border-border-default bg-bg-base/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-primary flex items-center justify-center">
              <Mail className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-text-primary tracking-tight">
              Pitchr
            </span>
          </div>
          <Link
            href="/login"
            className="px-5 py-2 rounded-xl bg-accent-primary hover:bg-accent-primary-hover text-white text-sm font-medium transition-all duration-200 hover:shadow-lg hover:shadow-accent-primary/20"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-24 pb-20 px-6 overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-accent-primary/3 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border-subtle bg-bg-surface text-sm text-text-secondary mb-8 animate-fade-in">
            <Zap className="w-3.5 h-3.5 text-accent-primary" />
            AI-Powered Cold Email Automation
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6 animate-fade-in-up">
            Personalized outreach
            <br />
            <span className="bg-gradient-to-r from-accent-primary to-accent-primary-hover bg-clip-text text-transparent">
              at scale
            </span>
          </h1>

          <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-10 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            Upload your leads, let AI craft personalized emails using your
            resume, review every message, then send them all — with your resume
            attached — through Gmail.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <Link
              href="/login"
              id="hero-get-started"
              className="group px-8 py-3.5 rounded-2xl bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold transition-all duration-200 flex items-center gap-2 hover:shadow-xl hover:shadow-accent-primary/25 hover:scale-[1.02]"
            >
              Get Started
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#how-it-works"
              className="px-8 py-3.5 rounded-2xl border border-border-subtle hover:border-border-default text-text-secondary hover:text-text-primary font-medium transition-all duration-200"
            >
              How it works
            </a>
          </div>
        </div>
      </section>

      {/* ── Features strip ── */}
      <section className="py-6 border-y border-border-default bg-bg-surface/50">
        <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          {[
            { icon: Sparkles, text: "AI-Personalized Emails" },
            { icon: Shield, text: "Secure Gmail App Passwords" },
            { icon: Clock, text: "Rate-Limited Sending" },
            { icon: Send, text: "Real-Time Progress" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-sm text-text-muted">
              <Icon className="w-4 h-4 text-accent-primary" />
              {text}
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Three steps to automated outreach
            </h2>
            <p className="text-text-secondary text-lg max-w-xl mx-auto">
              From lead generation to personalized emails — all in one workflow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="group relative">
              <div className="absolute -top-3 -left-3 w-10 h-10 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-accent-primary font-bold text-sm">
                01
              </div>
              <div className="pt-10 p-6 rounded-2xl bg-bg-surface border border-border-default hover:border-border-subtle transition-all duration-300 h-full">
                <div className="w-12 h-12 rounded-xl bg-accent-dim flex items-center justify-center mb-5">
                  <FileJson className="w-6 h-6 text-accent-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Generate Your Leads</h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  Use the AI prompt below to generate a JSON file of target
                  companies with roles, emails, and tech stacks.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="group relative">
              <div className="absolute -top-3 -left-3 w-10 h-10 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-accent-primary font-bold text-sm">
                02
              </div>
              <div className="pt-10 p-6 rounded-2xl bg-bg-surface border border-border-default hover:border-border-subtle transition-all duration-300 h-full">
                <div className="w-12 h-12 rounded-xl bg-accent-dim flex items-center justify-center mb-5">
                  <Sparkles className="w-6 h-6 text-accent-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Upload & Generate</h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  Upload the JSON + your resume PDF, enter Gmail credentials,
                  then let AI generate personalized emails for each company.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="group relative">
              <div className="absolute -top-3 -left-3 w-10 h-10 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-accent-primary font-bold text-sm">
                03
              </div>
              <div className="pt-10 p-6 rounded-2xl bg-bg-surface border border-border-default hover:border-border-subtle transition-all duration-300 h-full">
                <div className="w-12 h-12 rounded-xl bg-accent-dim flex items-center justify-center mb-5">
                  <Send className="w-6 h-6 text-accent-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Review & Send</h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  Preview every email, edit if needed, select which to send,
                  then launch the batch with real-time progress tracking.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Leads Generation Prompt ── */}
      <section className="py-20 px-6 bg-bg-surface/30 border-y border-border-default">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
              Leads Generation Prompt
            </h2>
            <p className="text-text-secondary">
              Copy this prompt into ChatGPT / Gemini to generate your leads JSON file.
            </p>
          </div>

          <div className="relative rounded-2xl bg-bg-base border border-border-default overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border-default bg-bg-elevated/50">
              <span className="text-xs font-mono text-text-muted">AI Prompt</span>
              <button
                onClick={() => handleCopy(LEADS_PROMPT, "prompt")}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent-primary transition-colors"
              >
                {copied === "prompt" ? (
                  <><Check className="w-3.5 h-3.5" /> Copied!</>
                ) : (
                  <><Copy className="w-3.5 h-3.5" /> Copy</>
                )}
              </button>
            </div>
            <pre className="p-5 text-sm text-text-secondary font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">
              {LEADS_PROMPT}
            </pre>
          </div>
        </div>
      </section>

      {/* ── Sample JSON ── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
              Expected JSON Format
            </h2>
            <p className="text-text-secondary">
              Your leads file should follow this exact structure.
            </p>
          </div>

          <div className="relative rounded-2xl bg-bg-surface border border-border-default overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border-default bg-bg-elevated/50">
              <span className="text-xs font-mono text-text-muted">leads.json</span>
              <button
                onClick={() => handleCopy(SAMPLE_JSON, "json")}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent-primary transition-colors"
              >
                {copied === "json" ? (
                  <><Check className="w-3.5 h-3.5" /> Copied!</>
                ) : (
                  <><Copy className="w-3.5 h-3.5" /> Copy</>
                )}
              </button>
            </div>
            <pre className="p-5 text-sm text-text-secondary font-mono leading-relaxed overflow-x-auto">
              {SAMPLE_JSON}
            </pre>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-6 border-t border-border-default">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-text-faint">
          <span>Pitchr — Built for job seekers</span>
          <span>Powered by Gemini</span>
        </div>
      </footer>
    </div>
  );
}
