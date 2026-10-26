---
name: Almanac
slug: almanac
genre: editorial
paper: mid 84 245
display: grotesk-sans Hanken Grotesk
accent: cool 250
posture: restrained
keywords: almanac, yearbook, field guide, reference, handbook, manual, index, catalogue, encyclopedia, data, figures, tables, statistics, research, dataset, records, directory, glossary, specifications
material: cool slate stock, two rule weights, Hanken Grotesk heads over Newsreader prose, tabular figures in mono, one library-stamp blue
signature: a hairline table with one firm rule under its head and figures lined up to the decimal
pictured: Spec Sheet, Settled hero
---

# Almanac

Cool slate stock ruled in two weights, Hanken Grotesk heads over Newsreader prose, mono figures lined up to the decimal, and one deep ink-blue that stays a stamp. The signature is the table: hairline rows under one firm rule beneath the head.

## Tokens

```css
:root {
  --color-paper: oklch(84% 0.012 245); --color-paper-2: oklch(81% 0.012 245); --color-paper-3: oklch(77% 0.012 245);
  --color-ink: oklch(16% 0.020 245); --color-ink-2: oklch(24% 0.018 245); --color-muted: oklch(38% 0.016 245);
  --color-rule: oklch(74% 0.012 240); --color-rule-2: oklch(38% 0.018 240);
  --color-accent: oklch(38% 0.135 250); --color-accent-ink: oklch(96% 0.006 245); --color-focus: oklch(38% 0.135 250);
  --font-display: "Hanken Grotesk", ui-sans-serif, system-ui, sans-serif;
  --font-body: "Newsreader", ui-serif, Georgia, serif;
  --font-outlier: "IBM Plex Mono", ui-monospace, monospace;
  --radius-card: 0; --radius-pill: 2px; --rule-hair: 1px; --rule-bar: 2px; --shadow-card: none;
  --tracking-display: -0.014em;
}
```

## Faces

- **Display:** Hanken Grotesk 600, `--tracking-display`, roman. Grotesk sets structure.
- **Body:** Newsreader 400 and 500 with optical sizing at a 64ch measure; italic is in-paragraph emphasis only.
- **Labels, captions, table heads, meta:** Newsreader 500 one step smaller, sentence case, in `--color-muted`. Never mono.
- **Figures and tables:** IBM Plex Mono 400 and 500 with `tabular-nums`, right-aligned, decimals lined up. Mono sets numerals that compare and nothing else.

## Material

- Two rule weights: `--rule-hair` draws the grid and separates rows; `--rule-bar` in `--color-rule-2` draws one firm line under a head or a `thead`. No boxed cards, no shadows; depth is rules.
- Square corners, 2px at most on a control; no texture. Ruled paper, not a card surface.
- The control pair: an ink-blue filled control with `--color-accent-ink` text beside a hairline-outlined control in ink. Otherwise the accent is a link or one figure.
- The object family is the table: hairline rows alternating on `--color-paper-2`, a firm head rule, numeric columns in mono. An index, a directory and a specification sheet are all this table.
- Images are small, hairline-outlined, inline to the measure; they never outgrow the type.

## Motion

Nothing moves except state: a row that links tints on hover, a link underlines. No reveal, no count-up, no marquee.

## Voice

Declarative, dated, exact: cite the figure, the edition, the source, the unit. Never a hype adjective.

## Do-nots

- Never an electric blue; the signal stays at L 38, a stamp rather than a live link colour.
- Never warm or white paper; slate at hue 245, always tinted.
- Never a boxed card or a drop shadow; two rule weights carry every surface.
- Never justified columns; ragged-right throughout.
- Never a chart where a table would do; the figure is the material.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@600&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
```

```css
body { background: var(--color-paper); color: var(--color-ink-2); font-family: var(--font-body); }
h1, h2, h3 { font-family: var(--font-display); font-weight: 600; letter-spacing: var(--tracking-display); color: var(--color-ink); }
thead th { border-bottom: var(--rule-bar) solid var(--color-rule-2); font: 500 var(--text-sm)/1.3 var(--font-body); text-align: left; }
td { border-top: var(--rule-hair) solid var(--color-rule); }
td.num { font-family: var(--font-outlier); font-variant-numeric: tabular-nums; text-align: right; }
tbody tr:nth-child(even) { background: var(--color-paper-2); }
.label { font: 500 var(--text-xs)/1.3 var(--font-body); color: var(--color-muted); }
a { color: var(--color-accent); text-underline-offset: 0.15em; }
::selection { background: color-mix(in oklab, var(--color-accent) 22%, transparent); }
```
