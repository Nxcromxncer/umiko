"use client";

import { useEffect, useState } from "react";
import { underwater, type SceneQuality } from "./store";

/**
 * Detects device capability once and decides render quality (particle
 * counts, mesh resolution, DPR ceiling). This component tree is only ever
 * mounted client-side (dynamic import with ssr: false), so the lazy state
 * initializer may safely touch browser APIs.
 *
 * Also wires `prefers-reduced-motion` into the shared store so the 3D scene
 * and the Framer Motion UI respect it together.
 */
export function useSceneQuality(): SceneQuality {
  const [quality] = useState<SceneQuality>(() => {
    if (typeof window === "undefined") return "high";
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const small = window.innerWidth < 768;
    const weakCpu = (navigator.hardwareConcurrency ?? 8) <= 4;
    return coarse || small || weakCpu ? "low" : "high";
  });

  useEffect(() => {
    underwater.quality = quality;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReduced = () => {
      underwater.reducedMotion = reduced.matches;
    };
    syncReduced();
    reduced.addEventListener("change", syncReduced);
    return () => reduced.removeEventListener("change", syncReduced);
  }, [quality]);

  return quality;
}
