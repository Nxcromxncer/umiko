"use client";

import { useRef } from "react";
import * as THREE from "three";
import { underwater, POINTER_PLANE_Z, POINTER_RELEASE_DELAY } from "./store";

/**
 * Koi steering brain.
 *
 * Blends two behaviors with a single physics model:
 *
 *  - AUTONOMOUS: random waypoints inside the visible volume, occasional
 *    hovering pauses, varied cruise speeds — smooth curved paths emerge
 *    naturally from rate-limited steering (no rigid waypoint snapping).
 *
 *  - POINTER: the user's cursor/finger is raycast onto a depth plane and
 *    becomes the target. The koi accelerates with distance, decelerates on
 *    approach and orbits the point when it stops — curious, never glued.
 *
 * Output is consumed by <KoiFish />: position, heading quaternion,
 * speed, turn bend and an integrated tail-beat phase.
 */

const UP = new THREE.Vector3(0, 1, 0);
const ZERO = new THREE.Vector3();
const AXIS_Z = new THREE.Vector3(0, 0, 1);

export interface KoiController {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  heading: THREE.Quaternion;
  speed: number;
  /** -1..1 lateral body bend (positive = bending to its left). */
  turn: number;
  /** Integrated tail-beat phase — frequency scales with speed. */
  phase: number;
  update: (dt: number, camera: THREE.Camera, now: number) => void;
}

export function useAutonomousSwimming(): { current: KoiController } {
  const ref = useRef<KoiController | null>(null);
  if (ref.current === null) {
    ref.current = createController();
  }
  return ref as { current: KoiController };
}

