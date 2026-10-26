---
name: Atelier
slug: atelier
genre: editorial
paper: light 94 60
display: roman-serif Sentient
accent: cool 250
posture: restrained
keywords: fashion, atelier, couture, fragrance, gallery, exhibition, museum, ceramics, furniture, homeware, architecture, design studio, lookbook, collection, craft, small-batch, made by hand, brand story, luxury, object, hotel, boutique hotel, hospitality, stay
material: warm plaster paper, umber ink, a bold Sentient crown over Hanken Grotesk, hairlines and air, one cool slate signal
signature: a large weighted serif line over a hairline-framed object with its placard set small beneath it
pictured: Catalogue, Settled hero
---

# Atelier

Warm plaster paper, umber ink, Sentient 700 carrying one large line over Hanken Grotesk reading, hairlines and air, one cool slate signal. The signature is a hairline-framed object with its placard set small beneath it.

## Tokens

```css
:root {
  --color-paper: oklch(94% 0.005 60); --color-paper-2: oklch(91% 0.006 60); --color-paper-3: oklch(87% 0.008 55);
  --color-ink: oklch(12% 0.020 40); --color-ink-2: oklch(28% 0.014 45); --color-muted: oklch(46% 0.010 50);
  --color-rule: oklch(78% 0.006 55);
  --color-accent: oklch(40% 0.080 250); --color-accent-ink: oklch(96% 0.005 60); --color-focus: oklch(50% 0.090 250);
  --font-display: "Sentient", Georgia, serif; --font-body: "Hanken Grotesk", system-ui, sans-serif;
  --font-outlier: var(--font-body);
  --radius-card: 0; --radius-pill: 3px; --rule-hair: 1px; --shadow-card: none;
  --tracking-display: -0.018em; --display-weight: 700;
}
```

## Faces

- **Display:** Sentient 700, `--tracking-display`, up to 6.25rem, roman. One large weighted line carries the page; no optical-size axis, so hold 700 and let scale work.
- **Body:** Hanken Grotesk 400 and 500, line-height 1.55, a 56ch measure. Never running prose in the serif.
- **Labels, captions, placards, meta:** Hanken Grotesk 500 one step smaller, sentence case, in `--color-muted`. The placard (material, dimensions, year, edition) is the same voice set as a short ruled list; never capitals, never mono.

## Material

- Hairlines and generous air. Depth is rules and whitespace only; no cards, no shadows, no glass, no texture. Radius 3px at most, only on an outlined control.
- Imagery is a gallery print: generous margin, a hairline frame, never bled to an edge. The object family is the framed print with its placard beneath.
- The slate signal under 4% of any viewport: a link underline, one `<mark>` in running text (never inside a heading), a heavy rule under the masthead, and the drop cap, the one ornament: Sentient 700 in slate, three lines deep, first paragraph only, once per page. Never a wash.
- The control pair: a hairline-outlined control in ink (hover fills ink, plaster text) beside an underlined text link with a slate underline. No colour-filled control anywhere.

## Motion

One entrance: the display line fades in once over `--dur-long` on `--ease-out`. A slate underline grows on link hover. Nothing else moves.

## Voice

Hand-set, literary, object-precise: verbs over adjectives; name the object, the material, the number made. Never "shop now".

## Do-nots

- Never a warm accent; the signal is cool slate under chroma 0.09.
- Never a bright pop; slate is nearly ink, and a saturated blue reads as a product page.
- Never a thin or high-contrast cut; Sentient is bold and soft-contrast.
- Never serif running body; Sentient in paragraphs turns the page into a broadsheet.
- Never a card, a drop shadow or a colour-filled button; hairlines and air carry every surface.

## Build hint

```html
<link href="https://api.fontshare.com/v2/css?f[]=sentient@700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500&display=swap" rel="stylesheet">
```

```css
body { background: var(--color-paper); color: var(--color-ink-2); font-family: var(--font-body); line-height: 1.55; }
h1, .display { font: var(--display-weight) clamp(2.75rem, 6vw + 1rem, 6.25rem)/1.02 var(--font-display); letter-spacing: var(--tracking-display); color: var(--color-ink); }
.placard { font: 500 var(--text-xs)/1.4 var(--font-body); color: var(--color-muted); }
.lede::first-letter { float: left; font: var(--display-weight) 3.9em/0.82 var(--font-display); padding: 0.06em 0.08em 0 0; color: var(--color-accent); }
.btn { border: var(--rule-hair) solid var(--color-ink); border-radius: var(--radius-pill); padding: var(--space-sm) var(--space-lg); color: var(--color-ink); }
a { color: inherit; text-decoration-color: var(--color-accent); text-underline-offset: 0.2em; }
::selection { background: color-mix(in oklab, var(--color-accent) 22%, transparent); }
```
