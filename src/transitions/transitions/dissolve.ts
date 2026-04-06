import type { TransitionEffect, TransitionParams } from "../types.ts";
import { createProgram as createGLProgram, FULLSCREEN_VERT } from "../gl-utils.ts";

const DISSOLVE_FRAG = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_from;
uniform sampler2D u_to;
uniform float u_progress;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_click;

// Simplex-ish noise
vec3 mod289(vec3 x) { return x - floor(x / 289.0) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x / 289.0) * 289.0; }
vec3 permute(vec3 x) { return mod289((x * 34.0 + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x_ = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x_) - 0.5;
  vec3 ox = floor(x_ + 0.5);
  vec3 a0 = x_ - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec4 fromColor = texture(u_from, v_uv);
  vec4 toColor = texture(u_to, v_uv);

  // Multi-octave noise for organic edge
  float scale = 4.0;
  float n = snoise(v_uv * scale + u_time * 0.3) * 0.5 + 0.5;
  n += snoise(v_uv * scale * 2.0 + u_time * 0.5) * 0.25;
  n += snoise(v_uv * scale * 4.0 + u_time * 0.7) * 0.125;
  n = n / (0.5 + 0.25 + 0.125); // normalize to ~0-1

  // Distance from click point influences the dissolve front
  float dist = distance(v_uv, u_click);
  float threshold = u_progress * 1.6 - dist * 0.6;

  // Edge glow
  float edge = smoothstep(threshold - 0.08, threshold, n) -
               smoothstep(threshold, threshold + 0.08, n);

  // Which page to show (n < threshold = reveal new page)
  float show_new = 1.0 - smoothstep(threshold - 0.02, threshold + 0.02, n);

  vec3 color = mix(fromColor.rgb, toColor.rgb, show_new);

  // Warm glow at the dissolve edge
  vec3 glowColor = vec3(1.0, 0.6, 0.2);
  color += glowColor * edge * 2.0;

  fragColor = vec4(color, 1.0);
}
`;

export const dissolveEffect: TransitionEffect = {
  name: "dissolve",
  duration: 1000,

  createProgram(gl: WebGL2RenderingContext): WebGLProgram {
    return createGLProgram(gl, FULLSCREEN_VERT, DISSOLVE_FRAG);
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
