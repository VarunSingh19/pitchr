'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Copy, Check } from 'lucide-react';

export function HeroConvex() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('npm install pitchr');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="pt-32 pb-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-block px-4 py-2 bg-accent-primary-dim rounded-full">
                <span className="text-accent-primary font-semibold text-sm">Build with confidence</span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold text-text-primary leading-tight">
                AI-powered cold email automation
              </h1>
              <p className="text-xl text-text-secondary">
                Everything is code. No limits on what you can build. Generate high-quality, personalized cold emails at scale with our AI.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="px-8 py-3 bg-accent-primary text-white rounded-full font-semibold hover:bg-accent-primary-hover transition-colors flex items-center gap-2 justify-center sm:justify-start">
                Start building
                <ArrowRight className="w-4 h-4" />
              </button>
              <button className="px-8 py-3 border-2 border-border-default text-text-primary rounded-full font-semibold hover:bg-bg-elevated transition-colors">
                View docs
              </button>
            </div>

            {/* Command */}
            <div className="flex items-center gap-3 p-4 bg-bg-elevated rounded-lg border border-border-default">
              <code className="text-sm text-text-secondary font-mono">npm install pitchr</code>
              <button
                onClick={handleCopy}
                className="ml-auto p-2 hover:bg-bg-subtle rounded transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-state-success" /> : <Copy className="w-4 h-4 text-text-muted" />}
              </button>
            </div>
          </div>

          {/* Right - Code Mockup */}
          <div className="relative">
            <div className="rounded-2xl overflow-hidden shadow-2xl border-4 border-accent-warm-amber">
              <Image
                src="/code-mockup.jpg"
                alt="Code editor showing Pitchr API"
                width={600}
                height={400}
                className="w-full h-auto"
              />
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-32 h-32 bg-accent-warm-amber rounded-full opacity-20 blur-3xl" />
            <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-accent-primary rounded-full opacity-10 blur-3xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
