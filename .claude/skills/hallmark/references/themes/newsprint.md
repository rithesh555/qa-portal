---
name: Newsprint
slug: newsprint
genre: editorial
paper: light 93.5 80
display: slab-serif Zilla Slab
accent: warm 28
posture: restrained
keywords: newspaper, broadsheet, journalism, publication, magazine, newsletter, op-ed, opinion, essay, longform, column, reportage, press, gazette, review, dispatch, literary
material: warm cream stock, a Zilla Slab head over Spectral columns, hairlines and a double rule, one dried-brick mark
signature: a slab-serif drop cap opening a lede split into hairline-ruled columns under a double rule
pictured: Front Page (an unlisted shape), Settled hero
---

# Newsprint

Warm cream stock, a Zilla Slab 700 head over Spectral columns split by a hairline, a double rule for the major breaks, a drop cap opening the lede, and one dried-brick link colour under 5%.

## Tokens

```css
:root {
  --color-paper: oklch(93.5% 0.022 80); --color-paper-2: oklch(91% 0.024 80); --color-paper-3: oklch(88% 0.026 78);
  --color-ink: oklch(15% 0.030 25); --color-ink-2: oklch(20% 0.030 28); --color-muted: oklch(46% 0.022 35);
  --color-rule: oklch(68% 0.030 40); --color-rule-2: oklch(35% 0.020 35);
  --color-accent: oklch(32% 0.10 28); --color-accent-ink: oklch(92% 0.045 50); --color-accent-text: oklch(45% 0.13 30); --color-focus: oklch(48% 0.18 30);
  --font-display: "Zilla Slab", serif; --font-body: "Spectral", serif;
  --font-outlier: "IBM Plex Mono", ui-monospace, monospace;
  --radius-card: 0; --radius-pill: 0; --rule-hair: 1px;
  --shadow-card: none;
  --tracking-display: -0.022em; --display-weight: 700;
}
```

## Faces

- **Display:** Zilla Slab 700, `--tracking-display`, heads and decks; roman. Bracketed serifs at nearly stem weight; hold the weight and let scale carry the masthead.
- **Body:** Spectral 400 and 500 at 1.0625rem, line-height 1.55, 58ch. The blunt slab over the calm book serif is the voice. Spectral italic is emphasis in running text only.
- **Bylines, datelines, captions, table heads, folios, meta:** Spectral 500 one step smaller, sentence case, `--color-muted`. Mono is not this theme's material; IBM Plex Mono appears only inside code and on figures that compare (an edition table).

## Material

- Columns split by a hairline: the lede flows in two or three columns with `column-rule: 1px solid var(--color-rule)`, never as one wide wall, and stays short enough that its screen holds 80 words or fewer (58); the long text belongs to the article, not the front page.
- The double rule: two 1px lines in `--color-rule-2` with a 2px gap, the heaviest divider the theme owns; hairlines carry ordinary breaks, the double rule the major ones.
- The drop cap: a Zilla Slab initial floated about three lines tall in `--color-ink` or brick, one per page.
- Rules and whitespace, no cards: radius 0, no shadow. A pulled line hangs between two hairlines with a brick indent. The brick under 5%: a rule tick, the link, a folio, never a fill.
- The control pair: an ink-filled rectangle beside one ruled top and bottom in ink, both square. Texture, if any, is the faintest fibre grain from `texture.md` § Grain, scoped to one band, off by default.

## Motion

Nothing moves except state: a brick underline grows under a link on hover. No reveal, no counter, nothing that types or scrolls itself.

## Voice

Specific, declarative, a dry editorial wit. Name the place, the date, the fact.

## Do-nots

- Never a single wide column of body text; the page is columns with a rule between them.
- Never a sans-serif body or a sans label voice; Spectral does all the small work.
- Never a cool or bright accent; dried brick is furniture, not a shout.
- Never boxed cards, shadows or rounded corners; rules carry the structure.
- Never ornament, duotone or a hard-offset shadow.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Zilla+Slab:wght@700&family=Spectral:ital,wght@0,400;0,500;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
```

```css
.display { font: var(--display-weight) var(--text-display)/1.05 var(--font-display); letter-spacing: var(--tracking-display); color: var(--color-ink); }
.rule--double { height: 2px; border-top: 1px solid var(--color-rule-2); border-bottom: 1px solid var(--color-rule-2); }
.columns { columns: 2; column-gap: var(--space-xl); column-rule: 1px solid var(--color-rule); }
.lede::first-letter { float: left; font: 700 3.4em/0.8 var(--font-display); padding-right: 0.06em; }
.btn { border-radius: 0; padding: var(--space-md) var(--space-lg); font: 700 0.9375rem/1 var(--font-display); }
.btn--primary { background: var(--color-ink); color: var(--color-paper); }
.btn--secondary { border-block: 1px solid var(--color-ink); color: var(--color-ink); }
a { color: var(--color-accent-text); text-decoration-color: var(--color-accent); text-underline-offset: 0.16em; }
::selection { background: color-mix(in oklab, var(--color-accent) 20%, transparent); }
```
