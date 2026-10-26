## Tier B · Hand-built SVG illustration

**When.** Illustration CSS cannot express cleanly: characters, articulated figures, organic curves, multi-element scenes. The bakery's storefront, the studio mascot, a workflow diagram with seven labelled paths. Scales without limit, animates, and typically weighs 4 to 15 KB inline; the cost is drawing every path by hand.

### Pipeline

1. **Draw it in code.** Set the `viewBox` to the drawing's bounds, build it from paths and strokes (never a raster), and group and name the parts that will move.
2. **Optimise.** Round coordinates to one decimal, merge paths that share a style, drop empty groups and unused `<defs>`. An SVG that came from a tool or a library goes through [SVGOMG](https://jakearchibald.github.io/svgomg/) first: 30 to 60% smaller is typical.
3. **Inline the result** for animation, or save `static.svg` and reference it from `<img>` or `background-image` for caching.
4. **Animate declaratively:** CSS keyframes on `<path d="">`, `@property`-driven interpolation, or [Motion](https://motion.dev) for orchestrated sequences.

### A hand-built SVG with declarative animation

Fills and strokes come from the tokens: the crumb is the accent, the score marks are the accent darkened, the shadow is the ink at low alpha (48).

```html
<svg viewBox="0 0 200 100" class="loaf-svg" role="img" aria-label="A loaf of bread">
  <path class="loaf-body" d="M 20 70 Q 100 10 180 70 L 180 90 L 20 90 Z" />
  <path class="loaf-score" d="M 60 50 L 90 30 M 100 45 L 130 25 M 140 50 L 165 35" />
</svg>
```

```css
@property --bake {
  syntax: "<number>";
  initial-value: 1;
  inherits: false;
}

.loaf-body {
  fill: var(--color-accent);
  filter: drop-shadow(0 4px 8px oklch(from var(--color-ink) l c h / 0.16));
  transform: scaleY(var(--bake));
  transform-origin: 100px 90px;
  animation: bake calc(var(--dur-long) * 9) var(--ease-in-out) infinite;
}

.loaf-score {
  stroke: oklch(from var(--color-accent) calc(l - 0.3) c h);
  stroke-width: 2;
  stroke-linecap: round;
  fill: none;
  stroke-dasharray: 0 200;
  animation: score var(--dur-long) calc(var(--dur-long) / 2) var(--ease-out) forwards;
}

@keyframes bake  { 50% { --bake: 1.02; } }
@keyframes score { to { stroke-dasharray: 200 200; } }

@media (prefers-reduced-motion: reduce) {
  .loaf-body, .loaf-score { animation: none; }
  .loaf-score { stroke-dasharray: 200 200; }
}
```

The breath comes from `@property --bake` interpolating a number into `scaleY()`; at about 3.8s a cycle it is the page's one E6 loop and carries the loop contract in `patterns.md` § A loop that can pause. The score marks draw themselves once on load via `stroke-dasharray`, inside the hero's 0.8s entrance. Reduced-motion safe.

### Animation choices for SVG

| Method | When | Verdict |
| --- | --- | --- |
| **CSS keyframes on `<path d>`** | Path morphing where shapes have matching anchor counts | Use it; composable with the rest of CSS |
| **`@property` plus animated custom properties** | Smoothly interpolated colour, length, angle, percentage | Use it; declarative, predictable |
| **CSS keyframes on `transform` and `opacity`** | Position, rotation, fade | Always; composited, no layout thrash |
| **`stroke-dasharray` draw-on** | Line illustrations that build themselves | Yes; cheap and effective |
| **SMIL `<animate>`** | Attribute animation CSS cannot express | Only then; CSS composes, SMIL does not |
| **JS via Motion or GSAP** | Multi-element orchestrated entrances, scroll scrubbing, long timelines | When CSS is not enough; see tier C |

### Anti-patterns of hand-built SVG

- **Shipping a tool's export untouched.** Exports carry metadata, unused `<defs>` and doubled transforms; SVGOMG strips them.
- **A 300 KB SVG.** Over 30 KB is suspicious; most well-built illustrations sit at 4 to 15 KB. A 100 KB file has hidden raster embeds or thousands of needless path commands.
- **`viewBox` cruft.** Match the box to the design's bounds: no padding, no extra space.
- **Linear easing on everything.** The easing tokens (`craft.md` § 5); linear is for progress.
- **Path morphing across mismatched anchor counts.** Browsers cannot interpolate it and jump halfway. Match the counts or use `clip-path`.

---

## The bakery worked example, end to end

**Brief:** "Build a landing page for a small bakery in Lisbon."

**Shape:** Long Document; the bakery is a story-led brand, not a product.
**Direction:** Editorial, dealt: warm cream, a heavy condensed grotesque, one coral mark.
**Enrichment:** E5 custom illustration centrepiece, tier B.

**The output:** a 60-line SVG of a single loaf, three paths (crust, crumb, score marks), to the right of the headline at 40% column width, drawn in ink with only the score marks in coral, so the accent stays a signal (23). Editorial moves nothing past its one clip reveal, so the loaf holds still: the theme wins on motion.

```css
/* Hallmark · shape: Long Document · genre: editorial · theme: Editorial (deal 3/3, seed small-bakery-lisbon·2026-10-02·r0)
 * hero: Settled · nav: wordmark and two links · footer: letter close · enrichment: E5 illustration, tier B SVG, 60 lines, still · signature: the loaf drawn beside the first line, scored in coral
 * axes: light/display-condensed/warm · posture: restrained · contrast: pass · fold: pass · v2.5.0 */
```

The next bakery brief gets a different loaf (another curvature and score pattern) or a different subject altogether (a boule, a baguette, a flatbread), and Rotation never lets E5 follow E5 (SKILL.md Step 2).
