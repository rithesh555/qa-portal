### C1 · Outlined chip
A bordered, transparent button carrying the verb of the action ("Save changes"). No arrow, no icon.
*Use when:* the page has one primary action and it should be visible but quiet.
*Not:* the filled primary (a page has one of those); a chip with an arrow or a plus glued to its text (63).

```html
<a class="cta-outline" href="/studio">Open your studio</a>
```
```css
.cta-outline { display: inline-flex; align-items: center; min-height: 44px; padding: var(--space-sm) var(--space-lg); border: var(--rule-hair) solid var(--color-ink); border-radius: var(--radius-input, var(--radius-card)); background: transparent; color: var(--color-ink); text-decoration: none; cursor: pointer; transition: background-color var(--dur-short) var(--ease-out), transform var(--dur-micro) var(--ease-out); }
.cta-outline:hover { background: var(--color-paper-2); }
.cta-outline:active { transform: translateY(1px); }
.cta-outline:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }
.cta-outline:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
```

## Knobs

- Shape: rectangular · slab · pill (playful or tactile tones only)
- Density: spacious · compact
- Border: hairline · 2px

## Mobile

- Below 40rem: full width, one per row.
