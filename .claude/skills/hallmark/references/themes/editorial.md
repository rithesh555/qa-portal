---
name: Editorial
slug: editorial
genre: editorial
paper: light 94 75
display: display-condensed Bricolage Grotesque
accent: warm 35
posture: restrained
keywords: magazine, editorial, feature, culture, fashion, design annual, interview, longform, publication, issue, contemporary, art direction, profile, lookbook, brand story, journal, considered, travel, city guide, guide
material: warm cream, a heavy condensed grotesque slammed left, 1px hairlines, roman-numeral folios, one coral mark
signature: a condensed headline hard against the left margin, answered by one serif-italic pulled line between two hairlines
pictured: Specimen, Settled hero
---

# Editorial

Warm cream, Bricolage Grotesque 800 at width 75 slammed against the left margin, Figtree for reading, 1px hairlines with roman-numeral folios, one coral mark. The signature is the condensed headline answered by one serif-italic pulled line between two hairlines.

## Tokens

```css
:root {
  --color-paper: oklch(94% 0.020 75); --color-paper-2: oklch(91.5% 0.022 75); --color-paper-3: oklch(88.5% 0.024 75);
  --color-ink: oklch(15% 0.014 280); --color-ink-2: oklch(28% 0.014 55); --color-muted: oklch(48% 0.014 60);
  --color-rule: oklch(80% 0.018 70); --color-rule-2: oklch(64% 0.014 68);
  --color-accent: oklch(50% 0.160 35); --color-accent-ink: oklch(98% 0.005 70); --color-focus: oklch(52% 0.160 35);
  --font-display: "Bricolage Grotesque", ui-sans-serif, sans-serif; --font-body: "Figtree", ui-sans-serif, system-ui, sans-serif;
  --font-outlier: "EB Garamond", ui-serif, Georgia, serif;
  --radius-card: 0; --radius-pill: 0; --rule-hair: 1px; --shadow-card: none;
  --tracking-display: -0.01em; --display-weight: 800;
}
```

## Faces

- **Display:** Bricolage Grotesque 800 with `"wdth" 75, "opsz" 96`, `--tracking-display`, title case, up to 4.75rem, slammed left; the width axis is the magazine proportion. The ink carries a faint cool tilt (hue 280) on warm cream: printed black on paper.
- **Body:** Figtree 400 and 500.
- **The pulled line:** EB Garamond 500 italic, set large as its own object between two hairlines with a coral indent, once per page at most. Never a word inside a head, never the display face; every head is roman grotesque.
- **Labels, captions, table heads, meta, folios:** Figtree 500 one step smaller, sentence case, `--color-muted`. Roman numerals as folios sit in the display face at label size in the outer margin, page furniture that persists; never above a heading. No mono on the page.

## Material

- Square everything: controls, tags, inputs and filled marks are sharp rectangles at radius 0.
- 1px hairlines and columns carry the structure: asymmetric splits (2:5, 3:7), left-biased composition, no boxed cards, no shadow, no blur, no texture.
- The control pair: an ink-filled square block with paper text beside a hairline-outlined block; a tag is the one filled coral rectangle.
- The coral signal under 5%: a link underline, one tag, a folio mark on paper or paper-2, one control. Never a band, never behind body type.
- The object family is feature furniture: a folio column of numerals, a pulled line between hairlines, a contents index of hairline rows.

## Motion

One clip reveal: the pulled line's two hairlines draw in from the left once over `--dur-long` on `--ease-out`. Hover grows a coral underline under a link. Nothing else moves.

## Voice

Contemporary, lightly literary. Verbs over adjectives; name the piece, the issue, the byline.

## Do-nots

- Never a serif display; the serif is the pulled line only, and never a word inside a head.
- Never a rounded corner, a pill or a shadow.
- Never an orange or brick drift on the accent: coral, hue 35, chroma 0.16.
- Never a centred masthead; left-biased and asymmetric, always.
- Never an all-caps shout; title case, tight, magazine-modern.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,600..800&family=Figtree:wght@400;500&family=EB+Garamond:ital,wght@1,500&display=swap" rel="stylesheet">
```

```css
.display { font: var(--display-weight) clamp(2.5rem, 5vw + 0.75rem, 4.75rem)/1 var(--font-display); color: var(--color-ink);
  font-variation-settings: "wdth" 75, "opsz" 96; letter-spacing: var(--tracking-display); }
.pull { font: italic 500 clamp(1.5rem, 2.5vw, 2.25rem)/1.25 var(--font-outlier); padding: var(--space-lg) 0 var(--space-lg) var(--space-lg);
  border-block: var(--rule-hair) solid var(--color-rule); border-inline-start: 3px solid var(--color-accent); }
.folio { font-size: var(--text-xs); color: var(--color-muted); }
.folio .numeral { font-family: var(--font-display); font-weight: var(--display-weight); }
.btn--primary { border-radius: 0; background: var(--color-ink); color: var(--color-paper); }
.tag { background: var(--color-accent); color: var(--color-accent-ink); border-radius: 0; }
::selection { background: color-mix(in oklab, var(--color-accent) 25%, transparent); }
```
