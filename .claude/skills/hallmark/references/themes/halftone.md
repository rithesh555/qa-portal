---
name: Halftone
slug: halftone
genre: playful
paper: light 96 85
display: slab-serif Ultra
accent: warm 30
posture: committed
keywords: drinks, soda, food brand, print shop, zine, magazine, record label, packaging, campaign, label, bottle, screen print, bold, one colour, retail, craft, loud, fruit
material: cream stock, one spot ink through a dot screen, a fat slab display, three-pixel rules and a nutrition panel as the only box
signature: a fruit drawn as a screened disc in the spot colour, dense on one side and fading to nothing on the other
pictured: Stat-Led, Settled hero
---

# Halftone

Cream stock, one spot colour through a dot screen, Ultra for the display, Chivo between 3px rules, a nutrition panel as the only box. The signature is a fruit drawn as a screened disc in the spot colour, dense on one side and fading to nothing on the other.

## Tokens

```css
:root {
  --color-paper: oklch(96% 0.015 85); --color-paper-2: oklch(93% 0.02 85); --color-paper-3: oklch(88% 0.03 85);
  --color-ink: oklch(24% 0.03 40); --color-ink-2: oklch(34% 0.035 42); --color-muted: oklch(46% 0.04 45);
  --color-rule: oklch(84% 0.03 80);
  --color-accent: oklch(52% 0.21 30); --color-accent-ink: oklch(96% 0.015 85); --color-focus: oklch(50% 0.19 30);
  --color-dot: var(--color-accent); --halftone-size: 12px; --halftone-dot: 3px;
  --font-display: "Ultra", serif; --font-body: "Chivo", ui-sans-serif, sans-serif;
  --font-outlier: var(--font-body);
  --radius-card: 0; --radius-input: 3px; --radius-pill: 999px; --rule-hair: 1px; --rule-bar: 3px;
  --shadow-card: none;
  --tracking-display: 0.005em;
}
```

Committed: the spot colour carries the screens, the button and the cap; nothing else is coloured. Three stocks, stated in the stamp (`halftone: cream`).

| Stock | Paper and ink | The spot |
| --- | --- | --- |
| **Cream and red** (default) | `oklch(96% 0.015 85)` under brown-black `oklch(24% 0.03 40)` | `oklch(52% 0.21 30)` |
| **Lemon on black** | `oklch(19% 0.01 60)` under `oklch(96% 0.02 90)` | yellow `oklch(88% 0.17 95)` with dark ink on it |
| **Blood orange** | the colour goes into the stock: `oklch(72% 0.17 45)` under plum `oklch(24% 0.06 25)` | the plum ink is also the spot, so the dots print dark |

## Faces

- **Display:** Ultra 400, roman, line-height 1.02, `--tracking-display`; 48px for section heads, `--text-display` for the page's head, 84 to 220 for the one figure; a batch tag's name at 22 to 24. One colour per head.
- **Body:** Chivo 400, 16 to 17px, line-height 1.55, in ink-2.
- **Labels, tags, table heads, captions and the panel's small print:** Chivo 500 one step smaller, sentence case, untracked. The label's authority comes from the 3px rules and the fat slab. No mono on the page; figures are Chivo with `tabular-nums`.

## Material

- The screen is the texture, and it is one tile: a `radial-gradient` dot of `--halftone-dot` on a `--halftone-size` cell in the spot colour, masked with a `linear-gradient` to fade from solid to nothing. A fruit is that tile clipped to a circle (`clip-path: circle()`) with the mask angled so one side is dense; a quantity (sugar, months, fridges) is the tile at a density. That is the whole object: no canvas, no per-dot tone, no bars.
- Budget: dots in the spot colour only, never under or across type, one screened object per section, and a field never touches a paragraph.
- Rules do the work of borders: `--rule-bar` in ink across the top of a section and a list, `--rule-hair` between rows, 8px inside the nutrition panel. The panel is the only box: a `--rule-bar` ink border, paper-2 fill, heavy rules inside; tags are small panels and nothing else is boxed.
- The scallop: a crown cap's edge as a repeating radial gradient at a 30px pitch, along one edge of a band. A dot rule (a single row of dots) may replace a hairline once a page.
- Radii: 3px on buttons, 999 on a pill, 50% on caps and dots; panels and tags are square. No shadow anywhere.
- The control pair: a spot-filled button in Chivo 700 at 3px beside a plain `--rule-bar` spot underline. The object family is the label: a bottle drawn as a path, a cap, a batch tag, the nutrition panel.

## Motion

The screen redraws when you change it: a picker swaps the figure and the panel, a sugar slider rescreens a tile, a tier lights on hover. Nothing on scroll, nothing ambient, no dots drifting.

## Voice

The label: the fruit, the grams of sugar, the fridge by street. Blunt, sweet and specific; never a lifestyle.

## Do-nots

- Never a second ink; one spot colour does dots, buttons and caps, and a blue link on the cream is a different printer.
- Never a gradient that is not dots; a fade is a screen from solid to nothing.
- Never a photograph of the fruit; the fruit is a screened disc.
- Never a bar chart; quantity is density.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Ultra&family=Chivo:wght@400;500;700&display=swap" rel="stylesheet">
```

```css
.display { font: 400 var(--text-display)/1.02 var(--font-display); letter-spacing: var(--tracking-display); text-wrap: balance; }
.halftone { background-image: radial-gradient(var(--color-dot) var(--halftone-dot), transparent calc(var(--halftone-dot) + 0.5px)); background-size: var(--halftone-size) var(--halftone-size); }
.fruit { aspect-ratio: 1; clip-path: circle(50%); mask: linear-gradient(35deg, var(--color-ink) 30%, transparent 85%); }
.btn { padding: var(--space-md) var(--space-lg); border-radius: var(--radius-input); font: 700 var(--text-sm) var(--font-body); background: var(--color-accent); color: var(--color-accent-ink); }
.btn--secondary { background: none; color: var(--color-ink); padding: var(--space-md) 0 var(--space-xs); border-radius: 0; border-bottom: var(--rule-bar) solid var(--color-accent); }
.panel { border: var(--rule-bar) solid var(--color-ink); background: var(--color-paper-2); }
.panel hr { border: 0; border-top: 8px solid var(--color-ink); }
.list { border-top: var(--rule-bar) solid var(--color-ink); } .list > li { border-bottom: var(--rule-hair) solid var(--color-rule); }
::selection { background: color-mix(in oklab, var(--color-accent) 30%, transparent); }
```
