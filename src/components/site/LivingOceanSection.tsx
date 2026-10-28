"use client";

import { Droplets, Sparkles, Sun } from "lucide-react";
import { Reveal, RevealItem, RevealList } from "./Reveal";

const FEATURES = [
  {
    icon: Sun,
    title: "Volumetric light rays",
    body: "Soft columns of light descend from a surface you can almost feel, flickering gently as the water above them shifts and folds.",
  },
  {
    icon: Sparkles,
    title: "Dancing caustics",
    body: "Interference patterns of light ripple across the depths — the same physics that paints the floor of a sunlit reef, computed live.",
  },
  {
    icon: Droplets,
    title: "Suspended matter",
    body: "Hundreds of particles drift and rise: marine snow and bubbles, each with its own speed, wobble and character.",
  },
] as const;

const STATS = [
  { value: "60", unit: "FPS TARGET" },
  { value: "100%", unit: "REAL-TIME RENDER" },
  { value: "0", unit: "VIDEO ASSETS" },
] as const;

/**
 * Section 01 — The Living Ocean.
 * Explains the procedural environment with a spacious editorial layout.
 */
export function LivingOceanSection(): React.ReactElement {
  return (
    <section id="experience" aria-label="The living ocean" className="relative overflow-hidden">
      {/* Subtle animated water texture */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="ocean-drift-blob absolute -left-40 top-1/4 h-[34rem] w-[34rem] rounded-full bg-ocean/[0.07] blur-[130px]" />
        <div className="ocean-drift-blob-slow absolute -right-52 bottom-0 h-[30rem] w-[30rem] rounded-full bg-glow/[0.05] blur-[120px]" />
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl gap-14 px-6 py-28 md:grid-cols-12 md:gap-10 md:px-10 md:py-40">
        {/* Sticky label column */}
        <div className="md:col-span-4">
          <div className="md:sticky md:top-32">
            <Reveal>
              <p className="flex items-center gap-3 font-mono text-[10px] tracking-[0.34em] text-glow">
                <span className="h-px w-8 bg-glow/60" />
                01 — THE LIVING OCEAN
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="mt-10 space-y-7 border-l border-white/[0.08] pl-6">
                {STATS.map((stat) => (
                  <div key={stat.unit}>
                    <p className="text-3xl font-light text-white md:text-4xl">
                      {stat.value}
                      <span className="ml-2 align-middle font-mono text-[10px] tracking-[0.22em] text-mist">
                        {stat.unit}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>

        {/* Content column */}
        <div className="md:col-span-8">
          <Reveal>
            <h2 className="max-w-xl text-[clamp(1.9rem,4.4vw,3.3rem)] font-light leading-[1.08] tracking-[-0.01em] text-white">
              An ocean that{" "}
              <em className="font-serif italic text-glow">never repeats</em>{" "}
              itself.
            </h2>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="mt-8 max-w-2xl space-y-6 text-[15px] leading-relaxed text-mist md:text-base">
              <p>
                Everything you see beneath the surface is generated in real
                time. There is no video loop and no pre-rendered backdrop —
                only light, motion, and mathematics arranged to behave like
                water. The depth you feel when you look into the scene is
                layered deliberately: near-black at the edges, a slow blue
                bloom where the light falls, and fog that swallows distance
                the way a real ocean does.
              </p>
              <p>
                The waves above you are built from four overlapping frequency
                trains rather than a single looping texture, which is why the
                surface never seems to hit the same shape twice. Beneath it,
                broad sheets of current rise and fall in long, patient
                periods — the kind of motion you stop noticing until it is
                gone. Look long enough and you will catch the water doing
                something it has never done before, and will never do again.
              </p>
            </div>
          </Reveal>

          <RevealList className="mt-14 space-y-0" stagger={0.12}>
            {FEATURES.map((feature, idx) => (
              <RevealItem key={feature.title}>
                <div className="group flex gap-6 border-t border-white/[0.08] py-7 transition-colors duration-500 hover:border-glow/25 md:gap-8">
                  <span className="pt-1 font-mono text-[11px] tracking-[0.2em] text-mist/60">
                    0{idx + 1}
                  </span>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] transition-all duration-500 group-hover:border-glow/40 group-hover:shadow-[0_0_24px_rgba(101,230,255,0.18)]">
                    <feature.icon className="h-[18px] w-[18px] text-glow/90" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-white md:text-lg">
                      {feature.title}
                    </h3>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-mist">
                      {feature.body}
                    </p>
                  </div>
                </div>
              </RevealItem>
            ))}
            <div className="border-t border-white/[0.08]" />
          </RevealList>
        </div>
      </div>
    </section>
  );
}
