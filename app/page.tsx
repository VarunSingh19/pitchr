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
  ChevronDown,
} from "lucide-react";

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

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

const STEP_CARDS = [
  {
    number: "01",
    icon: FileJson,
    title: "Generate Your Leads",
    description:
      "Use AI to generate a structured JSON file of target companies with verified email addresses and tech stacks.",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "Upload & Personalize",
    description:
      "Upload JSON + resume, set Gmail credentials, and watch AI craft uniquely personalized emails for each company.",
  },
  {
    number: "03",
    icon: Send,
    title: "Review & Launch",
    description:
      "Preview every email, make edits, then send them all with your resume attached—with full tracking.",
  },
];

const FEATURES = [
  { icon: Sparkles, text: "AI Personalization" },
  { icon: Shield, text: "Secure Gmail" },
  { icon: Clock, text: "Rate Limited" },
  { icon: Send, text: "Real-Time Tracking" },
];

function CopyButton({
  text,
  type,
  copied,
  onCopy,
}: {
  text: string;
  type: "prompt" | "json";
  copied: "prompt" | "json" | null;
  onCopy: (text: string, type: "prompt" | "json") => void;
}) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <button
      onClick={() => {
        onCopy(text, type);
        setIsPressed(true);
        setTimeout(() => setIsPressed(false), 150);
      }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:bg-primary/10 active:scale-95"
      style={{
        transform: isPressed ? "scale(0.95)" : "scale(1)",
      }}
    >
      {copied === type ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-500" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

function NavBar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className="sticky top-0 z-50 border-b border-border transition-all duration-300"
      style={{
        backgroundColor: isScrolled
          ? "rgba(var(--bg-nav-rgb), 0.92)"
          : "rgba(var(--bg-nav-rgb), 0.7)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 cursor-pointer group transition-all duration-300 hover:scale-105"
        >
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/30 group-hover:scale-110">
            <Mail className="w-4 h-4 text-white transition-transform duration-300 group-hover:rotate-12" />
          </div>
          <span className="text-lg font-bold text-foreground tracking-tight transition-all duration-300 group-hover:text-primary">
            Pitchr AI
          </span>
        </Link>

        <Link
          href="/login"
          className="relative px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:scale-105 active:scale-95 overflow-hidden group"
        >
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <span className="relative">Get Started</span>
        </Link>
      </div>
    </nav>
  );
}

function HeroSection() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const sectionRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!sectionRef.current) return;
    const rect = sectionRef.current.getBoundingClientRect();
    setMousePosition({
      x: (e.clientX - rect.left - rect.width / 2) * 0.03,
      y: (e.clientY - rect.top - rect.height / 2) * 0.03,
    });
  };

  const handleMouseLeave = () => {
    setMousePosition({ x: 0, y: 0 });
  };

  return (
    <section
      ref={sectionRef}
      className="relative pt-32 pb-24 px-6 overflow-hidden bg-background"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Gradient orbs with parallax */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl pointer-events-none transition-transform duration-500"
        style={{
          transform: `translate(calc(-50% + ${mousePosition.x}px), ${mousePosition.y}px)`,
        }}
      />
      <div
        className="absolute -top-40 right-0 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl pointer-events-none transition-transform duration-500"
        style={{
          transform: `translate(${-mousePosition.x}px, ${-mousePosition.y}px)`,
        }}
      />

      <div className="max-w-5xl mx-auto text-center relative z-10 space-y-8">
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card hover:bg-card/80 text-sm text-muted-foreground transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 cursor-pointer group"
          style={{
            animation: `slideDown 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards, float 6s ease-in-out infinite`,
            animationDelay: "0ms, 0.5s",
            opacity: 0,
          }}
        >
          <Zap className="w-4 h-4 text-primary transition-transform duration-300 group-hover:scale-125" />
          <span>AI-Powered Cold Email Automation</span>
        </div>

        <div>
          <h1
            className="text-6xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6"
            style={{
              animation: `slideDown 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
              animationDelay: "0.1s",
              opacity: 0,
            }}
          >
            Personalized outreach
            <br />
            <span className="bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent">
              at scale
            </span>
          </h1>

          <p
            className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10"
            style={{
              animation: `slideDown 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
              animationDelay: "0.2s",
              opacity: 0,
            }}
          >
            Upload your leads, let AI craft personalized emails using your resume, review every message, then send them all with your resume attached through Gmail.
          </p>
        </div>

        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          style={{
            animation: `slideDown 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
            animationDelay: "0.3s",
            opacity: 0,
          }}
        >
          <Link
            href="/login"
            className="group relative px-8 py-3.5 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all duration-300 flex items-center gap-2 hover:shadow-xl hover:shadow-primary/25 hover:scale-105 active:scale-95 overflow-hidden"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/10" />
            <span className="relative">Get Started</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-all duration-300 relative" />
          </Link>

          <a
            href="#how-it-works"
            className="group relative px-8 py-3.5 rounded-2xl border border-border hover:border-primary/30 text-foreground hover:text-primary font-medium transition-all duration-300 hover:bg-primary/5 hover:shadow-md"
          >
            <span className="flex items-center gap-2">
              How it works
              <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform duration-300" />
            </span>
          </a>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }
      `}</style>
    </section>
  );
}

