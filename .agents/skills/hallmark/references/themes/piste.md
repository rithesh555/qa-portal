---
name: Piste
slug: piste
genre: playful
paper: light 98.5 260
display: display-condensed Barlow Condensed
accent: cool 265
posture: committed
keywords: ski, mountain, resort, snow, winter, outdoor, sport, trail, lift, race, alpine, tickets, season pass, conditions, weather, club, active, bold
material: snow-white paper, cobalt runs and buttons, black condensed caps, blue and red and black grade marks, one cobalt band sweeping the hero
signature: a headline in condensed black caps beside a mountain profile drawn in ink, with the runs on it in cobalt
pictured: Marquee Hero, Ledge hero
---

# Piste

Snow-white paper, Barlow Condensed 800 caps in black, cobalt for the runs, the band and the buttons, and blue, red and black grade discs doing the only other colour work. The mountain is one ink polyline with cobalt runs on it, never a photograph.

## Tokens

```css
:root {
  --color-paper: oklch(98.5% 0.005 260); --color-paper-2: oklch(96% 0.005 260); --color-paper-3: oklch(92% 0.006 260);
  --color-ink: oklch(16% 0.01 260); --color-ink-2: oklch(28% 0.012 260); --color-muted: oklch(50% 0.015 260);
  --color-rule: oklch(90% 0.006 260);
  --color-accent: oklch(52% 0.25 265); --color-accent-ink: oklch(98.5% 0.004 260); --color-focus: oklch(58% 0.22 28);
  --color-field: var(--color-accent); --color-grade-red: oklch(58% 0.22 28);
  --font-display: "Barlow Condensed", ui-sans-serif, sans-serif; --font-body: "Barlow", ui-sans-serif, sans-serif;
  --font-outlier: "JetBrains Mono", ui-monospace, monospace;
  --radius-card: 0; --radius-pill: 0; --rule-hair: 1px; --rule-bar: 2px;
  --shadow-card: 0 30px 60px -40px oklch(16% 0.01 260 / 0.5);
  --tracking-display: -0.005em;
}
```

Committed: cobalt is `--color-field` and carries a band, a column and a block; the accent on buttons and runs stays a signal. Three grounds, stated in the stamp (`piste: snow`).

| Ground | Paper and ink | Cobalt and the marks |
| --- | --- | --- |
| **Snow** (default) | near-white under near-black | cobalt runs and buttons; blue, red and black grades |
| **Blue run** | cobalt `oklch(52% 0.25 265)` under white ink; the report card is a white plate on an `18px 18px 0` offset in darker cobalt | white does the run work, black stands in for red |
| **Night piste** | `oklch(14% 0.01 260)` under white ink, 2px white rules | cobalt `oklch(56% 0.25 265)` and red `oklch(60% 0.23 28)` |

## Faces

- **Display:** Barlow Condensed 800, uppercase, line-height 1.0 when a head can wrap (55a) and 0.92 only on a single nowrap line, `--tracking-display`, up to 7.25rem on a poster-scale hero; every head and every figure. Roman.
- **Body:** Barlow 400 and 500, 16 to 19px, line-height 1.5.
- **Signs and buttons:** Barlow Condensed 800, uppercase, tracked 0.04em, 16px, following the display's capitals. Table heads, captions and meta: Barlow 500 one step smaller, sentence case, untracked. No mono outside code.

## Material

- Rules `--rule-bar` ink under a table's head and under a nav; `--rule-hair` in paper-3 between rows. Radius 0: signs are cut, tables are ruled, cards are rare.
- The sign: a strip of condensed caps with one end cut to a point by clip-path, filled cobalt, red or black, or outlined 2px. Signs are the nav items, in the display's capitals at 16px or more tracked 0.04em at most; a tag smaller than that is a sign in sentence case, untracked (67).
- Grade marks: 10px discs in blue, red or black that mean a piste's grade and nothing else. A disc never decorates a label.
- The mountain: one SVG polyline of six to ten points in ink for the profile and two or three curved cobalt paths for the runs on it; that is the whole drawing, under 40 lines. Snow-depth bars are plain rects. The cobalt band sweeping the hero is a single wide SVG path.
- Shadow: none on chrome; the soft `--shadow-card` under the one framed report.
- The control pair: a cobalt fill with paper text beside a 2px inset ink outline, both in condensed caps tracked 0.04em. Objects: a price grid with the day column filled in cobalt, a report card with a stamp turned 6 degrees (a stamp carries a fact, a date or a frame number, or does not appear), a piste table.

## Motion

Signage holds still. A sign's point shifts 2px on hover; nothing draws in, loops or follows the scroll.

## Voice

The morning report: the hour, the depth in centimetres, the lifts open, the run by name. Never a slogan about freedom.

## Do-nots

- Never lowercase display or a light condensed; Barlow Condensed at 800.
- Never a photograph as the hero visual; the profile is drawn and the photo lives in a slot.
- Never cobalt on running text or as a card fill on snow paper.
- Never a fourth mark colour; blue, red and black are grades.
- Never a rounded sign or a pill button; everything is cut straight or to a point.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@800&family=Barlow:wght@400;500&display=swap" rel="stylesheet">
```

```css
.display { font: 800 var(--text-display)/1 var(--font-display); text-transform: uppercase; letter-spacing: var(--tracking-display); text-wrap: balance; }
.sign { display: inline-flex; align-items: center; height: 34px; padding: 0 var(--space-lg) 0 var(--space-sm); font: 800 var(--text-md) var(--font-display); letter-spacing: 0.04em; text-transform: uppercase;
  background: var(--color-accent); color: var(--color-accent-ink); clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%); }
.grade { display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: var(--color-accent); }
.profile { fill: none; stroke: var(--color-ink); stroke-width: 2; stroke-linejoin: round; } .run { fill: none; stroke: var(--color-accent); stroke-width: 3; }
.btn { padding: var(--space-md) var(--space-lg); font: 800 var(--text-md) var(--font-display); letter-spacing: 0.04em; text-transform: uppercase; }
.btn--primary { background: var(--color-accent); color: var(--color-accent-ink); }
.btn--secondary { box-shadow: inset 0 0 0 var(--rule-bar) var(--color-ink); color: var(--color-ink); }
th { border-bottom: var(--rule-bar) solid var(--color-ink); font: 500 var(--text-sm) var(--font-body); text-align: left; }
::selection { background: color-mix(in oklab, var(--color-accent) 30%, transparent); }
```
