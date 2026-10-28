import * as THREE from "three";

/**
 * Shared, mutable, render-loop-friendly state for the underwater scene.
 * Kept outside React on purpose: written by DOM event listeners and read
 * inside useFrame loops, so it must never trigger React re-renders.
 */
export type SceneQuality = "high" | "low";
export type SwimMode = "autonomous" | "pointer";

export interface UnderwaterStore {
  pointer: {
    /** Normalized device coordinates in [-1, 1] relative to the hero canvas. */
    ndcX: number;
    ndcY: number;
    /** True while the pointer/finger is actively over (or pressed on) the scene. */
    active: boolean;
    /** performance.now() of the last pointer movement. */
    lastMoveAt: number;
    /** Set to true after the very first interaction (used to fade the hint). */
    hasInteracted: boolean;
  };
  mode: SwimMode;
  /** Smoothed world-space target the koi steers toward. */
  target: THREE.Vector3;
  /** Live koi position, read by environment shaders (glow around the fish). */
  fishPos: THREE.Vector3;
  fishSpeed: number;
  bounds: { x: number; y: number; zMin: number; zMax: number };
  fishScale: number;
  quality: SceneQuality;
  reducedMotion: boolean;
  /** Fired once, the first time the user interacts with the water. */
  onFirstInteraction: (() => void) | null;
}

export const underwater: UnderwaterStore = {
  pointer: {
    ndcX: 0,
    ndcY: 0,
    active: false,
    lastMoveAt: -1e9,
    hasInteracted: false,
  },
  mode: "autonomous",
  target: new THREE.Vector3(0, 0, 1),
  fishPos: new THREE.Vector3(0, 0, 0),
  fishSpeed: 0,
  bounds: { x: 6, y: 3, zMin: -3, zMax: 2.5 },
  fishScale: 1,
  quality: "high",
  reducedMotion: false,
  onFirstInteraction: null,
};

/** Exact palette from the design brief. */
export const PALETTE = {
  black: "#000000",
  white: "#FFFFFF",
  mist: "#A7B0C0",
  abyss: "#03152B",
  ocean: "#075BCE",
  electric: "#168BFF",
  glow: "#65E6FF",
} as const;

/** Scene fog — deep water fading toward near-black. */
export const FOG = {
  color: "#020a16",
  density: 0.026,
} as const;

/** Depth plane used to project the pointer into the scene. */
export const POINTER_PLANE_Z = 1.2;

/** How long (ms) after the pointer goes idle before the koi explores again. */
export const POINTER_RELEASE_DELAY = 2200;
