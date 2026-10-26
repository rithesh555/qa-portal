---
name: Saffron
slug: saffron
genre: editorial
paper: mid 72 82
display: high-contrast-serif Zodiak Italic
accent: chromatic-amber 78
posture: drenched
keywords: couture, atelier, fashion, collection, season, dye, textile, silk, wool, linen, garment, fitting, boutique, lookbook, designer, luxury, slow fashion, craft, stockists
material: a whole page dyed mustard saffron, near-black ink, cream plates, Zodiak Italic on every head, a cropped giant letterform
signature: one enormous italic letter cropped by the section edge in a deeper saffron, with cream plates numbered along the fold
pictured: Catalogue, Stage hero
---

# Saffron

A page dyed saffron edge to edge, near-black ink, cream plates, Zodiak Italic 400 on every head, Newsreader for the reading and Hanken Grotesk at 13px for the labels. One giant italic letter in a deeper saffron is cropped by a section's edge.

## Tokens

```css
:root {
  --color-paper: oklch(72% 0.14 82); --color-paper-2: oklch(67% 0.14 80); --color-paper-3: oklch(60% 0.13 78);
  --color-ink: oklch(17% 0.012 70); --color-ink-2: oklch(24% 0.02 72); --color-muted: oklch(28% 0.04 75);
  --color-rule: oklch(40% 0.06 75); --color-plate: oklch(95% 0.035 88);
  --color-accent: oklch(60% 0.13 78); --color-accent-ink: oklch(17% 0.012 70); --color-focus: oklch(17% 0.012 70);
  --font-display: "Zodiak", Georgia, "Times New Roman", serif; --font-body: "Newsreader", Georgia, serif; --font-outlier: "Hanken Grotesk", ui-sans-serif, system-ui, sans-serif;
  --radius-card: 0; --radius-pill: 0; --rule-hair: 1px;
  --shadow-card: none;
  --tracking-display: -0.01em;
}
```

Three colourways, set once per page and named in the stamp (`saffron: lot`).

| Colourway | Ground, ink, plate |
| --- | --- |
| `lot` (default) | the block above |
| `cream` | ground `oklch(95% 0.035 88)`, ink unchanged, plates turn saffron `oklch(72% 0.14 82)`, rule `oklch(80% 0.05 85)`, muted `oklch(42% 0.03 75)` |
| `black` | ground `oklch(15% 0.012 70)`, heads in saffron `oklch(72% 0.14 82)`, prose in `oklch(92% 0.03 88)`, plates cream, rule `oklch(32% 0.04 75)` |

## Faces

- **Display:** Zodiak Italic 400, `--tracking-display`, line-height 1.04, up to 5rem. Declared italic system (stamp `waive 38ii`): on `--font-display`, every head at every level, true italic, `font-synthesis: none`. Figures (grams, hours, plate numbers) are the one roman use, Zodiak 700, and never sit inside a head.
- **Body:** Newsreader 400 and 500 at 17px, line-height 1.5, `"opsz" 16`.
- **Labels, nav links, buttons, captions, table heads:** Hanken Grotesk 500 at 13px, sentence case, untracked, in `--color-muted`. The sans is the outlier and carries only the small strings and the controls; never a head, never prose. No mono anywhere but code.

## Material

- 1px ink rules: under a nav, under section heads, between table rows and as the left edge of a column. No borders on plates; a plate is a cream rectangle on saffron, or a saffron one on cream.
- Zero radius and no shadow. Depth is a step of saffron: `--color-paper-2` for a band, `--color-paper-3` for the giant letter.
- The giant letterform: one italic character (a letter of the name, an ampersand) at 600 to 1200px in `--color-paper-3`, positioned past a section's edge and cropped by it, `pointer-events: none`. One per page.
- Numbered plates: cream rectangles carrying a two-digit figure in the roman at 700 and an italic title; a plate may be black with saffron type. Plates waiting for their garments are slots by design: stamp `waive 68` and say whose they are; the plate number carries `data-keep` so it stays when the photograph lands.
- The cloth placeholder: a 162deg linear gradient from pale straw to saffron with a 1px thread grid at 3.5% ink drawn over it and a bold roman figure in its corner. Never a photo of nothing.
- The control pair: an ink-filled square button beside a 1px-inset outlined one, both Hanken Grotesk 500 at 13px, sentence case; inline links are underlined by a 1px bottom border in the text colour.

## Motion

Almost none. One hairline draws in over `--dur-long` as its section enters; the giant letter is fixed. A plate lifts to `--color-paper-2` behind it on hover.

## Voice

The atelier's register: the piece, the cloth weight, the bath, the hour of the fitting. Precise, unhurried, in the first person plural.

## Do-nots

- Never a roman head; the italic is the system.
- Never a warm brown or terracotta button on the cream colourway; the pair is ink and outline.
- Never a card border, a shadow or a radius; plates are flat colour on flat colour.
- Never the sans at prose or head size; it exists at 13px.

## Build hint

```html
<link href="https://api.fontshare.com/v2/css?f[]=zodiak@400i,700&display=swap" rel="stylesheet"><link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Hanken+Grotesk:wght@500&display=swap" rel="stylesheet">
```

```css
.display, h1, h2, h3 { font-family: var(--font-display); font-style: italic; font-weight: 400; font-synthesis: none; letter-spacing: var(--tracking-display); line-height: 1.04; text-wrap: balance; }
.figure { font-family: var(--font-display); font-style: normal; font-weight: 700; }
.label { font: 500 var(--text-xs)/1.3 var(--font-outlier); color: var(--color-muted); }
.btn { display: inline-flex; padding: var(--space-md) var(--space-lg); font: 500 var(--text-xs)/1 var(--font-outlier); background: var(--color-ink); color: var(--color-paper); }
.btn--secondary { background: transparent; color: var(--color-ink); box-shadow: inset 0 0 0 1px var(--color-ink); }
.plate { background: var(--color-plate); color: var(--color-ink); }
.letter { position: absolute; right: -80px; top: -210px; font: italic 400 1150px/1 var(--font-display); color: var(--color-paper-3); pointer-events: none; user-select: none; }
.cloth { background: linear-gradient(162deg, var(--color-plate) 0%, color-mix(in oklab, var(--color-plate) 70%, var(--color-paper)) 55%, color-mix(in oklab, var(--color-plate) 35%, var(--color-paper)) 100%); }
::selection { background: var(--color-ink); color: var(--color-paper); }
```
