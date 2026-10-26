### N7 · Brutal slab
A heavy full width bar: a 2px ink rule beneath, the wordmark in the display face, a heavy sentence-case link row, no shadow, no radius.
*Use when:* the voice is heavy and declarative: a loud playful page, or a theme like Brutal, Manifesto or Sport.
*Not:* N9 (small, quiet). Radius, soft shadow or blur fight this vocabulary: reach for blur and it is N5. The wordmark may be capitals, tracked 0.04em at most (67 allows the wordmark); the links are sentence case.

```html
<header class="nav-slab">
  <a class="slab-wordmark" href="/" aria-label="Studio, home">STUDIO</a>
  <nav class="slab-nav" aria-label="Primary">
    <ul><li><a href="/catalog">Catalogue</a></li><li><a href="/voice">Voice</a></li><li><a href="/work">Work</a></li></ul>
  </nav>
  <a class="cta-fill cta-fill--slab" href="/get">Get it</a>
</header>
```
```css
.nav-slab { display: flex; align-items: center; gap: var(--space-md); padding: var(--space-sm) var(--gutter); border-bottom: 2px solid var(--color-ink); background: var(--color-paper); }
.slab-wordmark { font-family: var(--font-display); font-weight: 800; letter-spacing: 0.04em; text-decoration: none; }
.slab-nav ul { display: flex; gap: var(--space-md); list-style: none; padding: 0; margin: 0 0 0 auto; }
.slab-nav a { font-size: var(--text-sm); font-weight: 700; text-decoration: none; }
```

## Knobs

- Rule weight: 2px · 3px · 4px
- Link weight: 700 · 600
- Action: filled slab · outlined block · text only

## Mobile

- Below 60rem: links that no longer fit go behind a menu; the action stays right. Below 40rem: wordmark and menu only.
