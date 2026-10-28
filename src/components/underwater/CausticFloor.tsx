"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLSL_CAUSTICS, GLSL_FOG, GLSL_FISH_GLOW } from "./glsl";
import { FOG, PALETTE, underwater } from "./store";

/**
 * The seabed — barely there, deep below, with animated interference
 * caustics pooling across it and a faint glow where the koi swims above.
 * Additive blending lets it dissolve into the abyss at distance.
 */
export function CausticFloor(): React.ReactElement {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uDeep: { value: new THREE.Color(PALETTE.abyss) },
          uOcean: { value: new THREE.Color(PALETTE.ocean) },
          uGlow: { value: new THREE.Color(PALETTE.glow) },
          uFogColor: { value: new THREE.Color(FOG.color) },
          uFogDensity: { value: FOG.density },
          uFishPos: { value: new THREE.Vector3() },
        },
        vertexShader: /* glsl */ `
          varying vec3 vPosW;
          varying float vDist;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
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
          uniform vec3 uGlow;

          ${GLSL_CAUSTICS}
          ${GLSL_FISH_GLOW}
          ${GLSL_FOG}

          varying vec3 vPosW;
          varying float vDist;

          void main() {
            // Two layers of caustics at different scales & drift.
            float c1 = caustics(vPosW.xz * 0.06, uTime * 0.3);
            float c2 = caustics(vPosW.xz * 0.115 + 40.0, uTime * 0.42 + 30.0);
            float ca = c1 * 0.75 + c2 * 0.35;

            vec3 col = uDeep * 0.6;
            col += uOcean * ca * 0.7;
            col += uGlow * ca * 0.38;

            // The koi casts a soft ring of light onto the floor.
            col += uGlow * fishGlow(vPosW, 3.4, 0.14);

            // Radial falloff — the floor vanishes into darkness.
            float r = length(vPosW.xz);
            float fade = 1.0 - smoothstep(10.0, 34.0, r);
            col = applyFog(col, vDist);
            gl_FragColor = vec4(col * fade, fade);
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
    material.uniforms.uFishPos.value.copy(underwater.fishPos);
  });

  return (
    <mesh material={material} position={[0, -6.4, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
      <planeGeometry args={[130, 100, 1, 1]} />
    </mesh>
  );
}
