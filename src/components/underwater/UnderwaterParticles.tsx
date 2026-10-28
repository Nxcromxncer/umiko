"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { underwater, type SceneQuality } from "./store";

/**
 * Two GPU-driven particle systems, animated entirely in the vertex shader:
 *
 *  - Marine snow: tiny suspended motes that sink almost imperceptibly and
 *    drift sideways, giving the water physical depth.
 *  - Bubbles: rising, wobbling, fading as they approach the surface.
 *
 * No per-frame CPU updates, no allocations — just uniforms.
 */

const RANGE_Y = 11.6;

function buildSnowGeometry(count: number): THREE.BufferGeometry {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() * 2 - 1) * 15;
    positions[i * 3 + 1] = Math.random() * RANGE_Y;
    positions[i * 3 + 2] = -9 + Math.random() * 12.5;
    seeds[i] = Math.random();
    sizes[i] = 0.9 + Math.random() * 2.2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -0.5, -2), 40);
  return geo;
}

function buildBubbleGeometry(count: number): THREE.BufferGeometry {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const sizes = new Float32Array(count);
  const speeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    // Bubbles cluster into loose columns.
    const columnX = (Math.random() * 2 - 1) * 9;
    positions[i * 3] = columnX + (Math.random() * 2 - 1) * 0.8;
    positions[i * 3 + 1] = Math.random() * RANGE_Y;
    positions[i * 3 + 2] = -8 + Math.random() * 10;
    seeds[i] = Math.random();
    sizes[i] = 1.6 + Math.random() * 3.4;
    speeds[i] = 0.22 + Math.random() * 0.5;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -0.5, -3), 40);
  return geo;
}

export function UnderwaterParticles({ quality }: { quality: SceneQuality }): React.ReactElement {
  const { size, viewport } = useThree();

  const snowCount = quality === "low" ? 340 : 850;
  const bubbleCount = quality === "low" ? 42 : 110;

  const snowGeo = useMemo(() => buildSnowGeometry(snowCount), [snowCount]);
  const bubbleGeo = useMemo(() => buildBubbleGeometry(bubbleCount), [bubbleCount]);

  const snowMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSizeFactor: { value: 40 },
          uOpacity: { value: 0.5 },
        },
        vertexShader: /* glsl */ `
          uniform float uTime;
          uniform float uSizeFactor;
          attribute float aSeed;
          attribute float aSize;
          varying float vSeed;
          void main() {
            vec3 p = position;
            // Almost-imperceptible sinking, wrapped inside the volume.
            float speed = 0.05 + aSeed * 0.09;
            p.y = mod(p.y + 11.6 - uTime * speed, 11.6) - 6.4;
            // Lazy sideways drift.
            p.x += sin(uTime * 0.14 + aSeed * 50.0) * 0.45;
            p.z += cos(uTime * 0.11 + aSeed * 33.0) * 0.3;

            vSeed = aSeed;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = aSize * uSizeFactor / max(-mv.z, 0.1);
            gl_PointSize = clamp(gl_PointSize, 1.0, 7.0);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uOpacity;
          varying float vSeed;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.12, d) * uOpacity;
            vec3 col = mix(vec3(0.72, 0.8, 0.92), vec3(0.55, 0.72, 0.9), vSeed);
            gl_FragColor = vec4(col, a);
          }
        `,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );

  const bubbleMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSizeFactor: { value: 40 },
          uOpacity: { value: 0.75 },
        },
        vertexShader: /* glsl */ `
          uniform float uTime;
          uniform float uSizeFactor;
          attribute float aSeed;
          attribute float aSize;
          attribute float aSpeed;
          varying float vFade;
          void main() {
            vec3 p = position;
            // Rising with wobble.
            float y = mod(p.y + uTime * aSpeed, 11.6);
            p.y = y - 6.4;
            float rise = y / 11.6;
            p.x += sin(uTime * 1.3 + aSeed * 40.0) * 0.28 * (0.3 + rise);
            p.z += cos(uTime * 1.05 + aSeed * 28.0) * 0.22;

            // Fade in at the bottom, dissolve near the surface.
            vFade = smoothstep(0.0, 0.09, rise) * (1.0 - smoothstep(0.82, 1.0, rise));

            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = aSize * uSizeFactor / max(-mv.z, 0.1);
            gl_PointSize = clamp(gl_PointSize, 1.5, 14.0);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uOpacity;
          varying float vFade;
          void main() {
            vec2 pc = gl_PointCoord - 0.5;
            float d = length(pc);
            // A soft ring with a specular pip — reads as a bubble.
            float body = smoothstep(0.5, 0.36, d);
            float rim = smoothstep(0.5, 0.43, d) * smoothstep(0.33, 0.45, d);
            float pip = smoothstep(0.16, 0.02, length(pc + vec2(0.13, -0.13)));
            float a = (body * 0.28 + rim * 0.85 + pip * 0.9) * uOpacity * vFade;
            vec3 col = mix(vec3(0.6, 0.83, 1.0), vec3(0.4, 0.9, 1.0), rim);
            gl_FragColor = vec4(col, a);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  useEffect(
    () => () => {
      snowGeo.dispose();
      bubbleGeo.dispose();
      snowMat.dispose();
      bubbleMat.dispose();
    },
    [snowGeo, bubbleGeo, snowMat, bubbleMat],
  );

  // Point size must track resolution & DPR.
  useEffect(() => {
    const factor = size.height * Math.min(viewport.dpr ?? 1, 2) * 0.05;
    snowMat.uniforms.uSizeFactor.value = factor * 1.1;
    bubbleMat.uniforms.uSizeFactor.value = factor * 1.6;
  }, [size, viewport, snowMat, bubbleMat]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    snowMat.uniforms.uTime.value = t;
    bubbleMat.uniforms.uTime.value = t;
    if (underwater.reducedMotion) {
      // Freeze drift — particles hang still, opacity lowered.
      snowMat.uniforms.uOpacity.value = 0.4;
    }
  });

  return (
    <group renderOrder={4}>
      <points geometry={snowGeo} material={snowMat} frustumCulled={false} />
      <points geometry={bubbleGeo} material={bubbleMat} frustumCulled={false} />
    </group>
  );
}
