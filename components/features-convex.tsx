'use client';

import { Zap, Shield, Gauge, Code2 } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'AI-powered generation',
    description: 'Instantly generate personalized cold email sequences using advanced language models.',
    color: 'text-accent-warm-amber',
    bgColor: 'bg-accent-warm-amber'
  },
  {
    icon: Shield,
    title: 'Built for scale',
    description: 'Send thousands of personalized emails with our distributed infrastructure.',
    color: 'text-accent-warm-coral',
    bgColor: 'bg-accent-warm-coral'
  },
  {
    icon: Gauge,
    title: 'Real-time analytics',
    description: 'Track opens, clicks, and responses with comprehensive campaign analytics.',
    color: 'text-accent-primary',
    bgColor: 'bg-accent-primary'
  },
  {
    icon: Code2,
    title: 'Developer-first API',
    description: 'Complete control through our powerful REST API. Integrate anywhere.',
    color: 'text-state-info',
    bgColor: 'bg-state-info'
  }
];

export function FeaturesConvex() {
  return (
    <section id="features" className="py-20 px-6 bg-bg-base">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-text-primary mb-4">
            Everything you need
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Build production-ready cold email campaigns in minutes with our comprehensive platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="p-8 bg-white rounded-2xl border-2 border-border-default hover:border-accent-primary transition-all duration-300 hover:shadow-lg group"
              >
                <div className={`w-12 h-12 rounded-xl ${feature.bgColor} text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2">{feature.title}</h3>
                <p className="text-text-secondary">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
