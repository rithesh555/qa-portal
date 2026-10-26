### F3 · Tabular spec sheet
Each row is a feature: name, value, note. Hairline rules between rows, tabular numerals.
*Use when:* features compare as numbers.
*Not:* F1 (rhythmic, not tabular); a card around a table (`craft.md` § 9). Every value is the user's and carries its source; a row with neither is dropped (46a).

```html
<table class="spec-sheet">
  <caption class="visually-hidden">Specifications</caption>
  <thead><tr><th scope="col">Spec</th><th scope="col">Value</th><th scope="col">Note</th></tr></thead>
  <tbody>
    <tr><th scope="row">Latency</th><td class="num">…</td><td class="note">…</td></tr>
  </tbody>
</table>
```
```css
.spec-sheet { width: 100%; border-collapse: collapse; }
.spec-sheet th, .spec-sheet td { padding: var(--space-sm) 0; border-bottom: var(--rule-hair) solid var(--color-rule); text-align: left; vertical-align: top; }
.spec-sheet th { font-family: var(--font-body); font-size: var(--text-sm); font-weight: 500; white-space: nowrap; }
.spec-sheet .num { font-variant-numeric: tabular-nums; }
.spec-sheet .note { font-size: var(--text-sm); color: var(--color-muted); }
```

## Knobs

- Columns: 2 (name, value) · 3 (with a note) · 4 (with a unit and a note)
- Rules: every row · groups of three · head only

## Mobile

- Below 40rem: the table scrolls sideways in a wrapper (`craft.md` § 9); the note column drops.
