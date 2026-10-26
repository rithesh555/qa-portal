---
name: Loom
slug: loom
genre: editorial
paper: light 95 85
display: roman-serif Libre Caslon Text
accent: cool 275
posture: committed
keywords: weaving, textile, linen, wool, weaving studio, cloth, craft, atelier, handmade, natural, indigo, fabric, by the metre, workshop, maker, slow, commission, interiors, samples
material: ecru paper with a Caslon, a deep indigo, sand and oat as cloth colours, thin rules, a comb of 1px threads as the texture
signature: a bar of indigo threaded with 1px vertical lines at a 12px pitch, carrying the headline of the section
pictured: Narrative Workflow, Stage hero
---

# Loom

Ecru paper, a Caslon head over a Hanken Grotesk body, one deep indigo that arrives as a band, a bar or a button and never as a wash, and a comb of 1px vertical threads at a 12px pitch as the only texture. Sand (`--color-paper-3`) and oat are the other cloths and appear only as swatches.

## Tokens

```css
:root {
  --color-paper: oklch(95% 0.015 85); --color-paper-2: oklch(92% 0.02 85); --color-paper-3: oklch(84% 0.03 80);
  --color-ink: oklch(20% 0.01 60); --color-ink-2: oklch(30% 0.012 60); --color-muted: oklch(45% 0.012 60);
  --color-rule: oklch(84% 0.02 85); --color-thread: oklch(87% 0.02 85); --color-oat: oklch(76% 0.04 80);
  --color-accent: oklch(38% 0.15 275); --color-accent-2: oklch(46% 0.16 275); --color-accent-ink: oklch(95% 0.015 85); --color-focus: oklch(46% 0.16 275);
  --font-display: "Libre Caslon Text", "Times New Roman", serif; --font-body: "Hanken Grotesk", ui-sans-serif, system-ui, sans-serif;
  --font-outlier: "DM Mono", ui-monospace, monospace;
  --radius-card: 0; --radius-pill: 0; --rule-hair: 1px;
  --shadow-card: 0 18px 30px oklch(20% 0.01 60 / 0.12);
  --tracking-display: -0.015em;
}
```

Three colourways, set once per page and named in the stamp (`loom: ecru`).

| Colourway | Paper, ink, indigo |
| --- | --- |
| `ecru` (default) | the block above |
| `indigo` | paper `oklch(36% 0.15 275)`, ink ecru `oklch(95% 0.015 85)`, rule `oklch(52% 0.13 275)`, threads `oklch(44% 0.14 275)`; the button turns ecru with indigo text |
| `oat` | paper `oklch(88% 0.04 80)`, ink `oklch(15% 0.01 60)`, rules in the ink at 1px, indigo `oklch(40% 0.15 275)` kept to a line and a button |

## Faces

- **Display:** Libre Caslon Text 400, `--tracking-display`, line-height 1.04, up to 5.5rem; the wordmark at 28px; step numerals to 68px. Roman; the italic exists for a cloth's name in running text only.
- **Body:** Hanken Grotesk 400 and 500 at 16px, line-height 1.5; subheads at 19px in `--color-muted`.
- **Labels, captions, tags, table heads:** Hanken Grotesk 500 at 12 to 13px, sentence case, untracked, in `--color-muted`. DM Mono is kept only for figures that compare in a row (yarn counts, grams per metre, metres left on the beam) and for code.

## Material

- 1px rules: `--color-rule` under heads and between list rows, the ink at 1px above a list's first row. No card borders except the sample card, which has a 1px dashed rule.
- The comb: `repeating-linear-gradient(90deg, thread 0 1px, transparent 1px 12px)`, in `--color-thread` on paper and in ecru at 16% over indigo. It sits on a band, a bar or a loom drawing; never the whole page.
- Swatches drawn, not photographed: horizontal stripes of two tones at a 3px and 2px rhythm in SVG (sand and paper for linen, oat and ecru for wool, indigo and indigo-2 for the dyed cloths), bordered with the hairline. The loom is stacked bars and a comb of threads.
- Zero radius, one shadow: `--shadow-card` only under cloth that hangs from a rail. Flat everywhere else; depth is `--color-paper-2` as a band.
- The control pair: an indigo-filled square button in Hanken Grotesk 500 at 14px beside a text link with a 2px bottom border in the text colour. On indigo, the button is ecru.
- The indigo bar: a 32px strip of `--color-accent` under a step's numeral, the theme's smallest object; its largest is the same bar grown to a section-height band with the comb on it.

## Motion

Nothing moves except state. Hover raises a link's 2px underline into `--color-accent`; a swatch that is a link shifts its stripes one step on hover, over `--dur-short` on `--ease-out`, once.

## Voice

The studio speaking plainly: the cloth, the width, the days per stage, the Saturday. Weights and counts stated, nothing sold hard.

## Do-nots

- Never indigo as a page wash or a tint on the ecru colourway; it is a band, a bar or a button.
- Never a mono label voice; the yarn counts earn the mono, the captions do not.
- Never a photo-textured linen background; the texture is the comb, drawn in one gradient.
- Never a warm accent (rust, clay, terracotta) next to the ecru; sand and oat are cloth colours, not accents.
- Never a radius or a soft card; Loom is rules and bars.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Libre+Caslon+Text:ital,wght@0,400;1,400&family=Hanken+Grotesk:wght@400;500&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
```

```css
.display { font: 400 var(--text-display)/1.04 var(--font-display); letter-spacing: var(--tracking-display); text-wrap: balance; }
.label { font: 500 12px/1.3 var(--font-body); color: var(--color-muted); }
.count { font: 500 12px/1 var(--font-outlier); font-variant-numeric: tabular-nums; }
.comb { background-image: repeating-linear-gradient(90deg, var(--color-thread) 0 1px, transparent 1px 12px); }
.band { background: var(--color-accent) repeating-linear-gradient(90deg, color-mix(in oklab, var(--color-paper) 16%, transparent) 0 1px, transparent 1px 12px); color: var(--color-accent-ink); }
.btn { display: inline-flex; align-items: center; padding: var(--space-md) var(--space-lg); font: 500 var(--text-sm)/1 var(--font-body); background: var(--color-accent); color: var(--color-accent-ink); }
.link { font-weight: 500; font-size: var(--text-sm); padding: var(--space-2xs) 0; border-bottom: 2px solid currentColor; }
.sample { border: 1px dashed var(--color-rule); }
.bar { height: 32px; background: var(--color-accent); color: var(--color-accent-ink); display: flex; align-items: center; padding: 0 var(--space-sm); }
::selection { background: color-mix(in oklab, var(--color-accent) 25%, transparent); }
```
