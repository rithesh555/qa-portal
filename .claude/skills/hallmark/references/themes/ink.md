---
name: Ink
slug: ink
genre: editorial
paper: light 99.5 100
display: grotesk-sans Epilogue
accent: chromatic-teal 190
posture: restrained
keywords: library, lending, community, civic, notice board, catalogue, rota, volunteer, non-profit, neighbourhood, borrow, tools, repair, membership, events, local, competent, monochrome
material: white paper, a black with no hue, one teal that means in, Epilogue 700 display, rows on rules, a paper plane
signature: a list that starts on a 1px ink rule and ends each row with a pill, and a single-path paper plane
pictured: Conversational FAQ, Stage hero
---

# Ink

White paper, a black with no hue, one teal that means in or open, Epilogue at 700 for the head and 400 for everything you read. Every list is rows on rules that start on a 1px ink rule and end each row with a pill; the week is the only grid.

## Tokens

```css
:root {
  --color-paper: oklch(99.5% 0.003 100); --color-paper-2: oklch(97% 0.004 100); --color-paper-3: oklch(94% 0.006 100);
  --color-ink: oklch(16% 0 0); --color-ink-2: oklch(28% 0 0); --color-muted: oklch(44% 0 0);
  --color-rule: oklch(92% 0.003 100); --color-rule-2: oklch(95% 0.003 100);
  --color-accent: oklch(50% 0.085 190); --color-accent-ink: oklch(99.5% 0.003 100); --color-accent-soft: oklch(93% 0.05 190); --color-accent-soft-ink: oklch(27% 0.045 190);
  --color-focus: oklch(50% 0.085 190); --color-sun: oklch(93% 0.10 95); --color-sun-ink: oklch(28% 0.06 90);
  --font-display: "Epilogue", ui-sans-serif, system-ui, sans-serif; --font-body: var(--font-display);
  --font-outlier: "IBM Plex Mono", ui-monospace, monospace;
  --radius-card: 12px; --radius-pill: 999px; --rule-hair: 1px;
  --shadow-card: 0 20px 40px oklch(30% 0.05 90 / 0.18);
  --tracking-display: -0.04em; --display-weight: 700;
}
```

Two colourways, both light, stated in the stamp (`ink: paper` or `ink: board`).

| Colourway | Ground and teal |
| --- | --- |
| `paper` (default) | the block above: white, hueless black, teal at 50% |
| `board` | notice-board yellow `oklch(93% 0.10 95)` with rules at `oklch(84% 0.10 92)`, ink `oklch(20% 0.02 80)`, teal deepened to `oklch(46% 0.078 190)`; white takes over the card's role |

## Faces

- **Display:** Epilogue 700, `--tracking-display`, line-height 1.02, up to 4.5rem; the wordmark at 44px and -0.05em. One colour per head.
- **Body:** Epilogue 400 at 16px, line-height 1.55, in `--color-muted`; row titles, links and pills at 600.
- **Labels, captions, table heads, meta:** Epilogue 400 one step smaller, sentence case, untracked. Never mono, never uppercase.
- **Outlier:** IBM Plex Mono only inside code and on figures that compare in a column (loan counts, a card number, the rota's times). Big figures and prices are Epilogue 700 in the teal.

## Material

- Rows on rules: every list starts with a 1px rule in the ink and continues on hairlines; the first column is the thing at 600, the last is a pill. Results, shelves, wish lists, evenings, rankings and steps are all rows.
- Pills at 999px, 12.5px at 600, the theme's only badge: in is pale teal with teal ink, out is outlined in the rule colour, on is ink-filled, and the yellow one is a surface, not a state.
- The one grid: the week in seven columns cut by hairlines, and the rota cut the same way. Both are calendars; nothing else is a grid.
- The library card: the one yellow surface (`--color-sun`), 8px corners, a dashed rule under its head, and the page's only shadow. Once per page.
- The map: a grid of 12px rounded blocks in `--color-paper-3` with one ink block for the shop, cut by two paper-coloured roads 8px wide; that is the whole object. Never a photograph.
- The plane: a single-path paper plane at 22px, in the ink or the teal, the theme's one pictogram. The control pair is an ink-filled primary beside a 1px-bordered secondary on `--color-paper-2`, both at 10px.

## Motion

Nothing moves except state: a search filters on input, a shift is taken on click and the open count drops, a pledge fills its bar. No marquee, no reveal, no counter.

## Voice

The desk volunteer's: what is in, when it is back, who is on Saturday. Short, kind, exact, never institutional.

## Do-nots

- Never a second colour. Teal means in; red for out is banned, out is an outline; the yellow is a surface and appears once.
- Never a warm black. The ink has no hue, and the page says so: `waive 22 · ink and greys at zero chroma · a notice board is printed in plain black`.
- Never a card grid of things; things are rows, and the week is the only grid.
- Never a photograph; the map is drawn and the things are words.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Epilogue:wght@400;600;700&family=IBM+Plex+Mono:wght@400&display=swap" rel="stylesheet">
```

```css
.display { font: 700 min(var(--text-display), 4.5rem)/1.02 var(--font-display); letter-spacing: var(--tracking-display); }
.rows { border-top: 1px solid var(--color-ink); }
.rows > div { display: grid; gap: var(--space-md); align-items: center; padding: var(--space-sm) 0; border-bottom: 1px solid var(--color-rule); font-size: var(--text-sm); }
.rows > div b { font-weight: 600; }
.pill { display: inline-flex; padding: var(--space-2xs) var(--space-sm); border-radius: var(--radius-pill); font-size: 12.5px; font-weight: 600; background: var(--color-paper-3); }
.pill--in { background: var(--color-accent-soft); color: var(--color-accent-soft-ink); }
.pill--out { background: transparent; border: 1px solid var(--color-rule); color: var(--color-muted); }
.pill--on { background: var(--color-ink); color: var(--color-paper); }
.btn { border-radius: 10px; padding: var(--space-sm) var(--space-md); font-weight: 600; border: 1px solid var(--color-rule); background: var(--color-paper-2); }
.btn--primary { background: var(--color-ink); color: var(--color-paper); border-color: var(--color-ink); }
.plane path { fill: currentColor; }
::selection { background: var(--color-accent-soft); color: var(--color-accent-soft-ink); }
```
