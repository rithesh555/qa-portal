---
name: Terrazzo
slug: terrazzo
genre: modern-minimal
paper: light 96 80
display: geometric-sans Syne
accent: warm 35
posture: full-palette
keywords: materials, library, architects, samples, catalogue, surfaces, stone, timber, ceramic, interiors, interiors studio, showroom, specification, swatches, supplier, drawer, photography, tactile
material: off-white paper, wide geometric caps, flat terrazzo chips in rust, ochre, olive and navy scattered from a corner, one black drawer band
signature: a scatter of eleven-pixel chips drifting in from one corner of a section, and an ink band that holds the sample drawers
pictured: Stat-Led, Ledge hero
---

# Terrazzo

Off-white paper, Syne 800 heads, an Onest body, a scatter of 11px flat chips in rust, ochre, olive and navy drifting in from one corner of a section, and one ink band holding the sample drawers. Controls are ink; colour is aggregate.

## Tokens

```css
:root {
  --color-paper: oklch(96% 0.01 80); --color-paper-2: oklch(92% 0.013 80); --color-paper-3: oklch(88% 0.015 80);
  --color-plate: oklch(99.5% 0.003 80);
  --color-ink: oklch(15% 0.005 60); --color-ink-2: oklch(26% 0.006 60); --color-muted: oklch(47% 0.01 60);
  --color-rule: oklch(82% 0.012 80);
  --color-accent: oklch(54% 0.15 35); --color-accent-ink: oklch(99.5% 0.003 80); --color-focus: oklch(38% 0.08 260);
  --color-chip-ochre: oklch(78% 0.14 85); --color-chip-olive: oklch(62% 0.09 140); --color-chip-navy: oklch(38% 0.08 260); --color-chip-grey: oklch(72% 0.01 80);
  --font-display: "Syne", ui-sans-serif, sans-serif; --font-body: "Onest", ui-sans-serif, sans-serif;
  --font-outlier: "JetBrains Mono", ui-monospace, monospace;
  --radius-card: 0; --radius-pill: 0; --rule-hair: 1px; --rule-bar: 2px;
  --shadow-card: 16px 16px 0 var(--color-paper-2);
  --tracking-display: -0.02em;
}
```

Three drawers, stated in the stamp (`terrazzo: off-white`).

| Drawer | Paper and ink | Chips |
| --- | --- | --- |
| **Off-white** (default) | `oklch(96% 0.01 80)` under near-black ink | rust, ochre, olive, navy and grey |
| **Black drawer** | `oklch(14% 0.005 60)` under bone ink `oklch(96% 0.01 80)`; plates stay white | ochre `oklch(80% 0.14 85)` and bone only; ochre takes the controls with the black ink as their text |
| **Stone** | warm grey `oklch(85% 0.012 80)` under the same ink, `--rule-bar` ink rules on the nav | rust and navy only, chips larger and fewer |

## Faces

- **Display:** Syne 800, `--tracking-display`, line-height 1.02, roman, sentence case. Heads stay short and under 88px; one giant wordmark is the exception.
- **Body:** Onest 400 and 500, 16 to 19px, line-height 1.5.
- **Labels, captions, table heads, meta:** Onest 500 one step smaller, sentence case. JetBrains Mono 500 at 11 to 13px sets sample codes, dimensions and spec figures; never a label or a heading.

## Material

- The chips: 11px flat shapes (a dot, a square turned 14 degrees, a triangle, a hexagon) in the four chip inks plus grey, absolutely positioned inside a section, arriving from one corner and thinning toward the content. At most two scatters per viewport, never under running text, never a page-wide field. The chips are the texture; no grain.
- Rules `--rule-bar` ink on the top of a table and around a framed object; `--rule-hair` paper-2 between rows. Radius 0 everywhere; only a dot chip is round.
- Shadow: a hard `16px 16px 0` in paper-2 under a framed object, no blur.
- The control pair: an ink-filled primary with paper text beside a `--rule-bar` inset ink outline. Nothing coloured is a button on off-white paper.
- The object family is the drawer: a sample card (a photo slot, a code in mono, its facts as a `<dl>`), a drawer front (a pull bar and a label strip), a cabinet inside an ink band, a table where each row carries its chips as bullets.
- Rust is the accent and the only chip ink that reaches a figure or a highlighted row; ochre, olive and navy live in chips. Coloured area stays under a twentieth of any screen.

## Motion

Still. A card's border lifts to ink on hover, a drawer's pull bar slides 4px; the chips never move. Nothing reveals.

## Voice

A catalogue's plainness: the count, the drawer, the code, the size at one to one. Never sells the feeling of stone.

## Do-nots

- Never chips under body copy or across a heading.
- Never a photograph of terrazzo as a background; the photo lives in a slot.
- Never a coloured primary on off-white paper; controls are ink, colour is aggregate.
- Never rounded corners on cards, buttons or chips other than dots.
- Never mono on a label; mono is the sample code and the millimetres.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Onest:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

```css
.display { font: 800 var(--text-display)/1.02 var(--font-display); letter-spacing: var(--tracking-display); text-wrap: balance; }
.chips { position: absolute; inset: 0; pointer-events: none; }
.chip { position: absolute; width: 11px; height: 11px; background: var(--color-accent); }
.chip--ochre { background: var(--color-chip-ochre); } .chip--olive { background: var(--color-chip-olive); } .chip--navy { background: var(--color-chip-navy); }
.chip--dot { border-radius: 50%; } .chip--sq { rotate: 14deg; } .chip--tri { clip-path: polygon(50% 0, 100% 100%, 0 100%); }
.chip--hex { clip-path: polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0 50%); }
.btn { padding: var(--space-md) var(--space-lg); font: 500 15px/1.25 var(--font-body); border-radius: 0; }
.btn--primary { background: var(--color-ink); color: var(--color-paper); }
.btn--secondary { box-shadow: inset 0 0 0 var(--rule-bar) var(--color-ink); color: var(--color-ink); }
.drawer-band { background: var(--color-ink); color: var(--color-paper); padding: var(--space-md); }
.frame { background: var(--color-plate); border: var(--rule-bar) solid var(--color-ink); box-shadow: var(--shadow-card); }
.code { font: 500 12px var(--font-outlier); color: var(--color-muted); }
::selection { background: color-mix(in oklab, var(--color-chip-ochre) 45%, transparent); }
```
