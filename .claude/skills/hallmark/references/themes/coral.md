---
name: Coral
slug: coral
genre: modern-minimal
paper: light 96.5 50
display: grotesk-sans General Sans
accent: warm 28
posture: restrained
keywords: saas, platform, billing, payments, dashboard, b2b, startup, product, pricing, analytics, fintech, workflow, team, onboarding, trust, warm, human, calm
material: warm grey paper, one coral signal, General Sans throughout, soft pills
signature: an ink-filled pill beside an outlined one, and nothing else on the page is coloured
pictured: Map / Diagram, Settled hero
---

# Coral

Warm grey paper, warm charcoal ink, General Sans throughout, soft pills, and one coral signal. The signature is an ink-filled pill beside an outlined one, with nothing else on the page coloured.

## Tokens

```css
:root {
  --color-paper: oklch(96.5% 0.005 50); --color-paper-2: oklch(94% 0.006 50); --color-paper-3: oklch(91% 0.007 50);
  --color-ink: oklch(20% 0.010 35); --color-ink-2: oklch(26% 0.012 40); --color-muted: oklch(46% 0.010 40);
  --color-rule: oklch(86% 0.008 50); --color-rule-2: oklch(80% 0.010 50);
  --color-accent: oklch(52% 0.165 28); --color-accent-ink: oklch(98% 0.005 50); --color-focus: oklch(52% 0.19 28);
  --font-display: "General Sans", ui-sans-serif, system-ui, sans-serif; --font-body: var(--font-display);
  --font-outlier: "Geist Mono", ui-monospace, monospace;
  --radius-card: 8px; --radius-input: 6px; --radius-pill: 999px; --rule-hair: 1px;
  --shadow-card: 0 1px 2px oklch(20% 0.01 35 / 0.05);
  --tracking-display: -0.025em; --display-weight: 600;
}
```

## Faces

- **Display:** General Sans 600, `--tracking-display`, up to 4.5rem; roman.
- **Body:** General Sans 400 and 500. Single-family discipline: the theme's warmth comes from paper and signal, never from a font swap.
- **Labels, captions, table heads, meta:** General Sans 500 one step smaller, sentence case. Mono (Geist Mono) appears only inside code and on figures that compare.

## Material

- Soft pills: controls and chips at `--radius-pill`; surfaces at 8px; inputs at 6px. The rounded control vocabulary is the theme's clearest tell.
- The control pair: an ink-filled primary (`--color-paper` text on `--color-ink`) beside a 1px `--color-rule` outlined secondary. If the coral signal is spent on a fill, the primary takes the accent with `--color-accent-ink`.
- Thin visible borders and generous air: 1px `--color-rule` on divisions, the whisper shadow on a surface that is interactive, whitespace doing the luxury work.
- The one signal under 5%, and nothing else on the page is coloured: a link's hover underline, the focus ring, one figure on paper or paper-2, or one filled control. Never a coral wash, gradient or background band.
- No texture, no mesh, no blur. Paper, borders and space carry the page.

## Motion

Nothing moves except state: an underline grows under a link, a border lifts to `--color-rule-2` on a focusable surface. No reveal, nothing autoplays.

## Voice

Declarative, warm, specific: the number, the product, the outcome. Never hype.

## Do-nots

- Never cool paper or a blue signal; warm grey and coral, or it is not this theme.
- Never a second text face: no serif, no other sans, no mono as display.
- Never tight 6px bordered controls on the primary action; Coral is pills.
- Never a code or terminal treatment as the focal object; Coral leads with type and a slot.

## Build hint

```html
<link href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600&display=swap" rel="stylesheet">
```

```css
.display { font: var(--display-weight) min(var(--text-display), 4.5rem)/1.05 var(--font-display); letter-spacing: var(--tracking-display); }
.btn { border: 1px solid transparent; border-radius: var(--radius-pill); padding: var(--space-sm) var(--space-lg); font-weight: 500; }
.btn--primary { background: var(--color-ink); color: var(--color-paper); }
.btn--secondary { border-color: var(--color-rule); color: var(--color-ink); }
a { text-underline-offset: 0.2em; } a:hover { text-decoration-color: var(--color-accent); }
::selection { background: color-mix(in oklab, var(--color-accent) 25%, transparent); }
```
