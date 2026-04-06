# Compiz Web

Shader-driven page transitions inspired by Compiz, the Linux window manager that made every desktop interaction a visual spectacle.

Each page navigation runs a WebGL fragment shader that reads both the old and new page as live textures via the `texElementImage2D()` API, then composites them through the selected effect.

## Effects

- **Dissolve** - Simplex noise threshold sweep with a glowing edge
- **Burn** - FBM fire simulation with smoke, embers, and heat distortion
- **Cube** - 3D cube rotation via ray-casting with perspective camera pullback
- **Wobbly** - Spring-physics ripple wave with chromatic aberration
- **Genie** - Page squeezes into a point (like the Compiz minimize effect)
- **Magnetic** - Pixels scatter toward click point, then reassemble as the new page

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
