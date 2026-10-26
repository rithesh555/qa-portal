---
name: Formwork
slug: formwork
genre: editorial
paper: mid 74 80
display: display-condensed Oswald
accent: warm 38
posture: restrained
keywords: construction, concrete, skatepark, contractor, civil, landscape, foundry, industrial, fabrication, workshop, engineering, cast, welded, builders, hardware, tools, site, heavy
material: a poured concrete surface with board lines and tie holes, condensed caps in ink, one safety orange on plates and numbers, drawings built from a radius
signature: an orange plate button on a three-pixel cast shadow, set on a concrete surface that shows the lines of its boards
pictured: Split Studio, Ledge hero
---

# Formwork

A warm grey concrete surface that keeps its board lines and tie holes, Oswald capitals in ink, safety orange on the plate button and the numbers, sections drawn as SVG from a radius. The signature is an orange plate button on a 3px cast shadow over the board-lined wall.

## Tokens

```css
:root {
  --color-paper: oklch(74% 0.008 80); --color-paper-2: oklch(69% 0.009 80); --color-paper-3: oklch(64% 0.01 80);
  --color-plate: oklch(81% 0.008 80);
  --color-ink: oklch(18% 0.005 270); --color-ink-2: oklch(30% 0.006 80); --color-muted: oklch(32% 0.008 80);
  --color-rule: oklch(64% 0.01 80);
  --color-accent: oklch(66% 0.21 38); --color-accent-ink: oklch(18% 0.005 270); --color-focus: oklch(42% 0.15 38);
  --color-accent-deep: oklch(48% 0.17 38);
  --color-tie: oklch(58% 0.01 80); --color-seam-light: oklch(97% 0.01 80); --color-seam-dark: oklch(8% 0.01 80);
  --texture-opacity: 0.08;
  --font-display: "Oswald", ui-sans-serif, sans-serif; --font-body: "Archivo", ui-sans-serif, sans-serif;
  --font-outlier: "Archivo Narrow", ui-sans-serif, sans-serif;
  --radius-card: 0; --radius-pill: 0; --rule-hair: 1px; --rule-bar: 3px;
  --shadow-card: 6px 6px 0 var(--color-ink);
  --tracking-display: -0.005em;
}
```

Three pours, stated in the stamp (`formwork: cast`). Muted sits on the wall only; on a slot or a darker step the text is ink.

| Pour | Wall and ink | Orange |
| --- | --- | --- |
| **Cast** (default) | concrete `oklch(74% 0.008 80)` under near-black, grain multiplied | `oklch(66% 0.21 38)` |
| **Night pour** | `oklch(27% 0.006 270)` under `oklch(95% 0.006 80)`, grain screened | `oklch(70% 0.21 40)` |
| **Drawing** | tracing paper `oklch(95% 0.012 85)` with a 24px grid and no board lines, blue-black ink `oklch(22% 0.02 260)` | a red `oklch(58% 0.21 30)` |

## Faces

- **Display:** Oswald 700, uppercase, line-height 1.0 where a head can wrap (55a) and 0.92 only on a single nowrap line, `--tracking-display`; 48px for section heads, 84 to 90 for the page, 96 to 120 for figures. One colour per head. Roman.
- **Body:** Archivo 400 and 500, 16 to 17px, line-height 1.5, in ink-2.
- **Dimensions:** Archivo Narrow 500 at 12 to 13px, sentence case, tabular, the outlier, for every dimension on a drawing and the week number. Captions, meta and table heads: Archivo 500 one step smaller, sentence case. Plates and slots wear Oswald 700 at 13 to 15px uppercase, tracked 0.04em, following the display's capitals. No mono.

## Material

- The wall: every surface carries the board lines (a 1px light and a 2px dark line every 96px) and tie holes on a 480 by 288 grid, drawn as gradients, plus grain from `texture.md` § Grain at `--texture-opacity`, multiplied (screened on the night pour). The one texture family.
- Plates and slots: a button is a plate, raised on `0 3px 0` in the deep orange and nothing softer, or a slot, pressed in with `inset 0 2px 3px` and a 2px ink border.
- Cards are cast: plate-coloured concrete, a `--rule-bar` ink border, a 6 to 8px block shadow in ink. Rules `--rule-bar` in ink across the top of a section, `--rule-hair` in paper-3 between rows.
- Drawings are the object family: a section or a plan built from a radius, 2.5px ink outline, dashed construction lines, hatch under the slab, an orange coping dot, dimensions in Narrow.
- The stripe: hazard stripes at 45 degrees in orange and ink, 14px each, along one edge of a band, at most twice a page.
- No radius on anything; the only curves are the transition radii in a drawing. Orange stays under a twentieth of a screen: the plate, the coping dot, the numbers.

## Motion

Concrete does not animate; the pour does. A radius picker redraws the section on click, a pour log lands its loads one by one when pressed, a pin moves where you click. Plates press in `--dur-micro`. Nothing on scroll, nothing ambient.

## Voice

The foreman's sheet: the radius in millimetres, the pour number, the week, the load.

## Do-nots

- Never a second accent; a blue link on the wall is a different site.
- Never a rounded corner; concrete is cast against straight boards.
- Never a photograph of the thing; the structure is a drawing and the photo lives in a slot.
- Never a soft blurred shadow on a plate; the 3px cast shadow is the material.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@700&family=Archivo:wght@400;500&family=Archivo+Narrow:wght@500&display=swap" rel="stylesheet">
```

```css
body { background-color: var(--color-paper); background-image:
    radial-gradient(circle at 22px 48px, var(--color-tie) 4px, var(--color-paper-3) 5px, transparent 6.5px),
    repeating-linear-gradient(180deg, transparent 0 94px, color-mix(in oklab, var(--color-seam-light) 22%, transparent) 94px 95px, color-mix(in oklab, var(--color-seam-dark) 10%, transparent) 95px 97px);
  background-size: 480px 288px, 100% 96px; }
.display { font: 700 var(--text-display)/1 var(--font-display); text-transform: uppercase; letter-spacing: var(--tracking-display); }
.plate { padding: var(--space-sm) var(--space-xl); font: 700 var(--text-sm)/1.6 var(--font-display); letter-spacing: 0.04em; text-transform: uppercase; background: var(--color-accent); color: var(--color-accent-ink);
  box-shadow: 0 3px 0 var(--color-accent-deep); transition: translate var(--dur-micro) var(--ease-out), box-shadow var(--dur-micro) var(--ease-out); }
.plate:active { translate: 0 3px; box-shadow: 0 0 0 var(--color-accent-deep); }
.card { background: var(--color-plate); border: var(--rule-bar) solid var(--color-ink); box-shadow: var(--shadow-card); }
::selection { background: color-mix(in oklab, var(--color-accent) 35%, transparent); }
```
