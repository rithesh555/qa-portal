### H4 · Stat led
One number the user gave is the hero, with its unit; the `h1` beneath it says what the figure measures and where it comes from (46b).
*Use when:* the user supplied one defensible, externally checkable figure.
*Not:* T4 (a row of several). Never a figure the build wrote (46a): without the user's number, the page picks another hero.

```html
<section class="hero-stat">
  <p class="hero-stat__figure num"><!-- the user's figure -->…<span class="hero-stat__unit">%</span></p>
  <h1 class="hero-stat__line">…</h1>
  <a class="cta-outline" href="#">…</a>
</section>
```
```css
.hero-stat { min-height: 80dvh; display: grid; align-content: center; gap: var(--space-md); padding: var(--space-2xl) var(--gutter); }
.hero-stat__figure { margin: 0; font-family: var(--font-display); font-size: clamp(6rem, 16vw, 14rem); line-height: 1; letter-spacing: var(--tracking-display); font-variant-numeric: tabular-nums; }
.hero-stat__unit { font-size: 0.5em; }
.hero-stat__line { margin: 0; max-width: 24ch; font-family: var(--font-display); font-size: var(--text-display-s); line-height: 1.1; letter-spacing: var(--tracking-display); }
```

## Knobs

- Figure: display, tabular · mono (only when mono is the theme's material)
- Line: beneath · inline right of the figure
- Secondary figures: none · two beneath (also the user's, also sourced)

## Mobile

- Below 40rem: the clamp floor drops to 4rem; secondary figures stack.
