export interface TransitionEffect {
  name: string;
  /** Duration in milliseconds */
  duration: number;
  /** Create the WebGL program for this effect */
  createProgram(gl: WebGL2RenderingContext): WebGLProgram;
  /** Set per-frame uniforms (called each frame during transition) */
  setUniforms(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    params: TransitionParams
  ): void;
}

export interface TransitionParams {
  progress: number;
  time: number;
  resolution: [number, number];
  clickPos: [number, number] | null;
}
