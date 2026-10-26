---
name: Werkstatt
slug: werkstatt
genre: playful
paper: mid 80 80
display: geometric-sans Jost
accent: cool 265
posture: full-palette
keywords: school, programme, workshop, maker, course, bootcamp, academy, apply, admissions, tuition, timetable, bauhaus, craft, design education, design school, residency, cohort, prospectus
material: a warm putty grey ground, a blue circle, a red triangle and a yellow square, heavy geometric capitals, 2px and 3px black rules
signature: the three primary shapes cropped large beside the headline and repeated at 11px as the bullets of the lists that name the shops
pictured: Prospectus (an unlisted shape), Poster hero
---

# Werkstatt

A putty grey ground, Jost 700 capitals, a Karla body, 2px and 3px black rules, and exactly three coloured objects, a blue circle, a red triangle and a yellow square, huge beside the headline and 11px as list bullets. Each shape names a shop.

## Tokens

```css
:root {
  --color-paper: oklch(80% 0.02 80); --color-paper-2: oklch(76% 0.022 80); --color-paper-3: oklch(84% 0.018 80);
  --color-ink: oklch(18% 0.005 60); --color-ink-2: oklch(26% 0.008 60); --color-muted: oklch(38% 0.012 60);
  --color-rule: oklch(55% 0.02 70);
  --color-accent: oklch(52% 0.24 265); --color-accent-2: oklch(60% 0.2 30); --color-accent-2-deep: oklch(52% 0.2 30); --color-accent-3: oklch(84% 0.17 90);
  --color-accent-ink: oklch(96% 0.01 80); --color-focus: oklch(52% 0.24 265);
  --font-display: "Jost", "Futura", sans-serif; --font-body: "Karla", ui-sans-serif, system-ui, sans-serif;
  --font-outlier: "JetBrains Mono", ui-monospace, monospace;
  --radius-card: 0; --radius-pill: 0; --rule-hair: 1px; --rule-bar: 2px; --rule-box: 3px;
  --shadow-card: none;
  --tracking-display: -0.005em;
}
```

Three colourways, set once per page and named in the stamp (`werkstatt: putty`).

| Colourway | Ground, ink, primaries |
| --- | --- |
| `putty` (default) | the block above |
| `blackboard` | ground `oklch(17% 0.005 60)`, ink `oklch(90% 0.015 80)`, rule `oklch(38% 0.01 60)`, primaries a step brighter; putty returns as a plate colour |
| `blue` | ground `oklch(50% 0.22 265)`, ink `oklch(93% 0.02 85)`, rule `oklch(64% 0.14 265)`; the circle becomes putty and the yellow square does the work of the accent |

## Faces

- **Display:** Jost 700, uppercase, `--tracking-display`, line-height 1.02, up to 6.5rem in the hero and 2.75rem for section heads; the wordmark at 15px tracked 0.04em.
- **Body:** Karla 400 at 16px, line-height 1.5; subheads at 20px.
- **Labels, captions, tags, table heads:** Karla 600 at 12.5 to 13px, sentence case, untracked, in `--color-muted`. Mono only inside code; timetable cells and prices are Karla with `tabular-nums`.

## Material

- Rules do the structure: `--rule-box` ink lines box the shops grid and cross it, `--rule-bar` ink under a nav and over every table, `--rule-hair` `--color-rule` between rows. No card has a background; a cell is what the rules enclose.
- The three shapes, drawn in CSS (a circle by radius, a triangle by clip-path, a square with an 8 degree tilt): at 150 to 220px as cropped forms beside the headline and shop names; at 11px as the bullets of a list whose items belong to the shops, each colour one shop (a list of one kind takes no bullets); a 4px ink line is the fourth shop's mark.
- Zero radius, zero shadow, no texture; the only gradient is a warm grey ramp inside a placeholder with a tag in its corner. A drawn building is 2px isometric ink lines, never shaded.
- The control pair: a transparent `--rule-bar` ink-bordered button beside an ink-filled one, both uppercase Karla 600 at 13px tracked 0.04em, following the display's capitals; on a dark band the filled one turns yellow with ink type, the same primary in that band's colour, not a third control (the stamp answers F4).
- The timetable: a grid with 92px rows coloured per shop and an outlined cell for open bench time. Blue and red cells take the light ink `--color-accent-ink`, the red deepened to `--color-accent-2-deep`; the yellow cell takes black type, the black cell putty.

## Motion

Static, like a printed prospectus. Hover thickens a link's underline from 2px to 3px; the shapes never move, unless the user asks for motion: then they settle once on load and nothing loops.

## Voice

Plain school prose: the shop, the week, the tuition, the deadline.

## Do-nots

- Never a fourth colour, a tint of a primary, or a primary used as type.
- Never a radius on a shape's container or a button; the circle is the only curve.
- Never mixed-case display; Jost here is capitals.
- Never the shapes as confetti or a pattern; each appearance means a shop.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@500;700&family=Karla:wght@400;600&display=swap" rel="stylesheet">
```

```css
.display { font: 700 var(--text-display)/1.02 var(--font-display); text-transform: uppercase; letter-spacing: var(--tracking-display); text-wrap: balance; }
.label { font: 600 12.5px/1.3 var(--font-body); color: var(--color-muted); }
.btn { display: inline-flex; align-items: center; gap: var(--space-xs); padding: var(--space-md) var(--space-lg); border: var(--rule-bar) solid var(--color-ink); font: 600 13px/1 var(--font-body); letter-spacing: 0.04em; text-transform: uppercase; color: var(--color-ink); }
.btn--primary { background: var(--color-ink); color: var(--color-paper); }
.sh { display: inline-block; width: 11px; height: 11px; vertical-align: middle; }
.sh--c { border-radius: 50%; background: var(--color-accent); }
.sh--t { background: var(--color-accent-2); clip-path: polygon(50% 0, 100% 100%, 0 100%); }
.sh--s { background: var(--color-accent-3); rotate: 8deg; }
.cell--blue { background: var(--color-accent); color: var(--color-accent-ink); } .cell--red { background: var(--color-accent-2-deep); color: var(--color-accent-ink); }
.cell--yellow { background: var(--color-accent-3); color: var(--color-ink); } .cell--black { background: var(--color-ink); color: var(--color-paper); }
.grid { border-top: var(--rule-box) solid var(--color-ink); border-bottom: var(--rule-box) solid var(--color-ink); }
table { border-top: var(--rule-bar) solid var(--color-ink); } td { border-bottom: var(--rule-hair) solid var(--color-rule); }
::selection { background: var(--color-accent-3); color: var(--color-ink); }
```
