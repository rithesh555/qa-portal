---
name: Carnival
slug: carnival
genre: editorial
paper: light 92 50
display: display-heavy Big Shoulders Display
accent: chromatic-yellow 95
posture: full-palette
keywords: record label, podcast, comedy, indie, zine, poster, illustrator, games, hot sauce, merch, streetwear, cassette, vinyl, live show, festival, loud, maximalist, scrappy
material: tinted paper, a duo-tone pair that competes instead of blending, Big Shoulders Display 800 in its heavy width, 2px rules, a flat ink shadow offset four pixels
signature: the duo, mustard against oxblood, each on a 4px hard ink shadow, given to whatever the page pairs (two formats, two acts, two dates), never a fixed pair of tiles
pictured: Split Studio, Poster hero
---

# Carnival

Tinted paper, two accents that compete across surfaces and never blend, Big Shoulders Display 800, 2px rules, and a 4px ink shadow with zero blur. The signature is the duo: mustard and oxblood competing on two objects the brief itself pairs, each on its hard shadow, an ornament between them; the pair of plain tiles in the picture is one answer, not the layout.

## Tokens

```css
:root {
  --color-paper: oklch(92% 0.045 50); --color-paper-2: oklch(88% 0.050 45); --color-paper-3: oklch(82% 0.060 40);
  --color-ink: oklch(18% 0.080 20); --color-ink-2: oklch(28% 0.060 25); --color-muted: oklch(42% 0.050 30);
  --color-rule: oklch(40% 0.21 25); --color-accent: oklch(86% 0.18 95); --color-accent-2: oklch(40% 0.21 25);
  --color-accent-ink: oklch(18% 0.080 20); --color-focus: oklch(40% 0.21 25);
  --font-display: "Big Shoulders Display", Impact, sans-serif; --font-body: "Golos Text", system-ui, sans-serif;
  --font-outlier: var(--font-body);
  --radius-card: 2px; --radius-pill: 2px; --rule-hair: 1px; --rule-bar: 2px; --shadow-card: 4px 4px 0 var(--color-ink);
  --tracking-display: 0.02em;
}
```

One dial, the drop, stated in the stamp (`carnival: diner-sign`): a saturated first accent, a deep second accent that is also the rule and focus colour, tinted paper, deep ink. `paper-2` and `paper-3` step 4 and 10 points darker on the paper's hue; `ink-2` and `muted` lighten the ink the same way. `--color-accent-ink` is the ink on every drop; on diner-sign the ink sits on the cherry.

| Drop | Pick for | Paper | Ink | Accent | Accent 2 |
| --- | --- | --- | --- | --- | --- |
| cold-snap (default) | independent music, winter, cassettes, vinyl | `92% 0.045 50` | `18% 0.080 20` | mustard `86% 0.18 95` | oxblood `40% 0.21 25` |
| citrus-riot | zines, skate, summer drops, chaotic | `94% 0.040 85` | `20% 0.07 145` | lime `82% 0.20 130` | magenta `28% 0.28 350` |
| diner-sign | food and drink, hospitality, roadside | `95% 0.035 90` | `16% 0.04 30` | cherry `60% 0.22 25` | navy `30% 0.16 250` |
| studio-night | late-night radio, podcasts, blue hour | `88% 0.05 25` | `20% 0.05 270` | cyan `78% 0.18 220` | plum `24% 0.18 320` |
| aqua-park | summer, pool, surf, motels | `94% 0.040 180` | `20% 0.06 200` | turquoise `72% 0.16 195` | coral `36% 0.24 35` |
| pressroom | journalism, newsletters, opinion | `89% 0.025 65` | `16% 0.02 60` | amber `78% 0.18 75` | slate `34% 0.10 240` |

## Faces

- **Display:** Big Shoulders Display 800 (its width comes from the face; the web build has no width axis). All caps: -0.005em on a lone hero word at line-height 0.9 on a single nowrap line, 0.02em on a section head at 1.0 when it can wrap (55a). Loose tracking belongs only to a marquee.
- **Body:** Golos Text 400 and 500, sentence case, short, present tense, full ink.
- **Labels, captions, table heads, meta:** Golos Text 500 one step smaller, sentence case; a poster tag may take an accent colour. Never mono: figures are Golos Text with `tabular-nums`.

## Material

- Two accents that compete, never blend: one fills a surface, the other fills the next. A block never shows both, and there is never a gradient between them.
- The hard offset shadow: `4px 4px 0 var(--color-ink)`, zero blur, on cards, buttons and images. Leave clearance at the page edge so the offset is never clipped.
- Rules are `--rule-bar` in `--color-accent-2`; radius 2px at most. An accent fill may bleed about 24px past the page max-width on one side, a poster pinned to a wall.
- Typographic ornaments (✱ ❋ ◆) in an accent colour as dividers, as the bullets of a real list, and as a marquee's repeating separator. Never glued in front of a label or a link.
- Halftone fills (`texture.md` § Halftone) where the page would otherwise show a photo placeholder, at a fixed small size, never under type.
- The control pair: one button filled with an accent on its 4px ink shadow beside the same block outlined in ink with the same shadow; one fill per page (F4).

## Motion

Mostly still, with one horizontal engine, the theme's one ambient loop: a marquee of ornament-separated words, its content repeated at least twice so the loop reads continuous, a cycle of 8s or longer, paused on hover and focus and by a visible pause control, still under reduced motion and off-screen. Hover swaps colour and nothing else; active slams the offset to 1px; nothing lifts.

## Voice

Short, loud, declarative. Headlines all caps, six words or fewer, ending in a full stop; body in sentence case, numerals over words.

## Do-nots

- Never a soft shadow; hard offset or none.
- Never both accents inside one block; blending kills the duo-tone read.
- Never sentence-case headlines, and never loose tracking outside a marquee.
- Never a grey or ghost button: the secondary is the outlined ink block, the primary the one accent fill.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800&family=Golos+Text:wght@400;500&display=swap" rel="stylesheet">
```

```css
body { background: var(--color-paper); color: var(--color-ink); font-family: var(--font-body); }
h1, h2 { font-family: var(--font-display); font-weight: 800; text-transform: uppercase; letter-spacing: var(--tracking-display); line-height: 1; }
.hard { border: var(--rule-bar) solid var(--color-ink); border-radius: var(--radius-card); box-shadow: var(--shadow-card); }
.tile--a { background: var(--color-accent); color: var(--color-accent-ink); }
.tile--b { background: var(--color-accent-2); color: var(--color-paper); }
::selection { background: color-mix(in oklab, var(--color-accent) 60%, transparent); }
```
