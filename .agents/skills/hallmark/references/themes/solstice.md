---
name: Solstice
slug: solstice
genre: editorial
paper: light 94 80
display: high-contrast-serif Yeseva One
accent: warm 15
posture: restrained
keywords: farm, orchard, cider, winery, harvest, seasonal, food, almanac, produce, vineyard, calendar, market, craft drink, label, bottle, rural, slow, sun
material: cream paper with a ring of cream rays, warm brown ink, a low vermilion sun, gold hairlines, panels drawn as bottle labels
signature: a solid vermilion disc sitting in the empty centre of a ring of pale conic rays, with a label panel ruled in gold beside it
pictured: Stat-Led, Settled hero
---

# Solstice

Cream paper, Yeseva One heads, warm brown ink, a solid vermilion sun disc sitting in the empty centre of a ring of pale conic rays, gold hairlines doing the ruling, and panels drawn as bottle labels with an ink border and an inner gold rule.

## Tokens

```css
:root {
  --color-paper: oklch(94% 0.03 80); --color-paper-2: oklch(97% 0.02 85); --color-paper-3: oklch(89% 0.05 80);
  --color-ink: oklch(27% 0.05 50); --color-ink-2: oklch(36% 0.05 50); --color-muted: oklch(48% 0.06 55);
  --color-rule: oklch(89% 0.05 80);
  --color-accent: oklch(55% 0.20 15); --color-accent-ink: oklch(97% 0.02 85); --color-focus: oklch(55% 0.20 15);
  --color-gold: oklch(74% 0.14 75); --color-gold-2: oklch(84% 0.11 80);
  --font-display: "Yeseva One", serif; --font-body: "Archivo", ui-sans-serif, sans-serif;
  --font-outlier: "Archivo Narrow", ui-sans-serif, sans-serif;
  --radius-card: 0; --radius-pill: 999px; --rule-hair: 1px; --rule-bar: 2px;
  --shadow-card: 10px 10px 0 var(--color-paper-3);
  --tracking-display: -0.005em;
}
```

The sun is vermilion at hue 15, never clay; the gold is a hairline, never a fill. Three lights, stated in the stamp (`solstice: long-light`).

| Light | Paper and ink | Sun and gold |
| --- | --- | --- |
| **Long light** (default) | cream `oklch(94% 0.03 80)` under brown `oklch(27% 0.05 50)`; rays at 89% and 92% | vermilion `oklch(55% 0.20 15)`, gold `oklch(74% 0.14 75)` |
| **Dusk** | plum brown `oklch(27% 0.05 40)` under cream ink; label panels stay cream | the sun keeps `oklch(55% 0.20 15)` with cream text, gold `oklch(78% 0.14 80)` |
| **Midwinter** | frost `oklch(95% 0.012 230)` under cold brown `oklch(28% 0.03 260)`; rays go blue-white | the sun keeps its hue, gold goes pale `oklch(80% 0.06 230)` |

## Faces

- **Display:** Yeseva One 400, roman, line-height 1.0, `--tracking-display`; 50px for section heads, up to 84 for the page, 28 to 54 for figures, tabular. One colour per head.
- **Body:** Archivo 400 and 500, 16 to 17px, line-height 1.55, in ink-2.
- **Small print:** Archivo Narrow 600 at 12.5 to 13.5px, sentence case, untracked, the outlier, for dates, axis labels and months. Captions, meta and table heads: Archivo 500 one step smaller, sentence case. No mono.

## Material

- The rays: a repeating conic gradient of two creams, masked to a ring so the centre stays empty for the sun. One ring per page, never under running text; the theme's only surface treatment.
- The disc: a circle of the sun colour. As a badge it takes a 2px ink border and an inner ring of paper; a badge carries a fact, a date or a frame number, or does not appear. As the setting sun it is a half circle on a base line.
- The label: a panel with a `--rule-bar` ink border and an inner gold rule 6px in, centred text, a date in the serif with a gold rule under it; the one shadow is `--shadow-card`, hard.
- Rules `--rule-bar` ink across the top of a section, `--rule-hair` paper-3 between rows, 2px gold under a heading inside a panel. No radius on boxes; circles are circles and everything else is square.
- Drawings in ink with cream fills: a hill as one bezier with trees as circles, a bottle as a path; the sun is the one colour in them. Charts are hours of light: a gold rule ending in a sun.
- The control pair: a sun-filled button in Narrow 600 beside a plain 2px ink underline, no box.

## Motion

The sun moves and nothing else does. An hour slider carries the disc across the hill and turns the rays; a tab swaps the label; a month lights on hover. No reveal, no counters.

## Voice

The almanac: the hour of light, the pressing day, the orchard by name. Never a toast to the good life.

## Do-nots

- Never a second warm colour; a second orange makes a fruit stand.
- Never a neutral ink; a grey-black kills the cream.
- Never rays without an empty centre.
- Never a rounded card or a soft shadow; panels are labels.
- Never a sans or an italic display.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Yeseva+One&family=Archivo:wght@400;500&family=Archivo+Narrow:wght@600&display=swap" rel="stylesheet">
```

```css
.display { font: 400 var(--text-display)/1 var(--font-display); letter-spacing: var(--tracking-display); text-wrap: balance; }
.rays { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.rays::before { content: ""; position: absolute; width: 2600px; height: 2600px; right: -600px; top: -1300px; border-radius: 50%;
  background: repeating-conic-gradient(var(--color-paper-3) 0 4.5deg, transparent 4.5deg 9deg, color-mix(in oklab, var(--color-paper) 50%, var(--color-paper-3)) 9deg 12deg, transparent 12deg 18deg);
  mask: radial-gradient(circle, transparent 0 320px, var(--color-ink) 340px 1300px, transparent 1300px); }
.sun { display: inline-block; width: 1em; height: 1em; border-radius: 50%; background: var(--color-accent); }
.label { background: var(--color-paper-2); border: var(--rule-bar) solid var(--color-ink); outline: 1px solid var(--color-gold); outline-offset: -7px; text-align: center; box-shadow: var(--shadow-card); }
.small { font: 600 12.5px var(--font-outlier); color: var(--color-muted); }
.btn { padding: var(--space-md) var(--space-xl); font: 600 var(--text-sm)/1 var(--font-outlier); background: var(--color-accent); color: var(--color-accent-ink); }
.btn--secondary { background: none; color: var(--color-ink); padding: var(--space-lg) 0 var(--space-xs); border-bottom: var(--rule-bar) solid var(--color-ink); }
::selection { background: color-mix(in oklab, var(--color-gold) 40%, transparent); }
```
