### T2 · Logo wall (hairline)
A row of the user's customer logos, monochromatic, separated by hairline rules. No card boxes, no shadows, no line above it (`Trusted by` is an eyebrow, 54). The logos are the user's files; with none supplied the row is one `data-slot="logos"` placeholder per `craft.md` § 8, sized to the count the user gave, and never a run of empty `<img>` or invented customers (46a). No count given, no section.
*Use when:* the user named recognisable customers and wants them surfaced quietly.
*Not:* the default six-logo grid of boxes; this row has no card boxes.

```html
<!-- with files: one <li> per logo the user supplied -->
<section class="logo-wall" style="--logo-count: 5">
  <ul>
    <li><img src="/logos/first.svg" alt="First customer"></li>
    <!-- … one per logo … -->
  </ul>
</section>

<!-- without files: the placeholder at the row's real height -->
<section class="logo-wall" data-slot="logos" data-alt="…" style="--logo-count: 5">
  <p class="slot-label">Your customer logos, five</p>
</section>
```
```css
.logo-wall ul { display: grid; grid-template-columns: repeat(var(--logo-count), minmax(0, 1fr)); gap: 0; padding: 0; list-style: none; }
.logo-wall li { padding: var(--space-md); display: grid; place-items: center; }
.logo-wall li + li { border-inline-start: var(--rule-hair) solid var(--color-rule); }
.logo-wall img { height: 24px; width: auto; filter: grayscale(1); opacity: 0.7; }
.logo-wall[data-slot] { min-height: calc(24px + 2 * var(--space-md)); }
```

A fixed `--logo-count` holds the column count above 1440 (44d); `auto-fit` would grow a column and change the composition.

## Knobs

- Rows: one · two, split evenly (three and three, never five and one)
- Logo treatment: monochrome ink · ghosted at 0.7
- Divider: vertical hairline · none

## Mobile

- Below 60rem: half the count per row, split evenly, and the hairline pattern resets to the new rows. Below 40rem: two per row at 20px tall.
