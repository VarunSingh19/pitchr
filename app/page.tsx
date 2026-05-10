"use client";

import { SmoothScroll } from "@/components/smooth-scroll";
import { NavbarScroll } from "@/components/navbar-scroll";
import { HeroScroll } from "@/components/hero-scroll";
import { BrandStatement } from "@/components/brand-statement";
import { HowItWorks } from "@/components/how-it-works";
import { AiPromptSection } from "@/components/ai-prompt-section";
import { CtaSection } from "@/components/cta-section";
import { FooterScroll } from "@/components/footer-scroll";

export default function Home() {
  return (
    <SmoothScroll>
      <div className="flex flex-col min-h-screen bg-bg-base text-text-primary">
        <NavbarScroll />
        <HeroScroll />
        <BrandStatement />
        <HowItWorks />
        <AiPromptSection />
        <CtaSection />
        <FooterScroll />
      </div>
    </SmoothScroll>
  );
}
