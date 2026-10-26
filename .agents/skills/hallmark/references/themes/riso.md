---
name: Riso
slug: riso
genre: editorial
paper: mid 84 30
display: grotesk-heavy Public Sans
accent: cool 220
posture: committed
keywords: risograph, riso, print fair, zine, small press, letterpress, poster, art book, spot colour, illustration, indie press, diy, print studio, handmade
material: pink stock, two spot inks a hair out of register, heavy Public Sans over Newsreader, grain on the ink
signature: one focal word overprinted in blue and pink echoes two pixels out of register
pictured: Conversational FAQ, Settled hero
---

# Riso

Pink stock, Public Sans 900 heads over a Newsreader body, blue and yellow spot inks with grain at 0.045 over everything, and one hero word carrying a blue and a pink echo two pixels out of register.

## Tokens

```css
:root {
  --color-paper: oklch(84% 0.048 30); --color-paper-2: oklch(80% 0.05 30); --color-paper-3: oklch(75% 0.052 30);
  --color-ink: oklch(18% 0.060 30); --color-ink-2: oklch(34% 0.060 30); --color-muted: oklch(42% 0.045 30);
  --color-rule: oklch(70% 0.040 30);
  --color-accent: oklch(40% 0.140 220); --color-accent-2: oklch(78% 0.180 95); --color-echo: oklch(64% 0.19 12);
  --color-accent-ink: oklch(84% 0.048 30); --color-focus: oklch(42% 0.16 220);
  --font-display: "Public Sans", ui-sans-serif, sans-serif; --font-body: "Newsreader", serif;
  --font-outlier: "Geist Mono", ui-monospace, monospace;
  --radius-card: 2px; --radius-pill: 2px; --rule-hair: 1px;
  --shadow-card: none; --texture-opacity: 0.045;
  --tracking-display: -0.015em; --display-weight: 900;
}
```

## Faces

- **Display:** Public Sans 900, `--tracking-display`, line-height 0.92; roman, poster weight. A head is one weight and one colour; the misregistered hero word below is the signature and appears once.
- **Body and lede:** Newsreader 400 and 500 at a 45 to 75ch measure, opsz following size. The poster head against the reading serif is load-bearing.
- **Captions, counts, table heads, meta, folios:** Newsreader 500 one step smaller, sentence case, `--color-muted`, on paper or paper-2 (on a plate, captions take the ink). Mono is not this theme's material; Geist Mono appears only inside code and on figures that compare.

## Material

- The off-register overprint, the theme's move: a focal word carries a blue echo nudged up-left 2px and a pink echo nudged down-right 2px, printed behind the ink so the word stays black and only the fringes show colour, per `texture.md` § Misregistration: one focal word per page, in the hero head, offset 1 to 3px (the signature; stamp `waive 38iii`).
- Grain, declared: the `texture.md` § Grain recipe, one page-wide layer at `--texture-opacity` 0.045 (it sits under running text, so it stays under 0.05), up to 0.15 on a plate. Grain and misregistration are the theme's two artifacts; nothing else.
- Blue and yellow are the only flat inks, and pink prints only in the echo; where blue and yellow cross on white or on a plate, multiply makes a third for free. On the pink stock the yellow prints opaque (multiplied over pink it turns mustard). Both under 15% of a viewport.
- Hairlines, a yellow `<mark>` band at x-height in running text and never inside a heading, solid rectangles at 2px, zero shadow; depth comes from overprint and rule.
- The control pair: a blue-filled rectangle with paper text beside one outlined in ink, both 2px. The object family: plates. A print plate with a grained fill, a stockist list, a run sheet, a poster crop in a hairline frame.

## Motion

One reveal: the misregistration settles into place once on load, over `--dur-long`, and never loops. Nothing else moves; no fades, no rises.

## Voice

Specific, hand-set, a little literary. Verbs and counts over adjectives: name the ink, the press run, the paper weight. Deliberately imperfect, never sold as flawless.

## Do-nots

- Never clean vector flatness; registered, ungrained fills are the fatal failure.
- Never white paper; the stock is warm pink, hue 30.
- Never a gradient, glow or neon; colour comes from overprint, not luminance.
- Never a hard-offset box shadow or a mustard-and-oxblood pair.
- Never the echo on a second heading; one focal word, then rest.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@900&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
```

```css
.display { font: var(--display-weight) var(--text-display)/0.92 var(--font-display); letter-spacing: var(--tracking-display); }
.misreg { position: relative; display: inline-block; isolation: isolate; }
.misreg::before, .misreg::after { content: attr(data-text); position: absolute; inset: 0; z-index: -1; white-space: nowrap; pointer-events: none; }
.misreg::before { color: var(--color-accent); transform: translate(-2px, -2px); }
.misreg::after { color: var(--color-echo); transform: translate(2px, 2px); }
mark { background: var(--color-accent-2); color: var(--color-ink); }
.btn { display: inline-flex; align-items: center; min-height: 48px; padding: 0 var(--space-lg); border: 1.5px solid transparent; border-radius: var(--radius-card); font: var(--display-weight) 0.9375rem/1 var(--font-display); }
.btn--primary { background: var(--color-accent); color: var(--color-accent-ink); }
.btn--secondary { border-color: var(--color-ink); color: var(--color-ink); }
::selection { background: color-mix(in oklab, var(--color-accent-2) 60%, transparent); color: var(--color-ink); }
```
