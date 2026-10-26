---
name: Brutal
slug: brutal
genre: editorial
paper: light 98 25
display: grotesk-heavy Albert Sans
accent: chromatic-yellow 105
posture: committed
keywords: brutalist, raw, bold, high-contrast, statement, agency, design studio, portfolio, streetwear, drop, zine, type-forward, graphic design, poster, festival, collective, no-nonsense, uncompromising
material: an engineered near-white sheet carved by 3px near-black rules, giant uppercase Albert Sans 700, zero radius, one acid-yellow fill
signature: a solid ink block butted against a bordered paper block with one acid-yellow bar between them
pictured: Split Studio, Ledge hero
---

# Brutal

A near-white sheet carved by 3px near-black rules, uppercase Albert Sans 700 run tight, zero radius, and one acid yellow that only ever fills: a bar or a block under ink, never a letter. The signature is a solid ink block butted against a bordered paper block with one acid-yellow bar between them.

## Tokens

```css
:root {
  --color-paper: oklch(98% 0.005 25); --color-paper-2: oklch(95% 0.005 25); --color-paper-3: oklch(91% 0.005 25);
  --color-ink: oklch(8% 0.005 25); --color-ink-2: oklch(12% 0.005 25); --color-muted: oklch(38% 0.005 25);
  --color-rule: oklch(8% 0.005 25);
  --color-accent: oklch(90% 0.19 105); --color-accent-ink: oklch(8% 0.005 25); --color-focus: oklch(48% 0.1 110);
  --font-display: "Albert Sans", system-ui, sans-serif; --font-body: var(--font-display);
  --font-outlier: "JetBrains Mono", ui-monospace, monospace;
  --radius-card: 0; --radius-pill: 0; --rule-hair: 1px; --rule-bar: 3px; --shadow-card: none;
  --tracking-display: -0.045em; --display-weight: 700;
}
```

## Faces

- **Display:** Albert Sans 700, uppercase, `--tracking-display`, line-height 1.02 (the floor for multi-line caps), up to 6.5rem. Flush-left, edge-aligned to a rule, allowed to run wide and butt against it. Never centred.
- **Body:** Albert Sans 400 and 500, sentence case.
- **Labels, captions, table heads, meta:** Albert Sans 500 one step smaller, sentence case, in `--color-muted`; uppercase belongs to the display alone. JetBrains Mono sets only code and real figures that compare (a price column, a spec line); it never sets a caption or a head.

## Material

- Thick rules are the structure, two weights only: `--rule-bar` boxes sections and figures; `--rule-hair` splits rows inside them. Figures and blocks sit flush to the border with no inset gutter; text keeps its padding.
- Zero radius everywhere: buttons, inputs, blocks, images.
- Inverted solid blocks, no float: filled rectangles (ink with paper text, acid yellow with ink text, bordered paper) butted against each other and against rules. No shadow; depth is fill and border. The control pair: a `--rule-bar` bordered paper button beside a solid ink button with paper text; hover inverts either instantly.
- The acid yellow is a fill, never type, a rule or a ring: the one block of colour on the sheet (the signature bar, one filled panel, or a `mark` band in running text), always under ink, never inside a heading, under 5% of any viewport. Near-zero chroma everywhere else makes it the only colour on the page. Focus takes the deep olive `--color-focus`, which holds 3:1 on paper, ink and yellow. No texture, no ornament.

## Motion

Nothing glides. State flips in one frame: a block inverts to ink with paper text, or fills yellow under its ink text. No reveal, no bounce, no parallax, no blur transition.

## Voice

Blunt, declarative: capitals in the display, sentence case everywhere else; verbs and nouns, no hedging, no hype. Say the thing flat.

## Do-nots

- Never a rounded corner; any radius above zero softens the sheet.
- Never a shadow, blurred or hard-offset; depth is border and fill.
- Never an ornament, a fleuron or a layered offset stack; Brutal is raw, not decorated.
- Never black paper; this is a light sheet with black structure.
- Never yellow type, a yellow rule or a yellow focus ring, and never a second colour or a gradient; the acid yellow only fills.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Albert+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

```css
body { background: var(--color-paper); color: var(--color-ink-2); font-family: var(--font-body); }
h1, h2, .display { font-family: var(--font-display); font-weight: var(--display-weight); text-transform: uppercase; letter-spacing: var(--tracking-display); line-height: 1.02; color: var(--color-ink); }
.block { border: var(--rule-bar) solid var(--color-rule); border-radius: 0; }
.block--ink { background: var(--color-ink); color: var(--color-paper); }
.bar, p mark { background: var(--color-accent); color: var(--color-accent-ink); }
.btn { border: var(--rule-bar) solid var(--color-rule); border-radius: 0; padding: var(--space-xs) var(--space-lg); font-weight: 700; transition: none; }
.btn:hover, .btn--ink { background: var(--color-ink); color: var(--color-paper); } .btn--ink:hover { background: var(--color-paper); color: var(--color-ink); }
::selection { background: var(--color-accent); color: var(--color-accent-ink); }
```
