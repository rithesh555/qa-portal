### N9 · Edge-aligned
Wordmark at one edge, one action or two text links at the other, nothing between. The absence is the design.
*Use when:* the page has one or two destinations; quiet, atelier, editorial and product pages that earn silence. The first nav to reach for on a page that does not need more.
*Not:* N1 (a centre cluster and a filled button, the reflex bar, 42). Four links "to fill the space" is N1 with extra steps. The action is a verb ("Book a fitting"), never "Get" with an arrow (63).

```html
<header class="nav-edge">
  <a class="wordmark" href="/" aria-label="Studio, home">Studio</a>
  <nav aria-label="Primary"><a class="btn btn--secondary" href="/book">Book a fitting</a></nav>
</header>
```
```css
.nav-edge { display: flex; justify-content: space-between; align-items: center; gap: var(--space-lg); padding: var(--space-md) var(--gutter); }
.nav-edge nav { display: flex; align-items: center; gap: var(--space-lg); }
.nav-edge .wordmark { font-family: var(--font-display); font-size: var(--text-md); text-decoration: none; }
.nav-edge nav a:not(.btn) { font-size: var(--text-sm); text-decoration: none; }
```

## Knobs

- Far side: one action · two text links · one link and one action
- Action: outlined · filled · typographic link
- Wordmark: display face · body face · the outlier
- Sticky: no · yes, with a paper background once scrolled

## Mobile

- Below 40rem: the links fold into the action or a menu control; the action keeps a 44px hit target.
