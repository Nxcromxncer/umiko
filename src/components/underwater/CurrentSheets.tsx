"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLSL_FOG, GLSL_FISH_GLOW, GLSL_NOISE } from "./glsl";
import { FOG, PALETTE, underwater, type SceneQuality } from "./store";

/**
 * Ghostly mid-water currents — large, slowly undulating sheets of drifting
 * noise. They carry the "flowing blue wave pattern" language of the scene:
 * broad soft forms rising and falling, never repeating, never flat.
 */

interface SheetConfig {
  pos: [number, number, number];
  rot: [number, number, number];
  seed: number;
}

const SHEETS_HIGH: SheetConfig[] = [
  { pos: [-3.5, 0.9, -3.4], rot: [1.28, 0.25, 0.12], seed: 1.7 },
  { pos: [2.8, -0.8, -4.4], rot: [1.42, -0.2, -0.1], seed: 4.2 },
  { pos: [0.4, 1.8, -5.2], rot: [1.18, 0.05, 0.2], seed: 8.9 },
];
const SHEETS_LOW: SheetConfig[] = SHEETS_HIGH.slice(0, 2);

function createSheetMaterial(seed: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSeed: { value: seed },
      uOcean: { value: new THREE.Color(PALETTE.ocean) },
      uGlow: { value: new THREE.Color(PALETTE.glow) },
      uFogColor: { value: new THREE.Color(FOG.color) },
      uFogDensity: { value: FOG.density },
      uFishPos: { value: new THREE.Vector3() },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uSeed;
      varying vec2 vUv;
      varying vec3 vPosW;
      varying float vDist;

      void main() {
        vec3 p = position;
        // Slow, large soft waves rising and falling.
        p.z += sin(p.x * 0.28 + uTime * 0.22 + uSeed) * 0.85;
        p.z += sin(p.y * 0.5 - uTime * 0.16 + uSeed * 0.6) * 0.45;
        p.z += sin((p.x + p.y) * 0.12 + uTime * 0.1) * 0.6;

        vUv = uv;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vPosW = wp.xyz;
        vec4 mv = viewMatrix * wp;
        vDist = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uSeed;
      uniform vec3 uOcean;
      uniform vec3 uGlow;

      ${GLSL_NOISE}
      ${GLSL_FISH_GLOW}
      ${GLSL_FOG}

      varying vec2 vUv;
      varying vec3 vPosW;
      varying float vDist;

      void main() {
        // Flowing bands of turbidity, drifting sideways through time.
        vec2 q = vec2(vUv.x * 3.4 - uTime * 0.028 - uSeed, vUv.y * 1.6 + uSeed * 0.3);
        float band = fbm(q);
        float band2 = fbm(q * 1.9 + 7.3);

        float mask = smoothstep(0.38, 0.72, band * 0.7 + band2 * 0.3);

        // Feather toward the sheet borders.
        float edge = smoothstep(0.0, 0.22, vUv.x) * smoothstep(1.0, 0.78, vUv.x)
                   * smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);

        vec3 col = mix(uOcean, uGlow, band2 * 0.6);
        col += uGlow * fishGlow(vPosW, 3.0, 0.08);
        col = applyFog(col, vDist);

        gl_FragColor = vec4(col, mask * edge * 0.085);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

export function CurrentSheets({ quality }: { quality: SceneQuality }): React.ReactElement {
  const sheets = quality === "low" ? SHEETS_LOW : SHEETS_HIGH;

  const materials = useMemo(
    () => sheets.map((sheet) => createSheetMaterial(sheet.seed)),
    [sheets],
  );

  useEffect(
    () => () => {
      materials.forEach((m) => m.dispose());
    },
    [materials],
  );

  useFrame((state) => {
    for (const m of materials) {
      m.uniforms.uTime.value = state.clock.elapsedTime;
      m.uniforms.uFishPos.value.copy(underwater.fishPos);
    }
  });

  return (
    <group>
      {sheets.map((sheet, idx) => (
        <mesh
          key={idx}
          material={materials[idx]}
          position={sheet.pos}
          rotation={sheet.rot}
          renderOrder={2}
        >
          <planeGeometry args={[26, 11, 40, 16]} />
        </mesh>
      ))}
    </group>
  );
}
