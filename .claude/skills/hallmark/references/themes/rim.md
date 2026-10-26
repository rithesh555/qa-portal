---
name: Rim
slug: rim
genre: modern-minimal
paper: dark 6 80
display: grotesk-sans Switzer
accent: warm 45
posture: committed
keywords: space, satellite, earth observation, orbit, imagery, ground station, telemetry, hardware, schedule, utc, infrastructure, mission, sensor, monitoring, instrument, night, dark, measured
material: warm black paper, one disc lit along a third of its edge, Switzer medium, mono for every measurement, zero radius
signature: the black disc with a hard-edged conic rim, and a 1px horizon rule with something rising under it
pictured: Map / Diagram, Stage hero
---

# Rim

Warm black paper, one disc lit along a third of its edge by a hard conic rim, Switzer 500 heads, Geist Mono for every measurement with its zone, and a 1px horizon rule with something rising under it. The disc is the only round thing on the page, and it is drawn.

## Tokens

```css
:root {
  --color-paper: oklch(6% 0.005 80); --color-paper-2: oklch(10% 0.005 80); --color-paper-3: oklch(4% 0.005 80);
  --color-ink: oklch(94% 0.010 80); --color-ink-2: oklch(84% 0.011 80); --color-muted: oklch(66% 0.012 80); --color-muted-2: oklch(50% 0.010 80);
  --color-rule: oklch(24% 0.010 80); --color-rule-2: oklch(15% 0.008 80);
  --color-accent: oklch(72% 0.17 45); --color-accent-ink: oklch(10% 0.02 45); --color-accent-2: oklch(74% 0.12 250); --color-focus: oklch(78% 0.15 45);
  --color-rim-1: oklch(82% 0.17 50); --color-rim-2: oklch(60% 0.15 300); --color-disc: oklch(9% 0.008 260); --color-disc-2: oklch(16% 0.012 260);
  --font-display: "Switzer", ui-sans-serif, system-ui, sans-serif; --font-body: var(--font-display);
  --font-outlier: "Geist Mono", ui-monospace, monospace;
  --radius-card: 0; --radius-pill: 0; --rule-hair: 1px; --shadow-card: none;
  --tracking-display: -0.04em; --display-weight: 500;
}
```

Two colourways, both dark, stated in the stamp (`rim: night` or `rim: station`).

| Colourway | Ground and lights |
| --- | --- |
| `night` (default) | the block above: warm black, an orange sun, a blue sky, the rim from violet into orange |
| `station` | navy `oklch(19% 0.055 262)` with rules at `oklch(32% 0.060 262)`; the temperatures swap, sun to ice `oklch(84% 0.10 200)`, sky to amber `oklch(76% 0.14 55)`, the rim from ice into amber |

## Faces

- **Display:** Switzer 500, `--tracking-display`, line-height 1.02, up to 4.75rem. Medium, never bold. One colour per head.
- **Body:** Switzer 400 at 16px, line-height 1.55, in `--color-muted`; 500 where it must read as ink, 600 for `strong`.
- **Labels, captions, table heads, meta:** Switzer 500 one step smaller, sentence case, untracked. Never mono, never uppercase.
- **Measurements (mono as material):** Geist Mono 400 and 500, tabular, for every time, coordinate, kilometre, price and countdown, and for big figures at 20 to 40px. A time always carries its zone, UTC by default. Mono never sets a heading, a label or a paragraph.

## Material

- The disc: a radial body (`--color-disc-2` at the upper left into `--color-disc`) inside a 2px transparent border that carries a conic rim, lit from violet into orange over a third of the circumference. A hard edge: no blur, no halo, no bloom anywhere on the page. It is the only circle.
- Zero radius on everything. An unframed panel takes two 10px corner ticks (1px L shapes in `--color-muted-2`) at opposite corners instead of a border.
- The horizon: one 1px rule in `--color-ink` with something rising under it (a step list, a set of times, the disc).
- Depth by lightness only: three paper steps parted by hairlines; no shadow, no glass. The control pair is a square sun-filled primary beside a square 1px-outlined secondary.
- Data is a hairline table or an hour strip, never a card grid: heads on a 1px rule, rows on `--color-rule-2`, bars in sun and sky carrying state.
- Imagery is drawn: a slot filled with two overlapping radial gradients (`--color-disc-2` and `--color-paper-2` over `--color-disc`), a 1px scale bar and a tag in the label voice; that is the whole picture. No texture recipe; the black is the surface.

## Motion

Orbital and steady. A satellite may travel its ellipse on `animateMotion` at 19 to 31 seconds a lap, the theme's ambient loop, with a visible pause control; SMIL escapes the reduced-motion CSS, so a script calls `pauseAnimations()` under reduced motion and off-screen. Clocks update once a minute. The disc never pulses; nothing reveals.

## Voice

Measured and exact: the pass, the time in UTC, the area in square kilometres, the price. No wonder, no frontier.

## Do-nots

- Never a second round thing: no pill, no avatar circle, no rounded button. The disc is the only circle.
- Never a photograph of the planet; imagery is drawn with a scale bar.
- Never a bare time. `09:30` without a zone is the theme lying.
- Never a triangle, chevron or star as the mark.
- Never bold display. Switzer 500 is the ceiling; the black does the weight.

## Build hint

```html
<link href="https://api.fontshare.com/v2/css?f[]=switzer@400,500,600&display=swap" rel="stylesheet"><link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
```

```css
.display { font: 500 min(var(--text-display), 4.75rem)/1.02 var(--font-display); letter-spacing: var(--tracking-display); }
.disc { border-radius: 50%; border: 2px solid transparent;
  background: radial-gradient(circle at 38% 34%, var(--color-disc-2), var(--color-disc) 62%) padding-box,
    conic-gradient(from 200deg, transparent 0 40%, var(--color-rim-2) 52%, var(--color-rim-1) 66% 74%, transparent 88%) border-box; }
.horizon { height: 1px; background: var(--color-ink); }
.measure { font-family: var(--font-outlier); font-variant-numeric: tabular-nums; }
.tile { background: radial-gradient(circle at 30% 30%, var(--color-disc-2), transparent 60%), radial-gradient(circle at 75% 70%, var(--color-paper-2), transparent 55%) var(--color-disc); }
.btn { border-radius: 0; padding: var(--space-sm) var(--space-md); font-weight: 500; border: 1px solid var(--color-rule); }
.btn--primary { background: var(--color-accent); color: var(--color-accent-ink); border-color: var(--color-accent); }
::selection { background: color-mix(in oklab, var(--color-accent) 35%, transparent); color: var(--color-ink); }
```
