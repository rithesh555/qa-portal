---
name: Wayfind
slug: wayfind
genre: modern-minimal
paper: light 95 250
display: mono Space Mono
accent: cool 264
posture: committed
keywords: transit, metro, rail, station, wayfinding, departures, timetable, live, map, commute, city, platform, signage, logistics, status, operations, schedule, mobility, travel, trip, journey, itinerary, booking, flights, airport
material: cool grey paper, all-mono type, 2px ink borders, a black signage plate with amber figures, one cobalt
signature: the black sign plate with a giant amber exit number and a hazard stripe along its foot
pictured: Board and strip map (an unlisted shape), Settled hero
---

# Wayfind

Cool grey paper, all type in Space Mono and JetBrains Mono, 2px ink borders on every object, a black sign plate with a giant amber figure and a hazard stripe along its foot, and one cobalt for what is live. The mono is signage and the borders are the map.

## Tokens

```css
:root {
  --color-paper: oklch(95% 0.005 250); --color-paper-2: oklch(91% 0.008 250); --color-paper-3: oklch(99.5% 0.005 250);
  --color-ink: oklch(15% 0.01 260); --color-ink-2: oklch(28% 0.012 260); --color-muted: oklch(48% 0.015 260);
  --color-rule: oklch(82% 0.01 250); --color-plate: oklch(15% 0.01 260);
  --color-accent: oklch(52% 0.22 264); --color-accent-2: oklch(80% 0.16 85); --color-accent-ink: oklch(99.5% 0.003 250); --color-focus: oklch(52% 0.22 264);
  --font-display: "Space Mono", ui-monospace, monospace; --font-body: "JetBrains Mono", ui-monospace, monospace; --font-outlier: var(--font-body);
  --radius-card: 0; --radius-pill: 999px; --rule-hair: 1px; --rule-bar: 2px;
  --shadow-card: 0 24px 40px -24px oklch(8% 0.01 260 / 0.6);
  --tracking-display: -0.03em;
}
```

Three colourways, set once per page and named in the stamp (`wayfind: platform`).

| Colourway | Paper, ink, plate |
| --- | --- |
| `platform` (default) | the block above |
| `night` | paper `oklch(14% 0.01 260)`, ink `oklch(96% 0.005 250)`, plate `oklch(8% 0.01 260)`, rule `oklch(30% 0.012 260)`, cobalt lifts to `oklch(60% 0.2 264)` |
| `signal` | paper `oklch(52% 0.22 264)` cobalt, ink white, plate `oklch(12% 0.01 260)`, rule `oklch(75% 0.12 264)`; the cobalt button becomes the ink one |

## Faces

- **Display:** Space Mono 700, `--tracking-display`, line-height 1, up to 4.5rem, sentence case. Exit numbers and clock figures to 76px on the plate.
- **Body:** JetBrains Mono 400 and 500 at 16px, line-height 1.5, `tabular-nums` on everything. Mono is the material here: it is the signage face, so the whole page is set in it.
- **Labels, table heads, pills, buttons:** JetBrains Mono 500 or 700 at 12.5 to 14px, sentence case, untracked; the signage reads through the mono and the 2px borders, never through capitals.

## Material

- `--rule-bar` ink borders on every object (cards, plates, buttons, the underside of a nav, the table's head rule); row dividers are `--rule-hair` `--color-rule`. Zero radius except pills. Tables are the board: 62px rows, Space Mono 700 for the status and time columns, times in cobalt.
- The sign plate: a black block with a small grey label, a giant amber figure, an amber chevron and a 10px amber-and-black hazard stripe along its foot; `--shadow-card` under it, offset and blurred. The one object with a shadow.
- The app bleeds off the edge of its slot or sits in a plain `--rule-bar`-bordered plate, never inside a drawn phone bezel. Placeholders are a flat cobalt-tinted gradient inside that plate with a corner note in the label voice.
- The chevron mark: three stacked chevrons, the second at 55% and the third at 25% opacity, drawn in SVG with square caps.
- The control pair: a cobalt-filled button beside a transparent one, both `--rule-bar` ink-bordered, JetBrains Mono 700 at 14px, sentence case.
- Cobalt is for what is live (an open lift, the current stop's ring, a clock); amber is for figures (exits, minutes, platforms) and only ever on the plate or as a fill under black text. Pills carry no dot; one cobalt dot may sit on the board, and only when the board shows live data.

## Motion

Departure-board stiff: `--dur-micro` colour changes, the board's rows updating in place, no reveal on scroll. The live dot blinks once in `steps(1)` when a row updates; it never loops.

## Voice

Signage: the platform, the exit, the minute, the carriage. Imperative and short.

## Do-nots

- Never a proportional face anywhere, not even for prose.
- Never amber as a text colour on the paper; it belongs on the plate or under black text.
- Never a dot before every pill or label; one live dot on the board.
- Never rounded cards or soft grey shadows on cards; Wayfind is bordered, and only the plate casts.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
```

```css
body { font-variant-numeric: tabular-nums; }
.display { font: 700 min(var(--text-display), 4.5rem)/1 var(--font-display); letter-spacing: var(--tracking-display); text-wrap: balance; }
.label { font: 500 var(--text-xs)/1.3 var(--font-body); color: var(--color-muted); }
.btn { display: inline-flex; align-items: center; gap: var(--space-xs); padding: var(--space-md) var(--space-lg); border: var(--rule-bar) solid var(--color-ink); font: 700 var(--text-sm)/1 var(--font-body); }
.btn--primary { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-accent-ink); }
.card, .plate { border: var(--rule-bar) solid var(--color-ink); background: var(--color-paper-3); }
.sign { position: relative; padding: var(--space-md) var(--space-lg) var(--space-lg); background: var(--color-plate); color: var(--color-accent-ink); box-shadow: var(--shadow-card); }
.sign b { font: 700 76px/0.9 var(--font-display); } .sign .t { color: var(--color-accent-2); }
.sign::after { content: ""; position: absolute; left: 0; right: 0; bottom: -10px; height: 10px; background: repeating-linear-gradient(90deg, var(--color-accent-2) 0 18px, var(--color-plate) 18px 36px); }
th { border-bottom: var(--rule-bar) solid var(--color-ink); }
::selection { background: var(--color-accent-2); color: var(--color-ink); }
```
