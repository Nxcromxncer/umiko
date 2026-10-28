"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Cpu, Hand, MousePointer2, Waves } from "lucide-react";
import { Reveal, RevealItem, RevealList } from "./Reveal";

const INTERACTIONS = [
  {
    icon: MousePointer2,
    title: "Pointer tracking",
    body: "Your cursor becomes a point of interest in the water. The koi steers toward it with weighted, physical turns — never snapping, always curious — and circles politely when you stop moving.",
  },
  {
    icon: Hand,
    title: "Touch native",
    body: "On touch devices your finger guides the fish directly. Drag across the water to lead it; lift your finger and it drifts back to its own explorations within a few seconds.",
  },
  {
    icon: Waves,
    title: "Fluid motion",
    body: "A traveling wave runs the length of the body, its beat quickening with speed and deepening through turns — paired fins rowing in phase, the tail finishing every thought.",
  },
  {
    icon: Cpu,
    title: "Real-time 3D",
    body: "The entire scene is rendered with WebGL and hand-written GLSL shaders — no video, no images, no tricks. Just light, calculated as you watch it.",
  },
] as const;

interface Ripple {
  id: number;
  x: number;
  y: number;
}

/**
 * A small interactive pool — pointer movement across the surface spawns
 * expanding rings of light. A quiet echo of the hero's water.
 */
function RipplePad(): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const seq = useRef(0);
  const lastSpawn = useRef(0);
  const reduce = useReducedMotion();

  const spawn = useCallback(
    (clientX: number, clientY: number) => {
      const now = performance.now();
      if (now - lastSpawn.current < 46) return; // rate-limit burst events
      lastSpawn.current = now;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const id = seq.current++;
      const ripple = { id, x: clientX - rect.left, y: clientY - rect.top };
      setRipples((prev) => [...prev.slice(-11), ripple]);
      window.setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 1000);
    },
    [],
  );

  useEffect(() => {
    return () => setRipples([]);
  }, []);

  return (
    <div
      ref={ref}
      onPointerMove={(e) => !reduce && spawn(e.clientX, e.clientY)}
      onPointerDown={(e) => !reduce && spawn(e.clientX, e.clientY)}
      className="relative h-64 cursor-crosshair touch-pan-y select-none overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-abyss/40 via-black to-black md:h-80"
      style={{ touchAction: "pan-y" }}
    >
      {/* Ambient sheen */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(22,139,255,0.09),transparent_70%)]"
      />

      {/* Ripple rings */}
      {ripples.map((r) => (
        <span key={r.id} className="pointer-events-none absolute" style={{ left: r.x, top: r.y }}>
          <motion.span
            className="block h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-glow/50"
            initial={{ scale: 0.1, opacity: 0.85 }}
            animate={{ scale: 4.4, opacity: 0 }}
            transition={{ duration: 1.05, ease: "easeOut" }}
          />
          <motion.span
            className="absolute left-0 top-0 block h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-electric/30"
            initial={{ scale: 0.05, opacity: 0.6 }}
            animate={{ scale: 2.6, opacity: 0 }}
            transition={{ duration: 1.05, delay: 0.12, ease: "easeOut" }}
          />
        </span>
      ))}

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
        <p className="font-mono text-[10px] tracking-[0.34em] text-glow/90">
          {reduce ? "THE WATER RESTS" : "TOUCH THE WATER"}
        </p>
        <p className="max-w-[220px] text-xs leading-relaxed text-mist/70">
          {reduce
            ? "Motion is reduced out of respect for your settings — the experience remains fully navigable."
            : "Move across this surface and watch it remember, briefly, where you have been."}
        </p>
      </div>
    </div>
  );
}

/**
 * Section 02 — A Different Kind of Interaction.
 * Showcases the interaction model with editorial feature rows.
 */
export function InteractionSection(): React.ReactElement {
  return (
    <section id="about" aria-label="A different kind of interaction" className="relative">
      <div className="mx-auto grid w-full max-w-6xl gap-14 px-6 py-28 md:px-10 md:py-40">
        <div className="md:grid md:grid-cols-12 md:gap-10">
          <div className="md:col-span-4">
            <Reveal>
              <p className="flex items-center gap-3 font-mono text-[10px] tracking-[0.34em] text-glow">
                <span className="h-px w-8 bg-glow/60" />
                02 — A DIFFERENT KIND OF INTERACTION
              </p>
            </Reveal>
          </div>
          <div className="mt-8 md:col-span-8 md:mt-0">
            <Reveal delay={0.06}>
              <h2 className="max-w-xl text-[clamp(1.9rem,4.4vw,3.3rem)] font-light leading-[1.08] tracking-[-0.01em] text-white">
                It responds to{" "}
                <em className="font-serif italic text-glow">you.</em>
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-8 max-w-2xl text-[15px] leading-relaxed text-mist md:text-base">
                Most websites watch. This one listens. Every movement of your
                cursor or finger is projected into the three-dimensional water
                and offered to the koi as a point of interest. The fish weighs
                the distance, banks into the turn, and arrives on its own
                terms — because nothing here is scripted. Its curiosity is
                computed live, sixty times a second, from the same math that
                moves the light.
              </p>
            </Reveal>
          </div>
        </div>

        <RevealList className="space-y-0" stagger={0.1}>
          {INTERACTIONS.map((item, idx) => (
            <RevealItem key={item.title}>
              <div className="group grid grid-cols-[auto_auto_1fr] items-start gap-5 border-t border-white/[0.08] py-8 transition-all duration-500 hover:bg-white/[0.02] hover:pl-3 hover:border-glow/25 md:grid-cols-[70px_56px_1fr] md:gap-8 md:py-9">
                <span className="pt-1 font-mono text-[11px] tracking-[0.2em] text-mist/60">
                  0{idx + 1}
                </span>
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] transition-all duration-500 group-hover:border-glow/40 group-hover:shadow-[0_0_24px_rgba(101,230,255,0.16)]">
                  <item.icon className="h-[18px] w-[18px] text-glow/90" strokeWidth={1.5} />
                </div>
                <div className="max-w-2xl">
                  <h3 className="text-base font-medium text-white md:text-lg">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-mist md:text-[15px]">
                    {item.body}
                  </p>
                </div>
              </div>
            </RevealItem>
          ))}
          <div className="border-t border-white/[0.08]" />
        </RevealList>

        <Reveal delay={0.1}>
          <RipplePad />
        </Reveal>
      </div>
    </section>
  );
}
