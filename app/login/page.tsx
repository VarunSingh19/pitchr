"use client";

import { signIn } from "next-auth/react";
import { Mail, ArrowRight, Zap, Shield, Sparkles } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-accent-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent-primary/3 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-accent-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-accent-primary/20">
            <Mail className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-accent-primary to-accent-primary-hover bg-clip-text text-transparent">
              Pitchr
            </span>
          </h1>
          <p className="text-text-secondary text-sm">
            AI-powered cold email automation for job seekers
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-3xl border border-border-default bg-bg-surface p-8 space-y-6 animate-fade-in-up shadow-2xl shadow-black/20">
          <div className="space-y-2 text-center">
            <h2 className="text-lg font-semibold">Sign in to continue</h2>
            <p className="text-sm text-text-muted">
              Use your Google account to get started
            </p>
          </div>

          {/* Google Sign In Button */}
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            id="google-sign-in"
            className="group w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-white hover:bg-gray-50 text-gray-800 font-medium text-sm transition-all duration-200 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]"
          >
            {/* Google Icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
            <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border-default" />
            <span className="text-xs text-text-faint uppercase tracking-wider">
              What you get
            </span>
            <div className="flex-1 h-px bg-border-default" />
          </div>

          {/* Features list */}
          <div className="space-y-3">
            {[
              {
                icon: Sparkles,
                text: "AI-generated personalized emails",
              },
              {
                icon: Shield,
                text: "Secure Gmail app password integration",
              },
              {
                icon: Zap,
                text: "Batch sending with real-time progress",
              },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-3 text-sm text-text-secondary"
              >
                <div className="w-8 h-8 rounded-xl bg-accent-dim flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-accent-primary" />
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-text-faint mt-6 animate-fade-in">
          By continuing, you agree to Pitchr&apos;s terms of service
        </p>
      </div>
    </div>
  );
}
