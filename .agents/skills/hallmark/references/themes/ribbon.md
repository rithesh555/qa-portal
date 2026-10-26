---
name: Ribbon
slug: ribbon
genre: atmospheric
paper: light 98.5 85
display: high-contrast-serif Newsreader italic
accent: chromatic-teal 190
posture: committed
keywords: sleep, sound, soundscape, audio, night, rest, calm, wellness, meditation, white noise, ambient, listen, headphones, wind down, bedtime, quiet, breathing, app, subscription
material: warm off-white paper, a light italic serif, pills and rules, and a ribbon of hairline strands in copper and teal whose thickness means loudness
signature: the ribbon: a dozen hairline paths in two colours sharing one undulating centre line, fading into the paper at both ends
pictured: Narrative Workflow, Stage hero
---

# Ribbon

Warm off-white paper, Newsreader italic 300 at every display size, pills for every control, lists on rules, and one ribbon of hairline strands in copper and teal whose thickness is the level of the sound.

## Tokens

```css
:root {
  --color-paper: oklch(98.5% 0.006 85); --color-paper-2: oklch(96% 0.009 85); --color-paper-3: oklch(92.5% 0.012 85);
  --color-ink: oklch(18% 0.005 80); --color-ink-2: oklch(30% 0.008 80); --color-muted: oklch(48% 0.012 80);
  --color-rule: oklch(90% 0.010 85); --color-rule-2: oklch(94% 0.008 85);
  --color-accent: oklch(44% 0.075 190); --color-accent-ink: oklch(98% 0.006 85); --color-focus: oklch(52% 0.09 190);
  --color-band: oklch(26% 0.045 195); --color-band-ink: oklch(94% 0.012 85);
  --color-strand-a: oklch(69% 0.07 80); --color-strand-b: oklch(58% 0.085 188);
  --font-display: "Newsreader", Georgia, serif; --font-body: "Figtree", ui-sans-serif, system-ui, sans-serif;
  --font-outlier: "JetBrains Mono", ui-monospace, monospace;
  --radius-card: 20px; --radius-pill: 999px; --rule-hair: 1px;
  --shadow-card: none;
  --tracking-display: -0.022em;
}
```

One dial, the colourway, stated in the stamp (`ribbon: dawn`). One strand is warm and one cool; the accent comes from the cool strand on dawn and from the warm one on the other two.

| Colourway | Paper | Ink | Strands and accent |
| --- | --- | --- | --- |
| `dawn` (default) | `oklch(98.5% 0.006 85)` | `oklch(18% 0.005 80)` | copper `oklch(69% 0.07 80)` and teal `oklch(58% 0.085 188)`; accent teal `oklch(44% 0.075 190)` |
| `two-in-the-morning` | navy `oklch(21% 0.034 252)` | `oklch(93% 0.010 85)` | peach `oklch(86% 0.06 55)` and ice `oklch(80% 0.07 240)`; accent peach `oklch(84% 0.085 55)` with the navy as its text |
| `moss` | sage `oklch(89% 0.034 140)` | `oklch(22% 0.03 150)` | ochre `oklch(72% 0.13 75)` and deep teal `oklch(46% 0.07 195)`; accent ochre `oklch(48% 0.115 70)` |

## Faces

- **Display:** Newsreader italic 300 at opsz 72, `--tracking-display`, line-height 1.02; no roman head at any level. Declared italic system (stamp `waive 38ii`): on `--font-display`, every head at every level, true italic, `font-synthesis: none`. A head is one weight and one colour; big figures are the display italic too.
- **Body:** Figtree 400, 16px, line-height 1.55 to 1.6, measure 45 to 50ch, in `--color-muted` rather than ink.
- **Labels, captions, table heads, meta:** Figtree 500 one step smaller, sentence case, in `--color-muted`. JetBrains Mono only inside code and on figures that compare, tabular.

## Material

- The ribbon: twelve SVG paths sharing one sine centre line, six in each strand colour at 0.8px and 30% alpha, spread apart by a distance that follows the level and masked to fade at both ends. That is the whole object, under 40 lines of SVG; it takes the colourway through `currentColor`. Never an image, never a blob. Its spread always means loudness.
- Pills, not buttons: every control and tag at `--radius-pill`. The pair is an accent-filled pill beside one outlined in 1px `--color-rule` on `--color-paper-2`. A panel at 16 to 28px radius only when it holds a drawing, with a 1px rule.
- Ruled, not boxed: sounds, prices and questions are rows on rules.
- The band: at most one full-bleed `--color-band` per page, and the ribbon runs through it.
- The dot: 8px in the warm strand with a 4px ring at 22% alpha, no blur. It states live or playing; never decoration.
- No shadow, no blur, no bloom: depth is a tinted panel and a rule. The ribbon is the only ornament.

## Motion

Slow and breathing: the ribbon drifts 6px sideways on a 12s `--ease-in-out` loop, the theme's one ambient loop: it stops under reduced motion and off-screen and carries a visible pause control. A slider redraws its ribbon on input. Nothing else moves on its own: no reveals, no parallax, no counters.

## Voice

Calm and specific: the hour, the sound, how loud.

## Do-nots

- Never a third strand colour; a third is a rainbow.
- Never a full ribbon beside "the quietest hour"; spread is level.
- Never a card grid; three cards in a row is the failure the theme exists to avoid.
- Never a second band, and never a second full-bleed accent fill.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@1,6..72,300&family=Figtree:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

```css
h1, h2, h3, .display { font-family: var(--font-display); font-style: italic; font-weight: 300; font-variation-settings: "opsz" 72; font-synthesis: none; }
.display { font-size: var(--text-display); line-height: 1.02; letter-spacing: var(--tracking-display); }
.ribbon { display: block; width: 100%; mask: linear-gradient(90deg, transparent, var(--color-ink) 15% 85%, transparent); }
.ribbon path { fill: none; stroke: currentColor; stroke-width: 0.8; opacity: 0.3; }
.ribbon .a { color: var(--color-strand-a); } .ribbon .b { color: var(--color-strand-b); }
.pill { display: inline-flex; align-items: center; gap: var(--space-xs); padding: var(--space-sm) var(--space-lg); border-radius: var(--radius-pill); border: 1px solid var(--color-rule); background: var(--color-paper-2); font: 500 var(--text-sm)/1.5 var(--font-body); }
.pill--accent { background: var(--color-accent); color: var(--color-accent-ink); border-color: var(--color-accent); }
.band { background: var(--color-band); color: var(--color-band-ink); }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-strand-a); box-shadow: 0 0 0 4px color-mix(in oklab, var(--color-strand-a) 22%, transparent); }
::selection { background: color-mix(in oklab, var(--color-accent) 22%, transparent); }
```
