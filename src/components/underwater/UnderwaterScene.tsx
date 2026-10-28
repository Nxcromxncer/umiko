"use client";

import { useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { BackgroundGradient } from "./BackgroundGradient";
import { WaterSurface } from "./WaterSurface";
import { CausticFloor } from "./CausticFloor";
import { LightRays } from "./LightRays";
import { CurrentSheets } from "./CurrentSheets";
import { UnderwaterParticles } from "./UnderwaterParticles";
import { KoiFish } from "./KoiFish";
import { useSceneQuality } from "./useSceneQuality";
import { underwater } from "./store";
import * as THREE from "three";

const CAMERA_BASE = new THREE.Vector3(0, 0.55, 13);

/**
 * Recomputes the koi's swim volume from the live viewport so the fish stays
 * prominently visible on every aspect ratio, and scales it down slightly in
 * portrait so it never crowds a phone screen.
 */
function SceneBounds(): null {
  const { size, camera } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const dist = CAMERA_BASE.length();
    const visH = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * dist;
    const visW = visH * (size.width / size.height);
    underwater.bounds.x = THREE.MathUtils.clamp(visW * 0.34, 2.0, 6.8);
    underwater.bounds.y = THREE.MathUtils.clamp(visH * 0.26, 1.45, 3.1);
    underwater.fishScale = size.width / size.height < 0.8 ? 0.82 : 1;
  }, [size, camera]);
  return null;
}

/**
 * Camera rig — gentle parallax toward the pointer, drifting idly when the
 * user is away. Disabled entirely under reduced-motion.
 */
function CameraRig(): null {
  useFrame((state, dt) => {
    const cam = state.camera;
    const t = state.clock.elapsedTime;
    const reduce = underwater.reducedMotion;

    let px = 0;
    let py = 0;
    if (!reduce) {
      if (underwater.pointer.active) {
        px = underwater.pointer.ndcX * 0.55;
        py = underwater.pointer.ndcY * 0.34;
      } else {
        px = Math.sin(t * 0.07) * 0.22;
        py = Math.cos(t * 0.055) * 0.14;
      }
    }

    cam.position.x = THREE.MathUtils.damp(cam.position.x, CAMERA_BASE.x + px, 1.7, dt);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, CAMERA_BASE.y + py, 1.7, dt);
    cam.lookAt(0, 0, 0);
  });
  return null;
}

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** CSS-only stand-in when WebGL is unavailable — calm, no fake 3D. */
function FallbackBackdrop(): React.ReactElement {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(7,91,206,0.28),transparent_65%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_110%,rgba(3,21,43,0.9),transparent_70%)]" />
      <div className="ocean-fallback-drift absolute left-[20%] top-[8%] h-64 w-64 rounded-full bg-[#168BFF]/10 blur-3xl" />
      <div className="ocean-fallback-drift-slow absolute right-[15%] top-[35%] h-80 w-80 rounded-full bg-[#65E6FF]/8 blur-3xl" />
    </div>
  );
}

/**
 * The complete underwater world: background gradient, god-rays, currents,
 * surface, seabed, particles and the interactive koi.
 */
export default function UnderwaterScene(): React.ReactElement {
  const quality = useSceneQuality();

  // This tree is client-only (dynamic import, ssr: false) — lazy init is safe.
  const [webglSupported] = useState(supportsWebGL);

  // Pause the render loop while the tab is hidden.
  const [frameloop, setFrameloop] = useState<"always" | "never">("always");
  useEffect(() => {
    const handler = () => setFrameloop(document.hidden ? "never" : "always");
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  if (!webglSupported) {
    return <FallbackBackdrop />;
  }

  return (
    <Canvas
      className="absolute inset-0"
      frameloop={frameloop}
      flat
      dpr={[1, quality === "low" ? 1.4 : 2]}
      camera={{ position: [CAMERA_BASE.x, CAMERA_BASE.y, CAMERA_BASE.z], fov: 45, near: 0.1, far: 130 }}
      gl={{
        antialias: quality === "high",
        powerPreference: "high-performance",
        alpha: false,
        stencil: false,
      }}
      onCreated={({ gl }) => {
        // Custom shaders author colors directly in display space.
        THREE.ColorManagement.enabled = false;
        gl.setClearColor("#010409");
      }}
      aria-hidden="true"
    >
      <SceneBounds />
      <BackgroundGradient />
      <LightRays quality={quality} />
      <CurrentSheets quality={quality} />
      <CausticFloor />
      <UnderwaterParticles quality={quality} />
      <WaterSurface quality={quality} />
      <KoiFish />
      <CameraRig />
    </Canvas>
  );
}
