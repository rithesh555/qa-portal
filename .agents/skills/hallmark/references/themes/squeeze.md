---
name: Squeeze
slug: squeeze
genre: playful
paper: mid 38 160
display: geometric-sans Manrope
accent: warm 55
posture: drenched
keywords: fruit, food box, grocer, market, delivery, weekly, seasonal, farm shop, subscription, produce, veg box, cheerful, family, treats, stall, orchard, local, fresh
material: a forest green ground with real chroma, peach controls, Manrope heavy from headline to footnote, drawn fruit with a ripeness bar
signature: a drawn fruit on the green with an 8px ripeness gradient under it, and one white card for the thing you pay for
pictured: Bento Grid, Settled hero
---

# Squeeze

Forest green with real chroma, peach controls, Manrope from 500 to 800 and nothing thinner, fruit drawn as a highlighted circle with a stalk and a leaf over an 8px ripeness bar, and one white card for the thing you pay for.

## Tokens

```css
:root {
  --color-paper: oklch(38% 0.085 160); --color-paper-2: oklch(44% 0.090 160); --color-paper-3: oklch(32% 0.080 160);
  --color-ink: oklch(99% 0.005 90); --color-ink-2: oklch(94% 0.020 120); --color-muted: oklch(88% 0.035 150); --color-rule: oklch(50% 0.09 160);
  --color-accent: oklch(84% 0.10 55); --color-accent-ink: oklch(30% 0.06 40); --color-focus: oklch(88% 0.14 85);
  --color-card: oklch(97% 0.012 85); --color-card-ink: oklch(24% 0.05 160);
  --color-shade: oklch(20% 0.05 160); --ripe-0: oklch(80% 0.12 130); --ripe-1: oklch(84% 0.12 85); --ripe-2: oklch(70% 0.17 40);
  --font-display: "Manrope", ui-sans-serif, system-ui, sans-serif; --font-body: var(--font-display);
  --font-outlier: "IBM Plex Mono", ui-monospace, monospace;
  --radius-card: 20px; --radius-pill: 999px; --rule-hair: 1px; --rule-bar: 2px;
  --shadow-card: 0 12px 28px -14px oklch(24% 0.05 160 / 0.45);
  --tracking-display: -0.04em; --display-weight: 800;
}
```

## Faces

- **Display:** Manrope 800, `--tracking-display`, line-height 1.0, up to 4.75rem. One colour per head.
- **Body:** Manrope 500 at 16px, line-height 1.55, in `--color-muted`; links and row titles at 700.
- **Labels, captions, table heads, meta:** Manrope 700 one step smaller, sentence case, untracked. Never mono, never uppercase.
- **Outlier:** IBM Plex Mono only inside code and on figures that compare in a column.

## Material

- Tiles, not cards: the ground one step lighter, rounded 16 to 24px, no border, no shadow. The one white card, with the page's one shadow, appears once, for the thing you pay for.
- The fruit: a circle with a radial highlight, a stalk and a leaf as pseudo-elements, two custom properties per fruit; plums, pears and figs change their radii. Never a photograph, never an emoji.
- The ripeness bar: 8px, rounded, a fixed gradient from green through yellow to peach clipped to a width, under every fruit for sale. The same on every ground.
- The crate: two wood tones in a repeating stripe, rounded 14px, with fruit laid in it; box, cart and plan in one object.
- Rules at `--rule-bar`; only a rule between list rows is `--rule-hair`. Tags are pills, buttons 14px; the control pair is a peach-filled primary beside a 2px ink-outlined secondary.

## Motion

Cheerful and physical: the crate fills on tap, and the price follows when the user has given one per size; a marquee runs at about 36 seconds a loop and pauses on hover, on focus and from its own pause control. No reveals, no parallax, nothing else loops.

## Voice

The stall-holder's: the fruit, the farm, the day it comes, what ripe feels like in the hand. Plain and warm, never gourmet.

## Do-nots

- Never a neutral ground. White is for the one card; grey does not exist. The page is green.
- Never a photograph of fruit; the fruit is drawn so it carries its ripeness bar on any ground.
- Never a weight under 500 and never a serif.
- Never a hairline border; a 1px rule lives only between list rows.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
```

```css
.display { font: 800 min(var(--text-display), 4.75rem)/1 var(--font-display); letter-spacing: var(--tracking-display); }
.card { background: var(--color-card); color: var(--color-card-ink); border-radius: var(--radius-card); box-shadow: var(--shadow-card); }
.fruit { position: relative; width: 64px; height: 64px; border-radius: 50%; box-shadow: inset -6px -8px 14px color-mix(in oklab, var(--color-shade) 16%, transparent);
  background: radial-gradient(circle at 35% 32%, var(--f2), var(--f1) 62%, color-mix(in oklab, var(--f1) 70%, var(--color-shade))); }
.ripe { height: 8px; border-radius: 4px; background: color-mix(in oklab, var(--color-ink) 14%, transparent); overflow: hidden; }
.ripe i { display: block; height: 100%; width: var(--w); background: linear-gradient(90deg, var(--ripe-0), var(--ripe-1), var(--ripe-2)); }
.btn { border-radius: 14px; padding: var(--space-sm) var(--space-lg); font: 700 var(--text-md)/1.25 var(--font-body); border: var(--rule-bar) solid var(--color-ink); }
.btn--primary { background: var(--color-accent); color: var(--color-accent-ink); border-color: var(--color-accent); }
::selection { background: color-mix(in oklab, var(--color-accent) 45%, transparent); color: var(--color-card-ink); }
```
