### E7 · Abstract background, subtle gradient plus grain

A two-colour CSS gradient at low chroma with a monochrome SVG `<feTurbulence>` grain at 0.08 opacity or less, the `texture.md` budget. Not aurora, not a mesh, not floating orbs (29), and never a grid or stripe pattern, which needs a canvas, a map or a measuring tool under it (47c). Texture you can barely see: paper quality, not decoration. It never moves; parallax is banned (`craft.md` § 5) and scroll-linked motion lives only in `scroll-choreography.md`.

*Use when:* the page would feel synthetic on a flat surface.
*Avoid when:* the theme already reads as paper or names its own grain (Specimen, Atelier, Riso), since doubled grain is mud; and on a modern-minimal page, which never takes grain (`texture.md`).

**Knobs:**
- Gradient direction (45° · 135° · radial from one edge or corner, never centred behind the head, which is a spotlight, 29)
- Grain (off · 0.04 · 0.08)

**Example.** A small podcast site. A two-stop gradient at 135°, from the paper with a trace of the accent mixed in to a half step toward `--color-paper-2`, both under 0.04 chroma, over the hero only, never page-wide, with a monochrome grain overlay at 0.06 opacity in `multiply`.

```html
<section class="hero hero--bg">
  <div class="hero__bg" aria-hidden="true">
    <svg width="0" height="0" style="position: absolute;">
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
    </svg>
  </div>
  <div class="container hero__copy">…</div>
</section>
```
```css
.hero--bg { position: relative; isolation: isolate; }
.hero__bg {
  position: absolute; inset: 0;
  background:
    linear-gradient(135deg,
      color-mix(in oklab, var(--color-paper) 96%, var(--color-accent)),
      color-mix(in oklab, var(--color-paper) 50%, var(--color-paper-2)));
}
.hero__bg::after {
  content: ""; position: absolute; inset: 0;
  filter: url(#grain);
  opacity: 0.06;
  mix-blend-mode: multiply;
  pointer-events: none;
}
.hero__copy { position: relative; }   /* later in the DOM, so it paints above the backdrop without a z-index */
```
