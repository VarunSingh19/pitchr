'use client';

import { Star } from 'lucide-react';

const testimonials = [
  {
    quote: 'Pitchr saved us 20 hours per week on email creation. The AI quality is exceptional.',
    author: 'Sarah Chen',
    role: 'Head of Sales, TechStartup',
    avatar: '👩‍💼'
  },
  {
    quote: 'The API integration was seamless. We went from 0 to 1000 emails/day in production within a day.',
    author: 'Marcus Rodriguez',
    role: 'CTO, Growth Company',
    avatar: '👨‍💻'
  },
  {
    quote: 'Best investment we made for our outreach. Response rates increased by 40% immediately.',
    author: 'Emma Wilson',
    role: 'Founder, B2B SaaS',
    avatar: '👩‍🎓'
  }
];

export function TestimonialsConvex() {
  return (
    <section id="testimonials" className="py-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-text-primary mb-4">
            Loved by developers
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            See what industry leaders are saying about Pitchr.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="p-8 bg-bg-elevated rounded-2xl border-2 border-border-default hover:border-accent-primary transition-all duration-300"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-accent-warm-amber text-accent-warm-amber" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-text-secondary mb-6 italic">"{testimonial.quote}"</p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent-primary rounded-full flex items-center justify-center text-lg">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-bold text-text-primary">{testimonial.author}</p>
                  <p className="text-sm text-text-secondary">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
