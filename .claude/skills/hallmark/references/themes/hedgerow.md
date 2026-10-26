---
name: Hedgerow
slug: hedgerow
genre: editorial
paper: dark 24 165
display: high-contrast-serif Prata
accent: chromatic-green 115
posture: drenched
keywords: distillery, gin, brewery, forager, botanicals, nature reserve, walking, trail, seeds, plants, nursery, hedge, countryside, field guide, provenance, harvest, batch, seasonal, map, miles
material: deep hedge green, one chartreuse for every line the code draws, Prata names, Manrope for the reading, a leaf as the unit of quantity
signature: a specimen drawn in 1.2px chartreuse lines beside its name in Prata, one real quantity from the brief (miles, a count) as a row of leaves
pictured: Field guide (an unlisted shape), Stage hero
---

# Hedgerow

A hedge-green ground, cream Prata names, Manrope for reading, and one chartreuse that draws every specimen, every ring on the map and the one button. The signature is a specimen drawn in 1.2px chartreuse lines beside its name, with one real quantity from the brief counted out as a row of leaves.

## Tokens

```css
:root {
  --color-paper: oklch(24% 0.05 165); --color-paper-2: oklch(20% 0.045 165); --color-paper-3: oklch(30% 0.05 165);
  --color-ink: oklch(93% 0.02 85); --color-ink-2: oklch(80% 0.04 160); --color-muted: oklch(68% 0.05 160);
  --color-rule: oklch(36% 0.05 165);
  --color-accent: oklch(86% 0.19 115); --color-accent-2: oklch(91% 0.13 115); --color-accent-ink: oklch(24% 0.05 165); --color-focus: oklch(91% 0.13 115);
  --font-display: "Prata", Georgia, serif; --font-body: "Manrope", ui-sans-serif, system-ui, sans-serif;
  --font-outlier: "IBM Plex Mono", ui-monospace, monospace;
  --radius-card: 0; --radius-pill: 999px; --rule-hair: 1px;
  --shadow-card: none;
  --tracking-display: 0;
}
```

One dial, the colourway, stated in the stamp (`hedgerow: hedge`). The drawings follow the accent in every colourway.

| Colourway | Ground | Ink | Accent |
| --- | --- | --- | --- |
| `hedge` (default) | oklch(24% 0.05 165) | cream oklch(93% 0.02 85) | chartreuse oklch(86% 0.19 115) |
| `sloe` | plum oklch(25% 0.06 320) | oklch(94% 0.02 80) | straw oklch(88% 0.15 95) |

## Faces

- **Display:** Prata 400, its only weight, line-height 1.1, no tracking, roman: names in rows at 15 to 22px, heads at 44 to 66px, a batch number as large as 260px. The wordmark is Prata uppercase tracked 0.04em. One colour per head.
- **Body:** Manrope 400 and 500, 16 to 17px, line-height 1.55, in `--color-ink-2`.
- **Small print:** Manrope 500 at 12.5 to 13px, sentence case, untracked, in `--color-muted`, for tags, month names, captions, table heads and meta. Mono appears only inside code; figures are Manrope tabular.

## Material

- The specimen: one SVG the code draws, an umbel with six rays from a stem and a filled dot at each tip, under 12 lines, 1.2px strokes in the accent, nothing shaded. That is the whole drawing; it repeats at sizes and rotations, never a second species. Muted when dried or bought, accent when fresh.
- The leaf: a 14 by 8px rectangle with `border-radius: 0 100% 0 100%`. It is the unit of quantity: a leaf per half mile, per ten millilitres, per month picked. Never a bar.
- Rings: distance is concentric dashed circles a mile apart from a centre; a compass and the map are the same drawing.
- The label: cream paper, a 1.5px green keyline with a second 6px inside, the serif name, a specimen, figures on a rule. The only box in the theme, and it is square.
- Rules: 1px `--color-muted` above a section, 1px `--color-rule` between rows, 1px accent above a list. The hedge: a line of small drawn strokes along one edge of a band.
- Pills: the control pair is an accent-filled pill in Manrope 700 beside a pill outlined in 1.5px accent. Nothing else is rounded but the leaf. No shadow, no texture, no gradient.

## Motion

The guide is still. A tag appears on hover, a specimen redraws on click, a slider moves a line, a month dims the rest of the calendar. No growth, no drifting leaves, no scroll reveal.

## Voice

A field guide's: the plant and where it grows, then how far and when only where the brief knows; never invent a distance or a month. Miles to one decimal. Provenance as a sentence, never a badge.

## Do-nots

- Never a second accent; sold out is muted, not red.
- Never a filled or shaded illustration; specimens are lines and dots.
- Never a bar chart; a quantity is a row of leaves.
- Never a rounded card; the label is the only box, square, with its double keyline.
- Never a black ground; the dark is green at 24%, or plum on `sloe`.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Prata&family=Manrope:wght@400;500;700&display=swap" rel="stylesheet">
```

```css
.display { font: 400 var(--text-display)/1.1 var(--font-display); }
.specimen svg * { stroke: var(--color-accent); stroke-width: 1.2; fill: none; } .specimen svg .f { fill: var(--color-accent); stroke: none; }
.leaf { display: inline-block; width: 14px; height: 8px; border-radius: 0 100% 0 100%; background: var(--color-accent); }
.leaf.dried { background: var(--color-muted); }
.label { background: var(--color-ink); color: var(--color-paper); border: 1.5px solid var(--color-paper);
  box-shadow: inset 0 0 0 6px var(--color-ink), inset 0 0 0 7px var(--color-paper); }
.btn { border-radius: var(--radius-pill); padding: var(--space-sm) var(--space-lg); font-weight: 700; font-size: var(--text-sm);
  background: var(--color-accent); color: var(--color-accent-ink); }
.btn--secondary { background: transparent; color: var(--color-accent); border: 1.5px solid var(--color-accent); }
::selection { background: color-mix(in oklab, var(--color-accent) 30%, transparent); color: var(--color-ink); }
```
