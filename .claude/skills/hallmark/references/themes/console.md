---
name: Console
slug: console
genre: modern-minimal
paper: dark 14 262
display: grotesk-sans Host Grotesk
accent: chromatic-amber 80
posture: restrained
keywords: lab, laboratory, protocol, science, research, observability, monitoring, version control, audit, compliance, instruments, data, devtools, engineering, telemetry, record, operations, dark, developer
material: blue-black ground in three lightness steps, Host Grotesk for reading, mono for what was measured, amber for a person and a cool blue for an instrument
signature: a hairline panel cut into a grid by 1px gaps, a reading in mono with its unit and time, and one amber button
pictured: Bento Grid, Stage hero
---

# Console

A blue-black ground stepped in three lightnesses, panels cut from one surface by 1px gaps, Host Grotesk for what a person reads and JetBrains Mono for what an instrument measured, amber for a person and cool blue for an instrument. The signature is a hairline panel grid with a mono reading beside its unit and time, and one amber button.

## Tokens

```css
:root {
  --color-paper: oklch(14% 0.012 262); --color-paper-2: oklch(17.5% 0.013 262); --color-paper-3: oklch(11% 0.011 262);
  --color-ink: oklch(96% 0.005 262); --color-ink-2: oklch(80% 0.010 262); --color-muted: oklch(66% 0.014 262);
  --color-rule: oklch(27% 0.016 262);
  --color-accent: oklch(78% 0.14 80); --color-accent-ink: oklch(16% 0.03 80); --color-accent-soft: oklch(24% 0.04 80); --color-focus: oklch(78% 0.14 80);
  --color-cool: oklch(75% 0.12 245); --color-cool-soft: oklch(24% 0.05 245);
  --color-ok: oklch(72% 0.16 150); --color-bad: oklch(66% 0.19 25);
  --font-display: "Host Grotesk", ui-sans-serif, system-ui, sans-serif; --font-body: var(--font-display);
  --font-outlier: "JetBrains Mono", ui-monospace, monospace;
  --font-document: "Source Serif 4", Georgia, serif;
  --radius-card: 10px; --radius-pill: 6px; --rule-hair: 1px;
  --shadow-card: none;
  --tracking-display: -0.035em;
}
```

One dial, the colourway, stated in the stamp (`console: night`). In every colourway amber means a person and cool means an instrument.

| Colourway | Ground | Ink | Signals |
| --- | --- | --- | --- |
| `night` (default) | oklch(14% 0.012 262) | oklch(96% 0.005 262) | amber oklch(78% 0.14 80), cool oklch(75% 0.12 245) |
| `paper` | oklch(98% 0.006 85) | oklch(19% 0.010 60) | amber oklch(54% 0.14 70), cool oklch(52% 0.14 250); paper band becomes light |
| `amber-room` | oklch(15% 0.022 70) | oklch(95% 0.012 85) | amber oklch(82% 0.15 82), cool to ice oklch(82% 0.08 200) |

## Faces

- **Display:** Host Grotesk 600, `--tracking-display`, line-height 1.05, roman.
- **Body:** Host Grotesk 400 at 16px, line-height 1.55 to 1.6, in `--color-muted`. The document: Source Serif 4 at opsz 60, weight 400, for the printed method and its letterhead only.
- **Labels, captions, table heads, chips, meta:** Host Grotesk 500 one step smaller, sentence case, in `--color-muted`. JetBrains Mono at 13px is for what an instrument or the system wrote: readings with their unit, ids, diffs, the audit log, the timer, every figure tabular.

## Material

- Hairline panels: a surface is a 1px `--color-rule` with `--color-paper-2` inside, radius 10 (6 for controls). A grid is one panel cut by 1px gaps that show the rule, never separate cards with air between them.
- Three steps, no lamp: ground at 14%, panel at 17.5%, and the deepest surface at 11% for terminals and a rail. No shadow, no glow, no bloom, no spotlight.
- Drawn data: sparklines, rings, Gantts and diffs are the pictures. No illustration, no photograph.
- The chip: Host Grotesk 500 at 11px, sentence case, inside a 1px rule at radius 4, tinted `--color-accent-soft` or `--color-cool-soft` by meaning. It carries state only; a dot inside it means live and nothing else.
- Two meanings: amber is a person (operator, deviation, current step, the one button); cool is an instrument (reading, trace, hunk header, main branch). Ok and bad exist for diffs and status only.
- The control pair: an amber fill with dark amber ink beside a 1px `--color-rule` outline on `--color-paper-2`. The app bleeds off the right edge of its frame, never a browser mock.

## Motion

Instrumental. A timer counts down once a person starts it, and its ring follows; a sparkline draws once from seeded data. No reveals, no parallax, no hover lifts, nothing that appends on its own.

## Voice

A lab notebook kept by a careful person: the value, its unit, the time, who signed. A number without a unit or a time is nothing.

## Do-nots

- Never swap the meanings; an amber sparkline or a cool deviation is the theme lying.
- Never a floating card with ground around it and a shadow under it.
- Never the serif outside the printed method and its letterhead.
- Never a stock picture of a lab; the picture is the data.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Host+Grotesk:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Source+Serif+4:opsz,wght@8..60,400&display=swap" rel="stylesheet">
```

```css
.display { font: 600 var(--text-display)/1.05 var(--font-display); letter-spacing: var(--tracking-display); }
.panel { background: var(--color-paper-2); border: 1px solid var(--color-rule); border-radius: var(--radius-card); }
.grid { display: grid; gap: 1px; background: var(--color-rule); border: 1px solid var(--color-rule); border-radius: var(--radius-card); overflow: hidden; }
.grid > * { background: var(--color-paper-2); }
.reading { font-family: var(--font-outlier); font-size: var(--text-xs); font-variant-numeric: tabular-nums; color: var(--color-cool); }
.btn { border-radius: var(--radius-pill); padding: var(--space-sm) var(--space-md); font-weight: 500; border: 1px solid var(--color-rule); background: var(--color-paper-2); }
.btn--primary { background: var(--color-accent); color: var(--color-accent-ink); border-color: var(--color-accent); }
::selection { background: color-mix(in oklab, var(--color-accent) 25%, transparent); }
```
