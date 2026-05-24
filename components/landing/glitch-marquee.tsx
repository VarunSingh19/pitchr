"use client"

import { motion } from "framer-motion"
import { SectionLabel } from "./section-label"
import { SOURCING_SVGS } from "./sourcing-svgs"

const ease = [0.22, 1, 0.36, 1] as const

interface Brand {
  id: string
  name: string
  color: string
}

const BRANDS: Brand[] = [
  { id: "linkedin", name: "LinkedIn", color: "#0077B5" },
  { id: "indeed", name: "Indeed", color: "#003A9B" },
  { id: "naukri", name: "Naukri", color: "#FF7555" },
  { id: "glassdoor", name: "Glassdoor", color: "#0CAA41" },
  { id: "wellfound", name: "Wellfound", color: "currentColor" },
  { id: "upwork", name: "Upwork", color: "#14A800" },
  { id: "toptal", name: "Toptal", color: "#3862A5" },
  { id: "monster", name: "Monster", color: "#7C1284" }
]

function LogoBlock({ brand }: { brand: Brand }) {
  const isNaukri = brand.id === "naukri"
  const path = SOURCING_SVGS[brand.id as keyof typeof SOURCING_SVGS]

  return (
    <motion.div
      whileHover={{ scale: 1.04, y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 18 }}
      className="flex items-center justify-center px-10 py-6 border-r-2 border-foreground shrink-0 cursor-pointer group hover:bg-foreground/[0.02] transition-colors"
    >
      <div className="flex items-center gap-3">
        {isNaukri ? (
          <div className="flex items-center gap-1.5 select-none">
            <span className="font-sans font-black text-xl tracking-tight text-muted-foreground group-hover:text-[#091E42] dark:group-hover:text-white transition-colors duration-200">
              naukri
            </span>
            <span className="bg-muted-foreground/20 text-muted-foreground group-hover:bg-[#FF7555] group-hover:text-white text-[10px] font-bold px-2 py-0.5 rounded-full transition-all duration-200">
              .com
            </span>
          </div>
        ) : (
          <>
            {path && (
              <svg
                role="img"
                viewBox="0 0 24 24"
                className="h-6 w-6 shrink-0 fill-muted-foreground group-hover:fill-[var(--brand-color)] transition-colors duration-200"
                style={{ "--brand-color": brand.color } as any}
              >
                <path d={path} />
              </svg>
            )}
            <span
              className="font-sans font-black text-lg tracking-tight text-muted-foreground group-hover:text-[var(--brand-color)] transition-colors duration-200"
              style={{ "--brand-color": brand.color === "currentColor" ? "var(--color-foreground)" : brand.color } as any}
            >
              {brand.name}
            </span>
          </>
        )}
      </div>
    </motion.div>
  )
}

export function GlitchMarquee() {
  return (
    <section className="w-full py-16 px-6 lg:px-12 bg-background">
      <SectionLabel label="INTEGRATED_SOURCES" number="005" />

      {/* Marquee Title */}
      <div className="mb-8">
        <h3 className="text-sm font-mono font-bold tracking-wider text-muted-foreground uppercase">
          // Supported Job Sourcing Channels & APIs
        </h3>
      </div>

      {/* Marquee Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.6, ease }}
        className="overflow-hidden border-2 border-foreground"
      >
        <div className="flex animate-marquee" style={{ width: "max-content" }}>
          {[...BRANDS, ...BRANDS, ...BRANDS, ...BRANDS].map((brand, i) => (
            <LogoBlock
              key={`${brand.id}-${i}`}
              brand={brand}
            />
          ))}
        </div>
      </motion.div>
    </section>
  )
}
