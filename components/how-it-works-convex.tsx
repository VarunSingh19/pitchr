'use client';

import { PenTool, Rocket, TrendingUp } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: PenTool,
    title: 'Write your prompt',
    description: 'Describe your product, target audience, and email tone. Our AI understands context.',
    highlight: 'AI Prompt Studio'
  },
  {
    number: '02',
    icon: Rocket,
    title: 'Generate & customize',
    description: 'Get personalized email variants. Tweak, refine, or regenerate in seconds.',
    highlight: 'Smart Generation'
  },
  {
    number: '03',
    icon: TrendingUp,
    title: 'Deploy & analyze',
    description: 'Send at scale, track opens/clicks, and optimize based on real-time data.',
    highlight: 'Full Analytics'
  }
];

export function HowItWorksConvex() {
  return (
    <section id="how-it-works" className="py-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-text-primary mb-4">
            Three steps to success
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            From idea to delivered campaigns. Simple, powerful, effective.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="relative">
                {/* Connection line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/4 -right-4 w-8 border-t-2 border-accent-primary opacity-30" />
                )}

                <div className="p-8 bg-bg-elevated rounded-2xl border-2 border-border-default hover:border-accent-primary transition-all duration-300">
                  {/* Step number badge */}
                  <div className="inline-block mb-4 px-4 py-2 bg-accent-primary text-white rounded-lg font-bold text-sm">
                    Step {step.number}
                  </div>

                  {/* Icon */}
                  <div className="w-14 h-14 bg-accent-primary-dim rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-7 h-7 text-accent-primary" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-text-primary mb-2">{step.title}</h3>
                  <p className="text-text-secondary mb-4">{step.description}</p>
                  <p className="text-sm font-semibold text-accent-primary">{step.highlight}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
