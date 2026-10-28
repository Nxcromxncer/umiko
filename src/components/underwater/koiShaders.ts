import * as THREE from "three";
import { GLSL_CAUSTICS_LITE, GLSL_FOG, GLSL_NOISE } from "./glsl";
import { PALETTE, FOG } from "./store";

/**
 * Koi shaders.
 *
 * Vertex stage (shared skeleton): a traveling sine wave runs nose → tail.
 * The phase is *integrated on the CPU* (uPhase) so changes in beat frequency
 * never pop, the amplitude grows quadratically toward the tail, and a
 * `uTurn` term arcs the spine into turns — the head leads, the body follows.
 */

const KOI_VERTEX_COMMON = /* glsl */ `
uniform float uPhase;
uniform float uAmp;
uniform float uFreq;
uniform float uTurn;
uniform float uTime;
uniform float uFlutterSeed;

attribute float aAlong;
attribute float aEdge;

varying vec3 vNormalW;
varying vec3 vPosW;
varying float vAlong;
varying float vEdge;
varying vec2 vUv;

const float NOSE_Z = -1.05;
const float INV_LEN = 1.0 / 2.2;

void koiVertex(inout vec3 position, inout vec3 normal, float flutterAmount) {
  float along = aAlong;
  float kz = along;

  // Traveling wave (nose → tail) with quadratically growing amplitude.
  float ph = uPhase - kz * uFreq;
  float amp = uAmp * (0.08 + 0.92 * kz * kz);
  float sway = sin(ph) * amp - uTurn * 0.5 * kz * kz;
  position.x += sway;

  // Gentle secondary roll through the body.
  position.y += sin(uPhase * 0.5 - kz * 1.3) * 0.018 * uAmp * (0.3 + along);

  // Fin flutter — small high-frequency ripple on membranes only.
  position.x += sin(uTime * 2.6 + position.y * 3.0 + uFlutterSeed + kz * 2.0) * flutterAmount * kz;

  // Tilt normals along the wave slope so lighting follows the spine.
  float slope = cos(ph) * (-uFreq) * amp * INV_LEN - uTurn * kz * INV_LEN;
  float c = cos(slope);
  float s = sin(slope);
  normal = vec3(c * normal.x + s * normal.z, normal.y, -s * normal.x + c * normal.z);
}
`;

const KOI_FRAGMENT_HEAD = /* glsl */ `
uniform vec3 uColBack;
uniform vec3 uColBelly;
uniform vec3 uColDeep;
uniform vec3 uColGlow;
uniform float uTime;

varying vec3 vNormalW;
varying vec3 vPosW;
varying float vAlong;
varying float vEdge;
varying vec2 vUv;

${GLSL_NOISE}
${GLSL_CAUSTICS_LITE}
${GLSL_FOG}
`;

/** Opaque koi body — blue back, pearlescent belly, scale net, cyan rim. */
const KOI_BODY_VERTEX = /* glsl */ `
${KOI_VERTEX_COMMON}

void main() {
  vec3 p = position;
  vec3 n = normal;
  koiVertex(p, n, 0.0);

  vAlong = aAlong;
  vEdge = aEdge;
  vUv = uv;
  vNormalW = normalize(mat3(modelMatrix) * n);
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vPosW = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const KOI_BODY_FRAGMENT = /* glsl */ `
${KOI_FRAGMENT_HEAD}

void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vPosW);

  // Pearlescent belly against a saturated blue back.
  float belly = smoothstep(0.12, -0.6, N.y);
  vec3 base = mix(uColBack, uColBelly, belly);

  // Staggered scale net (back only — Asagi-style).
  vec2 sp = vec2(vAlong * 15.0, vUv.y * 5.5);
  float row = floor(sp.y);
  float xx = sp.x + mod(row, 2.0) * 0.5;
  float lx = abs(fract(xx) - 0.5);
  float ly = abs(fract(sp.y) - 0.5);
  float scaleEdge = smoothstep(0.36, 0.5, max(lx * 1.35, ly));
  base *= 1.0 - scaleEdge * 0.16 * (1.0 - belly);

  // Gill plate shading near the head.
  float gill = smoothstep(0.31, 0.27, vAlong) * smoothstep(0.18, 0.27, vAlong);
  base *= 1.0 - gill * 0.1;

  // Key light falls from the surface.
  vec3 L1 = normalize(vec3(0.25, 1.0, 0.4));
  float diff = max(dot(N, L1), 0.0);
  vec3 col = base * (0.38 + 0.78 * diff);

  // Specular glints that read as wet scales.
  vec3 H = normalize(L1 + V);
  col += uColGlow * pow(max(dot(N, H), 0.0), 46.0) * 0.85;

  // Cyan fresnel rim — luminous edges in dark water.
  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);
  col += uColGlow * fres * 0.42;

  // Nose sheen.
  col += uColBelly * smoothstep(0.22, 0.02, vAlong) * 0.12;

  // Caustic sunlight dappling the back.
  float ca = causticsLite(vPosW.xz * 0.5 + vec2(uTime * 0.05, 0.0), uTime * 0.4);
  col += uColGlow * ca * max(N.y, 0.0) * 0.14;

  float dist = length(cameraPosition - vPosW);
  col = applyFog(col, dist);
  gl_FragColor = vec4(col, 1.0);
}
`;

/** Translucent fin membranes with ray lines and rim glow. */
const KOI_FIN_VERTEX = /* glsl */ `
${KOI_VERTEX_COMMON}

