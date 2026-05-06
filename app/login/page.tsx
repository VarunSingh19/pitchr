"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Mail,
  ArrowRight,
  Zap,
  Shield,
  Sparkles,
  CheckCircle2,
  Cpu,
  Send,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

function AnimatedFeature({
  icon: Icon,
  label,
  delay,
}: {
  icon: typeof Sparkles;
  label: string;
  delay: number;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className="flex items-center gap-3 text-sm transition-all duration-500"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateX(0)" : "translateX(-20px)",
      }}
    >
      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 transition-all duration-300 hover:scale-110 hover:bg-primary/20">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <span className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">
        {label}
      </span>
    </div>
  );
}

export default function LoginPage() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [cardRotation, setCardRotation] = useState({ rotateX: 0, rotateY: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const rotateX = (e.clientY - centerY) * 0.02;
    const rotateY = (centerX - e.clientX) * 0.02;

    setCardRotation({ rotateX, rotateY });
    setMousePosition({
      x: (e.clientX - centerX) * 0.02,
      y: (e.clientY - centerY) * 0.02,
    });
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setCardRotation({ rotateX: 0, rotateY: 0 });
    setMousePosition({ x: 0, y: 0 });
    setIsHovering(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border transition-all duration-300" style={{ backgroundColor: "rgba(var(--bg-nav-rgb), 0.92)", backdropFilter: "blur(16px)" }}>
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

          <div className="text-sm text-muted-foreground">
            <Link
              href="/"
              className="flex items-center text-primary font-semibold hover:text-primary/80 transition-colors duration-300 group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
              <span className="ml-2">Back to home</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 overflow-hidden relative bg-background">
        {/* Background gradients */}
        <div
          className="absolute top-20 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none transition-transform duration-500"
          style={{
            transform: `translate(${-mousePosition.x * 0.3}px, ${-mousePosition.y * 0.3}px)`,
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl pointer-events-none"
          style={{
            animation: `float 8s ease-in-out infinite`,
          }}
        />

        <div className="relative z-10 w-full max-w-5xl">
          {/* Two column layout */}
          <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left side - Info */}
            <div
              className="space-y-8 hidden md:flex flex-col justify-center"
              style={{
                animation: `slideDown 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                opacity: 0,
              }}
            >
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card hover:bg-card/80 text-sm text-muted-foreground transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 cursor-pointer group w-fit">
                  <Zap className="w-4 h-4 text-primary transition-transform duration-300 group-hover:scale-125" />
                  <span>One workflow, countless emails</span>
                </div>

                <h2 className="text-5xl lg:text-6xl font-bold tracking-tight leading-[1.15]">
                  Start automating
                  <br />
                  <span className="bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent">
                    cold outreach
                  </span>
                </h2>

                <p className="text-lg text-muted-foreground leading-relaxed">
                  Login to access your dashboard, manage campaigns, and send personalized emails to hundreds of companies at once.
                </p>
              </div>

              {/* Feature checklist */}
              <div className="space-y-3 pt-4">
                <AnimatedFeature
                  icon={Sparkles}
                  label="AI-powered personalized emails at scale"
                  delay={0}
                />
                <AnimatedFeature
                  icon={Shield}
                  label="Secure Gmail integration with rate limiting"
                  delay={100}
                />
                <AnimatedFeature
                  icon={Send}
                  label="Real-time campaign tracking and analytics"
                  delay={200}
                />
                <AnimatedFeature
                  icon={Cpu}
                  label="Upload resumes and leads in bulk"
                  delay={300}
                />
                <AnimatedFeature
                  icon={CheckCircle2}
                  label="Review every email before sending"
                  delay={400}
                />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-6 pt-8 border-t border-border">
                <div className="p-4 rounded-xl border border-border bg-card/50 hover:bg-card transition-all duration-300 group cursor-default">
                  <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    Emails personalized
                  </p>
                  <p className="text-3xl font-bold text-foreground mt-2">10K+</p>
                </div>
                <div className="p-4 rounded-xl border border-border bg-card/50 hover:bg-card transition-all duration-300 group cursor-default">
                  <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    Success rate
                  </p>
                  <p className="text-3xl font-bold text-foreground mt-2">87%+</p>
                </div>
              </div>
            </div>

            {/* Right side - Login Card */}
            <div
              className="w-full"
              style={{
                animation: `slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                opacity: 0,
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <div
                className="group relative"
                style={{
                  transform: `perspective(1000px) rotateX(${cardRotation.rotateX}deg) rotateY(${cardRotation.rotateY}deg) translateZ(0)`,
                  boxShadow: `0 20px 40px -15px rgba(var(--primary-rgb), ${0.1 + Math.abs(cardRotation.rotateX) * 0.05})`,
                  transition: "transform 0.3s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.3s ease",
                }}
              >
                <div className="relative rounded-2xl border border-border bg-card p-8 shadow-xl transition-all duration-300">
                  {/* Content */}
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="text-center space-y-2">
                      <div className="inline-block p-3 rounded-2xl bg-primary/10 border border-primary/20 group-hover:bg-primary/15 group-hover:border-primary/30 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/20">
                        <Mail className="w-6 h-6 text-primary group-hover:rotate-12 transition-transform duration-300" />
                      </div>
                      <h2 className="text-2xl font-bold text-foreground">
                        Welcome back
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Login to your Pitchr account to continue
                      </p>
                    </div>

                    {/* Google Sign In Button */}
                    <button
                      onClick={() => {
                        setIsClicked(true);
                        signIn("google", { callbackUrl: "/dashboard" });
                      }}
                      id="google-sign-in"
                      className="group/btn relative w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-primary/25 hover:scale-105 active:scale-95 disabled:hover:scale-100 overflow-hidden"
                    >
                      <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 bg-white/10" />

                      <span className="relative flex items-center gap-2">
                        {isClicked ? "Redirecting..." : (
                          <>
                            <svg className="w-4 h-4 transition-transform duration-300 group-hover/btn:rotate-12" viewBox="0 0 24 24">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="currentColor" />
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor" />
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor" />
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor" />
                            </svg>
                            <span>Continue with Google</span>
                            {!isClicked && <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform duration-300" />}
                          </>
                        )}
                      </span>
                    </button>

                    {/* Divider */}
                    {/* <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-card text-muted-foreground">
                          Or continue with email
                        </span>
                      </div>
                    </div> */}

                    {/* Email Sign In Option */}
                    {/* <button className="group w-full px-6 py-3 rounded-xl border border-border hover:border-primary/30 bg-background hover:bg-primary/5 text-foreground font-medium transition-all duration-300 flex items-center justify-center gap-2 hover:scale-105 active:scale-95">
                      <Mail className="w-4 h-4 transition-transform duration-300 group-hover:rotate-12" />
                      Email
                    </button> */}
                  </div>
                </div>
              </div>
            </div>
          </div>
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

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(12px);
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
            transform: translateY(-20px);
          }
        }
      `}</style>
    </div>
  );
}
