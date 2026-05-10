'use client';

import Link from 'next/link';

export function FooterConvex() {
  return (
    <footer className="bg-bg-dark text-text-light border-t border-border-default">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 font-bold text-lg mb-4">
              <div className="w-8 h-8 rounded-lg bg-accent-primary flex items-center justify-center text-white">P</div>
              <span>Pitchr</span>
            </div>
            <p className="text-text-secondary text-sm">
              AI-powered cold email automation for teams.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-bold text-text-light mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#features" className="text-text-secondary hover:text-text-light transition-colors">Features</Link></li>
              <li><Link href="#pricing" className="text-text-secondary hover:text-text-light transition-colors">Pricing</Link></li>
              <li><Link href="/docs" className="text-text-secondary hover:text-text-light transition-colors">Documentation</Link></li>
              <li><Link href="/api" className="text-text-secondary hover:text-text-light transition-colors">API Reference</Link></li>
            </ul>
          </div>

          {/* Developers */}
          <div>
            <h4 className="font-bold text-text-light mb-4">Developers</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/docs" className="text-text-secondary hover:text-text-light transition-colors">Get started</Link></li>
              <li><Link href="/docs/sdk" className="text-text-secondary hover:text-text-light transition-colors">SDK</Link></li>
              <li><Link href="/docs/examples" className="text-text-secondary hover:text-text-light transition-colors">Examples</Link></li>
              <li><Link href="/docs/api" className="text-text-secondary hover:text-text-light transition-colors">REST API</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-bold text-text-light mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="text-text-secondary hover:text-text-light transition-colors">About us</Link></li>
              <li><Link href="/blog" className="text-text-secondary hover:text-text-light transition-colors">Blog</Link></li>
              <li><Link href="/careers" className="text-text-secondary hover:text-text-light transition-colors">Careers</Link></li>
              <li><Link href="/contact" className="text-text-secondary hover:text-text-light transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-bold text-text-light mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/privacy" className="text-text-secondary hover:text-text-light transition-colors">Privacy</Link></li>
              <li><Link href="/terms" className="text-text-secondary hover:text-text-light transition-colors">Terms</Link></li>
              <li><Link href="/security" className="text-text-secondary hover:text-text-light transition-colors">Security</Link></li>
              <li><Link href="/status" className="text-text-secondary hover:text-text-light transition-colors">Status</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border-default flex flex-col md:flex-row items-center justify-between">
          <p className="text-text-secondary text-sm">
            © 2024 Pitchr Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-6 mt-4 md:mt-0">
            <Link href="#" className="text-text-secondary hover:text-text-light transition-colors">Twitter</Link>
            <Link href="#" className="text-text-secondary hover:text-text-light transition-colors">GitHub</Link>
            <Link href="#" className="text-text-secondary hover:text-text-light transition-colors">Discord</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
