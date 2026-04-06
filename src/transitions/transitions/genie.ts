import type { TransitionEffect, TransitionParams } from "../types.ts";
import { createProgram as createGLProgram, FULLSCREEN_VERT } from "../gl-utils.ts";

const GENIE_FRAG = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_from;
uniform sampler2D u_to;
uniform float u_progress;
uniform vec2 u_click;

void main() {
  vec4 toColor = texture(u_to, v_uv);

  // The genie effect squeezes the old page toward the click point
  // as progress goes 0→1, the horizontal squeeze increases from top/bottom
  // toward the vanishing point

  vec2 target = u_click;

  // How much this row is squeezed (more squeeze near the target.y)
  float yDist = abs(v_uv.y - target.y);
  float squeezeProgress = u_progress * u_progress; // accelerate
  float squeeze = mix(1.0, 0.0, squeezeProgress * (1.0 - yDist * 0.5));

  // Squeeze toward target.x horizontally
  float centerX = mix(v_uv.x, target.x, squeezeProgress);

  // Map current UV back to source UV (inverse warp)
  float sourceX = (v_uv.x - centerX) / max(squeeze, 0.001) + 0.5;

  // Vertical compression toward target
  float sourceY = mix(v_uv.y, target.y, squeezeProgress * squeezeProgress);
  // Add slight curve for genie bottle shape
  float curve = sin(v_uv.y * 3.14159) * squeezeProgress * 0.1;
  sourceX += curve * sign(v_uv.x - target.x);

  vec2 sourceUV = vec2(sourceX, sourceY);

  // Check if we're outside the squeezed bounds
  bool inBounds = sourceUV.x >= 0.0 && sourceUV.x <= 1.0 &&
                  sourceUV.y >= 0.0 && sourceUV.y <= 1.0;

  vec4 fromColor = inBounds ? texture(u_from, sourceUV) : vec4(0.0);

  // Fade based on squeeze amount
  float alpha = inBounds ? (1.0 - squeezeProgress * 0.8) * squeeze : 0.0;
  alpha = max(alpha, 0.0);

  // Trail glow near the vanishing point
  float glowDist = distance(v_uv, target);
  float glow = exp(-glowDist * 8.0) * squeezeProgress * 0.5;
  vec3 glowColor = vec3(0.6, 0.4, 1.0);

  vec3 color = mix(toColor.rgb, fromColor.rgb, alpha);
  color += glowColor * glow;

  fragColor = vec4(color, 1.0);
}
`;

export const genieEffect: TransitionEffect = {
  name: "genie",
  duration: 800,

  createProgram(gl: WebGL2RenderingContext): WebGLProgram {
    return createGLProgram(gl, FULLSCREEN_VERT, GENIE_FRAG);
  },

  setUniforms(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    params: TransitionParams
  ) {
    gl.uniform1f(gl.getUniformLocation(program, "u_progress"), params.progress);
    gl.uniform2fv(
      gl.getUniformLocation(program, "u_click"),
      params.clickPos ?? [0.5, 0.5]
    );
  },
};
