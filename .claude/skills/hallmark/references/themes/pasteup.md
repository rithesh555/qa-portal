---
name: Paste-up
slug: pasteup
genre: playful
paper: mid 82 80
display: display-condensed League Gothic
accent: cool 250
posture: committed
keywords: zine, fair, market, festival, print fair, book fair, exhibitors, riso, punk, diy, collective, gig, poster, workshop, night market, flea, indie, community, launch, loud
material: kraft board with a fibre wash, the headline cut into ink strips and taped down at a slight tilt, one photocopier blue, a round sticker, a rubber stamp, halftone prints, a serif galley for the reading
signature: the headline pasted up as tilted ink strips held down with tape, every strip the same ink
pictured: Marquee Hero, Poster hero
---

# Paste-up

Kraft board under a fibre wash, the headline pasted up as tilted ink strips held down with tape, a Newsreader galley for the reading, one photocopier blue for the sticker, the stamp, the margin scrawl and the one primary button. No strip is set apart: every one is the same ink, and the head reads as one colour.

## Tokens

```css
:root {
  --color-paper: oklch(82% 0.03 80); --color-paper-2: oklch(74% 0.035 80); --color-paper-3: oklch(97% 0.01 90);
  --color-ink: oklch(18% 0.01 60); --color-ink-2: oklch(28% 0.012 60); --color-muted: oklch(36% 0.02 60);
  --color-rule: oklch(60% 0.03 75);
  --color-accent: oklch(43% 0.12 250); --color-accent-ink: oklch(97% 0.01 90);
  --color-tape: oklch(88% 0.09 95 / 0.72); --color-focus: oklch(43% 0.12 250);
  --font-display: "League Gothic", Impact, sans-serif; --font-body: "Newsreader", Georgia, serif;
  --font-outlier: "Space Mono", ui-monospace, monospace;
  --radius-card: 0; --radius-pill: 999px; --rule-hair: 1px;
  --shadow-card: 0 1px 0 oklch(18% 0.01 60 / 0.18), 0 4px 10px oklch(18% 0.01 60 / 0.10);
  --shadow-sheet: 0 14px 30px oklch(18% 0.01 60 / 0.22), 0 2px 4px oklch(18% 0.01 60 / 0.12);
  --tracking-display: 0.01em;
}
```

The blue reads as type on kraft and carries white type as a fill. Three boards, stated in the stamp (`pasteup: kraft`).

| Board | Ground, ink, blue |
| --- | --- |
| **kraft** (default) | the tokens above; fibre at 0.5, multiply |
| **black wall** | ground `oklch(21% 0.012 60)`, ink `oklch(94% 0.012 90)`, muted `oklch(70% 0.015 80)`, blue `oklch(68% 0.15 250)` with the ground as its text; fibre at 0.35, screen |
| **sugar paper** | ground `oklch(84% 0.035 150)`, ink `oklch(22% 0.02 160)`, muted `oklch(42% 0.03 160)`, blue as the tokens; fibre at 0.4, multiply |

## Faces

- **Display:** League Gothic 400 uppercase, `--tracking-display`, set on strips at line-height 1 with the head leaded at 1.1 so wrapped caps never touch. Never below 28px.
- **Body:** Newsreader 400 and 500 at 17px. The margin scrawl is Newsreader italic at 24px in `--color-accent`, tilted -5°, beside a head and never inside one.
- **Labels, captions, table heads, meta, controls:** Newsreader 500 one step smaller, sentence case. Space Mono sets only the price strip's figures and code; a control is never mono.

## Material

- Two textures: the fibre wash (turbulence tinted tan, multiplied over the board, `texture.md` § 1) and a 9px halftone dot field inside every print (§ 2). Nothing else is worn.
- Pasted strips (the signature): the headline is cut into ink strips, one per line or per word, each at its own `--r` between -2° and 2° with a 2px zero-blur drop, each held down at one end by tape, a translucent yellow rectangle. Every strip is the same ink under paper-coloured type; nothing in the head is cut out, recoloured or set apart.
- Shadows are paper lifts (`--shadow-card` on slips, `--shadow-sheet` on a sheet); tilt 0.5° to 3°; radius 0 except the sticker and the stamp.
- The control pair: a blue-filled primary with white type on a hard `4px 4px 0` ink offset beside a white-sheet secondary on the same ink offset, both Newsreader 500 at 15px; the primary is the blue's one fill on a screen.
- Objects: the round sticker (blue, display face, -12°) carries a fact, a price, a date or a table number, or does not appear; the rubber stamp (a `4px double` blue ring) carries a fact, a date or a frame number, or does not appear; the price strip; the taped print (a white sheet, halftone inside).

## Motion

Paper physics only: a button drops 1px into its offset on hover and 4px on press over `--dur-micro`. Nothing floats, nothing reveals.

## Voice

Flyer voice: the date, the door, the price, the table number.

## Do-nots

- Never more than three tilted objects in a viewport besides the headline's strips.
- Never League Gothic on running text or under 28px.
- Never a soft blurred shadow under a strip.
- Never a grunge overlay or a torn edge.
- Never a strip set apart: no white cut-out word, no blue strip, no italic word inside a head.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=League+Gothic&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
```

```css
body { position: relative; isolation: isolate; }
body::before { content: ""; position: absolute; inset: 0; z-index: -1; opacity: 0.5; mix-blend-mode: multiply; pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.02 0.03' numOctaves='3' seed='7'/%3E%3CfeColorMatrix values='0 0 0 0 0.55 0 0 0 0 0.45 0 0 0 0 0.3 0 0 0 0.28 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)'/%3E%3C/svg%3E"); }
.display { font-family: var(--font-display); text-transform: uppercase; line-height: 1.1; letter-spacing: var(--tracking-display); }
.strip { position: relative; display: inline-block; background: var(--color-ink); color: var(--color-paper); padding: 0.06em 0.24em 0.02em; line-height: 1; transform: rotate(var(--r, -1deg)); box-shadow: 0 2px 0 color-mix(in oklab, var(--color-ink) 15%, transparent); }
.strip::after { content: ""; position: absolute; top: -0.12em; left: -0.18em; width: 1.1em; height: 0.32em; background: var(--color-tape); transform: rotate(-8deg); }
.btn { font: 500 15px/1.2 var(--font-body); padding: var(--space-md); background: var(--color-accent); color: var(--color-accent-ink); box-shadow: 4px 4px 0 var(--color-ink); }
.btn--sheet { background: var(--color-paper-3); color: var(--color-ink); box-shadow: 4px 4px 0 var(--color-ink); }
.price { font: 700 13px var(--font-outlier); font-variant-numeric: tabular-nums; }
.print { position: relative; background: var(--color-paper-3); padding: var(--space-sm) var(--space-sm) var(--space-xl); box-shadow: var(--shadow-sheet); transform: rotate(var(--r, -2deg)); }
::selection { background: color-mix(in oklab, var(--color-accent) 30%, transparent); }
```
