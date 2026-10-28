/**
 * Shared GLSL chunks injected into every custom shader as template strings.
 * Keeping them in one place guarantees the fog / caustics / noise language
 * is consistent across the whole underwater scene.
 */

/** Exponential-squared fog toward a near-black deep water color. */
export const GLSL_FOG = /* glsl */ `
uniform vec3 uFogColor;
uniform float uFogDensity;

vec3 applyFog(vec3 color, float dist) {
  float f = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
  return mix(color, uFogColor, clamp(f, 0.0, 1.0));
}
`;

/** Cheap hash + value noise + 3-octave fbm. */
export const GLSL_NOISE = /* glsl */ `
float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * vnoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}
`;

/**
 * Classic interference-based water caustics ("sea caustics" pattern).
 * Iterations kept at 3 so it stays cheap enough for full-screen planes.
 */
export const GLSL_CAUSTICS = /* glsl */ `
float caustics(vec2 uv, float t) {
  vec2 p = mod(uv * 6.28318, 6.28318) - 250.0;
  vec2 i = p;
  float c = 1.0;
  float inten = 0.005;
  for (int n = 0; n < 3; n++) {
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
  }
  c /= 3.0;
  c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 7.0);
}
`;

/** Softer, cheaper 2-iteration variant for small surfaces (fish skin). */
export const GLSL_CAUSTICS_LITE = /* glsl */ `
float causticsLite(vec2 uv, float t) {
  vec2 p = mod(uv * 6.28318, 6.28318) - 250.0;
  vec2 i = p;
  float c = 1.0;
  float inten = 0.005;
  for (int n = 0; n < 2; n++) {
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
  }
  c /= 2.0;
  c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 6.0);
}
`;

/**
 * Subtle cyan light-distortion bubble around the koi, used by the
 * environment shaders so the water visibly reacts to the fish.
 */
export const GLSL_FISH_GLOW = /* glsl */ `
uniform vec3 uFishPos;

float fishGlow(vec3 worldPos, float radius, float strength) {
  vec3 d = worldPos - uFishPos;
  float dist = length(d);
  return exp(-(dist * dist) / (radius * radius)) * strength;
}
`;
