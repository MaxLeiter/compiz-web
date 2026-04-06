import type { TransitionEffect, TransitionParams } from "./types.ts";
import {
  createProgram,
  createFullscreenQuad,
  FULLSCREEN_VERT,
} from "./gl-utils.ts";

const PASSTHROUGH_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_from;

void main() {
  fragColor = texture(u_from, v_uv);
}
`;

export class TransitionEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private currentPage: HTMLElement | null = null;
  private transitioning = false;

  // Passthrough rendering (no transition, just show current page)
  private passthroughProgram: WebGLProgram;
  private passthroughVAO: WebGLVertexArrayObject;
  private pageTex: WebGLTexture;

  // Active transition effect
  private activeEffect: TransitionEffect | null = null;
  private effectProgram: WebGLProgram | null = null;
  private effectVAO: WebGLVertexArrayObject | null = null;
  private fromTex: WebGLTexture;
  private toTex: WebGLTexture;

  // Transition state
  private transitionStart = 0;
  private transitionDuration = 0;
  private transitionClickPos: [number, number] | null = null;
  private transitionResolve: (() => void) | null = null;

  // Effect registry
  private effects = new Map<string, TransitionEffect>();
  private selectedEffect = "dissolve";

  // Paint readiness
  private paintReady = false;

  // Fallback mode: no WebGL transitions, just DOM swaps
  private fallbackMode = false;
  private fallbackContainer: HTMLElement | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    const gl = canvas.getContext("webgl2", {
      alpha: false,
      premultipliedAlpha: false,
    });
    if (!gl) {
      this.initFallback(canvas);
      this.gl = null!;
      this.passthroughProgram = null!;
      this.passthroughVAO = null!;
      this.pageTex = null!;
      this.fromTex = null!;
      this.toTex = null!;
      return;
    }

    // Detect texElementImage2D support
    // @ts-expect-error — texElementImage2D is part of the HTML-in-Canvas proposal
    if (typeof gl.texElementImage2D !== "function") {
      this.initFallback(canvas);
      this.gl = null!;
      this.passthroughProgram = null!;
      this.passthroughVAO = null!;
      this.pageTex = null!;
      this.fromTex = null!;
      this.toTex = null!;
      return;
    }

    this.gl = gl;

    // Size canvas to viewport
    this.resize();
    window.addEventListener("resize", () => this.resize());

    // Passthrough shader
    this.passthroughProgram = createProgram(
      gl,
      FULLSCREEN_VERT,
      PASSTHROUGH_FRAG
    );
    this.passthroughVAO = createFullscreenQuad(gl, this.passthroughProgram);

    // Textures
    this.pageTex = this.createTexture();
    this.fromTex = this.createTexture();
    this.toTex = this.createTexture();

    // Listen for paint events from canvas children
    // @ts-expect-error — onpaint is part of the HTML-in-Canvas proposal
    canvas.onpaint = () => {
      this.paintReady = true;
    };

    // Start render loop
    this.render();
  }

  private initFallback(canvas: HTMLCanvasElement) {
    this.fallbackMode = true;
    // Hide the canvas, create a regular div container for pages
    canvas.style.display = "none";
    const container = document.createElement("div");
    container.id = "fallback-scene";
    container.style.cssText = `
      position: fixed; inset: 0;
      top: var(--nav-height, 56px);
      overflow-y: auto;
      background: var(--bg, #0a0a0f);
    `;
    canvas.parentElement!.insertBefore(container, canvas);
    this.fallbackContainer = container;

    // Show a dismissible banner
    const banner = document.createElement("div");
    banner.style.cssText = `
      position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%);
      z-index: 1000; max-width: 480px; width: calc(100% - 32px);
      padding: 12px 16px; border-radius: 8px;
      background: var(--surface, #14141f); color: var(--text, #e8e8f0);
      font-size: 13px; line-height: 1.4;
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: 0 4px 24px rgba(0,0,0,0.4);
      display: flex; align-items: center; gap: 12px;
    `;
    banner.innerHTML = `
      <span style="flex:1">This site uses WebGL transition effects that require
      <strong>Chrome&nbsp;Canary</strong> with the
      <code style="background:rgba(255,255,255,0.08);padding:2px 4px;border-radius:3px">--enable-features=HTMLInCanvas</code>
      flag. You're seeing a basic fallback.</span>
      <button style="background:none;border:none;color:var(--text-muted,#8888a0);
        cursor:pointer;font-size:18px;padding:4px 8px;flex-shrink:0"
        aria-label="Dismiss">&times;</button>
    `;
    banner.querySelector("button")!.addEventListener("click", () => {
      banner.remove();
    });
    document.body.appendChild(banner);
  }

  private resize() {
    const dpr = window.devicePixelRatio;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  private createTexture(): WebGLTexture {
    const gl = this.gl;
    const tex = gl.createTexture();
    if (!tex) throw new Error("Failed to create texture");
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return tex;
  }

  private uploadElementTexture(tex: WebGLTexture, el: HTMLElement) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    // @ts-expect-error — texElementImage2D is part of the HTML-in-Canvas proposal
    gl.texElementImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      el
    );
  }

  registerEffect(effect: TransitionEffect) {
    this.effects.set(effect.name, effect);
  }

  setSelectedEffect(name: string) {
    this.selectedEffect = name;
  }

  getSelectedEffect(): string {
    return this.selectedEffect;
  }

  hasCurrentPage(): boolean {
    return this.currentPage !== null;
  }

  /** Set a page without transition (initial load) */
  setPage(page: HTMLElement) {
    if (this.fallbackMode) {
      const container = this.fallbackContainer!;
      container.innerHTML = "";
      container.appendChild(page);
      this.currentPage = page;
      return;
    }
    if (this.currentPage) {
      this.canvas.removeChild(this.currentPage);
    }
    this.canvas.appendChild(page);
    this.currentPage = page;
    this.paintReady = false;
  }

  /** Transition to a new page with the selected effect */
  async transitionTo(
    newPage: HTMLElement,
    clickPos: { x: number; y: number } | null
  ): Promise<void> {
    if (this.fallbackMode) {
      this.setPage(newPage);
      return;
    }
    if (this.transitioning) return;
    if (!this.currentPage) {
      this.setPage(newPage);
      return;
    }

    // Resolve effect
    let effectName = this.selectedEffect;
    if (effectName === "random") {
      const names = [...this.effects.keys()];
      effectName = names[Math.floor(Math.random() * names.length)] ?? "dissolve";
    }
    const effect = this.effects.get(effectName);
    if (!effect) {
      this.setPage(newPage);
      return;
    }

    this.activeEffect = effect;

    // Build the shader program for this effect
    this.effectProgram = effect.createProgram(this.gl);
    this.effectVAO = createFullscreenQuad(this.gl, this.effectProgram);

    // Add new page to canvas (it will be laid out but not browser-painted)
    this.canvas.appendChild(newPage);

    // Normalize click position
    if (clickPos) {
      const rect = this.canvas.getBoundingClientRect();
      this.transitionClickPos = [
        clickPos.x / rect.width,
        clickPos.y / rect.height,
      ];
    } else {
      this.transitionClickPos = [0.5, 0.5];
    }

    // Wait a frame for paint event to fire so texElementImage2D works
    await new Promise<void>((r) => requestAnimationFrame(() => r()));

    // Set timing and flag AFTER the await so the render loop doesn't
    // see transitioning=true with transitionStart=0 and instantly finish
    this.transitionDuration = effect.duration;
    this.transitionStart = performance.now();
    this.transitioning = true;

    return new Promise<void>((resolve) => {
      this.transitionResolve = resolve;
    });
  }

  private render = () => {
    requestAnimationFrame(this.render);
    const gl = this.gl;

    if (this.transitioning && this.activeEffect && this.effectProgram) {
      // Transition render
      const now = performance.now();
      const elapsed = now - this.transitionStart;
      const rawProgress = Math.min(elapsed / this.transitionDuration, 1);
      // Ease in-out
      const progress =
        rawProgress < 0.5
          ? 2 * rawProgress * rawProgress
          : 1 - Math.pow(-2 * rawProgress + 2, 2) / 2;

      // Upload textures
      if (this.currentPage) {
        this.uploadElementTexture(this.fromTex, this.currentPage);
      }
      const toEl = this.canvas.querySelector(
        ".page:last-child"
      ) as HTMLElement | null;
      if (toEl && toEl !== this.currentPage) {
        this.uploadElementTexture(this.toTex, toEl);
      }

      // Draw with effect shader
      gl.useProgram(this.effectProgram);

      // Bind textures
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.fromTex);
      gl.uniform1i(
        gl.getUniformLocation(this.effectProgram, "u_from"),
        0
      );

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.toTex);
      gl.uniform1i(
        gl.getUniformLocation(this.effectProgram, "u_to"),
        1
      );

      const params: TransitionParams = {
        progress,
        time: now / 1000,
        resolution: [this.canvas.width, this.canvas.height],
        clickPos: this.transitionClickPos,
      };
      this.activeEffect.setUniforms(gl, this.effectProgram, params);

      gl.bindVertexArray(this.effectVAO);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // Transition complete
      if (rawProgress >= 1) {
        this.finishTransition();
      }
    } else if (this.currentPage) {
      // Passthrough render — just show current page
      this.uploadElementTexture(this.pageTex, this.currentPage);

      gl.useProgram(this.passthroughProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.pageTex);
      gl.uniform1i(
        gl.getUniformLocation(this.passthroughProgram, "u_from"),
        0
      );

      gl.bindVertexArray(this.passthroughVAO);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  };

  private finishTransition() {
    // The new page is the last .page child
    const toEl = this.canvas.querySelector(
      ".page:last-child"
    ) as HTMLElement | null;

    // Remove old page
    if (this.currentPage && toEl && toEl !== this.currentPage) {
      this.canvas.removeChild(this.currentPage);
    }

    this.currentPage = toEl;
    this.transitioning = false;
    this.activeEffect = null;

    // Clean up effect program
    if (this.effectProgram) {
      this.gl.deleteProgram(this.effectProgram);
      this.effectProgram = null;
    }
    this.effectVAO = null;

    this.transitionResolve?.();
    this.transitionResolve = null;
  }
}
