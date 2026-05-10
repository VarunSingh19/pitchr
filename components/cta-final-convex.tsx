'use client';

import { ArrowRight } from 'lucide-react';

export function CTAFinalConvex() {
  return (
    <section className="py-20 px-6 bg-bg-dark text-text-light">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
          Get your app up and running in minutes
        </h2>
        <p className="text-lg text-text-secondary mb-8 max-w-2xl mx-auto">
          Join thousands of teams already using Pitchr to scale their outreach.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button className="px-8 py-4 bg-accent-primary text-white rounded-full font-bold text-lg hover:bg-accent-primary-hover transition-colors flex items-center gap-2">
            Start building
            <ArrowRight className="w-5 h-5" />
          </button>
          <button className="px-8 py-4 border-2 border-accent-primary text-accent-primary rounded-full font-bold text-lg hover:bg-accent-primary-dim transition-colors">
            View documentation
          </button>
        </div>

        {/* Decorative elements */}
        <div className="mt-20 pt-12 border-t border-border-default">
          <p className="text-text-secondary mb-6">Trusted by leading companies</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-center justify-center opacity-60">
            {['Vercel', 'Stripe', 'GitHub', 'Next.js', 'React'].map((company) => (
              <div key={company} className="font-semibold text-center">{company}</div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
