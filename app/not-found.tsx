import Link from "next/link";
import { Home, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="dot-grid-bg min-h-screen flex flex-col items-center justify-center px-6 py-16 text-foreground font-mono animate-fade-in">
      <div className="w-full max-w-md text-center">
        {/* Glitchy 404 */}
        <p className="font-pixel text-7xl sm:text-8xl tracking-tight text-[#ea580c] animate-glitch select-none">
          404
        </p>

        <div className="mt-6 inline-flex items-center gap-2 border-2 border-border bg-card px-3 py-1.5 rounded-none">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ea580c] animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Route Not Found
          </span>
        </div>

        <h1 className="mt-6 text-lg font-bold uppercase tracking-wider text-foreground">
          This page went off the grid
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground uppercase tracking-wide">
          The URL you requested doesn&apos;t exist or may have been moved. Check the
          address, or head back to safe ground.
        </p>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-5 py-3 bg-foreground text-background text-xs font-bold uppercase tracking-widest hover:bg-[#ea580c] hover:text-background transition-colors rounded-none"
          >
            <Home className="w-4 h-4" />
            Return Home
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 px-5 py-3 border-2 border-border bg-card text-foreground text-xs font-bold uppercase tracking-widest hover:border-[#ea580c] hover:text-[#ea580c] transition-colors rounded-none"
          >
            <Compass className="w-4 h-4" />
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
