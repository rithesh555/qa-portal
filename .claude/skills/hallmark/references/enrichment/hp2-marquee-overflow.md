### HP2 · Marquee overflow

The h1 is set larger than the viewport on purpose and bleeds past the right edge: the headline is loud enough that the page cannot contain it. `html` and `body` already carry `overflow-x: clip` (34), so the spill never becomes a scroll width; the hero needs no clip of its own, and never `overflow-x: hidden`, which breaks sticky and fixed descendants.

*Use when:* the theme is loud (Brutal, Manifesto, Sport) and the title is short, six words or fewer. A long title plus overflow is noise.
*Avoid when:* the title carries information that must be read in full (a privacy notice, a terms page).

```html
<header class="hero hero--overflow container">
  <h1 class="hero__display hero__display--xxl">Louder than the room.</h1>
  <p class="hero__lede">A festival for the bands nobody books.</p>
</header>
```
```css
.hero--overflow { padding-block: var(--space-2xl); }
.hero__display--xxl { font-family: var(--font-display); font-size: clamp(4rem, 14vw, 14rem); line-height: 0.92; letter-spacing: var(--tracking-display); margin: 0; white-space: nowrap; }
@media (max-width: 60rem) { .hero__display--xxl { white-space: normal; line-height: 1; font-size: clamp(2.5rem, 10vw, 5rem); } }
```

Weight, tracking and case are the theme's: any uppercase is its display voice, set in its CSS rather than typed into the markup, and never a label. In mixed case the one-line head may close to 0.92 (`craft.md` § 1); an uppercase one holds 1.02 (55b); the moment it can wrap, under 60rem, line-height returns to 1.0 (55a).
