"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLSL_CAUSTICS, GLSL_FOG, GLSL_FISH_GLOW, GLSL_NOISE } from "./glsl";
import { FOG, PALETTE, underwater, type SceneQuality } from "./store";

/**
 * The water surface seen from below — a large plane whose vertex stage sums
 * four wave trains (two directions, multiple frequencies) so the swell
 * never reads as a flat looping texture. The fragment stage mixes depth
 * color, caustic sparkle and a faint glow that follows the koi.
 */
export function WaterSurface({ quality }: { quality: SceneQuality }): React.ReactElement {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uDeep: { value: new THREE.Color(PALETTE.abyss) },
          uOcean: { value: new THREE.Color(PALETTE.ocean) },
          uElectric: { value: new THREE.Color(PALETTE.electric) },
          uGlow: { value: new THREE.Color(PALETTE.glow) },
          uFogColor: { value: new THREE.Color(FOG.color) },
          uFogDensity: { value: FOG.density },
          uFishPos: { value: new THREE.Vector3() },
        },
        vertexShader: /* glsl */ `
          uniform float uTime;
          varying float vHeight;
          varying vec3 vPosW;
          varying float vDist;

          void main() {
            vec3 p = position;
            // Four summed wave trains — organic, non-repeating swell.
            float h = 0.0;
            h += sin(p.x * 0.24 + uTime * 0.62) * 0.42;
            h += sin(p.y * 0.31 - uTime * 0.47) * 0.31;
            h += sin((p.x + p.y) * 0.15 + uTime * 0.33) * 0.5;
            h += sin(p.x * 0.85 - uTime * 1.05) * 0.09;
            p.z += h;
            vHeight = h;

            vec4 wp = modelMatrix * vec4(p, 1.0);
            vPosW = wp.xyz;
            vec4 mv = viewMatrix * wp;
            vDist = -mv.z;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform vec3 uDeep;
          uniform vec3 uOcean;
          uniform vec3 uElectric;
          uniform vec3 uGlow;

          ${GLSL_CAUSTICS}
          ${GLSL_NOISE}
          ${GLSL_FISH_GLOW}
          ${GLSL_FOG}

          varying float vHeight;
          varying vec3 vPosW;
          varying float vDist;

          void main() {
            // Swell brightness — crests catch more light.
            float crest = smoothstep(-0.7, 0.9, vHeight);

            // Caustic lace racing across the underside of the surface.
            float ca = caustics(vPosW.xz * 0.055, uTime * 0.35);

            vec3 col = mix(uDeep, uOcean, crest * 0.75);
            col += uElectric * ca * 0.4;
            col += uGlow * ca * 0.25;

            // Sparkle — tiny specular glints riding the crests.
            float sparkle = step(0.985, vnoise(vPosW.xz * 6.0 + uTime * 0.8));
            col += uGlow * sparkle * crest * 0.8;

            // The koi's presence brightens the water just above it.
            col += uGlow * fishGlow(vPosW, 2.6, 0.1);

            // Fade with distance into the dark.
            col = applyFog(col, vDist);
            float alpha = mix(0.55, 0.92, crest) * smoothstep(70.0, 18.0, vDist);
            gl_FragColor = vec4(col, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );

  useEffect(() => () => material.dispose(), [material]);

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uFishPos.value.copy(underwater.fishPos);
  });

  const segments = quality === "low" ? [56, 28] : [110, 54];

  return (
    <mesh
      material={material}
      position={[0, 5.1, 0]}
      rotation={[Math.PI / 2, 0, 0]}
      renderOrder={5}
    >
      <planeGeometry args={[150, 90, segments[0], segments[1]]} />
    </mesh>
  );
}
