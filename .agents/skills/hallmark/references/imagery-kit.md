# Imagery kit

A small set of hosted files at `https://www.usehallmark.com/imagery/<category>/<file>` (`site/imagery/` in the repo), and the rules for placing them. **Never emit a URL that is not listed in the manifest below.** Anything not listed is built in the page instead: washes in CSS (tier A), marks and ornaments in SVG (tier B, [`custom-craft.md`](custom-craft.md)), grain from [`texture.md`](texture.md). A URL that 404s in a shipped page is worse than no image, so the built fallback stays in reach for every listed file.

The kit is atmosphere, marks and texture. It never stands in for a subject (a product, a dish, a person) and never for a product capture: those are slots (`craft.md` § 8).

## Manifest

Generated files carry a committed `.json` sidecar (model, prompt, date); a page that embeds one appends `imagery: <file> · <provenance>` to its stamp.

```
watercolor-warm-01.jpg   1440x800    sienna and ochre wash pooling lower left, on white      gen:flux-1.1-pro
watercolor-warm-02.jpg   1440x800    terracotta and apricot wash upper right, on white       gen:flux-1.1-pro
watercolor-cool-01.jpg   1440x800    prussian and grey wash lower right, on white            gen:flux-1.1-pro
watercolor-cool-02.jpg   1440x800    viridian and slate wash from the left edge, on white    gen:flux-1.1-pro
transparent-brush-warm-01.jpg   1216x1216   sienna diagonal brushstroke on white            gen:flux-1.1-pro
transparent-brush-warm-02.jpg   1216x1216   ochre torn-edge stroke on white                 gen:flux-1.1-pro
transparent-brush-cool-01.jpg   1216x1216   prussian brushstroke on white                   gen:flux-1.1-pro
transparent-brush-cool-02.jpg   1216x1216   slate-teal stroke on white                      gen:flux-1.1-pro
texture-grain-paper-01.svg   512x512   paper grain, feTurbulence                             hand-built
texture-riso-dot-01.svg      24x24     offset riso dot lattice, currentColor                 hand-built
texture-crosshatch-01.svg    16x16     45 and 135 degree hatch, currentColor                 hand-built
texture-weave-01.svg         20x20     over-under weave bars, currentColor                   hand-built
mark-orbit-01..03.svg    32x32   circle grammar: ring and satellite, vesica, wedge           hand-built
mark-stack-01..03.svg    32x32   bar grammar: steps, bar and counter, offset slab            hand-built
mark-field-01..03.svg    32x32   grid grammar: displaced dot, diagonal run, rotated square   hand-built
mark-stroke-01..03.svg   32x32   line grammar: chevrons, arc over baseline, oblique strokes  hand-built
```

Pick by the theme's palette family (`warm`, `cool`) and the brief's tone. The washes and brushes are painted on white, not on alpha: composite them with `mix-blend-mode: multiply` over a light paper, where the white drops out, and skip them on a dark theme.

## Placing them

- **A wash or a brush sits in its own plate or bleeds from one edge of one section**, biased to a side, larger than feels safe. Never behind running text, never centred behind a headline (that is the blob the hero review flags), never on more than one section.
- **A mark** goes beside a brand name in a wordmark when the user has no logo yet. Inline the SVG so it takes `currentColor` (an `<img>` cannot), set the name in the display token beside it:

```html
<a class="wordmark" href="/"><svg viewBox="0 0 32 32" width="20" height="20" fill="currentColor" aria-hidden="true"><!-- paths of mark-orbit-01.svg --></svg> Meridian</a>
```

- **A texture tile** follows `texture.md`'s budget (0.08 page-wide, 0.15 on one plate, 0.05 or nothing under running text) on a pseudo-element, never as the element's own opacity:

```css
.plate { position: relative; isolation: isolate; }
.plate::after { content: ""; position: absolute; inset: 0; pointer-events: none; opacity: var(--texture-opacity, 0.08);
  background: url("https://www.usehallmark.com/imagery/texture/texture-grain-paper-01.svg") 0 0 / 256px; mix-blend-mode: multiply; }
```

- An ornament next to a quote or as a section divider stands on its own, small, with no border, shadow or motion; one above a heading as its label is an eyebrow with a picture in it (54).

## Never

- Kit imagery in the modern-minimal genre: its point is the absence of decoration.
- Two washes, or a wash and a brush, on one page; three kit pieces of any kind.
- `multiply` over a dark ground (it vanishes) or `screen` over a light one (it washes out); check the blend on the active paper.

## Adding to the kit

A file lives in `site/imagery/<category>/`, stays under 200 KB, carries a `.json` sidecar if generated or `currentColor` if hand-built SVG, and gets one line in the manifest above. A file that is not listed is not used.
