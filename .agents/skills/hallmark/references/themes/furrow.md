---
name: Furrow
slug: furrow
genre: modern-minimal
paper: light 96.5 90
display: grotesk-sans Red Hat Display
accent: warm 40
posture: committed
keywords: farm, agriculture, land, field, livestock, crop, records, compliance, fleet, field service, rural, contractor, hectares, yard, outdoors, seasonal, working, units
material: warm office paper, an ink-ruled ledger, Red Hat Display at 600, one tangerine record mark and a yellow ear tag
signature: the ledger row, a mono time first and a chip last, under a single ink rule
pictured: Workbench, Stage hero
---

# Furrow

Warm office paper, an ink rule over every list, Red Hat Display 600 over Red Hat Text, tangerine for the record and green for what is growing, a yellow ear tag for an animal. The signature is the ledger row: a mono time first and a chip last, under a single ink rule.

## Tokens

```css
:root {
  --color-paper: oklch(96.5% 0.008 90); --color-paper-2: oklch(99.5% 0.005 90); --color-paper-3: oklch(92.5% 0.012 90);
  --color-ink: oklch(18% 0.005 60); --color-ink-2: oklch(28% 0.008 60); --color-muted: oklch(44% 0.010 60); --color-rule: oklch(89% 0.010 90);
  --color-accent: oklch(70% 0.19 40); --color-accent-ink: oklch(18% 0.005 60); --color-focus: oklch(62% 0.19 40);
  --color-green: oklch(50% 0.11 150); --color-tag: oklch(88% 0.17 95); --color-tag-ink: oklch(30% 0.06 90);
  --font-display: "Red Hat Display", "Red Hat Text", ui-sans-serif, sans-serif; --font-body: "Red Hat Text", ui-sans-serif, system-ui, sans-serif;
  --font-outlier: "JetBrains Mono", ui-monospace, monospace;
  --radius-card: 10px; --radius-pill: 6px; --rule-hair: 1px;
  --shadow-card: 0 10px 24px -14px oklch(18% 0.005 60 / 0.2);
  --tracking-display: -0.04em; --display-weight: 600;
}
```

## Faces

- **Display:** Red Hat Display 600, `--tracking-display`, line-height 1.0, up to 4rem. One weight and one colour per head.
- **Body:** Red Hat Text 400 at 16px, line-height 1.55, in `--color-muted`; Red Hat Text 500 for row titles.
- **Labels, captions, table heads, chips, meta:** Red Hat Text 500 one step smaller, sentence case, untracked. Never mono, never uppercase.
- **Form figures (mono as material):** JetBrains Mono 400 and 500 at 12 to 13px, tabular, only for what gets copied onto a form: times, tag numbers, rates, hectares, litres, prices.

## Material

- The ledger row: an ink rule on top of the list, hairlines between rows, a mono time or number first, a chip last. Every list is one: animals, movements, jobs, forms. There is no card grid.
- The ear tag: a 54 by 44 tile in `--color-tag`, 6px top corners and 10px bottom corners, a pin hole on the top edge, the number in mono. The only icon for an animal, and yellow means nothing else.
- The field map: polygons in four field fills (hues 130, 110, 85 and 60 near 80% L), the paper as the boundary stroke, the chosen field in tangerine. Drawn, never a satellite image.
- The form: a white sheet, a 2px ink rule under its title, mono fields in two columns, a signature line and the page's one shadow, because it is paper. Everything else is flat.
- Radii by object: 4px chips and checkboxes, 6px buttons, 10px panels. The control pair is a tangerine-filled primary with ink text beside a white 1px-bordered secondary. No texture.

## Motion

Working, not decorative: a sprayer canvas draws a pass and the hectare count follows, a withdrawal countdown ticks once a minute, a price recomputes on input. No reveals, no parallax.

## Voice

Plain and unit-bearing: 214 ha, 6.1 t/ha, 12 days withdrawal, GBP per hectare. Never a number without its unit, never a pastoral adjective.

## Do-nots

- Never yellow for a warning, a highlight or a sale; the tag is the animal, and that is all yellow means.
- Never a photograph of a field, a tractor or an animal; the map and the tag are drawn.
- Never a tier table; price is a calculation.
- Never tangerine as type; it fills the record mark and the chosen field, with ink on it.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@600&family=Red+Hat+Text:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

```css
.display { font: 600 min(var(--text-display), 4rem)/1 var(--font-display); letter-spacing: var(--tracking-display); }
.ledger { border-top: 1px solid var(--color-ink); }
.ledger > div { display: grid; gap: var(--space-md); align-items: center; padding: var(--space-sm) 0; border-bottom: 1px solid var(--color-rule); }
.ear { display: inline-grid; place-items: center; width: 54px; height: 44px; border-radius: 6px 6px 10px 10px; background: var(--color-tag); color: var(--color-tag-ink); font: 500 var(--text-xs) var(--font-outlier); }
.btn { border-radius: var(--radius-pill); padding: var(--space-sm) var(--space-md); font-weight: 600; border: 1px solid var(--color-rule); background: var(--color-paper-2); }
.btn--primary { background: var(--color-accent); color: var(--color-accent-ink); border-color: var(--color-accent); }
::selection { background: color-mix(in oklab, var(--color-accent) 30%, transparent); }
```
