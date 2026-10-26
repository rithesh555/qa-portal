---
name: Broadside
slug: broadside
genre: editorial
paper: light 93 85
display: display-condensed Six Caps
accent: warm 32
posture: committed
keywords: auction, sale, market, fair, event, one night, announcement, town, notice, poster, bill, lots, machinery, tools, festival, fete, hammer, date, venue, tickets
material: grained cream stock, ink rules at one point or five, wood type stacked three faces deep, one vermilion, everything centred
signature: a bill set to the measure: big lines fitted edge to edge under a five-point rule, three vermilion diamonds dividing one bill from the next
pictured: Bill stack, Poster hero
---

# Broadside

Grained cream stock, ink rules at one point or five, Six Caps fitted to the measure over Rye and Bevan, Archivo Narrow small print, one vermilion. The signature is a bill set edge to edge under a five-point rule, three vermilion diamonds dividing it from the next.

## Tokens

```css
:root {
  --color-paper: oklch(93% 0.02 85); --color-paper-2: oklch(89% 0.025 85); --color-paper-3: oklch(85% 0.03 85);
  --color-ink: oklch(18% 0.01 50); --color-ink-2: oklch(30% 0.012 50); --color-muted: oklch(44% 0.02 60);
  --color-rule: oklch(76% 0.025 80);
  --color-accent: oklch(46% 0.19 32); --color-accent-ink: oklch(95% 0.02 85); --color-focus: oklch(46% 0.19 32);
  --font-display: "Six Caps", "Impact", sans-serif; --font-display-2: "Rye", Georgia, serif; --font-display-3: "Bevan", Georgia, serif;
  --font-body: "Archivo Narrow", "Arial Narrow", ui-sans-serif, sans-serif;
  --font-outlier: "IBM Plex Mono", ui-monospace, monospace;
  --radius-card: 0; --radius-pill: 0; --rule-hair: 1px; --rule-bar: 5px;
  --shadow-card: none;
  --tracking-display: 0.02em;
  --grain: 0.08;
}
```

One dial, the colourway, stated in the stamp (`broadside: bill`).

| Colourway | Stock | Ink | Accent |
| --- | --- | --- | --- |
| `bill` (default) | cream oklch(93% 0.02 85), grain multiplied at 8% | oklch(18% 0.01 50) | vermilion oklch(46% 0.19 32) |
| `inked` | oklch(17% 0.01 60), grain screened at 8% | cream oklch(93% 0.02 85) | vermilion lifted to oklch(62% 0.19 32); paper band becomes dark |
| `red-bill` | vermilion oklch(52% 0.19 32), grain multiplied at 8% | cream oklch(95% 0.03 85), 4.8:1 on the red | cream; posture becomes drenched |

## Faces

- **Six Caps** 400, uppercase, line-height 0.88, `--tracking-display`: the loudest line and every big number, 250px down to 30px in a row. Each fitted line is its own element that never wraps (`white-space: nowrap`, the 55b guard), sized by the code until it fills the measure.
- **Rye** 400, uppercase: one line per bill, and the wordmark at 22 to 26px. **Bevan** 400, uppercase: the third line, estimates, machine names, condition lines at 16 to 24px. All roman.
- **Archivo Narrow** 400 and 600, 16 to 22px, line-height 1.5, for the small print and everything read. Labels, table heads, captions and meta are Archivo Narrow 500 at 13 to 14px, sentence case, untracked, in `--color-muted`. Mono appears only inside code; figures are Six Caps, or Archivo Narrow tabular in a row.

## Material

- Rules: `--rule-bar` in ink above a bill, a section or a table; `--rule-hair` in ink under a running head; `--rule-hair` in `--color-rule` between rows. Nothing between one and five.
- The diamond: a filled diamond in vermilion, three in a row as the divider between one bill and the next, one at each stop of a timeline. The only ornament; never above a heading, never in a line of meta.
- The post: a 3px ink border with a 1px keyline 3px inside it. Machines, days, the bid box, the form, an open drawer. Square corners, always. The control pair: one ink-filled block in the narrow face, capitals untracked, beside the same block drawn as a post (3px ink border, no fill); one fill per page.
- Tickets: a numbered stub with a dashed tear line, the current one printed in vermilion. Vermilion type sits on the paper or paper-2.
- Grain: one SVG noise layer over the page at `--grain` (texture.md § 1), multiplied on paper, screened on ink. The only texture.
- Centre: bills, headings, posts and figures are centred, because a bill is printed on its centre line; rows, ladders, catalogues and forms are left. The stamp answers F15 and names the centred axis as the material. The three wood faces are the printer's case: stamp `waive 37` (four families; guard: the display faces are the bill).

## Motion

Printed, so still. A bid updates in place, a ladder rounds as you type, a drawer opens on click, big lines fit themselves once when the fonts arrive. No marquee, no hover growth, no reveal.

## Voice

An auctioneer's bill: the date, the place, the lot, the estimate, without reserve. Shouted in capitals, explained in the small print.

## Do-nots

- Never a ragged big line; a headline that does not fill the measure is fitted or cut.
- Never a fifth face outside code; Six Caps, Rye, Bevan and the narrow are the printer's whole case.
- Never a rounded corner; posts, tickets, drawers and buttons are square.
- Never a second colour; green for sold is a screen, not a bill.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Six+Caps&family=Rye&family=Bevan&family=Archivo+Narrow:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
```

```css
.six { font-family: var(--font-display); text-transform: uppercase; line-height: 0.88; letter-spacing: var(--tracking-display); white-space: nowrap; }
.rye { font-family: var(--font-display-2); text-transform: uppercase; line-height: 1; } .bev { font-family: var(--font-display-3); text-transform: uppercase; line-height: 1; }
.heavy { border-top: var(--rule-bar) solid var(--color-ink); } .thin { border-top: var(--rule-hair) solid var(--color-ink); }
.post { border: 3px solid var(--color-ink); box-shadow: inset 0 0 0 3px var(--color-paper), inset 0 0 0 4px var(--color-ink); padding: var(--space-lg); text-align: center; }
.diamonds { text-align: center; color: var(--color-accent); font-size: var(--text-xs); } .diamonds::before { content: "\25C6\2003\25C6\2003\25C6"; }
.btn { display: inline-flex; align-items: center; min-height: 48px; padding: 0 var(--space-xl); border: 3px solid var(--color-ink); background: var(--color-ink); color: var(--color-paper); font: 600 var(--text-sm)/1 var(--font-body); text-transform: uppercase; border-radius: 0; }
.btn--post { background: transparent; color: var(--color-ink); }
::selection { background: color-mix(in oklab, var(--color-accent) 30%, transparent); }
```