function StepCard({
  number,
  icon: Icon,
  title,
  description,
  delay,
}: {
  number: string;
  icon: typeof Sparkles;
  title: string;
  description: string;
  delay: number;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group relative"
      style={{
        animation: `slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
        animationDelay: `${delay}ms`,
        opacity: 0,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div
        className="absolute -top-4 -left-4 w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg transition-all duration-300"
        style={{
          transform: isHovered ? "scale(1.15) translateY(-6px)" : "scale(1)",
        }}
      >
        {number}
      </div>

      <div
        className="pt-12 p-8 rounded-2xl bg-card border border-border transition-all duration-300 h-full cursor-pointer"
        style={{
          boxShadow: isHovered
            ? "0 20px 25px -5px rgba(var(--primary-rgb), 0.1)"
            : "0 1px 3px -1px rgba(0, 0, 0, 0.03)",
          borderColor: isHovered
            ? "var(--primary)"
            : "var(--border)",
          transform: isHovered ? "translateY(-8px)" : "translateY(0)",
        }}
      >
        <div
          className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 transition-all duration-300"
          style={{
            transform: isHovered ? "scale(1.15) rotate(6deg)" : "scale(1) rotate(0deg)",
          }}
        >
          <Icon
            className="w-7 h-7 text-primary transition-all duration-300"
            style={{
              transform: isHovered ? "rotate(-6deg)" : "rotate(0deg)",
            }}
          />
        </div>

        <h3 className="text-xl font-semibold mb-3 transition-colors duration-300 text-foreground">
          {title}
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function FeatureItem({
  icon: Icon,
  text,
  delay,
}: {
  icon: typeof Sparkles;
  text: string;
  delay: number;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className="flex items-center gap-3 text-sm text-muted-foreground transition-all duration-300 group hover:text-foreground"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(8px)",
      }}
    >
      <div className="p-2 rounded-lg bg-primary/10">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <span>{text}</span>
    </div>
  );
}

export default function Home() {
  const [copied, setCopied] = useState<"prompt" | "json" | null>(null);

  const handleCopy = (text: string, type: "prompt" | "json") => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />
      <HeroSection />

      {/* Features Strip */}
      <section className="py-8 border-y border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {FEATURES.map(({ icon: Icon, text }, index) => (
            <FeatureItem key={text} icon={Icon} text={text} delay={index * 100} />
          ))}
        </div>
      </section>

      {/* How It Works - Dark Section */}
      <section
        id="how-it-works"
        className="py-32 px-6 bg-card border-y border-border"
      >
        <div className="max-w-6xl mx-auto">
          <div
            className="text-center mb-20"
            style={{
              animation: `fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
              opacity: 0,
            }}
          >
            <p className="text-sm font-semibold text-primary mb-3 uppercase tracking-wider">
              Three-Step Workflow
            </p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              From leads to sent emails
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              A complete workflow designed to get your personalized outreach to hundreds of
              companies without the manual work.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {STEP_CARDS.map((card, index) => (
              <StepCard key={index} {...card} delay={index * 100} />
            ))}
          </div>
        </div>

        <style>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(24px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </section>

      {/* Prompt Section - Light Background */}
      <section className="py-32 px-6 bg-background">
        <div className="max-w-4xl mx-auto">
          <div
            className="text-center mb-12"
            style={{
              animation: `fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
              opacity: 0,
            }}
          >
            <p className="text-sm font-semibold text-primary mb-3 uppercase tracking-wider">
              AI Generation
            </p>
            <h2 className="text-4xl font-bold tracking-tight mb-4">
              Generate your leads
            </h2>
            <p className="text-muted-foreground text-lg">
              Copy this prompt into ChatGPT or Gemini to generate your structured leads file.
            </p>
          </div>

          <div className="relative rounded-2xl bg-card border border-border overflow-hidden group hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-5 bg-gradient-to-br from-primary to-primary/50 transition-opacity duration-300 pointer-events-none" />

            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-primary/5">
              <span className="text-xs font-mono text-muted-foreground font-semibold">
                AI_PROMPT.txt
              </span>
              <CopyButton
                text={LEADS_PROMPT}
                type="prompt"
                copied={copied}
                onCopy={handleCopy}
              />
            </div>

            <pre className="p-6 text-sm text-muted-foreground font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap transition-all duration-300 group-hover:text-foreground max-h-96">
              {LEADS_PROMPT}
            </pre>
          </div>
        </div>

        <style>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(24px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </section>

      {/* JSON Format Section - Dark Background */}
      <section className="py-32 px-6 bg-card border-y border-border">
        <div className="max-w-4xl mx-auto">
          <div
            className="text-center mb-12"
            style={{
              animation: `fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
              opacity: 0,
            }}
          >
            <p className="text-sm font-semibold text-primary mb-3 uppercase tracking-wider">
              Data Format
            </p>
            <h2 className="text-4xl font-bold tracking-tight mb-4">
              Expected JSON structure
            </h2>
            <p className="text-muted-foreground text-lg">
              Your leads file must follow this exact format for proper processing.
            </p>
          </div>

          <div className="relative rounded-2xl bg-primary/5 border border-border overflow-hidden group hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-5 bg-gradient-to-br from-primary to-primary/50 transition-opacity duration-300 pointer-events-none" />

            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-primary/10">
              <span className="text-xs font-mono text-muted-foreground font-semibold">
                leads.json
              </span>
              <CopyButton
                text={SAMPLE_JSON}
                type="json"
                copied={copied}
                onCopy={handleCopy}
              />
            </div>

            <pre className="p-6 text-sm text-muted-foreground font-mono leading-relaxed overflow-x-auto transition-all duration-300 group-hover:text-foreground max-h-96">
              {SAMPLE_JSON}
            </pre>
          </div>
        </div>

        <style>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(24px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 bg-background relative overflow-hidden">
        <div
          className="absolute -top-20 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"
          style={{
            animation: `float 8s ease-in-out infinite`,
          }}
        />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Ready to scale your outreach?
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Start sending personalized cold emails at scale. Upload leads, generate emails with
            AI, review, and launch—all in minutes.
          </p>

          <Link
            href="/login"
            className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all duration-300 hover:shadow-xl hover:shadow-primary/25 hover:scale-105 active:scale-95 overflow-hidden"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/10" />
            <span className="relative">Start Free Today</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-all duration-300 relative" />
          </Link>
        </div>

        <style>{`
          @keyframes float {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-20px);
            }
          }
        `}</style>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border bg-card">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Mail className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-foreground">Pitchr AI</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span>Built with ❤️ for job seekers</span>
            </div>

            <div className="flex items-center gap-4">
              <a
                href="https://github.com/VarunSingh19"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-primary/10 transition-colors duration-300"
              >
                <GithubIcon className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
              </a>
              <a
                href="https://www.linkedin.com/in/varun-s-80b719249"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-primary/10 transition-colors duration-300"
              >
                <LinkedinIcon className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
