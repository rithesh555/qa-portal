### Ft2 · Inline-rule single line
A single horizontal line of credits, address and copyright, each its own element with air between. Hairline rule above. No columns, no middle dots (63).
*Use when:* the footer states a few facts and navigates nowhere: a product page, or an editorial page whose footer is an afterthought.
*Not:* Ft4 (packs more in).

```html
<footer class="foot-line">
  <p>© 2026</p>
  <p>137 Marlow Street</p>
  <p>MIT licensed</p>
</footer>
```
```css
.foot-line { display: flex; flex-wrap: wrap; gap: var(--space-xl); padding: var(--space-lg) var(--gutter); border-top: var(--rule-hair) solid var(--color-rule); font-size: var(--text-sm); color: var(--color-muted); }
.foot-line p { margin: 0; }
```

## Knobs

- Order: copyright, address, licence · address, licence, copyright
- Separator: the gap · a vertical hairline (`border-inline-start` on each `p` after the first)
- Density: dense · spaced

## Mobile

- Below 40rem: the items stack, one per line, and the vertical hairlines drop.
