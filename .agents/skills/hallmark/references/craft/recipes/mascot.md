### Recipe 2 · Minimal-line mascot

A small SVG character, face only, about 120 by 120 units, with personality and none of the uncanny-valley risk of a rendered figure. Two ellipse eyes, one quadratic-curve mouth, two stem accents (hair, hat, horns, antennae). The eyes blink on a two-cycle loop that ends inside 5 seconds, so it needs no pause control (`patterns.md` § A loop that can pause). Sits beside text. It does not react to the pointer; a hover state on a non-interactive element is a tell (11).

```html
<figure class="mascot">
  <svg viewBox="0 0 120 130" class="mascot__svg" role="img" aria-label="A drawn face with two eyes and a small smile">
    <circle class="mascot__head" cx="60" cy="60" r="42" />

    <ellipse class="mascot__eye mascot__eye--l" cx="46" cy="56" rx="4" ry="6" />
    <ellipse class="mascot__eye mascot__eye--r" cx="74" cy="56" rx="4" ry="6" />

    <path class="mascot__mouth" d="M 50 76 Q 60 84 70 76" />

    <path class="mascot__accent" d="M 32 22 Q 40 12 52 18" />
    <path class="mascot__accent" d="M 88 22 Q 80 12 68 18" />
  </svg>
</figure>
```

```css
.mascot { display: inline-block; width: 80px; height: 86px; margin: 0; vertical-align: -8px; }
.mascot__svg { width: 100%; height: 100%; color: var(--color-ink); }
.mascot__head { fill: color-mix(in oklab, var(--color-paper-2) 94%, var(--color-accent)); stroke: var(--color-ink); stroke-width: 2; }
@property --lid { syntax: "<number>"; initial-value: 1; inherits: false; }
.mascot__eye  { fill: var(--color-ink); transform: scaleY(var(--lid)); transform-box: fill-box; transform-origin: center; animation: blink calc(var(--dur-long) * 5) var(--ease-in-out) 2; }
.mascot__eye--r { animation-delay: var(--dur-micro); }   /* one eye lags a little, as a drawn face would */
@keyframes blink {
  0%, 70%, 80%, 100% { --lid: 1; }
  74%, 76%           { --lid: 0.15; }
}
.mascot__mouth { fill: none; stroke: var(--color-ink); stroke-width: 1.6; stroke-linecap: round; }
.mascot__accent { fill: none; stroke: var(--color-accent); stroke-width: 1.2; opacity: 0.6; stroke-linecap: round; }

@media (prefers-reduced-motion: reduce) {
  .mascot__eye { animation: none; }
}
```

**Use when** a small product, studio or indie brand needs personality without a generated character. **Avoid when** the mascot must be expressive across many states; the `@property` route is for simple loops, and articulated emotion is tier F territory.
