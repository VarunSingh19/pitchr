"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";

const LEADS_PROMPT = `Search the web for companies actively hiring [YOUR ROLE].
For each company:
- Cross-verify HR/careers email from website, LinkedIn, job postings
- Only include verified emails
- Include fit_score explaining match

Return JSON array with fields:
- id, company, location, role, description
- contact_email, alt_email, website
- type, stack, email_verified, fit_score, status

Find at least 20 companies from Indeed, Glassdoor, LinkedIn, etc.`;

const SAMPLE_JSON = `[
  {
    "id": 1,
    "company": "Acme Corp",
    "role": "Full Stack Developer",
    "description": "Building scalable SaaS",
    "contact_email": "hr@acmecorp.com",
    "website": "https://acmecorp.com",
    "stack": ["React", "Node.js", "PostgreSQL"],
    "status": "active"
  }
]`;

function CopyButton({
  text,
  label,
}: {
  text: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          Copy {label}
        </>
      )}
    </button>
  );
}

export function AiPromptSection() {
  return (
    <section className="relative py-32 px-6 bg-bg-base overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent-primary/20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-sm font-semibold text-accent-primary mb-4 uppercase tracking-wider">
            AI Generation
          </p>
          <h2 className="text-5xl md:text-6xl font-bold text-text-primary text-balance leading-tight mb-6">
            Generate your leads
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Copy this prompt into ChatGPT or Gemini to generate your structured leads file.
          </p>
        </motion.div>

        {/* Prompt Card */}
        <motion.div
          className="relative rounded-2xl bg-bg-surface border border-border-default overflow-hidden group hover:border-border-accent hover:shadow-xl hover:shadow-accent-primary/10 transition-all duration-300 mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {/* Glass effect on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-5 bg-gradient-to-br from-accent-primary to-transparent transition-opacity duration-300 pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-default bg-accent-primary/5">
            <span className="text-xs font-mono text-text-muted font-semibold">
              AI_PROMPT.txt
            </span>
            <CopyButton text={LEADS_PROMPT} label="Prompt" />
          </div>

          {/* Content */}
          <pre className="p-6 text-sm text-text-secondary font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-96 group-hover:text-text-primary transition-colors duration-300">
            {LEADS_PROMPT}
          </pre>
        </motion.div>

        {/* Sample JSON Card */}
        <motion.div
          className="relative rounded-2xl bg-bg-surface border border-border-default overflow-hidden group hover:border-border-accent hover:shadow-xl hover:shadow-accent-primary/10 transition-all duration-300"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Glass effect on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-5 bg-gradient-to-br from-accent-primary to-transparent transition-opacity duration-300 pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-default bg-accent-primary/5">
            <span className="text-xs font-mono text-text-muted font-semibold">
              leads.json
            </span>
            <CopyButton text={SAMPLE_JSON} label="JSON" />
          </div>

          {/* Content */}
          <pre className="p-6 text-sm text-text-secondary font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-96 group-hover:text-text-primary transition-colors duration-300">
            {SAMPLE_JSON}
          </pre>
        </motion.div>
      </div>
    </section>
  );
}
