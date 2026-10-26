## Tier A · Pure CSS art

**When.** Geometric forms, gradient compositions, glyph-style decoration. Bars, dots, badges, icons, a simple loaf, a sliced sphere, an abstract mark. Anything that is shapes plus colour. Zero bytes, browser-native, scales without limit; the cost is the practice `clip-path` and `conic-gradient` take.

### The toolkit

| Feature | Use for |
| --- | --- |
| `clip-path: polygon(…)` | Multi-sided shapes: chevrons, hexagons, custom blobs |
| `clip-path: path("M …")` | Curved outlines from an SVG path (feature-query a fallback) |
| `conic-gradient()` | Pie segments, radial dividers, rotating colour wheels |
| `radial-gradient()` | Spheres, sun-burst centres |
| `linear-gradient()` (multi-stop) | Composite shapes from stacked stops |
| `mask-image: url(…)` | Layered transparency, morphing shapes, text clips |
| `mix-blend-mode` | Compositional depth (multiply, overlay, screen) |
| `filter` (drop-shadow, blur, hue-rotate) | Soft shadows on irregular shapes (follows the alpha channel) |
| `@property` | Smoothly interpolated custom properties (colour, length, angle) |
| `animation-timeline: scroll() / view()` | Scroll-linked motion, only as a named pattern in `scroll-choreography.md` (F8) |

### A worked example: the loaf as a single div

Every colour derives from a token: the crust from the accent, the shadow from the ink (48).

```html
<div class="loaf" role="img" aria-label="A loaf of bread"></div>
```

```css
@property --rise {
  syntax: "<length>";
  initial-value: 0px;
  inherits: false;
}

.loaf {
  width: 12rem;
  height: 7rem;
  background:
    /* crust ridges */
    radial-gradient(ellipse at 30% 70%, transparent 1.2rem, var(--color-ink-2) 1.21rem 1.3rem, transparent 1.31rem),
    radial-gradient(ellipse at 50% 70%, transparent 1.2rem, var(--color-ink-2) 1.21rem 1.3rem, transparent 1.31rem),
    radial-gradient(ellipse at 70% 70%, transparent 1.2rem, var(--color-ink-2) 1.21rem 1.3rem, transparent 1.31rem),
    /* loaf body: the accent, darkened toward the base */
    linear-gradient(180deg, var(--color-accent), oklch(from var(--color-accent) calc(l - 0.14) c h));
  border-radius: 50% 50% 14% 14% / 70% 70% 30% 30%;
  transform: translateY(var(--rise));
  animation: rise calc(var(--dur-long) * 9) var(--ease-in-out) infinite;
  box-shadow: 0 1.2rem 1.5rem -0.8rem oklch(from var(--color-ink) l c h / 0.18);
}

@keyframes rise {
  50% { --rise: -4px; }   /* the breath: up 4px and back in about 3.8s */
}

@media (prefers-reduced-motion: reduce) {
  .loaf { animation: none; --rise: 0px; }
}
```

A bakery centrepiece in about 25 lines: no asset, animated, accessible. The breath is the page's one E6 loop: it runs only where the theme lets something move and carries the loop contract in `patterns.md` § A loop that can pause. The next bakery brief gets a different loaf because the knobs change: rise distance, curvature, ridge spacing, colour stop.

### Anti-patterns of CSS art

- **Recalculating `clip-path` on every scroll.** Animate `transform` instead, or use `animation-timeline`, which composites off-thread.
- **Over-nested wrappers.** A pure-CSS illustration fits in one to three elements.
- **No reduced-motion fallback.** Every animation gets a `@media (prefers-reduced-motion: reduce)` block (27).
- **Random gradient noise.** If the gradient looks generated rather than designed, redo it. Three stops at most in any one layer, and every stop a token or derived from one.
