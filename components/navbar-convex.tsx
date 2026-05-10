'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

export function NavbarConvex() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-border-default">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-text-primary">
          <div className="w-8 h-8 rounded-lg bg-accent-primary flex items-center justify-center text-white">P</div>
          <span>Pitchr</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-text-secondary hover:text-text-primary transition-colors">Features</Link>
          <Link href="#how-it-works" className="text-text-secondary hover:text-text-primary transition-colors">How it works</Link>
          <Link href="#testimonials" className="text-text-secondary hover:text-text-primary transition-colors">Loved by teams</Link>
          <Link href="#pricing" className="text-text-secondary hover:text-text-primary transition-colors">Pricing</Link>
        </div>

        {/* CTA Button */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/login" className="text-text-secondary hover:text-text-primary transition-colors">Log in</Link>
          <button className="px-6 py-2 bg-accent-primary text-white rounded-full font-semibold hover:bg-accent-primary-hover transition-colors">
            Get started
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 hover:bg-bg-elevated rounded-lg transition-colors"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-border-default bg-white">
          <div className="max-w-7xl mx-auto px-6 py-4 space-y-3">
            <Link href="#features" className="block py-2 text-text-secondary hover:text-text-primary transition-colors">Features</Link>
            <Link href="#how-it-works" className="block py-2 text-text-secondary hover:text-text-primary transition-colors">How it works</Link>
            <Link href="#testimonials" className="block py-2 text-text-secondary hover:text-text-primary transition-colors">Loved by teams</Link>
            <Link href="#pricing" className="block py-2 text-text-secondary hover:text-text-primary transition-colors">Pricing</Link>
            <Link href="/login" className="block py-2 text-text-secondary hover:text-text-primary transition-colors">Log in</Link>
            <button className="w-full mt-4 px-6 py-2 bg-accent-primary text-white rounded-full font-semibold hover:bg-accent-primary-hover transition-colors">
              Get started
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
