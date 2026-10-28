import * as THREE from "three";

/**
 * Procedural blue-koi geometry.
 *
 * The fish is built entirely from code — no external model required.
 * Convention: the fish faces -Z (so a lookAt-style quaternion aims it along
 * its velocity), +Z runs toward the tail, +Y is up and the lateral axis
 * (undulation) is X.
 *
 * Every geometry carries two custom vertex attributes consumed by the
 * shaders:
 *   `aAlong` — 0 at the nose, 1 at the tail tip (fins may exceed 1).
 *   `aEdge`  — 0 at a fin's attachment edge, 1 at its outer rim.
 */

export interface KoiGeometries {
  body: THREE.BufferGeometry;
  dorsal: THREE.BufferGeometry;
  anal: THREE.BufferGeometry;
  caudal: THREE.BufferGeometry;
  pectoral: THREE.BufferGeometry;
  pelvic: THREE.BufferGeometry;
  dispose: () => void;
}

/** Nose / tail positions along the Z axis. */
export const KOI_NOSE_Z = -1.05;
export const KOI_TAIL_Z = 1.15;
export const KOI_LENGTH = KOI_TAIL_Z - KOI_NOSE_Z;

/** Smooth Catmull-Rom sampling over uniformly spaced control values. */
function catmull(values: number[], t: number): number {
  const n = values.length - 1;
  const f = Math.max(0, Math.min(1, t)) * n;
  const i = Math.min(Math.floor(f), n - 1);
  const u = f - i;
  const p0 = values[Math.max(i - 1, 0)];
  const p1 = values[i];
  const p2 = values[Math.min(i + 1, n)];
  const p3 = values[Math.min(i + 2, n)];
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * u +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u +
      (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u)
  );
}

// Vertical / width profiles sampled at 12 evenly spaced stations.
// t = 0 nose ... t = 1 tail peduncle.
const TOP_Y = [0.085, 0.175, 0.24, 0.272, 0.283, 0.265, 0.226, 0.176, 0.126, 0.086, 0.061, 0.05];
const BOTTOM_Y = [0.075, 0.16, 0.225, 0.253, 0.248, 0.223, 0.188, 0.148, 0.108, 0.078, 0.058, 0.048];
const HALF_W = [0.062, 0.108, 0.136, 0.148, 0.147, 0.136, 0.117, 0.093, 0.068, 0.048, 0.036, 0.03];

function buildBody(): THREE.BufferGeometry {
  const segX = 48;
  const segR = 28;
  const positions: number[] = [];
  const uvs: number[] = [];
  const alongs: number[] = [];
  const edges: number[] = [];
  const indices: number[] = [];

  for (let ix = 0; ix <= segX; ix++) {
    const t = ix / segX;
    const z = KOI_NOSE_Z + t * KOI_LENGTH;
    const top = catmull(TOP_Y, t);
    const bottom = catmull(BOTTOM_Y, t);
    const width = catmull(HALF_W, t);
    for (let ir = 0; ir <= segR; ir++) {
      const a = (ir / segR) * Math.PI * 2;
      const sy = Math.sin(a);
      const y = sy * THREE.MathUtils.lerp(bottom, top, (sy + 1) / 2);
      const x = Math.cos(a) * width;
      positions.push(x, y, z);
      uvs.push(t, ir / segR);
      alongs.push(t);
      edges.push(0);
    }
  }

  const ring = segR + 1;
  for (let ix = 0; ix < segX; ix++) {
    for (let ir = 0; ir < segR; ir++) {
      const a = ix * ring + ir;
      const b = a + 1;
      const c = a + ring;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  // Blunt nose cap.
  const noseIndex = positions.length / 3;
  positions.push(0, 0, KOI_NOSE_Z - 0.052);
  uvs.push(0, 0.5);
  alongs.push(0);
  edges.push(0);
  for (let ir = 0; ir < segR; ir++) {
    indices.push(noseIndex, ir, ir + 1);
  }

  // Tiny tail cap (hidden behind the caudal fin).
  const tailIndex = positions.length / 3;
  positions.push(0, 0, KOI_TAIL_Z + 0.03);
  uvs.push(1, 0.5);
  alongs.push(1);
  edges.push(0);
  const lastRing = segX * ring;
  for (let ir = 0; ir < segR; ir++) {
    indices.push(tailIndex, lastRing + ir + 1, lastRing + ir);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute("aAlong", new THREE.Float32BufferAttribute(alongs, 1));
  geo.setAttribute("aEdge", new THREE.Float32BufferAttribute(edges, 1));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Fills `aAlong` from each vertex's Z position (nose → 0, tail → 1+). */
function setAlongFromZ(geo: THREE.BufferGeometry): void {
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const along = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    along[i] = (pos.getZ(i) - KOI_NOSE_Z) / KOI_LENGTH;
  }
  geo.setAttribute("aAlong", new THREE.Float32BufferAttribute(along, 1));
}

/** Fills `aEdge` using a per-vertex evaluator (0 = attachment, 1 = rim). */
function setEdge(geo: THREE.BufferGeometry, fn: (x: number, y: number, z: number) => number): void {
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const edge = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    edge[i] = fn(pos.getX(i), pos.getY(i), pos.getZ(i));
  }
  geo.setAttribute("aEdge", new THREE.Float32BufferAttribute(edge, 1));
}

function shapeGeometry(shape: THREE.Shape, curveSegments = 14): THREE.BufferGeometry {
  const geo = new THREE.ShapeGeometry(shape, curveSegments);
  // ShapeGeometry has no normals worth using — the shader shades from the
  // view direction (fins are translucent membranes), so flat normals suffice.
  geo.computeVertexNormals();
  return geo;
}

/** Dorsal fin — rides the back, in the sagittal (ZY) plane. */
function buildDorsal(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.42, 0);
  s.bezierCurveTo(-0.28, 0.16, 0.05, 0.24, 0.3, 0.19);
  s.bezierCurveTo(0.42, 0.16, 0.5, 0.08, 0.52, 0.0);
  s.lineTo(-0.42, 0);
  const geo = shapeGeometry(s);
  geo.rotateY(-Math.PI / 2); // shape X → world Z (toward tail)
  setAlongFromZ(geo);
  setEdge(geo, (_x, y) => THREE.MathUtils.clamp(y / 0.24, 0, 1));
  return geo;
}

/** Anal fin — mirrors the dorsal along the belly. */
function buildAnal(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0.42, 0);
  s.bezierCurveTo(0.55, -0.08, 0.68, -0.13, 0.82, -0.12);
  s.bezierCurveTo(0.9, -0.1, 0.95, -0.04, 0.97, 0);
  s.lineTo(0.42, 0);
  const geo = shapeGeometry(s);
  geo.rotateY(-Math.PI / 2);
  setAlongFromZ(geo);
  setEdge(geo, (_x, y) => THREE.MathUtils.clamp(-y / 0.13, 0, 1));
  return geo;
}

