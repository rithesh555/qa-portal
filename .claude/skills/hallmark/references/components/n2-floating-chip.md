### N2 · Floating chip
A small fixed chip in a corner: wordmark and one verb ("Try it"). Out of document flow.
*Use when:* the fold is the content and a bar would fight it.
*Not:* C4 (full width, at the bottom); N5 (a whole nav in a pill).

```html
<nav class="nav-chip" aria-label="Site">
  <a class="wordmark" href="/" aria-label="Studio, home">Studio</a>
  <a class="cta-outline" href="/try">Try it</a>
</nav>
```
```css
.nav-chip { position: fixed; top: var(--space-md); right: max(var(--space-md), calc(50% - var(--container) / 2 + var(--gutter))); z-index: var(--z-sticky-nav); display: inline-flex; align-items: center; gap: var(--space-md); padding: var(--space-xs) var(--space-sm); background: var(--color-paper); border: var(--rule-hair) solid var(--color-rule); border-radius: var(--radius-card); }
```

## Knobs

- Corner: top right · bottom left · bottom right
- Content: one action · a theme switch · a search trigger
- Surface: `--color-paper` · `--color-paper-2`
