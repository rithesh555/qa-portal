---
name: Sticker
slug: sticker
genre: playful
paper: light 95.7 82
display: display-heavy Bowlby One SC
accent: chromatic-magenta 3
posture: full-palette
keywords: stickers, print, merch, shop, maker, creator, diy, craft, vinyl, packaging, labels, small business, ecommerce, fun, loud, pink, cut, ship, order
material: a warm off-white sheet, hot pink and lime cut shapes with thick white die-cut borders and hard offset shadows, a heavy display face
signature: a tilted die-cut shape, white-bordered, sitting proud of the page on a hard shadow beside the headline
pictured: Bento Grid set as a sticker sheet, Poster hero
---

# Sticker

Warm off-white paper, hot pink and lime shapes each with a 6px white die-cut border and a hard offset shadow, tilted between -6 and 6 degrees, Bowlby One SC heads and a Sofia Sans body.

## Tokens

```css
:root {
  --color-paper: oklch(95.7% 0.013 82); --color-paper-2: oklch(92.8% 0.021 79); --color-paper-3: oklch(99.4% 0.007 89);
  --color-ink: oklch(21% 0.011 81); --color-ink-2: oklch(30% 0.013 78); --color-muted: oklch(50% 0.017 64);
  --color-rule: oklch(89.7% 0.02 80); --color-white: oklch(99.5% 0.003 82);
  --color-accent: oklch(56% 0.19 3); --color-accent-2: oklch(87.6% 0.179 119); --color-accent-3: oklch(95% 0.021 355);
  --color-accent-ink: oklch(99.5% 0.003 82); --color-focus: oklch(56% 0.19 3);
  --font-display: "Bowlby One SC", "Arial Black", sans-serif; --font-body: "Sofia Sans", ui-sans-serif, system-ui, sans-serif;
  --font-outlier: "JetBrains Mono", ui-monospace, monospace;
  --radius-card: 18px; --radius-pill: 999px; --rule-hair: 1px; --rule-bar: 2px;
  --shadow-card: 5px 6px 0 var(--color-ink);
  --tracking-display: 0.005em;
}
```

Two colourways, set once per page and named in the stamp (`sticker: sheet`).

| Colourway | Paper, ink, shapes |
| --- | --- |
| `sheet` (default) | the block above |
| `vinyl` | ground `oklch(21% 0.011 81)`, cards `oklch(25.5% 0.013 72)`, ink `oklch(95.7% 0.013 82)`, rule `oklch(33% 0.016 75)`; pink and lime unchanged, the borders still white |

## Faces

- **Display:** Bowlby One SC 400, a capitals-only face by design, `--tracking-display`, line-height 1.02, up to 4rem; also the price figures at 38px and the wordmark at 21px. Never a paragraph.
- **Body:** Sofia Sans 400 and 600 at 17px, line-height 1.5, `tabular-nums`.
- **Labels, badges, captions, table heads:** Sofia Sans 700 at 12.5 to 13px, sentence case, untracked, in `--color-muted`. Mono only inside code.

## Material

- The die-cut: every shape, card and badge that is a sticker carries a 6px `--color-white` border (`paint-order: stroke` with an 8px white stroke on SVG shapes) and `--shadow-card`, a hard offset with no blur. Surfaces that are the sheet itself (tiles, the price table) are borderless with a whisper of `--color-rule` at `--rule-hair`.
- Shapes: circle, square, star, octagon, pill, blob, arrow, scalloped, drawn in SVG and filled pink or lime; a starburst for a number; one giant blob for a call to action. Each tilts between -6 and 6 degrees, never all the same way.
- The wordmark is itself a sticker: ink fill, white border, 12px radius, tilted -2deg, with a peeled corner drawn as a two-colour gradient triangle.
- Radii: 18px on cards, 22px on frames, `--radius-pill` on controls; a `--rule-bar` dashed `--color-rule` for cut lines, drop zones and the line the process steps sit on.
- The control pair: a pink pill with a 5px white ring and `--shadow-card`, beside a ghost pill with an inset 2px ink border. Chips are pills with a 2px inset rule, the selected one ink-filled.
- Colour in thirds: pink for the sticker, lime for the badge, ink for the type; the pale pink `--color-accent-3` only as a corner wash inside a slot.

## Motion

Sticker physics: a hover lifts a clickable sticker 2px and turns it a degree further; a press pushes it onto its shadow (translate by the offset, shadow to 1px). `--dur-micro` on `--ease-out`, nothing on scroll.

## Voice

Cheerful and exact: the hours, the quantity, the size in millimetres, the ship day. It sounds like the person at the cutter.

## Do-nots

- Never a soft blurred drop under a sticker; the shadow is a hard offset or there is no shadow.
- Never a shape without its white border, and never a border thinner than 4px.
- Never Bowlby at body size, in a table or on a label; it is for heads and prices.
- Never pink text on the paper; pink is a fill with white on it.
- Never every sticker tilted the same way, or none tilted.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Bowlby+One+SC&family=Sofia+Sans:wght@400;600;700&display=swap" rel="stylesheet">
```

```css
.display { font: 400 min(var(--text-display), 4rem)/1.02 var(--font-display); letter-spacing: var(--tracking-display); text-wrap: balance; }
.stk { border: 6px solid var(--color-white); box-shadow: var(--shadow-card); }
.shape svg * { fill: var(--color-accent); stroke: var(--color-white); stroke-width: 8; stroke-linejoin: round; paint-order: stroke; }
.shape--lime svg * { fill: var(--color-accent-2); }
.btn { display: inline-flex; align-items: center; height: 52px; padding: 0 var(--space-lg); border-radius: var(--radius-pill); font-weight: 700; font-size: var(--text-md); color: var(--color-ink); box-shadow: inset 0 0 0 2px var(--color-ink); }
.btn--primary { background: var(--color-accent); color: var(--color-accent-ink); box-shadow: 0 0 0 5px var(--color-white), 5px 6px 0 var(--color-ink); transition: translate var(--dur-micro) var(--ease-out), box-shadow var(--dur-micro) var(--ease-out); }
.btn--primary:active { translate: 4px 5px; box-shadow: 0 0 0 5px var(--color-white), 1px 1px 0 var(--color-ink); }
.wordmark { display: inline-block; padding: var(--space-xs) var(--space-md) var(--space-2xs); background: var(--color-ink); color: var(--color-paper); font: 21px/1 var(--font-display); border-radius: 12px; border: 4px solid var(--color-white); rotate: -2deg; }
.cut { border: var(--rule-bar) dashed var(--color-rule); }
::selection { background: var(--color-accent-2); color: var(--color-ink); }
```
