"use client";

import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { AboutSection } from "@/components/landing/about-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { PricingSection } from "@/components/landing/pricing-section";
import { GlitchMarquee } from "@/components/landing/glitch-marquee";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <div className="min-h-screen dot-grid-bg bg-background text-foreground transition-colors duration-200">
      <Navbar />
      <main>
        <HeroSection />
        <FeatureGrid />
        <AboutSection />
        <HowItWorks />
        <PricingSection />
        <GlitchMarquee />
      </main>
      <Footer />
    </div>
  );
}
