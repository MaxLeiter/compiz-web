import type { TransitionEffect, TransitionParams } from "../types.ts";
import { createProgram as createGLProgram, FULLSCREEN_VERT } from "../gl-utils.ts";

const WOBBLY_FRAG = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_from;
uniform sampler2D u_to;
uniform float u_progress;
uniform float u_time;
uniform vec2 u_click;

void main() {
  // Ripple wave expanding from click point
  float dist = distance(v_uv, u_click);

  // Wave parameters
  float waveSpeed = 3.0;
  float waveFreq = 12.0;
  float waveFront = u_progress * waveSpeed;

  // Wave exists between the front and a trail behind it
  float inWave = smoothstep(waveFront - 0.05, waveFront, dist) *
                 (1.0 - smoothstep(waveFront, waveFront + 1.2, dist));

  // Spring-like damped oscillation
  float phase = (dist - waveFront) * waveFreq + u_time * 4.0;
  float amplitude = 0.03 * (1.0 - u_progress) * inWave;
  float damping = exp(-dist * 2.0);

  // Displacement direction (radial from click)
  vec2 dir = normalize(v_uv - u_click + 0.001);
  vec2 displacement = dir * sin(phase) * amplitude * damping;

  // Chromatic aberration at the wavefront
  float aberration = amplitude * 2.0;
  vec2 uvR = v_uv + displacement * 1.1;
  vec2 uvG = v_uv + displacement;
  vec2 uvB = v_uv + displacement * 0.9;

  // Mix between from and to based on whether wave has passed
  float reveal = smoothstep(waveFront - 0.1, waveFront + 0.1, dist);
  reveal = 1.0 - reveal; // Invert: reveal new content where wave has passed

  // Clamp UVs
  uvR = clamp(uvR, 0.0, 1.0);
  uvG = clamp(uvG, 0.0, 1.0);
  uvB = clamp(uvB, 0.0, 1.0);

  // Sample both textures with displacement
  float fromR = texture(u_from, uvR).r;
  float fromG = texture(u_from, uvG).g;
  float fromB = texture(u_from, uvB).b;
  vec3 fromColor = vec3(fromR, fromG, fromB);

  float toR = texture(u_to, uvR).r;
  float toG = texture(u_to, uvG).g;
  float toB = texture(u_to, uvB).b;
  vec3 toColor = vec3(toR, toG, toB);

  vec3 color = mix(fromColor, toColor, reveal);

  // Bright edge at the wavefront
  float edge = smoothstep(waveFront - 0.01, waveFront, dist) *
               (1.0 - smoothstep(waveFront, waveFront + 0.03, dist));
  color += vec3(0.4, 0.6, 1.0) * edge * (1.0 - u_progress) * 2.0;

  fragColor = vec4(color, 1.0);
}
`;

export const wobblyEffect: TransitionEffect = {
  name: "wobbly",
  duration: 1200,

  createProgram(gl: WebGL2RenderingContext): WebGLProgram {
    return createGLProgram(gl, FULLSCREEN_VERT, WOBBLY_FRAG);
  },

  setUniforms(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    params: TransitionParams
  ) {
    gl.uniform1f(gl.getUniformLocation(program, "u_progress"), params.progress);
    gl.uniform1f(gl.getUniformLocation(program, "u_time"), params.time);
    gl.uniform2fv(
      gl.getUniformLocation(program, "u_click"),
      params.clickPos ?? [0.5, 0.5]
    );
  },
};
