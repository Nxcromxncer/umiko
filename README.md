# UMIKO — An Immersive 3D Underwater Experience

> A high-end, minimalist pure-black website that hides a living digital aquarium.
> A luminous blue koi swims through real-time deep-blue water — following your
> cursor on desktop, your finger on touch devices. Everything is procedural:
> no video loops, no image textures, no external 3D models. Only light,
> motion, and mathematics.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Quick Start](#quick-start)
4. [Project Structure](#project-structure)
5. [The 3D Design Style](#the-3d-design-style)
6. [The Seven-Layer Water Recipe](#the-seven-layer-water-recipe)
7. [The Procedural Koi](#the-procedural-koi)
8. [Interaction System](#interaction-system)
9. [Shader Architecture](#shader-architecture)
10. [The Non-Reactive Store Pattern](#the-non-reactive-store-pattern)
11. [Performance System](#performance-system)
12. [Accessibility](#accessibility)
13. [Customization Guide](#customization-guide)
14. [Reusing This Style in Other Projects](#reusing-this-style-in-other-projects)
15. [Browser Support](#browser-support)

---

## Overview

UMIKO is an interactive study in motion, light, and water. The page is dressed
in near-total black — white and mist-grey typography, hairline rules, generous
whitespace — and the moment it loads, a full-viewport WebGL scene opens beneath
the surface:

- A **procedurally generated blue koi** with an undulating spine, flowing
  translucent fins, pearlescent belly and cyan rim-light, swimming freely
  through a visible volume of water.
- **Depth atmosphere**: a deep-blue gradient world, exponential fog, volumetric
  god-rays, drifting currents, caustic light lace on the seabed, marine snow
  and rising bubbles.
- **A living surface** overhead built from four summed wave trains — the swell
  never repeats itself.
- **Cinematic parallax**: the camera drifts with the pointer; typography sits
  above the water world in quiet counterpoint.

The fish is curious. Move your cursor and it banks toward you; stop and it
orbits the point politely; leave, and within seconds it returns to its own
slow explorations. On phones, a drag across the water leads the fish while
vertical drags still scroll the page.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | **Next.js 16 (App Router)** | Single `/` route, client components |
| Language | **TypeScript 5 (strict)** | No `any` in scene code |
| Styling | **Tailwind CSS 4** | Custom ocean theme tokens |
| 3D | **Three.js + @react-three/fiber** | Declarative scene graph |
| Motion (UI) | **Framer Motion** | Reveals, magnetic buttons, nav |
| Motion (3D) | **Custom GLSL shaders** | Hand-written vertex/fragment stages |
| Icons | **lucide-react** | 1.5 stroke weight, thin line language |

No post-processing pipeline is used — depth, glow and bloom are authored
directly in fragment shaders. This keeps the render cheap and the look
deliberate.

---

## Quick Start

```bash
# install
bun install        # or: npm install

# develop (port 3000)
bun run dev        # or: npm run dev

# lint
bun run lint
```

Open `http://localhost:3000`. The first compile takes a few seconds while
the 3D chunk streams in; a placeholder reserves the exact hero height so
nothing shifts.

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Fonts (Geist, Playfair), metadata, black <body>
│   ├── page.tsx                # Page composition: nav → hero → 3 sections → footer
│   └── globals.css             # Ocean theme tokens + keyframes + a11y rules
│
├── components/
│   ├── site/                   # ── The DOM layer (black editorial UI) ──
│   │   ├── NavigationBar.tsx   # Fixed nav, scroll-frost, active underline, mobile menu
│   │   ├── HeroSection.tsx     # Canvas host + typography overlay + buttons + hint
│   │   ├── LivingOceanSection.tsx   # Section 01 — sticky stats + feature rows
│   │   ├── InteractionSection.tsx   # Section 02 — interaction model + ripple pad
│   │   ├── BeneathSurfaceSection.tsx # Section 03 — closing CTA
│   │   ├── SiteFooter.tsx      # Minimal footer, safe-area aware
│   │   ├── MagneticButton.tsx  # Cursor-magnetic CTA buttons
│   │   ├── ScrollProgress.tsx  # Hairline top progress bar
│   │   └── Reveal.tsx          # Scroll-triggered reveal primitives
│   │
│   └── underwater/             # ── The WebGL layer (the design style) ──
│       ├── UnderwaterScene.tsx # Canvas, camera rig, quality, WebGL fallback
│       ├── BackgroundGradient.tsx  # Inverted sphere: depth gradient + bloom
│       ├── CausticFloor.tsx    # Seabed: dual caustics + fish glow
│       ├── CurrentSheets.tsx   # Mid-water undulating noise sheets
│       ├── LightRays.tsx       # Volumetric god-rays (additive planes)
│       ├── UnderwaterParticles.tsx # Marine snow + bubbles (GPU-driven)
│       ├── WaterSurface.tsx    # 4 summed wave trains + caustics + sparkle
│       ├── KoiFish.tsx         # The fish: bones of the animation loop
│       ├── koiGeometry.ts      # Procedural body + fin geometries
│       ├── koiShaders.ts       # Body / fin / halo ShaderMaterials
│       ├── glsl.ts             # Shared GLSL chunks (fog, noise, caustics…)
│       ├── store.ts            # Palette + mutable non-reactive scene store
│       ├── usePointerTarget.ts # Unified mouse/touch/pen tracking
│       ├── useAutonomousSwimming.ts # Koi steering brain
│       └── useSceneQuality.ts  # Device capability + reduced-motion wiring
```

---

## The 3D Design Style

This is the design language of the scene, written as a reusable system.

### 1. Color System — "Black Ocean, Cyan Life"

| Token | Hex | Role |
|---|---|---|
| `black` | `#000000` | Page background. Black dominates everywhere. |
| `white` | `#FFFFFF` | Primary type, primary button. |
| `mist` | `#A7B0C0` | Secondary type — the grey of distant water. |
| `abyss` | `#03152B` | Deep-sea blue; base of gradient mixes. |
| `ocean` | `#075BCE` | Saturated water body color. |
| `electric` | `#168BFF` | Caustic light and mid-tones. |
| `glow` | `#65E6FF` | Cyan highlight — rims, sparks, focus rings. Rare and precious. |

**Distribution rule**: the site stays black; blue lives *inside the water*;
cyan appears only as highlight (fresnel rims, caustic sparkle, hover states,
focus rings). Never let the whole frame go bright blue — darkness is the
luxury.

### 2. Typography Counterpoint

Above the water: Geist Sans (light, tight leading, large scale) with Playfair
Display italic for single emphasized words, and Geist Mono for micro-labels
(`01 — THE LIVING OCEAN`, `OCEAN SYSTEM ACTIVE`). Below the water: no text at
all. The contrast between crisp type and soft water is the whole composition.

### 3. Lighting Language

- **One conceptual key light**, high above at `(0.25, 1.0, 0.4)` — sun through
  the surface. Every shader references the same direction.
- **Zero `THREE.Light` objects.** All lighting is hand-authored in GLSL:
  diffuse terms, Blinn speculars for wet scales, fresnel rims. This is why the
  scene renders `flat` with color management off — the shaders are the
  lighting designers.
- **God-rays** are additive double-sided planes with feathered edges,
  vertical falloff and independent per-ray flicker — volumetric *suggested*,
  not simulated.
- **Caustics** use the classic interference pattern (iterative sine
  distortion). Two scales drift at different speeds on the floor; a cheaper
  2-iteration variant dapples the fish's back.

### 4. Atmosphere — Fog Is Depth

An exponential-squared fog toward `#020A16` at density `0.026` runs inside
*every* fragment shader via one shared chunk:

```glsl
vec3 applyFog(vec3 color, float dist) {
  float f = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
  return mix(color, uFogColor, clamp(f, 0.0, 1.0));
}
```

Distance in this world does not sharpen — it dissolves into darkness, the way
a real ocean swallows light. Surfaces also fade their *alpha* with distance,
so the far edge of the surface melts into the background sphere rather than
ending at a visible border.

### 5. Motion Language

- **Everything alive, nothing spastic.** Periods are long (5–30 s). Flicker
  is slow sine, never noise-strobe.
- **The fish is physics, not keyframes**: seek-steering with clamped force,
  velocity integration, banking rolls into turns, head leading the body.
- **Amplitude grows toward the tail** (quadratic in `aAlong`) — the signature
  of real fish undulation. Tail-beat phase is *integrated on the CPU* so
  changing beat frequency never pops the spine.
- **Particles never touch the CPU**: sinking, rising, wobble and fade are all
  vertex-shader math driven by a single `uTime` uniform.

---

## The Seven-Layer Water Recipe

The scene composes depth as an ordered layer stack (back → front), each
layer a separate concern:

| # | Layer | File | Purpose |
|---|---|---|---|
| 1 | Background sphere | `BackgroundGradient.tsx` | Near-black edges, ocean bloom above, slow fbm shimmer, vignette |
| 2 | Seabed | `CausticFloor.tsx` | Dual-scale caustic pools, radial fade into abyss, fish glow-ring |
| 3 | Current sheets | `CurrentSheets.tsx` | 3 large noise sheets undulating mid-water |
| 4 | God-rays | `LightRays.tsx` | 4–7 feathered light columns, swaying rack |
| 5 | Particles | `UnderwaterParticles.tsx` | Marine snow (sinks) + bubbles (rise, wobble, dissolve) |
| 6 | Surface | `WaterSurface.tsx` | 4 summed wave trains, caustic underside, sparkle, fish glow |
| 7 | The koi | `KoiFish.tsx` | Procedural fish + soft halo, camera-facing billboard |

Plus a **CameraRig**: the camera damps toward the pointer (`±0.55x, ±0.34y`)
and idles on slow sines when the user is away. Parallax is gentle — a
submarine drift, never a shaky hand.

**Why additive blending everywhere?** Depth comes from *adding light onto
darkness*, not from occluding. It lets layers overlap softly and fade
gracefully, and it is the aesthetic DNA of the style: this water is made of
light, not of surfaces.

---

## The Procedural Koi

No model files. The fish is built in code at first mount:

- **Body** — a 48 × 28 ring lattice, radii driven by three Catmull-Rom
  profile curves (`TOP_Y`, `BOTTOM_Y`, `HALF_W`) sampled at 12 stations:
  blunt nose, full shoulders, tapering peduncle. Nose and tail caps close
  the hull.
- **Fins** — `THREE.Shape` bezier outlines: a riding dorsal, a mirrored anal,
  a long forked flowing caudal, paired pectorals on pivot groups (so they can
  *row*), and small pelvics.
- **Custom vertex attributes** carry the animation contract:
  - `aAlong` — 0 at the nose, 1 at the tail tip (fins exceed 1)
  - `aEdge` — 0 at a fin's root, 1 at its rim (for membrane gradients)
- **The shared vertex stage** applies the traveling wave
  `x += sin(uPhase − aAlong·uFreq) · amp·(0.08 + 0.92·along²)`, a turn-arc
  term `−uTurn·0.5·along²`, a subtle roll, and high-frequency flutter on fin
  membranes only.
- **Fragment stages**: pearlescent belly vs saturated blue back, a staggered
  scale-net, gill shading, wet specular glints, cyan fresnel rim, sun
  caustics on the back, fog. Fins render as translucent membranes with ray
  lines and dissolve toward their rims.
- **The halo** — an additive billboard that trails the fish, breathing with
  its speed: the "water reacts to the fish" tell.

---

## Interaction System

One unified system — **PointerEvents handle mouse, touch and pen alike**.
There are no separate mobile/desktop code paths.

```
pointermove / pointerdown      → ndc coordinates, target active
pointerup / leave / cancel     → release (2.2 s grace, then autonomous)
```

Key mechanics (all in `usePointerTarget.ts` + `useAutonomousSwimming.ts`):

- The hero container uses `touch-action: pan-y` — vertical drags scroll the
  page, horizontal or stationary touches steer the fish.
- The pointer is **raycast onto a depth plane** at `z = 1.2` and clamped to
  the swim volume, then **lerp-smoothed** so jittery input never jiggles the
  fish.
- Speed scales with distance to the target; the fish **orbits** a resting
  pointer instead of parking on it (curious, never glued).
- After `POINTER_RELEASE_DELAY` (2.2 s) of no input, autonomous waypoint
  behavior resumes — random far targets, occasional hover pauses, varied
  cruise speeds, soft containment that steers back before any hard clamp.

## Shader Architecture

All shared GLSL lives in `glsl.ts` as injectable template chunks:

| Chunk | Purpose |
|---|---|
| `GLSL_FOG` | Exponential-squared fog (one atmosphere everywhere) |
| `GLSL_NOISE` | hash21 → value noise → 3-octave fbm |
| `GLSL_CAUSTICS` | Interference caustics, 3 iterations (large surfaces) |
| `GLSL_CAUSTICS_LITE` | 2-iteration variant (fish skin) |
| `GLSL_FISH_GLOW` | Gaussian cyan glow around the live fish position |

The material pattern used by every layer:

```ts
const material = useMemo(() => new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader }), []);
useEffect(() => () => material.dispose(), [material]);
useFrame((state) => {
  material.uniforms.uTime.value = state.clock.elapsedTime;   // the only per-frame work
  material.uniforms.uFishPos.value.copy(underwater.fishPos);
});
```

**Rule: `useFrame` writes uniforms and mutates refs. It never calls setState.**

## The Non-Reactive Store Pattern

`store.ts` exports `underwater` — a plain **mutable module singleton**.
DOM listeners write to it; `useFrame` loops read it. React re-renders are
never triggered by the animation. This is the core performance contract of
the whole scene:

```ts
export const underwater: UnderwaterStore = {
  pointer: { ndcX, ndcY, active, lastMoveAt, hasInteracted },
  mode: "autonomous" | "pointer",
  target: new THREE.Vector3(),
  fishPos: new THREE.Vector3(),   // read by 4 environment shaders
  bounds: { x, y, zMin, zMax },   // recomputed on resize by <SceneBounds/>
  fishScale, quality, reducedMotion,
};
```

## Performance System

| Mechanism | Implementation |
|---|---|
| Quality tiers | `useSceneQuality` — coarse pointer / `< 768px` / ≤ 4 cores → `"low"` |
| `low` tier | DPR ≤ 1.4, no antialias, 340 snow + 42 bubbles, 4 rays, coarse meshes |
| `high` tier | DPR ≤ 2, 850 snow + 110 bubbles, 7 rays, fine meshes |
| Tab hidden | `frameloop="never"` via `visibilitychange` |
| Resize | `SceneBounds` recomputes the swim volume from the live FOV & aspect |
| Frame loop | Allocation-free: scratch vectors reused; dt clamped to 50 ms |
| Disposal | Every geometry/material disposed on unmount |

## Accessibility

- `prefers-reduced-motion`: camera parallax, particle drift, wave sway and
  beat frequency are quieted (not zeroed — the scene stays alive but calm);
  all Framer Motion translations collapse to opacity-only.
- A `sr-only` description of the scene for screen readers; the canvas itself
  is `aria-hidden`.
- Skip-to-content link, semantic landmarks, `aria-current` nav tracking,
  visible cyan focus rings, 44 px touch targets, safe-area padding.
- WebGL unavailable → a calm CSS-gradient backdrop replaces the scene
  gracefully; the site remains fully usable.

## Customization Guide

| Want to change… | Touch… |
|---|---|
| The palette | `store.ts → PALETTE` + `globals.css → @theme` tokens |
| Fog density / color | `store.ts → FOG` (all shaders read it) |
| Fish speed & curiosity | `useAutonomousSwimming.ts` — `maxSpeed`, `maxForce`, orbit radius, release delay |
| Fish shape | `koiGeometry.ts` profile arrays (`TOP_Y`, `BOTTOM_Y`, `HALF_W`) |
| Wave character | `WaterSurface.tsx` — the four wave trains in the vertex stage |
| Particle density | `UnderwaterParticles.tsx` counts per quality tier |
| God-ray mood | `LightRays.tsx` — `RAY_LAYOUT` (x, z, width, tilt, yaw, intensity) |
| Swim volume | `SceneBounds` in `UnderwaterScene.tsx` (fractions of visible area) |

## Reusing This Style in Other Projects

The look is a recipe, not a library. Port it in seven steps:

1. **Start from black.** `#000` page, `#010409` scene clear color.
2. **One gradient sky** — an inverted sphere, not a skybox image: vertical
   depth mix + one directional bloom + slow fbm shimmer + edge vignette.
3. **One fog chunk, shared by every shader** — exp-squared toward near-black.
   Atmosphere is consistency.
4. **Additive light layers** for volumetrics (rays, sheets), each with
   feathered edges and its own slow flicker. Add light, never geometry.
5. **Surface with summed wave trains** (≥ 3 frequencies, two directions) —
   never a scrolling texture.
6. **GPU-only particles** — position math in the vertex stage, one `uTime`
   uniform, seeded attributes for per-particle character.
7. **One creature, built procedurally**, animated by a traveling wave whose
   amplitude grows toward the tail, integrated phase, banking turns —
   physics reads as life.

And the DOM layer rule: **type stays crisp and static above the water.**
The tension between editorial typography and living water *is* the style.

## Browser Support

| Browser | Status |
|---|---|
| Chrome / Edge / Safari / Firefox (current − 2) | Full experience |
| WebGL unavailable | CSS fallback atmosphere, full content |
| Reduced-motion users | Calmed 3D, opacity-only UI motion |

---

**UMIKO** — built with React, Three.js and hand-written GLSL.
Every frame is computed as you watch it.
