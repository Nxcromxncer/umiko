"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLSL_NOISE } from "./glsl";
import { PALETTE } from "./store";

/**
 * Giant inverted sphere that paints the deep-water gradient:
 * near-black at the edges and below, a soft ocean-blue glow blooming
 * toward the light above, with a slow shimmer so the dark feels alive.
 */
export function BackgroundGradient(): React.ReactElement {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uNearBlack: { value: new THREE.Color("#010409") },
          uDeep: { value: new THREE.Color(PALETTE.abyss) },
          uOcean: { value: new THREE.Color(PALETTE.ocean) },
          uLightDir: { value: new THREE.Vector3(0.3, 0.62, -0.72).normalize() },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform vec3 uNearBlack;
          uniform vec3 uDeep;
          uniform vec3 uOcean;
          uniform vec3 uLightDir;
          varying vec3 vDir;

          ${GLSL_NOISE}

          void main() {
            vec3 dir = normalize(vDir);

            // Vertical depth: bright-ish above, abyssal below.
            float above = smoothstep(-0.55, 0.85, dir.y);
            vec3 col = mix(uNearBlack, uDeep, above);

            // Bloom of light from the surface, fading toward frame edges.
            float lightDot = max(dot(dir, uLightDir), 0.0);
            col += uOcean * pow(lightDot, 2.3) * 0.7;

            // Slow, large-scale shimmer — water breathing in the dark.
            float n = fbm(dir.xz * 2.6 + uTime * 0.015);
            col *= 0.9 + 0.2 * n;

            // Vignette toward the frame edges.
            float edge = 1.0 - pow(max(dot(dir, vec3(0.0, 0.08, 0.99)), 0.0), 1.6);
            col *= mix(1.0, 0.72, edge);

            gl_FragColor = vec4(col, 1.0);
          }
        `,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [],
  );

  useEffect(() => () => material.dispose(), [material]);

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh material={material} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[58, 32, 24]} />
    </mesh>
  );
}
