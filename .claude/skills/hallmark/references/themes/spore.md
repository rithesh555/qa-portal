---
name: Spore
slug: spore
genre: atmospheric
paper: dark 15 60
display: roman-serif Young Serif
accent: warm 30
posture: committed
keywords: grower, mushroom, fungi, farm, food, producer, fermentation, wine, natural wine, wine bar, bottle shop, cellar, preserves, dark, culture, night market, harvest, subscription, small batch
material: coffee-ground black under a warm grain, cream Young Serif, one oyster pink, the product drawn in code on brick shelves
signature: a drawn row of the product on a brick shelf (caps, bottles or jars), each name in cream serif and its price in pink
pictured: Conversational FAQ, Poster hero
---

# Spore

Coffee-ground black under a warm screened grain, Young Serif in cream, an Instrument Sans body, one pink taken from the pink oyster mushroom, and the product drawn in code from three shapes at most, sitting on a brick shelf.

## Tokens

```css
:root {
  --color-paper: oklch(15% 0.01 60); --color-paper-2: oklch(19% 0.012 60); --color-paper-3: oklch(24% 0.02 50);
  --color-ink: oklch(93% 0.02 85); --color-ink-2: oklch(88% 0.02 120); --color-muted: oklch(64% 0.02 70);
  --color-rule: oklch(30% 0.015 60);
  --color-accent: oklch(77% 0.09 30); --color-accent-2: oklch(86% 0.06 30); --color-accent-ink: oklch(15% 0.01 60); --color-focus: oklch(86% 0.06 30);
  --font-display: "Young Serif", Georgia, serif; --font-body: "Instrument Sans", ui-sans-serif, system-ui, sans-serif;
  --font-outlier: "DM Mono", ui-monospace, monospace;
  --radius-card: 12px; --radius-pill: 999px; --rule-hair: 1px;
  --shadow-card: 0 12px 32px oklch(8% 0.01 60 / 0.35);
  --tracking-display: -0.01em;
  --grain: 0.22;
}
```

One dial, the colourway, stated in the stamp (`spore: cellar`). Each product keeps its own drawn colours in every colourway; only the pink follows the accent.

| Colourway | Ground | Ink | Accent |
| --- | --- | --- | --- |
| `cellar` (default) | `oklch(15% 0.01 60)`, grain screened at 22% | cream `oklch(93% 0.02 85)` | pink `oklch(77% 0.09 30)` |
| `lab` | cream `oklch(94% 0.02 85)`, grain multiplied at 6% | `oklch(17% 0.015 60)` | pink `oklch(70% 0.12 30)` |
| `head-torch` | `oklch(12% 0.008 60)`, grain at 26% | `oklch(93% 0.03 85)` | ochre `oklch(74% 0.13 80)` |

## Faces

- **Display:** Young Serif 400, its only weight, line-height 1.02, `--tracking-display`, roman, from 26px to 110px. One colour per head. Figures (the day, the price) are Young Serif at 34 to 52px.
- **Body:** Instrument Sans 400 and 500, 16 to 18px, line-height 1.5, in `--color-ink-2`. A second name after a product (a Latin name, a grape, a vintage) is Instrument Sans italic 400, the only italic.
- **Labels, captions, table heads, meta:** Instrument Sans 500 one step smaller, sentence case, in `--color-muted`. DM Mono only inside code and on figures that compare, tabular.

## Material

- The grain: one SVG fractal-noise layer at page level, screened at 22%, `pointer-events: none`. It is the theme's whole atmosphere: no blooms, no spotlight, no torch. Depth is the three-step ground (cellar, panel, brick shelf) and the one offset shadow a dish casts.
- The product is drawn, one SVG each, from three shapes at most in `--color-ink-2` and the product's own colour: a mushroom is a rounded stem under a half-ellipse cap with a lighter ellipse at its top left; a bottle is a rounded body and a narrow neck; a jar is a squared body and a lid. A cluster is three at three sizes from one base point. Under 40 lines; no detail past that, no photograph.
- The gill fringe: 1px `--color-ink-2` lines every 5px, masked to fade, as the edge of a band.
- Rules and shelves: 1px `--color-rule` between rows; a 2px shelf in `--color-paper-3` under a row of products; 1.5px cream around a form and a dish. Nothing else has a border.
- Radii: pills on controls and chips, 12px on a panel, 50% on the dish; forms square. The control pair: a pink-filled pill beside a pill outlined in 1.5px `--color-ink-2`.
- The pink footprint: the primary control, the price, and at most one pink band per page.

## Motion

Nothing moves except state: a chip picks a product, a switch changes a price, a dish fills on a click in one frame. Drawn things never animate, nothing grows, nothing reveals.

## Voice

A maker's log: the name, the day, the weight, where it goes. No wellness, no mystique.

## Do-nots

- Never a photograph next to a drawing of the same thing.
- Never a second accent; a green for "in stock" makes a garden centre. Stock is a sentence in muted.
- Never a flat black without the grain, and never a torch or a pool of light standing in for it.
- Never a card grid of products; products sit on shelves.
- Never animate a cap.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Young+Serif&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
```

```css
body::after { content: ""; position: fixed; inset: 0; z-index: var(--z-raised); pointer-events: none; opacity: var(--grain); mix-blend-mode: screen;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.6 0 0 0 0 0.55 0 0 0 0 0.45 0 0 0 0.35 0'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)'/%3E%3C/svg%3E"); }
.display { font: 400 var(--text-display)/1.02 var(--font-display); letter-spacing: var(--tracking-display); }
.cap .stem { fill: var(--color-ink-2); } .cap .top { fill: var(--c); } .cap .hi { fill: var(--color-ink); opacity: 0.35; }
.gills { height: 26px; background: repeating-linear-gradient(90deg, var(--color-ink-2) 0 1px, transparent 1px 5px); mask: linear-gradient(180deg, color-mix(in oklab, var(--color-paper) 70%, transparent), transparent); }
.shelf { border-bottom: 2px solid var(--color-paper-3); }
.btn { border-radius: var(--radius-pill); padding: var(--space-sm) var(--space-lg); font-weight: 600; background: var(--color-accent); color: var(--color-accent-ink); }
.btn--secondary { background: transparent; color: var(--color-ink); box-shadow: inset 0 0 0 1.5px var(--color-ink-2); }
::selection { background: color-mix(in oklab, var(--color-accent) 30%, transparent); }
```
