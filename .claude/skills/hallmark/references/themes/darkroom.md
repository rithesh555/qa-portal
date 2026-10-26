---
name: Darkroom
slug: darkroom
genre: atmospheric
paper: dark 9 30
display: display-condensed Sofia Sans Extra Condensed
accent: chromatic-amber 68
posture: restrained
keywords: photographer, photography, film, analogue, darkroom, prints, portfolio, exhibition, gallery, edition, commission, cinematographer, negative, archive, monochrome, lab, moody, black and white, night, print shop, travel, places, destination, journey, landscape, portrait, headshot, photo studio
material: near-black wall with a fine grain, hairline extra-condensed capitals, one amber safelight, greyscale prints hung edge to edge
signature: prints hung edge to edge on the near-black wall at one height, each with its plate number and date beneath in the body face
pictured: Photographic, Ledge hero
---

# Darkroom

A near-black wall under a fine grain, Sofia Sans Extra Condensed capitals at hairline weights, Barlow for reading, one amber safelight. The signature is the hang: greyscale prints edge to edge at one height, plate number and date beneath each. A print room, not a film-strip costume.

## Tokens

```css
:root {
  --color-paper: oklch(9% 0.005 30); --color-paper-2: oklch(13% 0.005 30); --color-paper-3: oklch(17% 0.005 30);
  --color-ink: oklch(94% 0.006 60); --color-ink-2: oklch(84% 0.006 60); --color-muted: oklch(62% 0.008 50);
  --color-rule: oklch(24% 0.006 30);
  --color-accent: oklch(78% 0.16 68); --color-accent-deep: oklch(50% 0.105 68); --color-accent-ink: oklch(9% 0.005 30); --color-focus: oklch(78% 0.16 68);
  --g0: oklch(10% 0.006 260); --g1: oklch(24% 0.008 260); --g2: oklch(48% 0.008 260); --g3: oklch(66% 0.008 260); --g4: oklch(84% 0.006 260); --g5: oklch(96% 0.005 260);
  --font-display: "Sofia Sans Extra Condensed", ui-sans-serif, sans-serif; --font-body: "Barlow", ui-sans-serif, sans-serif;
  --font-outlier: "Overpass Mono", ui-monospace, monospace;
  --radius-card: 0; --radius-pill: 0; --rule-hair: 1px; --shadow-card: none;
  --tracking-display: -0.005em; --grain: 0.08;
}
```

Three colourways, stated in the stamp (`darkroom: amber`).

| Colourway | Ground, ink, signal |
| --- | --- |
| **amber** (default) | the tokens above |
| **red** | the same ground and ink; signal the red safelight `oklch(62% 0.19 32)`, deep `oklch(44% 0.16 32)` |
| **fibre paper** | ground `oklch(95% 0.01 80)`, ink `oklch(14% 0.006 40)`, muted `oklch(46% 0.01 50)`, signal `oklch(50% 0.2 30)`, rule `oklch(80% 0.014 70)`; grain at 0.16 |

## Faces

- **Display:** Sofia Sans Extra Condensed uppercase, 200 at poster size and 400 on a smaller head, line-height 1.0 (the floor for capitals that wrap, 55a), `--tracking-display`, roman, one weight per head. The hairline at scale is the look and it is never bolded.
- **Body:** Barlow 300 for prose, 400 under 16px, roman throughout. Controls follow the display's capitals in its 400 at 16px, tracked 0.04em.
- **Labels, captions, table heads, meta:** Barlow 400 one step smaller, sentence case; the plate number and date under a print are this voice. Overpass Mono sets exposure figures (stop, seconds, grade), negative and edition numbers, and code; never a caption.

## Material

- Grain once, fixed, over the whole page at `--grain`: the speck recipe of texture.md § 1 with light specks, since dark specks vanish on the wall. No vignette, no bloom, no amber wash; depth is lightness, ground 9, plate 13, surface 17.
- The hang, the one object family: prints butted edge to edge in a row, all one height so tops and bottoms run level, widths following each picture's ratio; no frame, no mat, no gap. Beneath each, its plate number and date, flush with the print's left edge. A series whose prints have not arrived is a row of slots only when the user said leave slots: stamp `waive 68` and name the series.
- A print is greyscale: a photograph under `filter: grayscale(1)`, or a placeholder graded within `--g0` to `--g5`. A step wedge appears only on a photography page, and only as a scale that measures something real (a paper grade, a test strip's seconds).
- The safelight is scarce: a line, a figure, a caption on hover and the one filled control. `--color-accent-deep` is the quieter fill, under ink text.
- The control pair: a 1px ink-outlined secondary beside an amber-filled primary with ground-coloured text, uppercase, radius 0.
- A stamp carries a fact, a date or a plate number, or does not appear.

## Motion

Still as a print. A print may come up from `--g1` to full over `--dur-long` once, as in the tray; hover on a print that links moves its caption to the accent.

## Voice

Lab notes: the roll, the frame, the grade, the minute. Exact numbers, short lines.

## Do-nots

- Never an amber wash, band or glow.
- Never a sprocket hole, a film strip, a grease-pencil ring or a step wedge as ornament; the hang is the picture.
- Never Sofia Sans Extra Condensed above 400 for a head; the hairline is the head.
- Never sepia, duotone or a colour tint on a picture; prints are greyscale.
- Never a rounded corner, a mat or a shadow on a print; it hangs bare.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Sofia+Sans+Extra+Condensed:wght@200;400&family=Barlow:wght@300;400&family=Overpass+Mono:wght@400&display=swap" rel="stylesheet">
```

```css
.display { font-family: var(--font-display); font-weight: 200; text-transform: uppercase; line-height: 1; letter-spacing: var(--tracking-display); }
.hang { display: flex; align-items: flex-start; }
.print { flex: var(--r, 1.5) 1 0; min-width: 0; margin: 0; }
.print > [data-slot] { aspect-ratio: var(--r, 1.5); background: linear-gradient(165deg, var(--g4), var(--g2) 55%, var(--g0)); }
.print img { filter: grayscale(1); }
.print figcaption { padding-top: var(--space-xs); font: 400 var(--text-xs)/1.4 var(--font-body); color: var(--color-muted); }
.print:has(a):hover figcaption { color: var(--color-accent); }
@media (max-width: 40rem) { .hang { flex-wrap: wrap; } .print { flex-basis: 100%; } }
.btn { font-family: var(--font-display); font-weight: 400; font-size: var(--text-md); letter-spacing: 0.04em; text-transform: uppercase; padding: var(--space-sm) var(--space-lg); border: 1px solid var(--color-ink); color: var(--color-ink); background: transparent; }
.btn--primary { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-accent-ink); }
::selection { background: color-mix(in oklab, var(--color-accent) 35%, transparent); }
```