/**
 * Caudal fin — a long, flowing, gently forked koi tail.
 * Built in the sagittal plane, extending from the peduncle backward.
 */
function buildCaudal(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  const base = KOI_TAIL_Z - 0.06;
  s.moveTo(base, 0.09);
  // Upper lobe
  s.bezierCurveTo(base + 0.28, 0.34, base + 0.55, 0.5, base + 0.92, 0.5);
  // Trailing edge — soft inner fork
  s.bezierCurveTo(base + 0.68, 0.32, base + 0.55, 0.16, base + 0.5, 0.0);
  s.bezierCurveTo(base + 0.55, -0.16, base + 0.68, -0.33, base + 0.92, -0.46);
  // Lower lobe
  s.bezierCurveTo(base + 0.5, -0.47, base + 0.24, -0.32, base, -0.09);
  s.lineTo(base, 0.09);
  const geo = shapeGeometry(s, 18);
  geo.rotateY(-Math.PI / 2);
  setAlongFromZ(geo);
  setEdge(geo, (_x, _y, z) => THREE.MathUtils.clamp((z - base) / 0.95, 0, 1));
  return geo;
}

/**
 * Pectoral fin — a swept paddle extending backward + outward.
 * Built in shape space (x = backward, y = outward), then mapped to
 * (x = outward, y = 0, z = backward) so a pivot group at the origin can
 * row it naturally.
 */
function buildPectoral(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0.0, 0.02);
  s.bezierCurveTo(0.16, 0.2, 0.34, 0.34, 0.5, 0.38);
  s.bezierCurveTo(0.56, 0.34, 0.52, 0.2, 0.38, 0.08);
  s.bezierCurveTo(0.26, -0.02, 0.12, -0.06, 0.0, -0.05);
  s.lineTo(0.0, 0.02);
  const geo = shapeGeometry(s);
  geo.rotateZ(-Math.PI / 2);
  geo.rotateX(-Math.PI / 2);
  setAlongFromZ(geo);
  setEdge(geo, (x, _y, z) => THREE.MathUtils.clamp(Math.hypot(x, z) / 0.55, 0, 1));
  return geo;
}

/** Pelvic fin — a small version of the pectoral, fanned downward. */
function buildPelvic(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0.0, 0.02);
  s.bezierCurveTo(0.1, 0.16, 0.24, 0.26, 0.34, 0.27);
  s.bezierCurveTo(0.38, 0.24, 0.34, 0.12, 0.22, 0.03);
  s.bezierCurveTo(0.14, -0.03, 0.06, -0.05, 0.0, -0.04);
  s.lineTo(0.0, 0.02);
  const geo = shapeGeometry(s);
  geo.rotateZ(-Math.PI / 2);
  geo.rotateX(-Math.PI / 2);
  setAlongFromZ(geo);
  setEdge(geo, (x, _y, z) => THREE.MathUtils.clamp(Math.hypot(x, z) / 0.4, 0, 1));
  return geo;
}

/** Height of the fish's back at a given `along` station (for fin placement). */
export function topProfileAt(along: number): number {
  return catmull(TOP_Y, along);
}

/** Belly depth at a given `along` station. */
export function bottomProfileAt(along: number): number {
  return catmull(BOTTOM_Y, along);
}

let cached: KoiGeometries | null = null;

/** Builds (once) and returns the full koi geometry set. */
export function getKoiGeometries(): KoiGeometries {
  if (cached) return cached;
  const geos = [buildBody(), buildDorsal(), buildAnal(), buildCaudal(), buildPectoral(), buildPelvic()];
  cached = {
    body: geos[0],
    dorsal: geos[1],
    anal: geos[2],
    caudal: geos[3],
    pectoral: geos[4],
    pelvic: geos[5],
    dispose: () => {
      geos.forEach((g) => g.dispose());
      cached = null;
    },
  };
  return cached;
}
