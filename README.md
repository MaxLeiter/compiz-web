# Compiz Web

[compiz-web.webm](https://github.com/user-attachments/assets/6f86736e-de8c-43b0-9dea-3459060983ee)

Shader-driven web page transitions inspired by Compiz, the Linux window manager.

Each page navigation runs a WebGL fragment shader that reads both the old and new page as live textures via the `texElementImage2D()` API, then composites them through the selected effect.

## Requirements

Requires [Chrome Canary](https://www.google.com/chrome/canary/) with the HTML-in-Canvas flag enabled:

```
--enable-features=HTMLInCanvas
```

Falls back to plain page swaps on unsupported browsers.

## Running

```bash
bun install
bun run dev
```

## How it works

1. Pages live inside a `<canvas layoutsubtree>` element
2. The browser lays out the HTML but doesn't paint it
3. `texElementImage2D()` renders each page into a WebGL texture
4. A fullscreen quad fragment shader blends the two textures based on progress
5. Each effect is a self-contained shader with its own uniforms and timing
