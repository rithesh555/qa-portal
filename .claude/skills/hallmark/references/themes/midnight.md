---
name: Midnight
slug: midnight
genre: atmospheric
paper: dark 15 250
display: grotesk-sans Geist
accent: cool 220
posture: restrained
keywords: ai tool, generative, model playground, render, pipeline, observability, console, dark mode, nocturnal, late-night, after-hours, moody, cinematic, cerebral, calm, technical, midnight
material: midnight-blue ground, cool near-white ink, thin Geist at scale, one azure signal, depth in lightness steps
signature: a Geist 300 headline set large and airy over layered blue-dark surfaces seamed by hairlines
pictured: Narrative Workflow, Settled hero
---

# Midnight

A midnight-blue ground, cool near-white ink, Geist 300 set large and airy over three paper steps seamed by 1px hairlines, and one azure signal under 5%. Depth is a lightness step, never a lamp.

## Tokens

```css
:root {
  --color-paper: oklch(15% 0.022 250); --color-paper-2: oklch(20% 0.024 250); --color-paper-3: oklch(25% 0.026 250);
  --color-ink: oklch(95% 0.008 230); --color-ink-2: oklch(86% 0.010 230); --color-muted: oklch(66% 0.014 235);
  --color-rule: oklch(33% 0.024 245); --color-rule-2: oklch(48% 0.020 240);
  --color-accent: oklch(72% 0.16 220); --color-accent-ink: oklch(15% 0.022 250); --color-focus: oklch(78% 0.15 220);
  --font-display: "Geist", ui-sans-serif, system-ui, sans-serif; --font-body: var(--font-display);
  --font-outlier: "Geist Mono", ui-monospace, monospace;
  --radius-card: 8px; --radius-pill: 8px; --rule-hair: 1px;
  --shadow-card: 0 8px 24px -12px oklch(5% 0.02 250 / 0.6);
  --tracking-display: -0.03em; --display-weight: 300;
}
```

## Faces

- **Display:** Geist 300, `--tracking-display`, up to 5.25rem, line-height 1.05; roman. Light weight at large size is the theme's face: spacious, cold, calm. Never the genre's 600.
- **Body:** Geist 400 and 500 at a 60ch measure. Single family: the cold comes from ground and ink, never from a font swap.
- **Labels, captions, table heads, meta, status:** Geist 500 one step smaller, sentence case, `--color-muted`. Mono is not this theme's material; Geist Mono appears only inside code and on figures that compare (a token count, a latency column).

## Material

- Depth by lightness: three paper steps seamed by 1px `--color-rule`; a surface that must lift takes `--shadow-card`, offset and blur in the ground's own dark. No bloom, no radial light, no coloured halo: the atmosphere is the void, the blue ground and the airy type.
- Radius 8px, small and even, on surfaces, controls, chips and inputs alike; neither pill nor ruler-sharp.
- The signal under 5%: the one primary control, a link hover, an active nav item, a single large figure. Never a wash, never a gradient, never a second light.
- The control pair: an azure-filled primary with `--color-accent-ink` text beside a secondary bordered in `--color-rule-2`, both at 8px.
- The object family: instrument panels. A console pane, a run log, a metric strip, a settings sheet, each a `paper-2` surface with a hairline seam and a plain Geist header. Nothing glass, nothing blurred.

## Motion

One settle: the hero fades from 0.6 to 1 over `--dur-long` on `--ease-out`, once, from an already-visible default. Hover: a link's underline turns azure; a border lifts to `--color-rule-2` on a focusable surface. No slide, no parallax, no autoplay.

## Voice

Cool, spare, a touch cerebral. Name the command or the number. Never hype.

## Do-nots

- Never a warm accent (amber, orange, gold); the light here is cold.
- Never a heavy display weight; Geist 300 is the face, and 600 makes it another theme.
- Never a lamp: no radial glow behind the hero, no halo on a card. The light is the ink, not a source in the ground.
- Never a light-paper section; dark end to end.
- Never a serif anywhere; one sans family and its cold.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
```

```css
.display { font: var(--display-weight) var(--text-display)/1.05 var(--font-display); letter-spacing: var(--tracking-display); color: var(--color-ink); }
.panel { background: var(--color-paper-2); color: var(--color-ink); border: 1px solid var(--color-rule); border-radius: var(--radius-card); }
.panel--raised { background: var(--color-paper-3); color: var(--color-ink); border-color: transparent; box-shadow: var(--shadow-card); }
.btn { border-radius: var(--radius-card); padding: var(--space-sm) var(--space-md); font-weight: 500; }
.btn--primary { background: var(--color-accent); color: var(--color-accent-ink); }
.btn--secondary { border: 1px solid var(--color-rule-2); color: var(--color-ink); }
a:hover { text-decoration-color: var(--color-accent); }
::selection { background: color-mix(in oklab, var(--color-accent) 30%, transparent); color: var(--color-ink); }
```
