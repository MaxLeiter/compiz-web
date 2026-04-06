import type { TransitionEffect, TransitionParams } from "../types.ts";
import { createProgram as createGLProgram, FULLSCREEN_VERT } from "../gl-utils.ts";

const MAGNETIC_FRAG = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_from;
uniform sampler2D u_to;
uniform float u_progress;
uniform float u_time;
uniform vec2 u_click;
uniform vec2 u_resolution;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec4 toColor = texture(u_to, v_uv);

  // Phase 1 (0-0.5): scatter old page pixels toward click
  // Phase 2 (0.5-1): assemble new page pixels from click outward

  float scatter = smoothstep(0.0, 0.5, u_progress);
  float assemble = smoothstep(0.5, 1.0, u_progress);

  vec2 toClick = u_click - v_uv;
  float dist = length(toClick);
  vec2 dir = normalize(toClick + 0.001);

  // Gaussian falloff — stronger pull near click
  float pull = exp(-dist * dist * 4.0);

  // Scatter: displace old page pixels toward click point
  float scatterAmount = scatter * pull * 0.4;
  // Add turbulence
  float turb = hash(v_uv * 100.0 + u_time) * 0.02 * scatter;

  vec2 scatterUV = v_uv + dir * scatterAmount + turb;

  // Chromatic aberration during scatter
  float aberr = scatterAmount * 2.0;
  vec2 uvR = v_uv + dir * (scatterAmount * 1.15) + turb;
  vec2 uvG = v_uv + dir * scatterAmount + turb;
  vec2 uvB = v_uv + dir * (scatterAmount * 0.85) + turb;

  // Clamp
  uvR = clamp(uvR, 0.0, 1.0);
  uvG = clamp(uvG, 0.0, 1.0);
  uvB = clamp(uvB, 0.0, 1.0);

  float fromR = texture(u_from, uvR).r;
  float fromG = texture(u_from, uvG).g;
  float fromB = texture(u_from, uvB).b;
  vec3 fromScattered = vec3(fromR, fromG, fromB);

  // Assemble: new page expands from click outward
  float assembleRadius = assemble * 2.0;
  float assembleMask = smoothstep(assembleRadius, assembleRadius - 0.3, dist);

  // Pixel dissolution — fade out old content
  float dissolve = 1.0 - scatter;
  // Add per-pixel randomness to dissolution
  float pixelRand = hash(floor(v_uv * u_resolution / 4.0));
  dissolve *= step(scatter * 1.2, pixelRand + 0.2);

  vec3 color = fromScattered * dissolve;

  // Blend in new page
  color = mix(color, toColor.rgb, assembleMask);

  // Energy glow at the click point during transition
  float energy = exp(-dist * dist * 10.0) * sin(u_time * 8.0) * 0.5 + 0.5;
  float energyAmount = scatter * (1.0 - assemble);
  color += vec3(0.3, 0.5, 1.0) * energy * energyAmount * 0.4;

  // Edge glow on the assembly front
  float edgeGlow = smoothstep(assembleRadius - 0.05, assembleRadius, dist) *
                   (1.0 - smoothstep(assembleRadius, assembleRadius + 0.05, dist));
  color += vec3(0.5, 0.7, 1.0) * edgeGlow * 0.8;

  fragColor = vec4(color, 1.0);
}
`;

export const magneticEffect: TransitionEffect = {
  name: "magnetic",
  duration: 1200,

  createProgram(gl: WebGL2RenderingContext): WebGLProgram {
    return createGLProgram(gl, FULLSCREEN_VERT, MAGNETIC_FRAG);
  },

  setUniforms(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    params: TransitionParams
  ) {
    gl.uniform1f(gl.getUniformLocation(program, "u_progress"), params.progress);
    gl.uniform1f(gl.getUniformLocation(program, "u_time"), params.time);
    gl.uniform2fv(gl.getUniformLocation(program, "u_resolution"), params.resolution);
    gl.uniform2fv(
      gl.getUniformLocation(program, "u_click"),
      params.clickPos ?? [0.5, 0.5]
    );
  },
};
