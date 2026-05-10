'use client';

import Image from 'next/image';

export function ValuePropositionConvex() {
  return (
    <section className="py-20 px-6 bg-bg-dark text-text-light">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left - Illustration */}
          <div className="relative">
            <div className="rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="/database-3d.jpg"
                alt="Database illustration"
                width={500}
                height={500}
                className="w-full h-auto"
              />
            </div>
          </div>

          {/* Right - Content */}
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl lg:text-5xl font-bold text-text-light mb-4 leading-tight">
                More than a database
              </h2>
              <p className="text-lg text-text-secondary">
                Pitchr combines email generation with production-grade infrastructure. Scale your outreach without limits.
              </p>
            </div>

            <div className="space-y-6">
              {[
                {
                  title: 'Built for developers',
                  desc: 'Complete TypeScript/JavaScript SDK. Works with Next.js, React, Node.js, and more.'
                },
                {
                  title: 'Always in sync',
                  desc: 'Real-time collaboration, instant updates, and consistent data across all your apps.'
                },
                {
                  title: 'Security first',
                  desc: 'Enterprise-grade encryption, role-based access, and compliance with SOC 2 Type II.'
                },
                {
                  title: 'Scales with you',
                  desc: 'From side projects to millions of emails. Never worry about capacity or downtime.'
                }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="w-1 bg-accent-primary rounded-full" />
                  <div>
                    <h3 className="font-bold text-text-light mb-1">{item.title}</h3>
                    <p className="text-text-secondary">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button className="px-8 py-3 bg-accent-primary text-white rounded-full font-semibold hover:bg-accent-primary-hover transition-colors w-fit">
              Learn more
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
