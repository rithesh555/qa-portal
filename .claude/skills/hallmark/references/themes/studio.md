---
name: Studio
slug: studio
genre: editorial
paper: light 96.5 200
display: roman-serif Erode
accent: warm 52
posture: restrained
keywords: design studio, creative studio, branding, brand identity, art direction, agency, portfolio, case study, selected work, editorial design, typography, creative direction, graphic design, considered, curatorial
material: cool studio-white, a roughened roman serif at scale, hairlines and air, one cadmium-orange rectangle
signature: an Erode headline set huge with its chipped edges legible, over a hairline, and one cadmium-orange rectangle beneath it
pictured: Case-study index (an unlisted shape), Settled hero
---

# Studio

Cool studio-white, Erode 500 set huge with its chipped edges legible over a hairline, a Geist body, whitespace doing the structure, and one cadmium-orange rectangle under 5%. Nothing else on the page is coloured.

## Tokens

```css
:root {
  --color-paper: oklch(96.5% 0.005 200); --color-paper-2: oklch(93.5% 0.007 200); --color-paper-3: oklch(90.5% 0.008 200);
  --color-ink: oklch(13% 0.024 205); --color-ink-2: oklch(34% 0.016 205); --color-muted: oklch(50% 0.014 205);
  --color-rule: oklch(82% 0.008 200);
  --color-accent: oklch(68% 0.170 52); --color-accent-ink: oklch(13% 0.024 205); --color-focus: oklch(54% 0.14 50);
  --font-display: "Erode", serif; --font-body: "Geist", ui-sans-serif, system-ui, sans-serif;
  --font-outlier: "Geist Mono", ui-monospace, monospace;
  --radius-card: 4px; --radius-pill: 4px; --rule-hair: 1px;
  --shadow-card: none;
  --tracking-display: -0.022em; --display-weight: 500;
}
```

## Faces

- **Display:** Erode 500, `--tracking-display`, up to 5.25rem, line-height 1.0, two or three lines; roman. A chipped, hand-set edge on every terminal: at display size the letters read impressed into the page, and that texture is the signature. No optical axis: set it big enough that the erosion reads as intent.
- **Body:** Geist 400 and 500 at a 45 to 75ch measure. The clean sans under a textured serif is the pairing. Erode never sets running text (its edge turns to mud at reading size); Erode italic is a pulled line at text size only.
- **Labels, captions, dates, roles, disciplines, table heads, folios:** Geist 500 one step smaller, sentence case, `--color-muted`. Mono is not this theme's material; Geist Mono appears only inside code and on figures that compare.

## Material

- Hairlines, not cards: 1px `--color-rule` defines structure; no box, no shadow, no glass. Depth is rules and air.
- Radius 4px on the one filled control; no pills. No texture: the cool paper is the whole surface.
- The orange under 5% and in one place: the one rectangle, the filled control or the block beneath the head, with ink type on it. A hover underline borrows it and focus takes the deeper `--color-focus`; nothing else is coloured. A head is one colour; emphasis in running text is weight.
- The control pair: an orange-filled rectangle with ink text beside a hairline-outlined one, both 4px.
- The object family: the case-study index. A selected-work list ruled by hairlines with year and discipline in the label voice, an image slot framed by whitespace, a colophon block.

## Motion

Nothing moves except state: an orange underline grows under a link on hover; a hairline shifts toward orange on a focusable row. No reveal, no bounce, no parallax.

## Voice

Spare, a little literary. Verbs over adjectives; name the work, the discipline, the year.

## Do-nots

- Never smooth Erode out: no substitute serif at display size, no text-shadow or blur on the edge. Without the roughness this is any serif on white.
- Never an orange flood, an orange tint band or a second warm colour; one cadmium rectangle.
- Never warm paper; the ground is cool, hue 200.
- Never boxed cards, shadows or glass; hairlines and air carry the page.
- Never a pill or gradient control; one filled orange rectangle plus typographic links.

## Build hint

```html
<link href="https://api.fontshare.com/v2/css?f[]=erode@400,500,600&display=swap" rel="stylesheet"><link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
```

```css
.display { font: var(--display-weight) var(--text-display)/1 var(--font-display); letter-spacing: var(--tracking-display); color: var(--color-ink); }
.index > li { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: var(--gap-columns); padding: var(--space-md) 0; border-top: 1px solid var(--color-rule); }
.btn { border-radius: var(--radius-card); padding: var(--space-sm) var(--space-lg); font-weight: 500; }
.btn--primary { background: var(--color-accent); color: var(--color-accent-ink); }
.btn--secondary { border: 1px solid var(--color-rule); color: var(--color-ink); }
a:hover { text-decoration-color: var(--color-accent); text-underline-offset: 0.2em; }
::selection { background: color-mix(in oklab, var(--color-accent) 25%, transparent); }
```
