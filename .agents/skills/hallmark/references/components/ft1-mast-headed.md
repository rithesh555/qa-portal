### Ft1 · Mast-headed
A wordmark and tagline anchor a single horizontal band. Two or three small links beside, address or licence below.
*Use when:* the page has heavy content; the footer should be quiet and singular.
*Not:* Ft2 (even more reduced).

```html
<footer class="foot-mast">
  <p class="wordmark">Studio</p>
  <p class="tagline">Type, print and bindings.</p>
  <ul class="links">
    <li><a href="/imprint">Imprint</a></li>
    <li><a href="/privacy">Privacy</a></li>
    <li><a href="/contact">Contact</a></li>
  </ul>
</footer>
```
```css
.foot-mast { padding: var(--space-2xl) var(--gutter); display: grid; grid-template-columns: auto minmax(0, 1fr) auto; column-gap: var(--space-xl); align-items: baseline; }
.foot-mast .wordmark { font-family: var(--font-display); font-size: var(--text-2xl); margin: 0; }
.foot-mast .tagline { font-size: var(--text-sm); color: var(--color-muted); margin: 0; }
.foot-mast .links { display: flex; gap: var(--space-lg); list-style: none; padding: 0; margin: 0; font-size: var(--text-sm); }
```

## Knobs

- Wordmark size: display 3xl · display 2xl · xl
- Tagline: italic display · roman body · none
- Links: a row with gaps · a two-line stack · a vertical hairline between each

## Mobile

- Below 60rem: the grid stacks into wordmark, tagline, then the links, which wrap to two lines.
