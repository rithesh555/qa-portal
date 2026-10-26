### T4 · Numbered stat strip
A horizontal strip of three to five figures, each with its unit or subject, running across one row in tabular numerals. Every figure is the user's, with its unit; none is rounded up, estimated or invented, and a strip with no figures from the user does not ship (46a).
*Use when:* the user gave several complementary figures that work together.
*Not:* H4 (one focal number, not several).

```html
<section class="stat-strip">
  <div><b><!-- the user's figure --></b><span><!-- its unit or subject --></span></div>
  <div><b><!-- the user's figure --></b><span><!-- its unit or subject --></span></div>
  <div><b><!-- the user's figure --></b><span><!-- its unit or subject --></span></div>
</section>
```
```css
.stat-strip { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.stat-strip > div { padding-inline: var(--space-lg); display: grid; gap: var(--space-2xs); }
.stat-strip > div:first-child { padding-inline-start: 0; }
.stat-strip > div:last-child { padding-inline-end: 0; }
.stat-strip > div + div { border-inline-start: var(--rule-hair) solid var(--color-rule); }
.stat-strip b { font-family: var(--font-display); font-size: var(--text-3xl); font-weight: 400; line-height: 1; font-variant-numeric: tabular-nums; }
.stat-strip span { font-family: var(--font-body); font-size: var(--text-sm); color: var(--color-muted); white-space: nowrap; }
```

## Knobs

- Layout: 3-up · 4-up · 5-up
- Number weight: display · body, large
- Subject position: under · inline after the figure

## Mobile

- Below 60rem: a 4-up becomes 2-up and a 3-up or 5-up one figure per row, so no figure sits alone on a last row (F20); the hairline pattern resets, with top borders between rows. Below 40rem: one figure per row.
