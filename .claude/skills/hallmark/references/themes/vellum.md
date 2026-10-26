---
name: Vellum
slug: vellum
genre: editorial
paper: light 93 80
display: blackletter Grenze Gotisch
accent: cool 275
posture: committed
keywords: roastery, coffee, bakery, wine, cellar, apothecary, bookshop, press, letterpress, guild, heritage, artisan, manuscript, parchment, edition, tasting, vintage, craft, old world, slow
material: parchment with a fibre wash, gothic display lettering, ultramarine ink, double rules, a woodcut seal and a tilted stamp
signature: the wordmark set edge to edge above a double rule, with one woodcut seal and one tilted rubber stamp on the page
pictured: Marquee Hero, Poster hero
---

# Vellum

Parchment under a fibre wash, Grenze Gotisch lettering at poster size, ultramarine as the one pigment, hairlines and double rules for the ruling, a woodcut seal that carries a date and a stamp at a tilt that carries the lot.

## Tokens

```css
:root {
  --color-paper: oklch(93% 0.025 80); --color-paper-2: oklch(89% 0.03 78); --color-paper-3: oklch(85% 0.032 76);
  --color-ink: oklch(22% 0.02 60); --color-ink-2: oklch(30% 0.02 60); --color-muted: oklch(46% 0.02 65);
  --color-rule: oklch(74% 0.03 75);
  --color-accent: oklch(42% 0.16 275); --color-accent-deep: oklch(34% 0.15 275); --color-accent-ink: oklch(94% 0.02 80);
  --color-focus: oklch(50% 0.17 275);
  --font-display: "Grenze Gotisch", serif; --font-body: "Hanken Grotesk", ui-sans-serif, sans-serif;
  --font-outlier: "IBM Plex Mono", ui-monospace, monospace;
  --radius-card: 2px; --radius-pill: 2px; --rule-hair: 1px; --shadow-card: none;
  --tracking-display: -0.01em; --fibre: 0.7;
}
```

Three colourways, stated in the stamp (`vellum: parchment`).

| Colourway | Ground, ink, pigment |
| --- | --- |
| **parchment** (default) | the tokens above, fibre at 0.7 |
| **oxblood, reversed** | ground `oklch(27% 0.09 20)`, ink `oklch(94% 0.02 80)`, pigment gold `oklch(84% 0.11 85)` with the ground as its text, rule `oklch(44% 0.08 20)`, fibre at 0.25 |
| **indigo, the ledger** | ground `oklch(93% 0.012 240)`, ink `oklch(24% 0.035 265)`, the same ultramarine, rule `oklch(76% 0.02 250)`, fibre at 0.14 |

## Faces

- **Display:** Grenze Gotisch 600 for the wordmark and heads, line-height 0.92, `--tracking-display`; 400 for the big figures. The face carries the gothic; nothing else is ornamented.
- **Body:** Hanken Grotesk 400 and 500 at 16px, line-height 1.5. Nav links are 600.
- **Labels, captions, table heads, meta:** Hanken Grotesk 500 one step smaller, sentence case. IBM Plex Mono sets only the ledger's comparing figures (prices, weights, lots) and code.

## Material

- One texture: the fibre wash, an SVG turbulence tinted tan, multiplied over the ground at `--fibre` (`texture.md` § 1). No deckle, no vignette, no burn.
- Rules: 1px `--color-rule` hairlines inside tables, 1px ink on a section's top, and `4px double` ink above an index or a colophon.
- Radius 2px everywhere, no pills, no shadows; the stamp's register ring is a `box-shadow` of ground then pigment, a print, not a lift.
- The control pair: a pigment-filled primary with parchment text beside a ghost with a 1px ink border, both 2px radius.
- Objects: the edge-to-edge wordmark over its double rule, the pigment band (a full-bleed accent block with an inset double keyline), the ledger (row numbers at 30px in pigment, headed No., tabular figures right-aligned), the day strip (ruled boxes with display numerals), the woodcut seal (text on a circle path) and one stamp at -7°. A stamp or a seal carries a fact, a date or a frame number, or does not appear.

## Motion

Still. A hover underline in pigment, the primary deepening to `--color-accent-deep`, nothing else; no reveals, no parallax on the wash.

## Voice

Ledger-plain and dated: the item, the price paid, the hour, the room. Never *artisanal*, never *curated*.

## Do-nots

- Never clay, terracotta or oxblood as the pigment on parchment; oxblood is a ground only.
- Never Grenze Gotisch below 30px or at paragraph length.
- Never a torn edge, a coffee ring, a burn or a second texture.
- Never pills, soft shadows or a lifted card; the page is printed flat.
- Never a nav, a folio or a caption in mono; mono is the ledger's figures.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Grenze+Gotisch:wght@400;600&family=Hanken+Grotesk:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
```

```css
body { position: relative; isolation: isolate; }
body::before { content: ""; position: absolute; inset: 0; z-index: -1; opacity: var(--fibre); mix-blend-mode: multiply; pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.012 0.02' numOctaves='3' seed='4'/%3E%3CfeColorMatrix values='0 0 0 0 0.62 0 0 0 0 0.52 0 0 0 0 0.36 0 0 0 0.35 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)'/%3E%3C/svg%3E"); }
.display { font-family: var(--font-display); font-weight: 600; line-height: 0.92; letter-spacing: var(--tracking-display); }
.wordmark { text-align: center; font-size: clamp(84px, 11vw, 160px); line-height: 0.82; }
.index { border-top: 4px double var(--color-ink); border-bottom: 1px solid var(--color-ink); padding: var(--space-sm) 0; }
.btn { border: 1px solid var(--color-accent); background: var(--color-accent); color: var(--color-accent-ink); border-radius: var(--radius-card); padding: var(--space-sm) var(--space-lg); font-weight: 500; }
.btn--ghost { background: transparent; border-color: var(--color-ink); color: var(--color-ink); }
.stamp { display: inline-block; transform: rotate(-7deg); padding: var(--space-xs) var(--space-sm); font-size: var(--text-xs); text-align: center; color: var(--color-accent);
  border: 1.5px solid var(--color-accent); border-radius: 2px; box-shadow: 0 0 0 2px var(--color-paper), 0 0 0 3px var(--color-accent); }
.ledger .num { font-family: var(--font-outlier); font-variant-numeric: tabular-nums; text-align: right; }
::selection { background: color-mix(in oklab, var(--color-accent) 22%, transparent); }
```
