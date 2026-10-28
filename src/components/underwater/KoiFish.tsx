"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  createKoiBodyMaterial,
  createKoiFinMaterial,
  createKoiHaloMaterial,
  createKoiUniforms,
  disposeKoiMaterials,
} from "./koiShaders";
import { getKoiGeometries, topProfileAt, bottomProfileAt } from "./koiGeometry";
import { useAutonomousSwimming } from "./useAutonomousSwimming";
import { underwater } from "./store";

/**
 * The blue koi — a fully procedural fish with undulating body, flowing fins,
 * eyes and a soft travelling halo. All per-frame work happens in useFrame on
 * refs and shared uniforms; React never re-renders during animation.
 */
export function KoiFish(): React.ReactElement {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const pectoralLRef = useRef<THREE.Group>(null);
  const pectoralRRef = useRef<THREE.Group>(null);
  const swim = useAutonomousSwimming();

  const geos = useMemo(() => getKoiGeometries(), []);
  const uniforms = useMemo(() => createKoiUniforms(), []);
  const bodyMat = useMemo(() => createKoiBodyMaterial(uniforms), [uniforms]);
  const finMat = useMemo(() => createKoiFinMaterial(uniforms), [uniforms]);
  const haloMat = useMemo(() => createKoiHaloMaterial(), []);

  const eyeGeo = useMemo(() => new THREE.SphereGeometry(0.034, 12, 10), []);
  const eyeMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#060a12" }),
    [],
  );

  useEffect(() => {
    return () => {
      disposeKoiMaterials(bodyMat, finMat, haloMat);
      eyeGeo.dispose();
      eyeMat.dispose();
    };
  }, [bodyMat, finMat, haloMat, eyeGeo, eyeMat]);

  // Fin placement, derived from the body profile.
  const dorsalY = useMemo(() => topProfileAt(0.45) - 0.02, []);
  const analY = useMemo(() => -bottomProfileAt(0.62) + 0.02, []);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;
    const s = swim.current;
    s.update(dt, camera, performance.now());

    const group = groupRef.current;
    if (!group) return;

    group.position.copy(s.position);
    group.quaternion.copy(s.heading);

    // Responsive scale (smaller in portrait) without visual snapping.
    const targetScale = underwater.fishScale;
    const current = group.scale.x;
    const next = THREE.MathUtils.damp(current, targetScale, 4, dt);
    group.scale.setScalar(next);

    // Swimming uniforms — beat and amplitude follow speed and turning.
    const reduce = underwater.reducedMotion;
    uniforms.uPhase.value = s.phase;
    uniforms.uAmp.value = (0.13 + Math.min(s.speed, 3) * 0.055) * (reduce ? 0.55 : 1);
    uniforms.uFreq.value = 4.3;
    uniforms.uTurn.value = s.turn;
    uniforms.uTime.value = t;

    // Pectoral fins row with the beat; asymmetry while turning.
    const row = Math.sin(s.phase * 0.85 + Math.PI / 2) * 0.3;
    if (pectoralLRef.current) {
      pectoralLRef.current.rotation.y = -0.28 + row + s.turn * 0.14;
      pectoralLRef.current.rotation.z = 0.55 + Math.sin(s.phase * 0.85) * 0.08;
    }
    if (pectoralRRef.current) {
      pectoralRRef.current.rotation.y = 0.28 - row - s.turn * 0.14;
      pectoralRRef.current.rotation.z = -0.55 - Math.sin(s.phase * 0.85) * 0.08;
    }

    // Halo — a faint cyan aura that billboards toward the camera and
    // breathes with the fish's effort.
    const halo = haloRef.current;
    if (halo) {
      halo.position.copy(s.position);
      halo.quaternion.copy(camera.quaternion);
      const toward = halo.position.distanceTo(camera.position);
      const dirBack = halo.position
        .clone()
        .sub(camera.position)
        .normalize()
        .multiplyScalar(-Math.min(toward * 0.02, 0.9));
      halo.position.add(dirBack);
      haloMat.uniforms.uIntensity.value =
        0.1 + Math.min(s.speed, 2.6) * 0.045 + Math.sin(t * 0.6) * 0.02;
    }
  });

  return (
    <>
      <group ref={groupRef}>
        {/* Body */}
        <mesh geometry={geos.body} material={bodyMat} />

        {/* Dorsal fin rides the back */}
        <mesh geometry={geos.dorsal} material={finMat} position={[0, dorsalY, 0.05]} renderOrder={6} />

        {/* Anal fin under the rear belly */}
        <mesh geometry={geos.anal} material={finMat} position={[0, analY, 0]} renderOrder={6} />

        {/* Flowing caudal (tail) fin — continues the body's wave */}
        <mesh geometry={geos.caudal} material={finMat} position={[0, 0.01, 0]} renderOrder={6} />

        {/* Paired pectoral fins on pivots so they can row */}
        <group ref={pectoralLRef} position={[0.105, -0.075, -0.42]}>
          <mesh geometry={geos.pectoral} material={finMat} renderOrder={6} />
        </group>
        <group ref={pectoralRRef} position={[-0.105, -0.075, -0.42]}>
          <mesh geometry={geos.pectoral} material={finMat} scale={[-1, 1, 1]} renderOrder={6} />
        </group>

        {/* Pelvic fins */}
        <group position={[0.062, -bottomProfileAt(0.56) + 0.03, 0.12]} rotation={[0.35, 0, 0.9]}>
          <mesh geometry={geos.pelvic} material={finMat} renderOrder={6} />
        </group>
        <group position={[-0.062, -bottomProfileAt(0.56) + 0.03, 0.12]} rotation={[0.35, 0, -0.9]}>
          <mesh geometry={geos.pelvic} material={finMat} scale={[-1, 1, 1]} renderOrder={6} />
        </group>

        {/* Eyes */}
        <mesh geometry={eyeGeo} material={eyeMat} position={[0.098, 0.05, -0.72]} />
        <mesh geometry={eyeGeo} material={eyeMat} position={[-0.098, 0.05, -0.72]} />
      </group>

      {/* Soft light distortion travelling with the koi */}
      <mesh ref={haloRef} material={haloMat} renderOrder={7}>
        <planeGeometry args={[3.1, 3.1]} />
      </mesh>
    </>
  );
}
