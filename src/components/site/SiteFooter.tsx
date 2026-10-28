"use client";

import { Fish } from "lucide-react";

const FOOTER_LINKS = [
  { href: "#home", label: "Home" },
  { href: "#experience", label: "Experience" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
] as const;

/** Minimal footer — navigation, copyright, and a quiet sign-off. */
export function SiteFooter(): React.ReactElement {
  return (
    <footer className="relative mt-auto border-t border-white/[0.07] bg-black">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-10 md:flex-row md:items-center md:justify-between md:px-10">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-glow/30 bg-glow/[0.06]">
            <Fish className="h-4 w-4 text-glow" strokeWidth={1.5} />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-[0.32em] text-white">UMIKO</p>
            <p className="mt-0.5 text-xs text-mist/70">
              An interactive study in motion, light, and water.
            </p>
          </div>
        </div>

        <nav aria-label="Footer">
          <ul className="flex flex-wrap items-center gap-x-7 gap-y-3">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-[13px] text-mist transition-colors duration-300 hover:text-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 border-t border-white/[0.05] px-6 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] font-mono text-[10px] tracking-[0.18em] text-mist/50 md:flex-row md:items-center md:justify-between md:px-10">
        <p>© 2026 UMIKO — ALL CURRENTS RESERVED</p>
        <p>BUILT WITH REACT · THREE.JS · GLSL</p>
      </div>
    </footer>
  );
}
