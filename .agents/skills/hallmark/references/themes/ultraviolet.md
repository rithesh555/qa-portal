---
name: Ultraviolet
slug: ultraviolet
genre: modern-minimal
paper: light 95 300
display: geometric-sans Outfit
accent: cool 290
posture: committed
keywords: music, audio, stems, remix, dj, producer, player, streaming, tempo, playlist, creator, app, consumer, lowercase, violet, sound, beats, recording studio
material: lavender paper, one saturated violet, Outfit set lowercase, pills, a drawn record and a bar waveform
signature: a lowercase headline beside a vinyl disc whose label is the only violet fill
pictured: Map / Diagram, Stage hero, in the night colourway
---

# Ultraviolet

Lavender paper tinted the same hue as the ink, one saturated violet that fills one control and the record label, Outfit set lowercase on every head and control, pills throughout, a drawn vinyl disc and a bar waveform. The colour is one pigment and the depth is a hairline.

## Tokens

```css
:root {
  --color-paper: oklch(95% 0.02 300); --color-paper-2: oklch(92% 0.03 300); --color-paper-3: oklch(89% 0.035 300);
  --color-ink: oklch(18% 0.02 300); --color-ink-2: oklch(28% 0.03 300); --color-muted: oklch(46% 0.05 300);
  --color-rule: oklch(84% 0.04 300); --color-dim: oklch(82% 0.04 300);
  --color-accent: oklch(50% 0.25 290); --color-accent-ink: oklch(97% 0.01 300); --color-focus: oklch(50% 0.25 290);
  --font-display: "Outfit", ui-sans-serif, system-ui, sans-serif; --font-body: "Onest", ui-sans-serif, sans-serif;
  --font-outlier: "JetBrains Mono", ui-monospace, monospace;
  --radius-card: 16px; --radius-pill: 999px; --rule-hair: 1px;
  --shadow-card: 0 1px 2px oklch(18% 0.02 300 / 0.06);
  --tracking-display: -0.025em;
}
```

Three colourways, set once per page and named in the stamp (`ultraviolet: lavender`).

| Colourway | Paper, ink, accent |
| --- | --- |
| `lavender` (default) | the block above |
| `record` | ground `oklch(50% 0.25 290)`, ink `oklch(95% 0.02 300)`, the accent turns white `oklch(99% 0.005 300)` with violet text on it, rule `oklch(62% 0.2 290)` |
| `night` | ground `oklch(14% 0.02 290)`, ink `oklch(92% 0.04 300)`, accent `oklch(55% 0.25 290)`, the waveform lit in `oklch(66% 0.24 290)`, rule `oklch(28% 0.04 290)` |

## Faces

- **Display:** Outfit 500, lowercase, `--tracking-display`, line-height 1, up to 5rem; the wordmark at 600. Lowercase is the material: heads, nav, buttons and pills never carry a capital.
- **Body:** Onest 400 and 500, sentence case, 16 to 20px, line-height 1.5. Prose is the one place a capital appears.
- **Labels, captions, folios, table heads:** Outfit 500 at 13 to 14px, lowercase, untracked, in `--color-muted`; figures in Outfit with `tabular-nums`. Mono only inside code.

## Material

- Hairlines: 1px `--color-rule` between list rows and under a nav; pills and outlined controls carry 1.5px. No borders on cards; a surface is a step to `--color-paper-2`.
- Pills for every control and chip at `--radius-pill`; slots at 16px; nothing square. The app bleeds off the edge of its slot or sits in a plain 16px plate, never inside a drawn phone bezel.
- The control pair: a violet-filled pill (`--color-accent` with `--color-accent-ink` text) beside an inset-outlined one (`box-shadow: inset 0 0 0 1.5px var(--color-ink)`).
- The waveform: a row of 2px bars in `--color-dim` with the played portion in `--color-accent`, drawn as SVG rects, never an image; it sits inside list rows, tempo readouts and slots.
- The record: a drawn vinyl disc (a near-black face, concentric groove strokes, a violet label with lowercase Outfit text, a paper-coloured spindle hole), the theme's one illustration. It stands beside the headline or inside a slot; it never spins in a loop.
- Shadow stance: none on paper, the whisper `--shadow-card` under a raised plate. No texture, no blur, no gradient; the placeholder recipe is two violet radial fields inside a slot only, and the flat paper step on night.

## Motion

Quick and dry: `--dur-micro` colour transitions on pills, a tempo slider that updates a figure live, one settle of the hero over `--dur-long` from an already-visible default. The disc is a picture: it never turns on hover.

## Voice

Lowercase, short, exact: the bar count, the key, the percent, the price. It talks like a producer, not a label.

## Do-nots

- Never a capital in a head, a nav link or a button; a mixed-case head breaks the theme faster than a wrong colour.
- Never a second chromatic colour; the waveform, the label and one pill share the violet, everything else is ink and lavender.
- Never a purple-to-pink gradient, a mesh or a glow behind the disc.
- Never square controls or 4px radii; Ultraviolet is round.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600&family=Onest:wght@400;500&display=swap" rel="stylesheet">
```

```css
.display { font: 500 min(var(--text-display), 5rem)/1 var(--font-display); letter-spacing: var(--tracking-display); text-transform: lowercase; text-wrap: balance; }
.pill, .btn { display: inline-flex; align-items: center; gap: var(--space-xs); border-radius: var(--radius-pill); font: 500 15px/1 var(--font-display); text-transform: lowercase; }
.btn { padding: var(--space-md) var(--space-lg); } .pill { padding: var(--space-xs) var(--space-md); box-shadow: inset 0 0 0 1.5px var(--color-rule); }
.btn--primary { background: var(--color-accent); color: var(--color-accent-ink); }
.btn--secondary { box-shadow: inset 0 0 0 1.5px var(--color-ink); color: var(--color-ink); }
.wave rect { fill: var(--color-dim); } .wave rect.on { fill: var(--color-accent); }
.disc .face { fill: var(--color-ink); } .disc .groove { fill: none; stroke: var(--color-ink-2); } .disc .label { fill: var(--color-accent); } .disc .hole { fill: var(--color-paper); }
::selection { background: color-mix(in oklab, var(--color-accent) 25%, transparent); }
```
