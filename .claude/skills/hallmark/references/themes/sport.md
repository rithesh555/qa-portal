---
name: Sport
slug: sport
genre: editorial
paper: light 98 250
display: display-condensed Saira Condensed
accent: chromatic-volt 120
posture: restrained
keywords: running, marathon, race, training, fitness, gym, team, league, fixtures, standings, scoreboard, athletics, performance, splits, sportswear, club, match, tournament
material: cool concrete paper, blue-black ink, uppercase Saira Condensed, tabular mono figures, one volt stripe
signature: a split-time figure set larger than its label beside a single volt lane stripe
pictured: Stat-Led, Ledge hero
---

# Sport

Cool concrete paper, blue-black ink, Saira Condensed 700 uppercase heads, JetBrains Mono tabular figures set larger than their labels, and one volt lane stripe as the page's only colour. Volt is a fill: ink sits on it, and it never sets a letter on paper.

## Tokens

```css
:root {
  --color-paper: oklch(98% 0.005 250); --color-paper-2: oklch(95.5% 0.005 250); --color-paper-3: oklch(92.5% 0.005 250);
  --color-ink: oklch(16% 0.080 260); --color-ink-2: oklch(22% 0.060 258); --color-muted: oklch(50% 0.020 250);
  --color-rule: oklch(78% 0.008 250); --color-rule-2: oklch(36% 0.060 255);
  --color-accent: oklch(88% 0.200 120); --color-accent-ink: oklch(16% 0.080 260); --color-accent-deep: oklch(58% 0.145 125);
  --color-focus: oklch(58% 0.145 125);
  --font-display: "Saira Condensed", sans-serif; --font-body: "Albert Sans", ui-sans-serif, sans-serif;
  --font-outlier: "JetBrains Mono", ui-monospace, monospace;
  --radius-card: 4px; --radius-pill: 4px; --rule-hair: 1px; --rule-bar: 2px;
  --shadow-card: none;
  --tracking-display: -0.015em; --display-weight: 700;
}
```

## Faces

- **Display:** Saira Condensed 700, uppercase, `--tracking-display`, line-height 1.02; upright, roman. A true condensed design, so the caps stack without crowding; the tension is in the caps and tracking, not a slant.
- **Body:** Albert Sans 400 and 500 at a 58ch measure.
- **Figures:** JetBrains Mono with `font-variant-numeric: tabular-nums` for times, splits, scores and distances, set larger than the label beside them. The stopwatch voice: the only place mono goes, a measurement, not the material.
- **Labels, captions, table heads, meta, units, bib tags:** Albert Sans 500 one step smaller, sentence case, `--color-muted`; on a volt fill every word is the ink.

## Material

- The two-weight rule system, never boxed cards: `--rule-hair` hairlines rule rows and grids; the `--rule-bar` rule in `--color-rule-2` frames a figure and breaks a section. Depth from rules, never shadows.
- The single lane stripe: one vertical or diagonal volt bar (a lane, a finish line) in `--color-accent`, pure CSS, placed once as the page's kinetic graphic, never repeated.
- Radius 4px on a control; no pills, no hard-offset shadow, no gradient, no texture: concrete is a colour, not a photograph.
- The volt under 5% and always a fill under ink: a bib number, one primary control, an active row, the stripe. A link underline or any mark on paper that must read takes `--color-accent-deep`, which holds 3:1. The control pair: a volt-filled block with ink text beside one bordered 2px in ink, both 4px.
- The object family: the results board. A standings table, a split readout, a race-bib crop, a fixtures list, each ruled hairline and closed with the bar rule, figures in mono.

## Motion

Nothing moves except state: a deep-volt underline grows under a link on hover, a row lifts one paper step. No count-ups, no reveal, no parallax.

## Voice

Imperative, kinetic, numbered. Caps on the head, sentence case in the body. Numerals over words; verbs and numbers, not adjectives.

## Do-nots

- Never slant the display; the lean comes from tracking and layout.
- Never loosen the display tracking past zero, and never tighten it until two capitals touch; a true condensed face already sits close.
- Never warm paper; the ground is cool concrete, hue 250.
- Never volt type, a volt hairline on paper, a second accent or a duotone; one volt, as a fill.
- Never stadium skeuomorphism: no grass, jersey mesh, medal or trophy.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@700&family=Albert+Sans:wght@400;500&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
```

```css
.display { font: var(--display-weight) var(--text-display)/1.02 var(--font-display); text-transform: uppercase; letter-spacing: var(--tracking-display); color: var(--color-ink); }
.figure { font: 500 var(--text-2xl)/1 var(--font-outlier); font-variant-numeric: tabular-nums; color: var(--color-ink); }
.rule { border-top: var(--rule-bar) solid var(--color-rule-2); }
.board tr { border-top: var(--rule-hair) solid var(--color-rule); }
.lane { position: absolute; inset-block: 0; width: 12px; background: var(--color-accent); }
.btn { border-radius: var(--radius-card); padding: var(--space-sm) var(--space-lg); border: var(--rule-bar) solid transparent; font: 700 var(--text-md)/1.25 var(--font-display); text-transform: uppercase; }
.btn--primary { background: var(--color-accent); color: var(--color-accent-ink); }
.btn--secondary { border: 2px solid var(--color-ink); color: var(--color-ink); }
a:hover { text-decoration-color: var(--color-accent-deep); }
::selection { background: var(--color-accent); color: var(--color-ink); }
```
