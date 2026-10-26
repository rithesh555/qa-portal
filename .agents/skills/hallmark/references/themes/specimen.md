---
name: Specimen
slug: specimen
genre: editorial
paper: light 96 80
display: high-contrast-serif Bodoni Moda
accent: cool 262
posture: restrained
keywords: typography, type specimen, foundry, letterform, portfolio, editorial, magazine, essay, type studio, agency, brand story, print, publication, craft, considered, literary
material: warm oat paper, a Didone set enormous and thin, hairlines, one cool ink-blue mark
signature: a single Bodoni Moda word at specimen scale whose hairlines nearly vanish, over a ruled page
pictured: Type Specimen, Poster hero
---

# Specimen

Warm oat paper, Bodoni Moda 400 at opsz 96 set enormous so its hairlines nearly vanish against the stems, a Geist body, ruler-drawn 1px rules, and one ink-blue mark under 5%.

## Tokens

```css
:root {
  --color-paper: oklch(96% 0.018 80); --color-paper-2: oklch(93.5% 0.02 80); --color-paper-3: oklch(90.5% 0.022 78);
  --color-ink: oklch(18% 0.014 60); --color-ink-2: oklch(26% 0.014 60); --color-muted: oklch(48% 0.014 65);
  --color-rule: oklch(80% 0.016 75);
  --color-accent: oklch(46% 0.17 262); --color-accent-ink: oklch(96% 0.018 80); --color-focus: oklch(50% 0.18 262);
  --font-display: "Bodoni Moda", serif; --font-body: "Geist", ui-sans-serif, system-ui, sans-serif;
  --font-outlier: "Geist Mono", ui-monospace, monospace;
  --radius-card: 0; --radius-pill: 0; --rule-hair: 1px;
  --shadow-card: none;
  --tracking-display: -0.025em; --display-weight: 400; --display-optical: 96;
}
```

## Faces

- **Display:** Bodoni Moda 400, `"opsz" 96`, `--tracking-display`, up to 5.75rem, line-height 1.02; roman. Set enormous, the hairlines thin to a razor against the stems, and that contrast is the graphic.
- **Body:** Geist 400 and 500, 62ch, line-height 1.5; the sans under the Didone is the tension. Bodoni Moda italic is a body-level device only (a pulled line at text size, one emphasised word in running text) and never enters a head.
- **Labels, captions, folios, table heads, meta:** Geist 500 one step smaller, sentence case, `--color-muted`. Mono is not this theme's material; Geist Mono appears only inside code and on figures that compare.

## Material

- Hairlines, square corners, no shadow: 1px `--color-rule` on structure, inside tables and between columns, radius 0, nothing lifts. Rules, columns and one double rule, never boxed surfaces.
- The object family is the specimen itself: a waterfall (one line per size), a character grid, a weight or optical ladder, a figure set with a folio, showing the display face.
- Ornament without depth: a fleuron or a blue Bodoni Moda drop cap, set in the face it demonstrates.
- The one mark under 5%: the drop cap, a link underline, one control, a single figure. Never a fill behind type, never a band, never a second hue.
- The control pair: an ink-filled rectangle beside a hairline-outlined one, both square. No texture, no gradient, no mesh.

## Motion

Nothing moves except state: a blue underline grows under a link on hover. No reveal, no settling ladder, nothing loops.

## Voice

Editorial, hand-set, lightly literary. Verbs over adjectives; name the face, the size, the number.

## Do-nots

- Never a heavy display; Bodoni Moda stays at 400, and bold turns the Didone into a crown.
- Never an optical size under 72 on display type; fat hairlines are the theme's most common failure.
- Never a warm accent; the one mark is ink blue, and the warmth comes from the oat.
- Never cool paper; the ground is oat, hue 80, and every neutral tints toward it.
- Never rounded corners, pills, shadows or texture. Square, hairline, flat.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;1,6..96,400&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
```

```css
.display { font: var(--display-weight) var(--text-display)/1.02 var(--font-display); font-variation-settings: "opsz" var(--display-optical); letter-spacing: var(--tracking-display); }
.waterfall > * { border-top: var(--rule-hair) solid var(--color-rule); padding-block: var(--space-xs); font-family: var(--font-display); font-variation-settings: "opsz" 96; }
.dropcap::first-letter { float: left; font: 400 3.6em/0.82 var(--font-display); color: var(--color-accent); padding-right: 0.08em; }
.btn { border-radius: 0; padding: var(--space-sm) var(--space-lg); font-weight: 500; }
.btn--primary { background: var(--color-ink); color: var(--color-paper); }
.btn--secondary { border: 1px solid var(--color-ink); color: var(--color-ink); }
a { text-decoration-color: var(--color-accent); text-underline-offset: 0.18em; }
::selection { background: color-mix(in oklab, var(--color-accent) 22%, transparent); }
```
