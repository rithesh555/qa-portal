### N12 · Announcement banner and retracting nav
A coloured banner stacked above one real nav. Scrolling down, the banner slides up out of view and the bar docks to the top; scrolling up brings it back. A dismiss control removes it for good and zeroes its height so no gap remains. The banner's colour is what stops it reading as two navs.
*Use when:* there is a real, time-bound announcement (a launch, a sale, shipping) worth a strip over a product or commerce page.
*Not:* a second row of links (the two-bar smell this exists to avoid); a static strip that never moves (on a theme that keeps still, the bar simply scrolls away with the page instead). One line, one link, one dismiss; no glyph before the text (63); the height is never animated, the whole `.nav` translates.

```html
<header class="nav" id="nav">
  <div class="nav__banner" id="banner">
    <p class="nav__banner-text">… <a class="nav__banner-link" href="/changelog">Read the changelog</a></p>
    <button class="nav__banner-x" id="banner-x" type="button" aria-label="Dismiss the announcement"><svg aria-hidden="true">…</svg></button>
  </div>
  <div class="nav__bar"><div class="nav__bar-inner">
    <a class="nav__brand" href="/" aria-label="Studio, home">Studio</a>
    <nav class="nav__links" aria-label="Primary">…</nav>
    <a class="btn btn--accent" href="/start">Start</a>
  </div></div>
</header>
```
```css
:root { --banner-height: 44px; --bar-height: 64px; }
.nav { position: fixed; inset: 0 0 auto; z-index: var(--z-sticky-nav); transform: translateY(0); transition: transform var(--dur-long) var(--ease-out); }
.nav.is-compact   { transform: translateY(calc(var(--banner-height) * -1)); transition: transform calc(var(--dur-long) * 0.7) var(--ease-in); }  /* the banner leaves, the bar docks to the top */
.nav.is-dismissed { transform: none; }
.nav.is-dismissed .nav__banner { display: none; }
.nav__banner { height: var(--banner-height); display: flex; align-items: center; justify-content: center; gap: var(--space-sm); padding-inline: var(--gutter); background: var(--color-accent); color: var(--color-accent-ink); }
.nav__banner-text { margin: 0; font-size: var(--text-sm); }
.nav__banner-link { color: inherit; }
.nav__banner-x { min-width: 44px; height: var(--banner-height); background: none; border: 0; color: inherit; cursor: pointer; }
.nav__bar { background: var(--color-paper); border-bottom: var(--rule-hair) solid var(--color-rule); }
.nav__bar-inner { max-width: var(--container); margin: 0 auto; padding-inline: var(--gutter); min-height: var(--bar-height); display: flex; align-items: center; gap: var(--space-lg); }
/* content clears both at rest; dismiss zeroes --banner-height so the calc reflows with no gap */
main { padding-top: calc(var(--banner-height) + var(--bar-height) + var(--space-xl)); }
```

JS: one passive scroll listener, throttled to one read per animation frame (direction is the one thing an observer cannot tell you); track the scroll direction; past 48px going down add `.is-compact`, going up remove it, near the top always show. Dismiss sets `--banner-height: 0px` on `documentElement.style` and adds `.is-dismissed`. A second sticky element on the page docks under `calc(var(--banner-height) + var(--bar-height))` (56).

## Knobs

- Banner fill: solid accent (it counts toward the accent's footprint, 23) · tinted paper with ink
- Dismiss: yes · none
- Content: a launch line · a live status in a `role="status"` · the days left to a real date

## Mobile

- Below 60rem: the links collapse behind a menu; the action stays. Below 40rem: the banner text truncates to one line.
