import { NavbarConvex } from '@/components/navbar-convex';
import { HeroConvex } from '@/components/hero-convex';
import { FeaturesConvex } from '@/components/features-convex';
import { HowItWorksConvex } from '@/components/how-it-works-convex';
import { ValuePropositionConvex } from '@/components/value-proposition-convex';
import { TestimonialsConvex } from '@/components/testimonials-convex';
import { IntegrationsConvex } from '@/components/integrations-convex';
import { CTAFinalConvex } from '@/components/cta-final-convex';
import { FooterConvex } from '@/components/footer-convex';

export const metadata = {
  title: 'Pitchr - AI-powered Cold Email Automation',
  description: 'Generate personalized cold emails at scale with AI. Everything is code. No limits on what you can build.',
};

export default function Home() {
  return (
    <main className="min-h-screen">
      <NavbarConvex />
      <HeroConvex />
      <FeaturesConvex />
      <HowItWorksConvex />
      <ValuePropositionConvex />
      <TestimonialsConvex />
      <IntegrationsConvex />
      <CTAFinalConvex />
      <FooterConvex />
    </main>
  );
}