function createController(): KoiController {
  // --- Mutable simulation state (allocation-free per frame) ---
  const position = new THREE.Vector3(1.6, -0.4, -0.2);
  const velocity = new THREE.Vector3(-1.1, 0.15, 0);
  const heading = new THREE.Quaternion();

  let waypoint = new THREE.Vector3(-2.5, 0.9, 0);
  let waypointSpeed = 1.1;
  let nextWaypointAt = 0;
  let orbitAngle = Math.random() * Math.PI * 2;
  let turn = 0;

  // Scratch objects — reused every frame.
  const desiredVel = new THREE.Vector3();
  const steer = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const qRoll = new THREE.Quaternion();
  const fwd = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -POINTER_PLANE_Z);
  const rawTarget = new THREE.Vector3();
  const orbitTarget = new THREE.Vector3();

  const pickWaypoint = (now: number) => {
    const b = underwater.bounds;
    const pause = Math.random() < 0.14;
    if (pause) {
      // Hover in place with a lazy drift.
      waypoint.set(
        position.x + (Math.random() - 0.5) * 0.8,
        position.y + (Math.random() - 0.5) * 0.5,
        THREE.MathUtils.clamp(position.z + (Math.random() - 0.5) * 0.6, b.zMin, b.zMax),
      );
      waypointSpeed = 0.22;
      nextWaypointAt = now + 1400 + Math.random() * 1800;
      return;
    }
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = new THREE.Vector3(
        (Math.random() * 2 - 1) * b.x * 0.92,
        (Math.random() * 2 - 1) * b.y * 0.9,
        b.zMin + Math.random() * (b.zMax - b.zMin),
      );
      if (candidate.distanceTo(position) > 3.4 || attempt === 7) {
        waypoint = candidate;
        break;
      }
    }
    waypointSpeed = 0.75 + Math.random() * 0.85;
    nextWaypointAt = now + 4200 + Math.random() * 5200;
  };

  const update = (dt: number, camera: THREE.Camera, now: number) => {
    const store = underwater;
    const b = store.bounds;

    // --- Mode selection ---------------------------------------------
    const pointerFresh =
      store.pointer.active || now - store.pointer.lastMoveAt < POINTER_RELEASE_DELAY;

    let target = waypoint;
    let maxSpeed = waypointSpeed;
    let maxForce = 1.45;

    if (pointerFresh) {
      store.mode = "pointer";
      ndc.set(store.pointer.ndcX, store.pointer.ndcY);
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.ray.intersectPlane(plane, rawTarget) !== null) {
        // Keep the projected target inside the swim volume.
        rawTarget.x = THREE.MathUtils.clamp(rawTarget.x, -b.x, b.x);
        rawTarget.y = THREE.MathUtils.clamp(rawTarget.y, -b.y, b.y);
        // Smooth the raw target so jittery input never jiggles the koi.
        store.target.lerp(rawTarget, 1 - Math.exp(-6 * dt));
      }
      target = store.target;
      maxSpeed = 2.9;
      maxForce = 2.3;

      // Close to a resting pointer → orbit it lazily instead of parking.
      const distToPointer = position.distanceTo(target);
      if (distToPointer < 1.05) {
        orbitAngle += dt * 1.15;
        orbitTarget.set(
          target.x + Math.cos(orbitAngle) * 0.62,
          target.y + Math.sin(orbitAngle * 0.7) * 0.3,
          target.z + Math.sin(orbitAngle) * 0.18,
        );
        target = orbitTarget;
        maxSpeed = 0.72;
      }
    } else {
      store.mode = "autonomous";
      if (now > nextWaypointAt || position.distanceTo(waypoint) < 0.7) {
        pickWaypoint(now);
      }
    }

    // --- Steering physics -------------------------------------------
    dir.copy(target).sub(position);
    const dist = Math.max(dir.length(), 1e-4);
    dir.divideScalar(dist);

    const desiredSpeed = store.mode === "pointer"
      ? THREE.MathUtils.clamp(dist * 0.95, 0.3, maxSpeed)
      : THREE.MathUtils.clamp(dist * 0.5, 0.14, maxSpeed);

    desiredVel.copy(dir).multiplyScalar(desiredSpeed);
    steer.copy(desiredVel).sub(velocity);
    const steerLen = steer.length();
    if (steerLen > maxForce) {
      steer.multiplyScalar(maxForce / steerLen);
    }
    velocity.addScaledVector(steer, dt);

    // Soft containment — steer back before the hard clamp ever triggers.
    if (Math.abs(position.x) > b.x) {
      velocity.x -= Math.sign(position.x) * Math.abs(position.x - b.x) * 3.2;
    }
    if (Math.abs(position.y) > b.y) {
      velocity.y -= Math.sign(position.y) * Math.abs(position.y - b.y) * 3.2;
    }
    if (position.z < b.zMin || position.z > b.zMax) {
      velocity.z -= Math.sign(position.z - (b.zMin + b.zMax) / 2) * 1.8;
    }

    let sp = velocity.length();
    if (sp > maxSpeed) {
      velocity.multiplyScalar(maxSpeed / sp);
      sp = maxSpeed;
    }
    position.addScaledVector(velocity, dt);

    // Hard clamp as a final safety net.
    position.x = THREE.MathUtils.clamp(position.x, -b.x - 0.4, b.x + 0.4);
    position.y = THREE.MathUtils.clamp(position.y, -b.y - 0.4, b.y + 0.4);
    position.z = THREE.MathUtils.clamp(position.z, b.zMin, b.zMax);

    // --- Orientation: head turns first, body bend follows -----------
    if (sp > 0.06) {
      // -Z faces the velocity (nose-forward convention).
      m.lookAt(ZERO, dir, UP);
      q.setFromRotationMatrix(m);

      // Bank into the turn, dorsal tilting toward the inside of the curve.
      fwd.set(0, 0, -1).applyQuaternion(heading);
      // Signed lateral error: y of cross(fwd, dir). Positive = turning left.
      const lateral = fwd.z * dir.x - fwd.x * dir.z;
      const turnTarget = THREE.MathUtils.clamp(Math.sign(lateral) * Math.min(Math.abs(lateral) * 2.4, 1), -1, 1);
      turn += (turnTarget - turn) * (1 - Math.exp(-2.6 * dt));

      qRoll.setFromAxisAngle(AXIS_Z, turn * 0.42);
      q.multiply(qRoll);

      heading.slerp(q, 1 - Math.exp(-3.1 * dt));
    } else {
      // Hovering — settle the spine back to straight.
      turn += (0 - turn) * (1 - Math.exp(-1.5 * dt));
    }

    // --- Tail beat: frequency rises with speed ------------------------
    const beat = underwater.reducedMotion ? 0.9 : 1.6 + sp * 2.4;
    controller.phase += dt * beat;

    controller.speed = sp;
    controller.turn = turn;
    store.fishPos.copy(position);
    store.fishSpeed = sp;
  };

  const controller: KoiController = {
    position,
    velocity,
    heading,
    speed: 0,
    turn: 0,
    phase: 0,
    update,
  };

  // Initialize heading from the starting velocity.
  dir.copy(velocity).normalize();
  m.lookAt(ZERO, dir, UP);
  heading.setFromRotationMatrix(m);

  return controller;
}
