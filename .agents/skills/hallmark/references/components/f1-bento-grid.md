### F1 · Bento grid
An asymmetric grid of six to nine tiles in mixed spans (1x1, 2x1, 1x2, 2x2). Rhythm comes from size.
*Use when:* several equally valid entry points; a feature page.
*Not:* a three-card row with one tile stretched; F2 (stacks vertically, sticky pacing). Tiles are tinted wells or air, never a card inside a card (4).

```html
<section class="bento">
  <article class="cell span-2x2"><h3>…</h3><figure data-slot="demo-2" data-alt="…">…</figure></article>
  <article class="cell"><h3>…</h3><p>…</p></article>
  <article class="cell span-2x1"><h3>…</h3><p>…</p></article>
</section>
```
```css
.bento { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-auto-rows: 12rem; gap: var(--gap-columns); }
.cell { min-width: 0; padding: var(--space-lg); background: var(--color-paper-2); border-radius: var(--radius-card); }
.span-2x2 { grid-column: span 2; grid-row: span 2; }
.span-2x1 { grid-column: span 2; }
.span-1x2 { grid-row: span 2; }
@media (max-width: 60rem) { .bento { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 40rem) { .bento { grid-template-columns: minmax(0, 1fr); grid-auto-rows: auto; } .span-2x2, .span-2x1, .span-1x2 { grid-column: auto; grid-row: auto; } }
```

## Knobs

- Tiles: 6 · 7 · 9
- Spans: regular · irregular · mosaic
- Surface: tinted well · hairline · air

## Mobile

- Below 60rem: two columns, big tiles keep their span. Below 40rem: one column in reading order.
