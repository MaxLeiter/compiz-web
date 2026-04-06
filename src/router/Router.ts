import type { TransitionEngine } from "../transitions/TransitionEngine.ts";

export type PageFactory = () => HTMLElement;

export class Router {
  private routes = new Map<string, PageFactory>();
  private currentPath = "";
  private engine: TransitionEngine;
  private lastClickPos: { x: number; y: number } | null = null;

  constructor(engine: TransitionEngine) {
    this.engine = engine;

    // Intercept link clicks
    document.addEventListener("click", (e) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#")) return;

      e.preventDefault();
      this.lastClickPos = { x: e.clientX, y: e.clientY };
      this.navigate(href);
    });

    // Handle back/forward — animate the transition
    window.addEventListener("popstate", () => {
      this.lastClickPos = null;
      this.loadRoute(window.location.pathname, true);
    });
  }

  addRoute(path: string, factory: PageFactory): this {
    this.routes.set(path, factory);
    return this;
  }

  async navigate(path: string) {
    if (path === this.currentPath) return;
    history.pushState(null, "", path);
    await this.loadRoute(path, true);
  }

  async loadRoute(path: string, animate: boolean) {
    const factory = this.routes.get(path) ?? this.routes.get("/");
    if (!factory) return;

    const newPage = factory();
    this.currentPath = path;
    this.updateActiveNav(path);

    if (animate && this.engine.hasCurrentPage()) {
      const clickPos = this.lastClickPos;
      this.lastClickPos = null;
      await this.engine.transitionTo(newPage, clickPos);
    } else {
      this.engine.setPage(newPage);
    }
  }

  private updateActiveNav(path: string) {
    document.querySelectorAll(".nav-links a").forEach((a) => {
      const href = a.getAttribute("href");
      a.classList.toggle("active", href === path);
    });
  }

  start() {
    this.loadRoute(window.location.pathname, false);
  }
}
