# Custom craft: how to hand-build hero artwork

Loaded only when an enrichment archetype needs construction (see [`hero-enrichment.md`](hero-enrichment.md)). It says which technique to reach for at which tier, and what each looks like done well.

**The principle.** Custom-built artwork is the design; a library asset is a shortcut. Know when CSS alone suffices, when SVG is right, when scripted animation earns its bundle, and when (rarely) WebGL is justified. Constraint-driven, hand-built, performance-respecting, accessible: use the platform.

This file is the index. The guidance lives in `craft/`, one file per tier, with worked recipes in `craft/recipes/`. Pick from the table, then load only the file you need. The tier letters are the ones `hero-enrichment.md` uses; there is one alphabet.

## The six tiers

| Tier | Technique | Reach for it when | Bundle cost | File |
| --- | --- | --- | --- | --- |
| A | Pure CSS art | Shapes plus colour: bars, badges, spheres, abstract marks | Zero | `craft/tier-a-css.md` |
| B | Hand-built SVG | Characters, organic curves, multi-element scenes | 4 to 15 KB inline | `craft/tier-b-svg.md` |
| C | Declarative animation | Motion on top of A or B; CSS first, JS only for orchestration | 0 to 50 KB | `craft/tier-c-animation.md` |
| D | Three.js / WebGL | The 3D is the hero value and the user interacts with it | Up to 2 MB | `craft/tier-d-webgl.md` |
| E | Generated stills | Characters or scenes where hand-building is uneconomical | Image weight | `craft/tier-e-generated.md` |
| F | Library asset or Lottie | Budget and timeline force a shortcut; last resort | Varies | `craft/tier-f-lottie.md` |

### Cross-recipe techniques

What the four recipes share:

1. **`@property` for declarative interpolation.** Animating a typed custom property (`<length>`, `<number>`, `<angle>`, `<color>`) animates with zero JS. The loaf, the flow line, the architecture diagram's traffic and the mascot's blink all use it.
2. **Asymmetric `transform: rotate()` for a drawn feel.** The workflow boxes rotate at plus or minus 1°, the mascot's eyes blink `--dur-micro` apart, the sprig's leaves sit at -25° and +30°. Symmetry looks algorithmic; controlled asymmetry looks drawn.
3. **Opacity layering for secondary detail.** The workflow's second arrow is `--color-muted`; the architecture sub-labels are muted; the sprig veins are 0.6 opacity. The hierarchy of opacity is the hierarchy of attention.
4. **Labels that are facts.** The architecture diagram's hop labels name real protocols; the workflow's predicates are real. Labels inside drawn work are the body face at a small size, sentence case, untracked (67); mono only on a figure, a measurement or code (64).

Use the recipes verbatim when they fit, or strip them for technique when the brief calls for something else. Every illustration on a Hallmark page is built, not picked.

### Anti-patterns, one line each

Each tier file carries its own list. The cross-tier tells:

- **Lottie where CSS would do.** Build it in CSS or SVG; the library pull is the shortcut that costs you.
- **50 KB of GSAP for one fade-in.** `transition: opacity var(--dur-long) var(--ease-out)` is zero bytes.
- **Animating `width` or `height`.** Reflows the layout; use `transform: scale()` with a `transform-origin`.
- **Three.js for a non-interactive rotation.** No interaction, no justification; animate an SVG instead.
- **An untouched Figma export.** Run SVGOMG, always.
- **A raw generated raster.** Post-process: grain, an asymmetric crop, a colour grade.
- **Linear easing on UI.** `--ease-out` at minimum; linear is for progress and loaders.
- **No `prefers-reduced-motion` fallback.** Every animation gets one (27).

## Tier index

Pick the tier, then read only that file from `references/craft/`. Never load the whole catalogue.

- **Tier A · Pure CSS art**: shapes plus colour at zero bytes; the `clip-path` and `conic-gradient` toolkit and the single-div loaf. [`craft/tier-a-css.md`](craft/tier-a-css.md)
- **Tier B · Hand-built SVG**: drawing in code and optimising it, declarative SVG animation, and the bakery worked example end to end. [`craft/tier-b-svg.md`](craft/tier-b-svg.md)
- **Tier C · Declarative animation**: `@property`, scroll-driven animation, View Transitions, and when Motion or GSAP earns its bundle. [`craft/tier-c-animation.md`](craft/tier-c-animation.md)
- **Tier D · Three.js / WebGL**: when 3D is justified, the performance budget, and the mandatory non-WebGL fallback. [`craft/tier-d-webgl.md`](craft/tier-d-webgl.md)
- **Tier E · Generated stills**: the hook script, provenance, and the post-processing discipline. [`craft/tier-e-generated.md`](craft/tier-e-generated.md)
- **Tier F · Library asset or Lottie**: the last-resort rules and the short list of jobs Lottie is for. [`craft/tier-f-lottie.md`](craft/tier-f-lottie.md)

## Recipe index

Four complete recipes at tier A or B, each with full code, a use-when and avoid-when note, and a reduced-motion fallback. Load one when the brief calls for the named subject; strip for technique otherwise.

- **Recipe 1 · Workflow diagram**: three labelled boxes, curved arrows, an animated `stroke-dashoffset` flow. [`craft/recipes/flow-diagram.md`](craft/recipes/flow-diagram.md)
- **Recipe 2 · Minimal-line mascot**: a face-only SVG character with a blink loop; personality without the uncanny valley. [`craft/recipes/mascot.md`](craft/recipes/mascot.md)
- **Recipe 3 · Three-tier architecture diagram**: browser to API to database with pulsing data-flow lines. [`craft/recipes/architecture-diagram.md`](craft/recipes/architecture-diagram.md)
- **Recipe 4 · Botanical leaf flourish**: a drawn sprig beside a headline; no animation, the design is the stillness. [`craft/recipes/leaf-sprig.md`](craft/recipes/leaf-sprig.md)
