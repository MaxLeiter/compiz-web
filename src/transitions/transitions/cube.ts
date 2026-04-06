import type { TransitionEffect, TransitionParams } from "../types.ts";
import { createProgram as createGLProgram, FULLSCREEN_VERT } from "../gl-utils.ts";

// Cube rotation via ray-casting. For each pixel we cast a ray from the camera,
// rotate it around Y, and test intersections with the cube faces.
// Camera distance is derived so the face EXACTLY fills the screen at start/end.

const CUBE_FRAG = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_from;
uniform sampler2D u_to;
uniform float u_progress;
uniform vec2 u_resolution;
uniform float u_direction; // 1.0 = rotate right, -1.0 = rotate left

const float PI = 3.14159265359;

void main() {
  float aspect = u_resolution.x / u_resolution.y;
  float dir = u_direction;

  // Cube face half-dimensions (square cross-section in xz plane)
  float hw = aspect; // half-width
  float hh = 1.0;    // half-height

  // Focal length and base camera distance.
  // Key identity: focalLen = baseCamDist + hw ensures the front face
  // projects exactly onto the screen at progress 0 and 1.
  float focalLen = 3.0;
  float baseCamDist = focalLen - hw;

  // Smooth rotation
  float rotateT = smoothstep(0.0, 1.0, u_progress);
  float angle = rotateT * PI * 0.5 * dir;
  float ca = cos(angle);
  float sa = sin(angle);

  // Camera pullback synced to rotation — peaks at 50%
  float zoomBack = sin(rotateT * PI);
  float camDist = baseCamDist + 1.5 * zoomBack;

  // Screen-space coordinates: p.x in [-aspect, aspect], p.y in [-1, 1]
  vec2 p = v_uv * 2.0 - 1.0;
  p.x *= aspect;

  // Camera ray — fixed focal length, moving camera position
  vec3 ro = vec3(0.0, 0.0, camDist);
  vec3 rd = normalize(vec3(p.x, p.y, -focalLen));

  // Rotate ray around Y axis (equivalent to rotating the cube)
  vec3 rd_rot = vec3(
    rd.x * ca - rd.z * sa,
    rd.y,
    rd.x * sa + rd.z * ca
  );
  vec3 ro_rot = vec3(
    ro.x * ca - ro.z * sa,
    ro.y,
    ro.x * sa + ro.z * ca
  );

  vec3 color = vec3(0.0);
  float closest_t = 1e10;

  // --- Front face: z = -hw (always u_from) ---
  if (abs(rd_rot.z) > 0.001) {
    float t = (-hw - ro_rot.z) / rd_rot.z;
    if (t > 0.0 && t < closest_t) {
      vec3 hit = ro_rot + t * rd_rot;
      if (abs(hit.x) <= hw && abs(hit.y) <= hh) {
        closest_t = t;
        vec2 uv = vec2(hit.x / hw * 0.5 + 0.5, hit.y * 0.5 + 0.5);
        vec4 tex = texture(u_from, uv);
        float facing = max(0.0, ca);
        color = tex.rgb * (0.25 + 0.75 * facing);
      }
    }
  }

  // --- Right face: x = +hw (only visible when rotating right) ---
  if (dir > 0.0 && abs(rd_rot.x) > 0.001) {
    float t = (hw - ro_rot.x) / rd_rot.x;
    if (t > 0.0 && t < closest_t) {
      vec3 hit = ro_rot + t * rd_rot;
      if (abs(hit.z) <= hw && abs(hit.y) <= hh) {
        closest_t = t;
        vec2 uv = vec2(hit.z / hw * 0.5 + 0.5, hit.y * 0.5 + 0.5);
        vec4 tex = texture(u_to, uv);
        float facing = max(0.0, sa * dir);
        color = tex.rgb * (0.25 + 0.75 * facing);
      }
    }
  }

  // --- Left face: x = -hw (only visible when rotating left) ---
  if (dir < 0.0 && abs(rd_rot.x) > 0.001) {
    float t = (-hw - ro_rot.x) / rd_rot.x;
    if (t > 0.0 && t < closest_t) {
      vec3 hit = ro_rot + t * rd_rot;
      if (abs(hit.z) <= hw && abs(hit.y) <= hh) {
        closest_t = t;
        vec2 uv = vec2(-hit.z / hw * 0.5 + 0.5, hit.y * 0.5 + 0.5);
        vec4 tex = texture(u_to, uv);
        float facing = max(0.0, -sa * dir);
        color = tex.rgb * (0.25 + 0.75 * facing);
      }
    }
  }

  fragColor = vec4(color, 1.0);
}
`;

export const cubeEffect: TransitionEffect = {
  name: "cube",
  duration: 1200,

  createProgram(gl: WebGL2RenderingContext): WebGLProgram {
    return createGLProgram(gl, FULLSCREEN_VERT, CUBE_FRAG);
  },

  setUniforms(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    params: TransitionParams
  ) {
    gl.uniform1f(gl.getUniformLocation(program, "u_progress"), params.progress);
    gl.uniform2fv(gl.getUniformLocation(program, "u_resolution"), params.resolution);
    const dir = (params.clickPos?.[0] ?? 0.5) > 0.5 ? 1.0 : -1.0;
    gl.uniform1f(gl.getUniformLocation(program, "u_direction"), dir);
  },
};
