---
name: Overprint
slug: overprint
genre: playful
paper: light 93 85
display: grotesk-heavy Anybody
accent: cool 215
posture: full-palette
keywords: venue, gigs, festival, music, label, print studio, bar, club, poster, tickets, events, nightlife, two-colour, screenprint, punk, zine, loud, listings, door
material: warm newsprint stock, a wide shouted grotesk, two transparent flat inks that print a third where they cross, tickets and stamps
signature: two flat ink shapes overlapping behind or beside the headline, the overlap printing a third colour, nothing out of register
pictured: Marquee Hero, Poster hero
---

# Overprint

Newsprint stock, Anybody set wide and heavy in caps, a teal-blue pass and an orange pass pulled as big flat shapes, and a deep olive that exists only where the two cross. Nothing is out of register: each ink sits where it was put, and the third colour is the only trick. Lists are ruled, tickets are perforated, stamps sit on a slant.

## Tokens

```css
:root {
  --color-paper: oklch(93% 0.02 85); --color-paper-2: oklch(90% 0.025 85); --color-paper-3: oklch(86% 0.03 85);
  --color-ink: oklch(18% 0.006 60); --color-ink-2: oklch(30% 0.008 60); --color-muted: oklch(45% 0.01 60);
  --color-rule: oklch(80% 0.025 85);
  --color-accent: oklch(70% 0.09 215); --color-accent-ink: oklch(18% 0.006 60); --color-focus: oklch(45% 0.08 220);
  --color-accent-2: oklch(73% 0.18 55); --color-accent-2-ink: oklch(18% 0.006 60);
  --color-mix: oklch(42% 0.09 113);
  --blend: multiply; --texture-opacity: 0.05;
  --font-display: "Anybody", ui-sans-serif, sans-serif; --font-body: "Archivo", ui-sans-serif, sans-serif;
  --font-outlier: "Archivo Narrow", ui-sans-serif, sans-serif;
  --radius-card: 0; --radius-pill: 0; --rule-hair: 1px; --rule-bar: 3px;
  --shadow-card: none;
  --tracking-display: -0.01em; --display-stretch: 140%;
}
```

Pass 1 (teal-blue) takes the main button and free; pass 2 (orange) takes sold-out; each prints one of the two big shapes. Both inks are fills under ink type, never type, and the overlap is a role nobody paints. Three stocks, stated in the stamp (`overprint: newsprint`).

| Stock | Paper and ink | The two passes |
| --- | --- | --- |
| **Newsprint** (default) | the tokens above, multiply | teal-blue and orange, crossing in olive (`--color-mix`) |
| **Kraft** | brown `oklch(79% 0.055 75)` under `oklch(22% 0.02 60)`, multiply, grain 0.05 | the same two passes; the brown darkens them, so type stays off the shapes |
| **Black stock** | `oklch(20% 0.01 280)` under `oklch(95% 0.01 90)`; the blend flips to screen so the overlap goes pale; grain 0.05 | yellow `oklch(88% 0.17 95)` and aqua `oklch(78% 0.13 200)`; fills carry the stock black, focus takes the aqua |

## Faces

- **Display:** Anybody 900, set wide (`--display-stretch`, 130 to 150%), uppercase, line-height 1.02, `--tracking-display`, from 40px for a section head to 160px for a door time; figures and prices too. Wide caps need room: a few words a line.
- **Body:** Archivo 400 and 600, 16 to 17px, line-height 1.5.
- **Small print:** Archivo Narrow 600 at 12 to 13px, sentence case, untracked, for days, hours, table heads and the stub, the theme's outlier. Captions and meta are Archivo. No mono anywhere.

## Material

- Two passes: everything coloured is pass 1 or pass 2 and blends with `--blend` where it crosses the other; a third colour only ever comes from an overlap.
- The overlap (the signature): two big flat shapes, one per pass (a disc, a bar, a slab), cross behind or beside the hero head and multiply into `--color-mix` where they meet. Nothing is offset or echoed, and the head is one colour. Type sits on paper or on one ink, never on the overlap. Grain (`texture.md` § Grain) over the stock at `--texture-opacity` is the page's one texture.
- Rules `--rule-bar` ink across the top of a list or a nav, `--rule-hair` in `--color-rule` between rows.
- A ticket carries a 2px dashed perforation and is the only container. Stamps are one-ink bordered rectangles with an inner hairline, turned 1 to 4 degrees; a stamp carries a fact, a date or a frame number, or does not appear.
- No radius, no shadow, no gradient. The control pair: a pass-1 fill in Narrow capitals, tracked 0.04em under the shouted display, beside a 2px inset ink outline.

## Motion

The press does not animate. A bill swaps its date on click; a door clock is set on load and does not tick. The shapes print once and stay; nothing reveals, floats or loops.

## Voice

The bill on the wall: the room, the door time, the price, sold out or free.

## Do-nots

- Never a third ink; the third colour is printed by the overlap, never mixed into a fill, a button or a letter.
- Never out of register: no echo, no offset copy of a word, no ghosted second head.
- Never a gradient, a shadow or a rounded corner; flat ink on cut stock.
- Never a photograph; shapes, bars, type and the overlap are the pictures.
- Never lowercase or narrow display; the heavy grotesk is shouted and wide.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Anybody:wdth,wght@100..150,900&family=Archivo:wght@400;600&family=Archivo+Narrow:wght@600&display=swap" rel="stylesheet">
```

```css
.display { font: 900 var(--text-display)/1.02 var(--font-display); font-stretch: var(--display-stretch); text-transform: uppercase; letter-spacing: var(--tracking-display); color: var(--color-ink); }
.print { position: relative; }
.print > .display { position: relative; z-index: var(--z-base); }
.pass { position: absolute; mix-blend-mode: var(--blend); pointer-events: none; }
.pass--1 { background: var(--color-accent); }
.pass--2 { background: var(--color-accent-2); border-radius: 50%; }
.small { font: 600 12.5px var(--font-outlier); color: var(--color-muted); }
.btn { padding: var(--space-md) var(--space-lg); font: 600 var(--text-sm) var(--font-outlier); letter-spacing: 0.04em; text-transform: uppercase; }
.btn--primary { background: var(--color-accent); color: var(--color-accent-ink); }
.btn--secondary { box-shadow: inset 0 0 0 2px var(--color-ink); color: var(--color-ink); }
.list { border-top: var(--rule-bar) solid var(--color-ink); } .list > li { border-bottom: var(--rule-hair) solid var(--color-rule); }
.stamp { display: inline-block; border: 2px solid var(--color-ink); outline: 1px solid var(--color-ink); outline-offset: -5px; padding: var(--space-xs) var(--space-sm); rotate: -2deg; }
::selection { background: color-mix(in oklab, var(--color-accent-2) 40%, transparent); }
```
