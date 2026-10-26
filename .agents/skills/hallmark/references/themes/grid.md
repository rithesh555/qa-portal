---
name: Grid
slug: grid
genre: editorial
paper: light 99 255
display: grotesk-heavy Archivo
accent: warm 28
posture: committed
keywords: identity, brand system, wayfinding, signage, design studio, type specimen, editorial grid, institution, museum, archive, index, directory, systems, modular, swiss, grotesque, manual, programme, poster
material: a cool near-white sheet with an exposed 12-column hairline grid, one heavy lowercase grotesk, one signal ink spent on geometry
signature: the visible column rails running behind everything, including across the one flooded plate
pictured: Index-First, Ledge hero
---

# Grid

A cool near-white sheet with its 12-column hairline grid left visible, Archivo 800 run lowercase at giant size, one signal ink spent entirely on constructed geometry. The signature is the visible column rails running behind everything, including across the one flooded plate.

## Tokens

```css
:root {
  --color-paper: oklch(99% 0.005 255); --color-paper-2: oklch(97.2% 0.005 255); --color-paper-3: oklch(94.5% 0.005 255);
  --color-ink: oklch(16% 0.010 255); --color-ink-2: oklch(26% 0.010 255); --color-muted: oklch(48% 0.012 255);
  --color-rule: oklch(88% 0.006 255);
  --color-accent: oklch(54% 0.21 28); --color-accent-ink: oklch(99% 0.005 255); --color-focus: oklch(54% 0.21 28);
  --font-display: "Archivo", ui-sans-serif, system-ui, sans-serif; --font-body: var(--font-display);
  --font-outlier: ui-monospace, monospace;
  --radius-card: 0; --radius-pill: 0; --rule-hair: 1px; --shadow-card: none;
  --tracking-display: -0.015em; --display-weight: 800;
}
```

One dial, the signal ink, stated in the stamp (`grid: red`). `--color-focus` follows the ink.

| Ink | Value | Register | On the plate |
| --- | --- | --- | --- |
| **red** (default) | `oklch(54% 0.21 28)` | cultural, editorial, civic | paper text on an ink flood |
| **ultramarine** | `oklch(45% 0.19 264)` | technical, institutional, engineering | paper text on an ink flood |
| **yellow** | `oklch(82% 0.17 95)` | industrial, archive, logistics | surface only: floods plates and marks under ink text; never yellow type |

## Faces

- **Display:** Archivo 800, lowercase, `clamp(52px, 10.5vw, 136px)`, `--tracking-display`, line-height 1.0, slammed to the left margin and edge-aligned to the rails.
- **Body:** Archivo 400 at 16px, line-height 1.5. One family; discipline comes from weight, scale and tracking, never from a second face.
- **Labels, captions, table heads, meta, folios, units:** Archivo 500 at 13px, sentence case, `--color-muted`. Figures take `tabular-nums` in Archivo; mono appears only on figures that compare, if at all.
- **The numeral voice:** Archivo 800 numerals at `clamp(7.5rem, 22vw, 18rem)` as objects, cropped by the band edge, at 6 to 10% ink, only when the numeral is a real figure (an issue, a year, a chapter) and a caption says which. One per page; art, not a heading.

## Material

- The exposed 12-column hairline grid is the theme: a `repeating-linear-gradient` of 1px `--color-rule` every twelfth, painted behind the content and capped to the shell width; content rides `repeat(12, minmax(0, 1fr))` on top. The rails are content, never scaffolding to delete.
- The marks kit, every mark snapped to a column track or a type metric, under 5% painted area per viewport: the period square (0.52em), the 3px bar cut to a column width, the register mark (a 1px circle with a crosshair), the quarter-disc in a cell corner, stepped bars on the tracks, one 45-degree diagonal.
- The plate, at most one per page: a full-bleed band flooded in the ink or near-black, carrying the poster moment. The rails continue across it at 12 to 18% paper alpha; zero radius, zero shadow, flush against the rules above and below.
- Hairlines and ink rules do all the structure, zero cards: a solid ink rule tops a section; repeated units are equal cells divided by `border-inline-start` hairlines.
- Asymmetric occupancy: running text never spans more than 6 of the 12 columns; the rest carries the band's object or stays empty as designed air, and the occupied side holds down the page, mirrored once at most.
- The control pair: an ink-filled square block with paper text beside a 1px ink-outlined block whose outline moves to the signal ink on hover. `::selection` is the ink on paper (ink on yellow).

## Motion

Grid-snapped, `--dur-short` on `--ease-out`, no scroll reveals, no parallax. Hover gives a link one answer: a row shifts to `--color-paper-2`, or a mark inside it takes a snapped transform (a quarter-disc rotates 90 degrees, a stepped bar extends one track).

## Voice

Rational, institutional: name the system, the place, the year.

## Do-nots

- Never hide the rails, including across the plate; deleting them as scaffolding removes the theme.
- Never uppercase display and never a second family.
- Never two inks on one page and never a second plate.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;800&display=swap" rel="stylesheet">
```

```css
.rails { position: absolute; inset: 0; z-index: 0; pointer-events: none; box-sizing: border-box; max-width: var(--container); margin-inline: auto; padding-inline: var(--gutter);
  background: repeating-linear-gradient(to right, var(--color-rule) 0 1px, transparent 1px calc(100% / 12)) content-box; }
h1, h2 { font: var(--display-weight) clamp(52px, 10.5vw, 136px)/1 var(--font-display); letter-spacing: var(--tracking-display); text-transform: lowercase; }
.plate { background: var(--color-accent); color: var(--color-accent-ink); position: relative; overflow: clip; }
.plate::before { content: ""; position: absolute; inset: 0; pointer-events: none;
  background-image: repeating-linear-gradient(to right, color-mix(in oklab, var(--color-paper) 15%, transparent) 0 1px, transparent 1px calc(100% / 12)); }
.btn--secondary { border-radius: 0; border: 1px solid var(--color-ink); transition: border-color var(--dur-short) var(--ease-out); } .btn--secondary:hover { border-color: var(--color-accent); }
::selection { background: var(--color-accent); color: var(--color-accent-ink); }
```
