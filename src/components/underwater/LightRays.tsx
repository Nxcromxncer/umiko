"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PALETTE, underwater, type SceneQuality } from "./store";

/**
 * Volumetric god-rays — tall additive planes descending from the surface,
 * each with soft side edges, a vertical falloff and an independent flicker
 * derived from its world position. The whole rack sways almost imperceptibly.
 */
const RAYS_HIGH = 7;
const RAYS_LOW = 4;

const RAY_LAYOUT = [
  { x: -6.2, z: -4.2, w: 1.5, tilt: 0.16, yaw: 0.1, i: 0.14 },
  { x: -3.4, z: -2.6, w: 0.9, tilt: -0.11, yaw: -0.06, i: 0.11 },
  { x: -1.1, z: -5.0, w: 2.0, tilt: 0.08, yaw: 0.03, i: 0.16 },
  { x: 1.4, z: -3.2, w: 1.1, tilt: -0.14, yaw: 0.08, i: 0.12 },
  { x: 3.9, z: -4.6, w: 1.7, tilt: 0.12, yaw: -0.09, i: 0.15 },
  { x: 6.0, z: -2.4, w: 0.8, tilt: -0.18, yaw: 0.05, i: 0.1 },
  { x: 0.2, z: -1.6, w: 0.65, tilt: 0.05, yaw: 0.0, i: 0.08 },
];

export function LightRays({ quality }: { quality: SceneQuality }): React.ReactElement {
  const groupRef = useRef<THREE.Group>(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uElectric: { value: new THREE.Color(PALETTE.electric) },
          uGlow: { value: new THREE.Color(PALETTE.glow) },
          uIntensity: { value: 1 },
          uSway: { value: 0 },
        },
        vertexShader: /* glsl */ `
          uniform float uSway;
          varying vec2 vUv;
          varying float vWorldX;
          void main() {
            vUv = uv;
            vec3 p = position;
            p.x += sin(uv.y * 2.2) * uSway;
            vec4 wp = modelMatrix * vec4(p, 1.0);
            vWorldX = wp.x;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform float uIntensity;
          uniform vec3 uElectric;
          uniform vec3 uGlow;
          varying vec2 vUv;
          varying float vWorldX;

          void main() {
            // Vertical falloff — strongest at the surface, fading into the deep.
            float v = smoothstep(0.0, 0.42, vUv.y);
            v *= smoothstep(1.0, 0.86, vUv.y);

            // Feathered side edges.
            float side = smoothstep(0.0, 0.34, vUv.x) * smoothstep(1.0, 0.66, vUv.x);

            // Independent slow flicker per ray.
            float flicker = 0.62 + 0.38 * sin(uTime * 0.32 + vWorldX * 0.9);

            float a = v * side * flicker * uIntensity;
            vec3 col = mix(uElectric, uGlow, vUv.y * 0.7);
            gl_FragColor = vec4(col, a * 0.7);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [],
  );

  useEffect(() => () => material.dispose(), [material]);

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uSway.value = underwater.reducedMotion ? 0 : 0.28;
    if (groupRef.current) {
      groupRef.current.rotation.z = underwater.reducedMotion
        ? 0
        : Math.sin(state.clock.elapsedTime * 0.05) * 0.02;
    }
  });

  const count = quality === "low" ? RAYS_LOW : RAYS_HIGH;

  return (
    <group ref={groupRef}>
      {RAY_LAYOUT.slice(0, count).map((ray, idx) => (
        <mesh
          key={idx}
          material={material}
          position={[ray.x, 1.4, ray.z]}
          rotation={[0, ray.yaw, ray.tilt]}
          renderOrder={3}
        >
          <planeGeometry args={[ray.w, 16]} />
        </mesh>
      ))}
    </group>
  );
}
