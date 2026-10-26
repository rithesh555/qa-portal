---
name: Garden
slug: garden
genre: editorial
paper: light 95.5 92
display: roman-serif Vollkorn
accent: chromatic-green 140
posture: committed
keywords: farm, apiary, honey, cidery, orchard, seed, nursery, herbalist, botanical, tea, preserves, single-origin, seasonal, harvest, small-maker, csa, provenance, grown, field, homestead
material: oat paper, green ink, a sturdy Vollkorn head, a leaf-green signal, clay kept inside hand-built craft
signature: the season bar, twelve months as one ruled bar with the in-season months filled leaf green and the current month marked by a hairline
pictured: Conversational FAQ, Settled hero
---

# Garden

Warm oat paper, a near-black green ink, Vollkorn heads over Hanken Grotesk, one leaf-green signal, a clay pop kept inside hand-built CSS and SVG craft. The signature is the season bar: twelve months in one ruled bar, the months in season filled leaf green, the current month marked by a hairline.

## Tokens

```css
:root {
  --color-paper: oklch(95.5% 0.022 92); --color-paper-2: oklch(92.5% 0.026 92); --color-paper-3: oklch(89.5% 0.030 92);
  --color-ink: oklch(24% 0.052 152); --color-ink-2: oklch(33% 0.050 150); --color-muted: oklch(48% 0.030 145);
  --color-rule: oklch(84% 0.020 120); --color-rule-2: oklch(70% 0.040 140);
  --color-accent: oklch(47% 0.130 140); --color-accent-2: oklch(54% 0.140 46); --color-accent-ink: oklch(97% 0.015 95);
  --color-focus: oklch(47% 0.130 140); --tint-moss: oklch(47% 0.130 140 / 0.10); --tint-clay: oklch(54% 0.140 46 / 0.10);
  --font-display: "Vollkorn", ui-serif, Georgia, serif; --font-body: "Hanken Grotesk", ui-sans-serif, system-ui, sans-serif;
  --font-outlier: "Newsreader", ui-serif, Georgia, serif;
  --radius-card: 4px; --radius-pill: 999px; --rule-hair: 1px; --shadow-card: none;
  --tracking-display: -0.01em;
}
```

## Faces

- **Display:** Vollkorn 700, roman, `--tracking-display`, up to 5rem, one weight for every head, never italic. A sturdy old-style serif with a dark, warm colour on the page, not a high-contrast serif.
- **Body:** Hanken Grotesk 400 and 500 with `oldstyle-nums`. Newsreader 400 carries long provenance prose at 58ch; Vollkorn never runs as body.
- **Labels, captions, table heads, meta, lot codes, dates, months:** Hanken Grotesk 500 one step smaller, sentence case, untracked, `--color-muted`: the herbarium tag reads like a caption, never like a stamp. No mono on the page.

## Material

- The season bar (the signature): twelve months as one bar ruled in 1px hairlines, the months in season filled leaf green under `--color-accent-ink`, the rest left as paper with the month in `--color-muted`, and the current month marked by a 1px ink hairline that runs past the bar's edges. It shows the real season of the thing sold, or it does not appear; a brief that gives one date fills one month and says what the month is ("poured in September") in a caption under the bar, so it never reads as a month picker.
- Hand-built botanical craft: the imagery is pure CSS and hand-authored SVG (a honeycomb wash, a jar of amber, corked vials, a pressed leaf, a drawn specimen beside its caption), never a stock photo. It is the thing being sold, not decoration, and not the signature.
- Tint bands, not boxed cards: soft full-bleed washes in `--tint-moss` or `--tint-clay`; structure is 1px hairlines plus whitespace, never a drop-shadowed box. Flat paper, no texture.
- Every neutral carries a green cast (hue 90 to 152), no pure grey. Leaf-green stays under 5% of a viewport. Clay lives inside the craft, almost never as chrome.
- The control pair: one flat leaf-green pill with `--color-accent-ink` text beside a hairline-outlined pill in `--color-rule-2`.
- A sprig ornament: one small hand-authored SVG leaf in `--color-rule-2`, the fleuron botanised; ornament, never chrome.

## Motion

Nothing moves except state: a control's hover, and where a piece of craft is itself a link or a button, one hover on it (a jar filling, a cork lifting), on transform and opacity only. No reveal, no stagger, no parallax.

## Voice

Warm, honest, seasonal, unhurried. Say the ridge, the flower, the pour date, the number of jars; never artisanal, curated or small-batch as a hollow badge.

## Do-nots

- Never grey-sage or slate paper; the ground is warm oat, hue 92.
- Never a photograph where the craft should be.
- Never a cool teal or corporate emerald; the green is chlorophyll, hue 140.
- Never italic or faux-bold Vollkorn; load the real 700.
- Never clay on a control, a nav or the season bar, never a gradient on the leaf-green control.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Vollkorn:wght@700&family=Hanken+Grotesk:wght@400;500&family=Newsreader:opsz,wght@6..72,400&display=swap" rel="stylesheet">
```

```css
body { font-family: var(--font-body); font-variant-numeric: oldstyle-nums; color: var(--color-ink-2); }
h1, h2, h3, .display, .season, td { font-variant-numeric: lining-nums tabular-nums; }
.display { font: 700 clamp(2.25rem, 4vw + 1rem, 5rem)/1.05 var(--font-display); letter-spacing: var(--tracking-display); color: var(--color-ink); }
.tag { font-size: var(--text-xs); font-weight: 500; color: var(--color-muted); }
.season { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); border: var(--rule-hair) solid var(--color-rule-2); }
.season > li { position: relative; padding: var(--space-xs) 0; text-align: center; font-size: var(--text-xs); color: var(--color-muted); }
.season > li + li { border-inline-start: var(--rule-hair) solid var(--color-rule); }
.season > .in { background: var(--color-accent); color: var(--color-accent-ink); }
.season > [aria-current]::after { content: ""; position: absolute; inset-block: calc(-1 * var(--space-xs)); left: 50%; width: 1px; background: var(--color-ink); }
.band--moss { background: var(--tint-moss); }
.btn--solid { border-radius: var(--radius-pill); border: var(--rule-hair) solid var(--color-accent); background: var(--color-accent); color: var(--color-accent-ink); }
.btn--line { border-radius: var(--radius-pill); border: var(--rule-hair) solid var(--color-rule-2); color: var(--color-ink); }
::selection { background: color-mix(in oklab, var(--color-accent) 22%, transparent); }
```
