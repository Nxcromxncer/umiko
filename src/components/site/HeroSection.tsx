"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowDown, Hand, MousePointer2 } from "lucide-react";
import { MagneticButton } from "./MagneticButton";
import { usePointerTarget } from "@/components/underwater/usePointerTarget";
import { underwater } from "@/components/underwater/store";

// The 3D world is client-only and lazily loaded; the placeholder reserves
// the exact same height so nothing shifts while it streams in.
const UnderwaterScene = dynamic(() => import("@/components/underwater/UnderwaterScene"), {
  ssr: false,
  loading: () => <ScenePlaceholder />,
});

function ScenePlaceholder(): React.ReactElement {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_0%,rgba(7,91,206,0.22),transparent_62%)]" />
      <div className="absolute inset-0 animate-pulse bg-[radial-gradient(ellipse_50%_35%_at_50%_60%,rgba(3,21,43,0.8),transparent_70%)] [animation-duration:2.8s]" />
    </div>
  );
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Detect touch-primary devices for the interaction hint copy (SSR-safe). */
function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(pointer: coarse)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false,
  );
}

export function HeroSection(): React.ReactElement {
  const containerRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const coarse = useCoarsePointer();
  const [showHint, setShowHint] = useState(true);

  usePointerTarget(containerRef);

  useEffect(() => {
    underwater.onFirstInteraction = () => {
      // Let the fish reach the cursor before the hint dissolves.
      window.setTimeout(() => setShowHint(false), 700);
    };
    return () => {
      underwater.onFirstInteraction = null;
    };
  }, []);

  return (
    <section
      id="home"
      ref={containerRef}
      aria-label="Interactive underwater hero"
      className="relative h-svh min-h-[580px] w-full overflow-hidden"
      style={{ touchAction: "pan-y" }}
    >
      {/* 3D underwater world */}
      <div className="absolute inset-0">
        <UnderwaterScene />
      </div>
      <span className="sr-only">
        An interactive underwater scene: a luminous blue koi fish swimming through deep blue
        water, following your cursor or finger.
      </span>

      {/* Readability scrims (kept pointer-transparent) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-black/5 to-black/70"
      />

      {/* Typography overlay */}
      <div className="pointer-events-none relative z-10 mx-auto flex h-full w-full max-w-7xl flex-col justify-center px-6 pb-24 pt-28 md:px-10 md:pb-28">
        <motion.p
          initial={{ opacity: 0, y: reduce ? 0 : 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.55, ease: EASE }}
          className="mb-6 flex items-center gap-3 font-mono text-[10px] tracking-[0.34em] text-glow md:text-[11px]"
        >
          <span className="h-px w-8 bg-glow/60" />
          AN INTERACTIVE DIGITAL WORLD
        </motion.p>

        <h1 className="max-w-3xl text-[clamp(2.9rem,8.2vw,6.8rem)] font-light leading-[0.98] tracking-[-0.02em] text-white">
          <motion.span
            initial={{ opacity: 0, y: reduce ? 0 : 42 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.05, delay: 0.7, ease: EASE }}
            className="block"
          >
            Dive Beyond
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: reduce ? 0 : 42 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.05, delay: 0.84, ease: EASE }}
            className="block"
          >
            the{" "}
            <em className="font-serif font-medium italic text-transparent bg-clip-text bg-gradient-to-br from-electric to-glow">
              Ordinary.
            </em>
          </motion.span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: reduce ? 0 : 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.95, delay: 1.02, ease: EASE }}
          className="mt-7 max-w-md text-[15px] leading-relaxed text-mist md:text-base"
        >
          An immersive experience where motion, light, and the ocean respond to
          you.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.95, delay: 1.18, ease: EASE }}
          className="pointer-events-auto mt-10 flex flex-wrap items-center gap-4"
        >
          <MagneticButton href="#experience">
            Explore the Depths
            <ArrowDown className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" strokeWidth={1.75} />
          </MagneticButton>
          <MagneticButton href="#about" variant="ghost">
            Discover the Experience
          </MagneticButton>
        </motion.div>

        {/* Interaction hint */}
        <AnimatePresence>
          {showHint && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.8 } }}
              transition={{ delay: 2.2, duration: 1 }}
              className="mt-14 hidden items-center gap-2.5 font-mono text-[10px] tracking-[0.26em] text-mist/70 sm:flex"
            >
              {coarse ? (
                <Hand className="h-3.5 w-3.5 text-glow/70" strokeWidth={1.5} />
              ) : (
                <MousePointer2 className="h-3.5 w-3.5 text-glow/70" strokeWidth={1.5} />
              )}
              {coarse ? "DRAG ACROSS THE WATER — THE KOI FOLLOWS" : "MOVE YOUR CURSOR — THE KOI IS CURIOUS"}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scroll indicator */}
      <motion.a
        href="#experience"
        aria-label="Scroll to the next section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-7 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-3 focus-visible:outline-none"
      >
        <span className="font-mono text-[9px] tracking-[0.4em] text-mist/80">SCROLL</span>
        {!reduce && (
          <span className="relative h-10 w-px overflow-hidden bg-white/10">
            <motion.span
              className="absolute left-0 top-0 h-4 w-px bg-glow"
              animate={{ y: [-16, 40] }}
              transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
            />
          </span>
        )}
      </motion.a>
    </section>
  );
}
