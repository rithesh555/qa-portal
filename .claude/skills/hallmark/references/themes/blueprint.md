---
name: Blueprint
slug: blueprint
genre: modern-minimal
paper: mid 36 255
display: geometric-sans Chakra Petch
accent: neutral 240
posture: drenched
keywords: architecture, architect, engineering, construction, structural, interiors, planning, surveying, cad, drafting, fabrication, prefab, developer, technical, spec, permit, renovation, build, drawings, architecture studio
material: prussian-blue sheet under a two-pitch grid, white line drawing, a fixed title block, dimension strings and hatch fills
signature: the fixed title block in the sheet's corner, with every figure on the page dimensioned like a drawing
pictured: Bento Grid set as one drawing sheet, Stage hero
---

# Blueprint

A Prussian-blue sheet under a two-pitch grid, a white line for ink, Chakra Petch drafted capitals, dimension strings with units and keylines instead of cards. The signature is the fixed title block in the sheet's corner.

## Tokens

```css
:root {
  --color-paper: oklch(36% 0.10 255); --color-paper-2: oklch(32% 0.10 255); --color-paper-3: oklch(28% 0.10 257);
  --color-ink: oklch(97% 0.01 240); --color-ink-2: oklch(90% 0.02 240); --color-muted: oklch(80% 0.04 240);
  --color-rule: oklch(92% 0.02 240 / 0.85); --color-rule-2: oklch(92% 0.02 240 / 0.35);
  --color-grid: oklch(97% 0.01 240 / 0.10); --color-grid-2: oklch(97% 0.01 240 / 0.22);
  --color-accent: oklch(97% 0.01 240); --color-accent-ink: oklch(36% 0.10 255); --color-focus: oklch(97% 0.01 240);
  --font-display: "Chakra Petch", ui-sans-serif, sans-serif; --font-body: "IBM Plex Sans", ui-sans-serif, sans-serif;
  --font-outlier: "IBM Plex Mono", ui-monospace, monospace;
  --radius-card: 0; --radius-pill: 0; --rule-hair: 1px; --shadow-card: none;
  --tracking-display: -0.01em; --sheet-inset: 20px;
}
```

Three sheets, stated in the stamp (`blueprint: cyanotype`).

| Sheet | Ground, line, grain |
| --- | --- |
| **cyanotype** (default) | the tokens above; grain at 0.45, overlay |
| **whiteprint** | ground `oklch(97.5% 0.006 240)`, ink `oklch(36% 0.10 255)`, muted `oklch(52% 0.07 255)`; grain at 0.28, multiply |
| **brownline** | ground `oklch(86% 0.045 80)`, ink `oklch(28% 0.05 50)`, muted `oklch(45% 0.05 55)`, a red pencil `oklch(45% 0.19 28)` for mark-up notes only; grain at 0.35, multiply |

## Faces

- **Display:** Chakra Petch 600 uppercase, line-height 1.02 (55a), `--tracking-display`, roman, one weight per head; a whole second line at 300 is the contrast, never one word. Chakra Petch 500 at 12 to 13px, sentence case, is the lettering inside the title block only.
- **Body:** IBM Plex Sans 300 for prose, 500 under 16px.
- **Labels, captions, table heads, meta:** IBM Plex Sans 500 one step smaller, sentence case. IBM Plex Mono sets a dimension string (a value with its unit), coordinates, revision numbers and code, nothing else.

## Material

- The sheet: four linear gradients draw the grid, 24px minor at `--color-grid` and 120px major at `--color-grid-2`, offset by `--sheet-inset`; a fixed turbulence overlay at 0.45 (texture.md § 1) is the last texture.
- Lines only: 1px `--color-rule` keylines on every surface, a second keyline 5px inside on figures, hatch fills from SVG patterns for a ground plane or a cut wall. Radius 0, no shadows; depth is a second line or a one-step darker ground.
- The control pair: a 1px-outlined secondary beside an ink-filled primary with sheet-coloured text, both 0 radius in the body face.
- Objects: the title block (1px-divided cells in the lettering), dimension strings (a thin line with end ticks and a mono value), the drawing index, a schedule drawn as ruled rows and a key map; a placeholder is a radial wash under a stroke-only elevation.
- The line is the accent: white on blue. Emphasis is a thicker line or a filled shape, never a second hue on the cyanotype sheet.

## Motion

Static, drafted. A dimension line may draw itself on entry (scaleX from the left over `--dur-long` on `--ease-out`) once per page; hover on a keylined surface that links darkens the ground one step.

## Voice

Specification voice: the metre, the fee, the week, the drawing number, a unit on every figure.

## Do-nots

- Never a filled card, a blur or a lifted panel; the sheet has lines, not layers.
- Never a second colour on the cyanotype; the red pencil belongs to the brownline sheet.
- Never lowercase display; the contrast is a 300 line, never a 300 word.
- Never a photo bleeding over the grid; images sit inside a double-keyline figure.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@300;500;600&family=IBM+Plex+Sans:wght@300;500&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
```

```css
body { background-color: var(--color-paper); background-position: var(--sheet-inset) var(--sheet-inset); background-size: 120px 120px, 120px 120px, 24px 24px, 24px 24px;
  background-image: linear-gradient(var(--color-grid-2) 1px, transparent 1px), linear-gradient(90deg, var(--color-grid-2) 1px, transparent 1px), linear-gradient(var(--color-grid) 1px, transparent 1px), linear-gradient(90deg, var(--color-grid) 1px, transparent 1px); }
.display { font-family: var(--font-display); font-weight: 600; text-transform: uppercase; line-height: 1.02; letter-spacing: var(--tracking-display); }
.title-block { position: fixed; right: var(--sheet-inset); bottom: var(--sheet-inset); display: flex; border: 1px solid var(--color-rule); background: var(--color-paper); }
.fig { position: relative; border: 1px solid var(--color-rule); padding: var(--space-lg); }
.fig::before { content: ""; position: absolute; inset: 5px; border: 1px solid var(--color-rule-2); pointer-events: none; }
.dim { font-family: var(--font-outlier); font-size: var(--text-xs); color: var(--color-muted); font-variant-numeric: tabular-nums; }
.btn { border: 1px solid var(--color-rule); color: var(--color-ink); background: transparent; padding: var(--space-sm) var(--space-lg); font-weight: 500; }
.btn--primary { background: var(--color-ink); color: var(--color-accent-ink); border-color: var(--color-ink); }
::selection { background: color-mix(in oklab, var(--color-ink) 28%, transparent); }
```