void main() {
  vec3 p = position;
  vec3 n = normal;
  koiVertex(p, n, 0.028);

  vAlong = aAlong;
  vEdge = aEdge;
  vUv = uv;
  vNormalW = normalize(mat3(modelMatrix) * n);
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vPosW = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const KOI_FIN_FRAGMENT = /* glsl */ `
${KOI_FRAGMENT_HEAD}

void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vPosW);
  float ndv = abs(dot(N, V));

  // Glassy gradient — dense at the root, dissolving at the rim.
  vec3 col = mix(uColBack * 1.25, uColGlow, vEdge * 0.85);

  // Fin rays.
  float rays = 0.5 + 0.5 * sin(vAlong * 42.0 + vEdge * 7.0);
  col *= 0.9 + 0.14 * rays;

  // Rim catch-light.
  float fres = pow(1.0 - ndv, 2.0);
  col += uColGlow * fres * 0.5;

  float alpha = (0.52 - 0.4 * vEdge) * (0.55 + 0.45 * fres);
  alpha *= 0.65 + 0.35 * ndv;

  float dist = length(cameraPosition - vPosW);
  col = applyFog(col, dist);
  gl_FragColor = vec4(col, alpha);
}
`;

/** Soft cyan aura that travels with the koi ("light distortion around the fish"). */
const KOI_HALO_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const KOI_HALO_FRAGMENT = /* glsl */ `
uniform float uIntensity;
uniform vec3 uColGlow;
varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float a = pow(max(1.0 - d, 0.0), 2.4) * uIntensity;
  gl_FragColor = vec4(uColGlow, a);
}
`;

function col(hex: string): THREE.IUniform<THREE.Color> {
  return { value: new THREE.Color(hex) };
}

export interface KoiUniforms {
  uPhase: THREE.IUniform<number>;
  uAmp: THREE.IUniform<number>;
  uFreq: THREE.IUniform<number>;
  uTurn: THREE.IUniform<number>;
  uTime: THREE.IUniform<number>;
  uFlutterSeed: THREE.IUniform<number>;
}

/** Shared swimming uniforms kept in sync between body and fin materials. */
export function createKoiUniforms(): KoiUniforms {
  return {
    uPhase: { value: 0 },
    uAmp: { value: 0.18 },
    uFreq: { value: 4.3 },
    uTurn: { value: 0 },
    uTime: { value: 0 },
    uFlutterSeed: { value: 0 },
  };
}

function baseUniforms(u: KoiUniforms): Record<string, THREE.IUniform> {
  return {
    ...u,
    uColBack: col(PALETTE.ocean),
    uColBelly: col("#BFE3FF"),
    uColDeep: col(PALETTE.abyss),
    uColGlow: col(PALETTE.glow),
    uFogColor: col(FOG.color),
    uFogDensity: { value: FOG.density },
  };
}

export function createKoiBodyMaterial(u: KoiUniforms): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: KOI_BODY_VERTEX,
    fragmentShader: KOI_BODY_FRAGMENT,
    uniforms: baseUniforms(u),
    side: THREE.DoubleSide,
  });
}

export function createKoiFinMaterial(u: KoiUniforms): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: KOI_FIN_VERTEX,
    fragmentShader: KOI_FIN_FRAGMENT,
    uniforms: baseUniforms(u),
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

export function createKoiHaloMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: KOI_HALO_VERTEX,
    fragmentShader: KOI_HALO_FRAGMENT,
    uniforms: {
      uIntensity: { value: 0.16 },
      uColGlow: col(PALETTE.glow),
    },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });
}

export function disposeKoiMaterials(
  body: THREE.ShaderMaterial,
  fin: THREE.ShaderMaterial,
  halo: THREE.ShaderMaterial,
): void {
  body.dispose();
  fin.dispose();
  halo.dispose();
}
