### F2 · Sticky scroll stack
A sticky left pane and a right pane that scrolls through related captures.
*Use when:* a feature has several states worth showing in sequence.
*Not:* F4 (numbered, not synced). Scroll-scrubbed motion on top of the pin is `scroll-choreography.md` § Sticky diptych.

```html
<section class="sticky-stack">
  <div class="pane-sticky"><h3>…</h3><p>…</p></div>
  <div class="pane-scroll">
    <figure data-slot="demo-2" data-alt="…">…</figure>
    <figure data-slot="demo-3" data-alt="…">…</figure>
  </div>
</section>
```
```css
.sticky-stack { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--gap-columns); }
/* docks below a sticky nav when one exists (gate 56); falls back to --space-xl alone */
.pane-sticky { position: sticky; top: calc(var(--banner-height, 0px) + var(--space-xl)); align-self: start; z-index: var(--z-sticky); }
.pane-scroll { display: grid; gap: var(--space-2xl); }
.pane-scroll figure { margin: 0; aspect-ratio: 16 / 10; }
@media (max-width: 60rem) { .sticky-stack { grid-template-columns: minmax(0, 1fr); } .pane-sticky { position: static; } }
```

## Knobs

- Pinned side: left · right
- Scrolling pane: captures · code · diagram
- Steps: 2 · 3 · 4

## Mobile

- Below 60rem: the pane unsticks and sits above its captures in one column.
