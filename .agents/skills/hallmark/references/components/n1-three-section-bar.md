### N1 · Three-section bar
Wordmark hard left, a centred cluster of three to five links (one or two opening small dropdowns), a sign-in link and one quiet action hard right (outlined: the filled primary belongs to the hero, `craft.md` § 9). Dense and balanced; the structural opposite of N9.
*Use when:* a product page has several real destinations and one clear primary action.
*Not:* N9 (one or two destinations at the far edge); N5 (a detached pill); N11 (full width panels). This is the reflex bar (42): reach for it only when the product has four or more real top-level destinations, name it in the stamp and move one knob. The cluster never collides with the brand or the action; if it cannot sit centred with room, drop to three links or use N9. A dropdown opens on hover and on focus, and closes on Escape.

```html
<header class="nav"><div class="nav__inner">
  <a class="nav__brand" href="/" aria-label="Studio, home">Studio</a>
  <nav class="nav__center" aria-label="Primary">
    <div class="nav__item nav__item--menu">
      <button class="nav__link" type="button" aria-expanded="false">Product</button>
      <div class="nav__dropdown"><a class="nav__dropitem" href="/gateway"><b>Gateway</b><span>one endpoint</span></a></div>
    </div>
    <a class="nav__link" href="/docs">Docs</a><a class="nav__link" href="/pricing">Pricing</a>
  </nav>
  <div class="nav__right"><a class="btn btn--text" href="/sign-in">Sign in</a><a class="btn btn--quiet" href="/start">Start</a></div>
</div></header>
```
```css
.nav { position: fixed; inset: 0 0 auto; z-index: var(--z-sticky-nav); background: transparent; border-bottom: var(--rule-hair) solid transparent;
  transition: background-color var(--dur-short) var(--ease-out), border-color var(--dur-short) var(--ease-out); }
.nav.is-scrolled { background: var(--color-paper); border-bottom-color: var(--color-rule); }
.nav__inner { max-width: var(--container); margin: 0 auto; padding-inline: var(--gutter); min-height: 64px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; }
.nav__brand { justify-self: start; } .nav__center { justify-self: center; display: flex; gap: var(--space-xs); } .nav__right { justify-self: end; display: flex; align-items: center; gap: var(--space-sm); }
.nav__link { font-size: var(--text-sm); padding: var(--space-xs) var(--space-sm); background: none; border: 0; color: inherit; text-decoration: none; }
.nav__dropdown { position: absolute; z-index: var(--z-dropdown); opacity: 0; visibility: hidden; transform: translateY(-6px);
  transition: opacity calc(var(--dur-short) * 0.7) var(--ease-in), transform calc(var(--dur-short) * 0.7) var(--ease-in), visibility 0s linear calc(var(--dur-short) * 0.7); }
.nav__item--menu:hover .nav__dropdown, .nav__item--menu:focus-within .nav__dropdown { opacity: 1; visibility: visible; transform: none;
  transition-duration: var(--dur-short); transition-timing-function: var(--ease-out); transition-delay: 0s; }
```

Scroll state: transparent over the hero, then the paper and its hairline once a 24px sentinel at the top of the page leaves view, watched by an IntersectionObserver (`craft.md` § 5).

## Knobs

- Centre links: 3 · 4 · 5
- Dropdowns: none · 1 · 2
- Scroll state: paper once scrolled · paper from the first paint
- Right pair: sign in and fill · fill only

## Mobile

- Below 60rem: the centre cluster collapses behind a menu disclosure; sign in and the action stay. Below 40rem: wordmark left, menu and action right, 44px targets.
