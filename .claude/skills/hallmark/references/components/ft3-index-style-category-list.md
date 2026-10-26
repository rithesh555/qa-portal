### Ft3 · Index-style category list
Three or four short columns, each headed by a category in the body face one weight up, holding four to six links each, and a colophon line beneath. This is the reflex footer (gate 42): it ships only on a documentation root or a hub with a genuine sitemap, with the site's own category nouns, never a `Product, Company, Resources` set chosen because it is the shape.
*Use when:* the page is a docs root or a hub and the visitor arrives to navigate.
*Not:* Ft4 (one block, not columns).

```html
<footer class="foot-index">
  <div><h2>Guides</h2><ul>…</ul></div>
  <div><h2>Reference</h2><ul>…</ul></div>
  <div><h2>Releases</h2><ul>…</ul></div>
  <div><h2>Community</h2><ul>…</ul></div>
  <p class="foot-index__colophon">MIT licensed. Built in Marlow, 2026.</p>
</footer>
```
```css
.foot-index { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--gap-columns); padding: var(--space-2xl) var(--gutter); border-top: var(--rule-hair) solid var(--color-rule); }
.foot-index h2 { font-family: var(--font-body); font-size: var(--text-sm); font-weight: 600; letter-spacing: 0; margin: 0 0 var(--space-sm); }
.foot-index ul { list-style: none; padding: 0; margin: 0; display: grid; gap: var(--space-xs); font-size: var(--text-sm); }
.foot-index__colophon { grid-column: 1 / -1; font-size: var(--text-sm); color: var(--color-muted); margin: var(--space-lg) 0 0; }
```

## Knobs

- Columns: 3 · 4
- Heading style: a heavier weight · ink over muted links · a hairline beneath
- Colophon: one line · a rule then the line

## Mobile

- Below 60rem: four columns become two. Below 40rem: one column, the column heads kept.
