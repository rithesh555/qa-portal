---
name: Dose
slug: dose
genre: modern-minimal
paper: light 99 160
display: grotesk-sans Schibsted Grotesk
accent: chromatic-green 160
posture: committed
keywords: health, medication, pharmacy, care, family, reminders, schedule, app, mobile, medicine, patients, clinic, prescription, tracking, calm, trust, routine, elderly
material: white paper with pale green tint bands, one pharmacy green, a rounded grotesk, dose pills in a week grid, the app bleeding off its slot
signature: a week grid of small green pills, filled when taken and outlined when due, beside a rounded green cross
pictured: Map / Diagram, Settled hero
---

# Dose

White paper with pale green tint bands, one pharmacy green for the cross, the pills and the button, Schibsted Grotesk heads over Instrument Sans. The signature is a week grid of small green pills, filled when taken and outlined when due, beside a rounded green cross.

## Tokens

```css
:root {
  --color-paper: oklch(99% 0.005 160); --color-paper-2: oklch(97% 0.016 160); --color-paper-3: oklch(94% 0.03 160);
  --color-ink: oklch(19% 0.012 170); --color-ink-2: oklch(30% 0.015 170); --color-muted: oklch(50% 0.022 165);
  --color-rule: oklch(88% 0.02 160);
  --color-accent: oklch(50% 0.13 160); --color-accent-ink: oklch(99% 0.005 160); --color-focus: oklch(45% 0.14 160);
  --color-missed: oklch(88% 0.01 160);
  --font-display: "Schibsted Grotesk", ui-sans-serif, sans-serif; --font-body: "Instrument Sans", ui-sans-serif, sans-serif;
  --font-outlier: "JetBrains Mono", ui-monospace, monospace;
  --radius-card: 12px; --radius-input: 8px; --radius-pill: 999px; --rule-hair: 1px;
  --shadow-card: 0 0 0 1px var(--color-rule), 0 18px 40px oklch(50% 0.1 160 / 0.18);
  --tracking-display: -0.028em;
}
```

Committed: the paper family is the green; paper-2 and paper-3 are tint bands, while the accent proper stays on the cross, the pills and one button. Three grounds, stated in the stamp (`dose: white`).

| Ground | Paper and ink | The green |
| --- | --- | --- |
| **White** (default) | near-white under near-black; tint bands at 97% and 94% | `oklch(50% 0.13 160)` |
| **Green** | drenched `oklch(46% 0.12 160)` under white ink; cards are white plates with dark ink inside | pills go mint `oklch(88% 0.09 160)` on the ground, green on a plate |
| **Night dose** | `oklch(13% 0.01 170)` under `oklch(96% 0.01 160)`, cards at 20% | mint `oklch(86% 0.13 160)` with dark ink on it; missed at 30% |

## Faces

- **Display:** Schibsted Grotesk 700, `--tracking-display`, line-height 1.02, up to 88px; sentence case, roman. Prices and the one big count at 700 with -0.035em.
- **Body:** Instrument Sans 400 and 500, 16 to 18px, line-height 1.5.
- **Labels, captions, table heads, meta:** Instrument Sans 500 one step smaller, sentence case. Mono (JetBrains Mono 500) is kept for the clock and the dose only, `08:00` and `500 mg`; it never sets a caption, a tab or a table head.

## Material

- Radii that read as an app: 8px on controls and inputs, 12px on cards, 999 on pills. Hairlines at 1px; a panel's edge is a `0 0 0 1px` ring rather than a border.
- The pill: a 46 by 18 capsule, green when taken, outlined 1.5px green when due, grey when missed. The week grid of pills is the object family, and so is a step timeline where the open step is an outlined ring.
- The cross: a plus with rounded ends in green, drawn as an SVG, large or small as the wordmark's mark. It is the only illustration.
- Tint bands: paper-2 and paper-3 as bands; white cards sit on tint with the one soft shadow. No gradient and no mesh.
- The app: it bleeds off the edge of its slot or sits in a plain 12px plate, never inside a drawn phone bezel, never with a notch or a bar.
- The control pair: a green fill with paper text beside a 1.5px inset rule outline, both 52px tall, both at 8px. Shadow stance: a single soft green-tinted shadow with a y offset under a floating card or the app plate; nothing else lifts.

## Motion

One settle: the reminder card fades in once over `--dur-long` on `--ease-out`. A pill fills on tap over `--dur-micro`; the next-dose clock does not tick. Nothing autoplays, nothing pulses.

## Voice

A pharmacist's plainness: the name, the dose, the time, who it is for. Reassuring by being exact. Never a journey, never a warning in red.

## Do-nots

- Never red or amber for a missed dose; missed is grey and the page stays calm.
- Never a medical blue or a second brand colour; the green does the cross, the pills and the button.
- Never a photograph of pills or a stock hand; the app in its slot is the picture.
- Never a sharp-cornered card or a square button; Dose is 8 and 12 and 999.
- Never mono on a label or a tab; mono is the clock and the milligrams.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@700&family=Instrument+Sans:wght@400;500&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
```

```css
.display { font: 700 var(--text-display)/1.02 var(--font-display); letter-spacing: var(--tracking-display); text-wrap: balance; }
.btn { height: 52px; padding: 0 var(--space-lg); border-radius: var(--radius-input); font: 500 var(--text-md) var(--font-body); }
.btn--primary { background: var(--color-accent); color: var(--color-accent-ink); }
.btn--secondary { box-shadow: inset 0 0 0 1.5px var(--color-rule); color: var(--color-ink); }
.pill { display: inline-flex; width: 46px; height: 18px; border-radius: var(--radius-pill); background: var(--color-accent); }
.pill--due { background: none; box-shadow: inset 0 0 0 1.5px var(--color-accent); }
.pill--missed { background: var(--color-missed); }
.card { background: var(--color-paper); border-radius: var(--radius-card); box-shadow: var(--shadow-card); }
.band { background: var(--color-paper-2); }
.time { font: 500 var(--text-3xl)/1 var(--font-outlier); letter-spacing: -0.02em; color: var(--color-accent); }
::selection { background: color-mix(in oklab, var(--color-accent) 25%, transparent); }
```
