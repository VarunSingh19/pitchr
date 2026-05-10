'use client';

import { Code2, Database, Cloud, Lock } from 'lucide-react';

const integrations = [
  { name: 'Next.js', icon: Code2, color: 'text-black' },
  { name: 'React', icon: Code2, color: 'text-blue-400' },
  { name: 'Node.js', icon: Code2, color: 'text-green-600' },
  { name: 'TypeScript', icon: Code2, color: 'text-blue-600' },
  { name: 'PostgreSQL', icon: Database, color: 'text-blue-600' },
  { name: 'Stripe', icon: Cloud, color: 'text-blue-500' },
  { name: 'Supabase', icon: Database, color: 'text-green-500' },
  { name: 'Vercel', icon: Cloud, color: 'text-black' },
];

export function IntegrationsConvex() {
  return (
    <section className="py-20 px-6 bg-bg-base">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-text-primary mb-4">
            Pitchr loves your favorite tools
          </h2>
          <p className="text-lg text-text-secondary">
            Integrations with the frameworks and platforms you already use.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {integrations.map((integration, index) => {
            const Icon = integration.icon;
            return (
              <div
                key={index}
                className="p-6 bg-white rounded-xl border border-border-default hover:border-accent-primary hover:shadow-lg transition-all duration-300 flex flex-col items-center justify-center text-center gap-3 group"
              >
                <Icon className={`w-8 h-8 ${integration.color} group-hover:scale-110 transition-transform`} />
                <span className="font-semibold text-text-primary text-sm">{integration.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
