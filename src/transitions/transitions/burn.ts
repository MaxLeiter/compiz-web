import type { TransitionEffect, TransitionParams } from "../types.ts";
import { createProgram as createGLProgram, FULLSCREEN_VERT } from "../gl-utils.ts";

const BURN_FRAG = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_from;
uniform sampler2D u_to;
uniform float u_progress;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_click;

// FBM noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 6; i++) {
    v += a * noise(p);
    p = rot * p * 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec4 fromColor = texture(u_from, v_uv);
  vec4 toColor = texture(u_to, v_uv);

  // Distance from click point drives the burn front
  float dist = distance(v_uv, u_click);

  // Burn front: expands outward from click, with noise for organic edge
  float burnNoise = fbm(v_uv * 6.0 + u_time * 0.8) * 0.4;
  float burnFront = u_progress * 2.0 - dist * 1.2 + burnNoise;

  // Five zones based on distance from burn front
  // 1. Heat distortion (ahead of fire)
  // 2. Ember line (at the front)
  // 3. Char zone (just behind)
  // 4. Clean reveal (new page)
  // 5. Smoke (drifts ahead of fire)

  // Smoke zone — FBM clouds ahead of the fire
  float smokeNoise = fbm(v_uv * 3.0 + vec2(u_time * 0.2, -u_time * 0.15));
  float smokeZone = smoothstep(-0.3, -0.05, burnFront) * (1.0 - smoothstep(-0.05, 0.2, burnFront));
  vec3 smokeColor = vec3(0.15, 0.13, 0.12);

  // Heat distortion — warp UVs near the fire front
  float heatAmount = smoothstep(-0.2, 0.0, burnFront) * (1.0 - smoothstep(0.0, 0.3, burnFront));
  vec2 heatOffset = vec2(
    fbm(v_uv * 10.0 + u_time * 2.0) - 0.5,
    fbm(v_uv * 10.0 + u_time * 2.0 + 100.0) - 0.5
  ) * heatAmount * 0.02;
  vec4 distortedFrom = texture(u_from, v_uv + heatOffset);

  // Ember line — bright fire colors at the burn edge
  float emberZone = smoothstep(-0.02, 0.0, burnFront) * (1.0 - smoothstep(0.0, 0.12, burnFront));
  float emberNoise = fbm(v_uv * 15.0 + u_time * 3.0);
  vec3 emberColor = mix(
    vec3(1.0, 0.3, 0.0),  // deep orange
    vec3(1.0, 0.85, 0.1), // bright yellow
    emberNoise
  );
  // Add white-hot core
  emberColor = mix(emberColor, vec3(1.0, 0.95, 0.8), smoothstep(0.03, 0.0, abs(burnFront)) * 0.6);

  // Char zone — darkened, smoldering
  float charZone = smoothstep(0.0, 0.15, burnFront) * (1.0 - smoothstep(0.15, 0.5, burnFront));
  vec3 charColor = fromColor.rgb * vec3(0.1, 0.05, 0.02);

  // Reveal zone — new page fully visible
  float revealZone = smoothstep(0.3, 0.5, burnFront);

  // Compose all zones
  vec3 color = distortedFrom.rgb;

  // Apply smoke
  color = mix(color, smokeColor, smokeZone * smokeNoise * 0.6);

  // Apply char
  color = mix(color, charColor, charZone);

  // Apply ember glow (additive-ish)
  color = mix(color, emberColor, emberZone * 0.9);
  color += emberColor * emberZone * 0.5; // bloom

  // Reveal new page
  color = mix(color, toColor.rgb, revealZone);

  // Ember particles (sparse bright dots near the front)
  float sparkle = step(0.97, hash(floor(v_uv * 80.0) + floor(u_time * 8.0)));
  float sparkleZone = smoothstep(-0.1, 0.0, burnFront) * (1.0 - smoothstep(0.0, 0.2, burnFront));
  color += vec3(1.0, 0.7, 0.2) * sparkle * sparkleZone * 0.8;

  fragColor = vec4(color, 1.0);
}
`;

export const burnEffect: TransitionEffect = {
  name: "burn",
  duration: 1400,

  createProgram(gl: WebGL2RenderingContext): WebGLProgram {
    return createGLProgram(gl, FULLSCREEN_VERT, BURN_FRAG);
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
