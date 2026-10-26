### F6 · Product card grid
Each card is a product, not a feature: image, name, price, one small action. A shop floor, not a marketing site.
*Use when:* the brief is commerce, a catalogue, a lookbook, a marketplace: the page sells things, and the user supplied the product photographs. Without them the range is a table of names and prices (the F3 spec sheet), never a grid of empty frames (68).
*Not:* F1 (sells features; spans vary). Cards are uniform on purpose, the rhythm is the products. No two-line description under a name (the price is the description); no shadow plus radius plus border plus ribbon (one container signal); no image that scales on hover (11): the feedback is the action appearing on the card.

```html
<section class="product-grid">
  <article class="product">
    <a class="product__media" href="/shop/linen-apron" aria-label="Linen apron, indigo"><img src="" alt="" loading="lazy" /></a>
    <div class="product__meta">
      <h3 class="product__name">Linen apron, indigo</h3>
      <p class="product__price num">…</p>
    </div>
    <button class="product__add" type="button" aria-label="Add the linen apron to your bag">Add</button>
  </article>
</section>
```
```css
.product-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-xl) var(--gap-columns); }
.product { position: relative; display: grid; gap: var(--space-sm); }
.product__media { display: block; aspect-ratio: 3 / 4; background: var(--color-paper-2); border-radius: var(--radius-card); overflow: hidden; }
.product__media img { width: 100%; height: 100%; object-fit: cover; outline: 1px solid color-mix(in oklab, var(--color-ink) 6%, transparent); outline-offset: -1px; }
.product__name { margin: 0; font-family: var(--font-body); font-size: var(--text-md); font-weight: 500; letter-spacing: 0; }
.product__price { margin: 0; font-size: var(--text-sm); color: var(--color-ink-2); font-variant-numeric: tabular-nums; }
.product__add { position: absolute; top: var(--space-sm); right: var(--space-sm); min-height: 44px; padding: 0 var(--space-md); background: var(--color-paper); border: var(--rule-hair) solid var(--color-rule-2, var(--color-rule)); border-radius: var(--radius-pill); cursor: pointer; opacity: 0; transition: opacity var(--dur-short) var(--ease-out); }
.product:hover .product__add, .product:focus-within .product__add { opacity: 1; }
.product__add:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }
@media (pointer: coarse) { .product__add { opacity: 1; } }
@media (max-width: 60rem) { .product-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 40rem) { .product-grid { grid-template-columns: minmax(0, 1fr); } }
```

Names and prices are the user's material; the price is a figure, so tabular numerals, and mono only when mono is the theme's material (64).

## Knobs

- Card ratio: 3/4 · 1/1 · 4/3
- Density: 3 up · 4 up, whichever leaves no orphan on the last row (F20)
- Price: under the name · over the image
- Action: Add · Save · none

## Mobile

- Below 60rem: two up. Below 40rem: one up.
