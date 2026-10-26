---
name: Kiln
slug: kiln
genre: atmospheric
paper: dark 13 40
display: high-contrast-serif Fraunces
accent: warm 45
posture: full-palette
keywords: kiln, ceramics, pottery, firing, glaze, heat, temperature, ceramics studio, craft, sensor, monitor, hardware, iot, warmth, dark, glow, schedule, workshop
material: a near-black ground, a seven-step heat ramp from ash to white heat drawn inside grained plates, Fraunces at full optical size, one smoked plate for the controls
signature: a rounded plate whose lower corner burns from oxblood through ember to white while the page around it stays cold
pictured: Feature Stack, Stage hero
---

# Kiln

A near-black ground with cream ink, and inside its plates a grained radial ramp that runs from ash through oxblood, ember and amber to white heat, rising from one corner. Fraunces at opsz 144 heads it, Geist reads it, and the heat never leaves a plate.

## Tokens

```css
:root {
  --color-paper: oklch(13% 0.012 40); --color-paper-2: oklch(16% 0.014 40); --color-paper-3: oklch(20% 0.016 40);
  --color-ink: oklch(94% 0.02 80); --color-ink-2: oklch(84% 0.025 70); --color-muted: oklch(72% 0.03 60);
  --color-rule: oklch(96% 0.01 80 / 0.12);
  --color-accent: oklch(70% 0.2 45); --color-accent-ink: oklch(14% 0.02 40); --color-focus: oklch(76% 0.19 56);
  --heat-0: oklch(12% 0.012 40); --heat-1: oklch(22% 0.07 22); --heat-2: oklch(40% 0.16 27); --heat-3: oklch(60% 0.21 36);
  --heat-4: oklch(76% 0.19 56); --heat-5: oklch(89% 0.14 78); --heat-6: oklch(98% 0.04 95);
  --font-display: "Fraunces", "Iowan Old Style", Georgia, serif; --font-body: "Geist", ui-sans-serif, system-ui, sans-serif;
  --font-outlier: "Geist Mono", ui-monospace, monospace;
  --radius-card: 28px; --radius-pill: 999px; --rule-hair: 1px;
  --shadow-card: 0 50px 90px -30px oklch(8% 0.01 40 / 0.5);
  --tracking-display: -0.02em;
}
```

Three colourways, set once per page and named in the stamp (`kiln: ember`).

| Colourway | Ground, ink, accent |
| --- | --- |
| `ember` (default) | the block above |
| `bisque` | ground `oklch(96.5% 0.014 80)`, ink `oklch(20% 0.02 40)`, accent `oklch(54% 0.17 62)` with the ground as its text; the ramp starts at `oklch(90% 0.035 75)`; the smoked plate turns to a bone plate in paper-2 |
| `reduction` | ground `oklch(21% 0.06 22)`, ink `oklch(95% 0.02 85)`, accent `oklch(84% 0.12 62)`; the ramp begins at the ground |

## Faces

- **Display:** Fraunces 400 at `"opsz" 144`, `--tracking-display`, line-height 1.02, up to 4.5rem; the temperature readout to 7.5rem at -0.03em. Roman, one colour per head.
- **Body:** Geist 400 and 500 at 16 to 18px, line-height 1.5.
- **Labels, captions, ticks, table heads:** Geist 500 at 12 to 13px, sentence case, untracked, in `--color-muted`. Mono only inside code; readouts are Fraunces figures.

## Material

- The heat panel: a plate at `--radius-card` whose background is one radial gradient in `oklch` from `--heat-6` at a corner out through the ramp to `--heat-0`, plus a small white bloom at the same origin, under a 14% grain overlay (`texture.md` § Grain). Two such fields on a page at most (the genre's two blooms), both inside plates, never on the ground.
- The smoked plate: one flat panel in `--color-paper-2` with a 1px `--color-rule` edge and no shadow, beside a heat panel on the ground, never inside one (gate 4), never with a title bar, never blurred. Its UI fills are the ramp's cool end; the readout's figures are tabular.
- Rules 1px at 12%; radii 28px plates, 20px cones, 16px the smoked plate; the ground is flat and cold.
- The control pair: an accent-filled pill 50px tall beside a ghost pill with a 1px inset `--color-rule`. The one interactive object: a temperature slider whose 2px track and 28px thumb recolour its plate along the ramp.

## Motion

Slow and thermal: plate colours interpolate over `--dur-long` on `--ease-out` when the slider moves. Nothing else moves; the grain and the heat are static, nothing pulses.

## Voice

Calm and physical: degrees, cones, minutes, the schedule.

## Do-nots

- Never the heat gradient on the page ground or behind a headline; heat belongs inside a plate.
- Never orange type: the accent is only ever a fill (one pill, one readout's well), and every letter stays cream.
- Never a hard-edged or square plate; a heat plate is 28px or rounder.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400&family=Geist:wght@400;500&display=swap" rel="stylesheet">
```

```css
.display { font: 400 min(var(--text-display), 4.5rem)/1.02 var(--font-display); font-variation-settings: "opsz" 144; letter-spacing: var(--tracking-display); }
.plate { position: relative; overflow: hidden; border-radius: var(--radius-card); color: var(--heat-6); isolation: isolate; background-color: var(--heat-1);
  background-image: radial-gradient(in oklch 40% 30% at 86% 104%, color-mix(in oklab, var(--heat-6) 70%, transparent), transparent 70%),
    radial-gradient(in oklch 130% 120% at 88% 104%, var(--heat-6) 0%, var(--heat-5) 10%, var(--heat-4) 24%, var(--heat-3) 40%, var(--heat-2) 60%, var(--heat-1) 82%, var(--heat-0) 100%); }
.plate::after { content: ""; position: absolute; inset: 0; opacity: 0.14; mix-blend-mode: overlay; pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
.smoke { border-radius: 16px; background: var(--color-paper-2); border: 1px solid var(--color-rule); }
.btn { display: inline-flex; align-items: center; height: 50px; padding: 0 var(--space-lg); border-radius: var(--radius-pill); font-weight: 500; background: var(--color-accent); color: var(--color-accent-ink); }
.btn--ghost { background: transparent; color: var(--color-ink); box-shadow: inset 0 0 0 1px var(--color-rule); }
::selection { background: color-mix(in oklab, var(--color-accent) 35%, transparent); }
```
