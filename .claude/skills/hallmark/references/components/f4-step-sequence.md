### F4 · Step sequence
Numbered stages flow vertically: a heading, one paragraph, sometimes a small visual.
*Use when:* the product is a workflow, not a single moment.
*Not:* F2 (unnumbered, synced). The number is a `counter()` inline in the heading, never a typed span above it (54); it takes the heading's face, never mono (64).

```html
<ol class="steps">
  <li><h3>Intake</h3><p>…</p></li>
  <li><h3>Plan</h3><p>…</p></li>
</ol>
```
```css
.steps { list-style: none; counter-reset: stage; margin: 0; padding: 0; display: grid; gap: var(--space-xl); }
.steps > li { counter-increment: stage; }
.steps > li > h3::before { content: counter(stage) ". "; }
```

## Knobs

- Numbering: decimal · leading zero · roman
- Layout: vertical stack · a row of three
- Connector: hairline · none

## Mobile

- Below 60rem: a row of three stacks.
