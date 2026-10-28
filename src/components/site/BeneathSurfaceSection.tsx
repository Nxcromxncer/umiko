"use client";

import { ArrowUp, Mail } from "lucide-react";
import { MagneticButton } from "./MagneticButton";
import { Reveal } from "./Reveal";

/**
 * Section 03 — Beneath the Surface.
 * Atmospheric closing statement with a deep-blue glow and a clear call to
 * action.
 */
export function BeneathSurfaceSection(): React.ReactElement {
  return (
    <section
      id="contact"
      aria-label="Beneath the surface"
      className="relative overflow-hidden border-t border-white/[0.06]"
    >
      {/* Atmospheric lighting */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="caustic-sheen absolute inset-0 opacity-70" />
        <div className="absolute inset-x-0 bottom-0 h-[38rem] bg-[radial-gradient(ellipse_70%_60%_at_50%_115%,rgba(7,91,206,0.3),rgba(22,139,255,0.1)_45%,transparent_72%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-glow/25 to-transparent" />
      </div>

      <div className="relative mx-auto flex min-h-[92svh] w-full max-w-4xl flex-col items-center justify-center px-6 py-32 text-center md:px-10">
        <Reveal>
          <p className="flex items-center justify-center gap-3 font-mono text-[10px] tracking-[0.34em] text-glow">
            <span className="h-px w-8 bg-glow/60" />
            03 — BENEATH THE SURFACE
            <span className="h-px w-8 bg-glow/60" />
          </p>
        </Reveal>

        <Reveal delay={0.08}>
          <h2 className="mt-8 text-[clamp(2.2rem,6vw,4.6rem)] font-light leading-[1.05] tracking-[-0.015em] text-white">
            The surface is only
            <br />
            <em className="font-serif font-medium italic text-transparent bg-clip-text bg-gradient-to-br from-electric to-glow">
              the beginning.
            </em>
          </h2>
        </Reveal>

        <Reveal delay={0.16}>
          <p className="mx-auto mt-8 max-w-xl text-[15px] leading-relaxed text-mist md:text-base">
            You have reached the end of the page, but the ocean above you has
            not stopped moving. The koi still circles. The light still falls
            the way sunlight does through water — patient, weightless, a
            little indifferent to where you are scrolling. Every ripple you
            left behind is still propagating outward, quietly, somewhere in
            the mathematics. Whenever you are ready, take one more breath and
            dive back in.
          </p>
        </Reveal>

        <Reveal delay={0.24}>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <MagneticButton href="#home">
              Return to the Surface
              <ArrowUp className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5" strokeWidth={1.75} />
            </MagneticButton>
            <MagneticButton href="mailto:hello@umiko.studio" variant="ghost">
              <Mail className="h-4 w-4" strokeWidth={1.75} />
              Get in Touch
            </MagneticButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
