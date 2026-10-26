### S1 · Ordinal by structure
When a run of sections is genuinely ordered, the order comes from the markup: a real `<ol>` with `counter()`, the numeral inline at the heading's own size, in the heading's own weight and colour. A small muted `01` stacked above an `<h2>` is an eyebrow in ordinal geometry and gate 54 bans it.
*Use when:* the content is truly sequential (chapters, steps, issues, a run of numbered work). Not for "the third section on the page", which is a position, not an ordinal.
*Not:* S5 (a caption under the section); [`../enrichment/hp4-decorative-numeral.md`](../enrichment/hp4-decorative-numeral.md) (one numeral at graphic scale, one per page, not a run).

```html
<ol class="chapters">
  <li>
    <h2>Foundations</h2>
    <p>…</p>
  </li>
  <li>
    <h2>The crossing</h2>
    <p>…</p>
  </li>
</ol>
```
```css
.chapters { list-style: none; counter-reset: chapter; padding: 0; }
.chapters > li { counter-increment: chapter; }
.chapters > li > h2 { font-variant-numeric: tabular-nums; }
.chapters > li > h2::before {
  content: counter(chapter, decimal-leading-zero) "\00a0\00a0";
}
```

The ordinal is generated on the heading itself, so a screen reader hears it once, as part of the heading.

## Knobs

- Ordinal form: `decimal-leading-zero` · `upper-roman` · none (a rule between items instead)
- Ordinal position: inline before the first word · hung in the outer margin at the heading's size (`position: absolute`, returns inline below 60rem) · one numeral at graphic scale (hp4, one per page, only when the number is real)
