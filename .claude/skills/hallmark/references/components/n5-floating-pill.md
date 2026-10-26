### N5 · Floating pill
A rounded, content-sized nav, visibly detached from the edges, `--space-md` from the top, in a hairline ring. It is a pill from the first paint, or it starts as a full bar and morphs into the pill once the reader scrolls.
*Use when:* an atmospheric page, where the pill sits on the blurred backdrop shown, over the canvas; a modern-minimal or playful page takes the same pill on solid `--color-paper` with no `backdrop-filter`. The morph only when one kinetic moment earns its place on the page.
*Not:* N9 (edge-aligned, in flow); N2 (a corner chip). A pill 95% of the viewport wide is a full width bar with round ends; if the links push it past 720px, drop a link or use N9.

```html
<nav class="nav-pill" aria-label="Primary">
  <a class="wordmark" href="/" aria-label="Studio, home">Studio</a>
  <ul class="nav-pill__links"><li><a href="/catalog">Catalogue</a></li><li><a href="/voice">Voice</a></li></ul>
  <a class="btn btn--primary" href="/start">Start</a>
</nav>
```
```css
.nav-pill { position: fixed; top: var(--space-md); left: 50%; transform: translateX(-50%); z-index: var(--z-sticky-nav);
  display: inline-flex; align-items: center; gap: var(--space-md); padding: var(--space-xs) var(--space-xs) var(--space-xs) var(--space-md);
  background: color-mix(in oklab, var(--color-paper) 78%, transparent); backdrop-filter: blur(14px) saturate(120%);
  border: var(--rule-hair) solid var(--color-rule); border-radius: var(--radius-pill); }
.nav-pill__links { display: flex; gap: var(--space-sm); list-style: none; margin: 0; padding: 0; }
.nav-pill a { font-size: var(--text-sm); text-decoration: none; }
```

#### On scroll: the morph from a bar

One DOM, two visual modes: `.nav` (outer, `position: sticky; top: 0`) owns the bar look, `.nav__inner` owns the pill look, cross-faded on one class toggle (`.is-floating`) with one timing curve.

```html
<header class="nav">
  <div class="nav__inner">
    <a class="wordmark" href="/" aria-label="Studio, home">Studio</a>
    <ul class="nav__links">…</ul>
    <a class="btn btn--primary" href="/install">Install</a>
  </div>
</header>
```

##### The four laws

**1. Total nav height stays constant.** If the outer's height changes when the state flips, every pixel below shifts and the page reads as jumping mid-scroll. Compensate the inner's shrink with the outer's `padding-block` so the sum is the same in both states (the 10b guard): with a 44px control, the table below holds 68px either way.

**2. The visible offset is `transform: translateY()`, never `padding` or `margin`.** The pill sits detached from the viewport top; adding padding to the outer breaks law 1. `transform` leaves layout alone: the pill drops visually and the box stays put.

**3. Cross-fade ownership of every shared visual.** For every property the outer carries at rest (background, border, backdrop-filter, box-shadow), neutralise it in `.is-floating` and put it in the transition list. Forget one, say a stale `backdrop-filter: blur(14px)` on the outer in floating mode, and an invisible blurred strip drags across the viewport behind nothing.

**4. One timing curve across every property.** Each property on its own curve reads as its own animation; all of them on `var(--dur-long)` and `var(--ease-in-out)`, the toggle easing, read as one motion.

##### The property morph, one curve

| Element | Property | Default | Floating |
|---|---|---|---|
| `.nav` | `padding-block` | `0` | `var(--space-xs)` |
| `.nav` | `background-color` | `color-mix(in oklab, var(--color-paper) 62%, transparent)` | `transparent` |
| `.nav` | `border-block-end-color` | `var(--color-rule)` | `transparent` |
| `.nav` | `backdrop-filter` | `saturate(1.4) blur(14px)` | `blur(0)` |
| `.nav__inner` | `max-width` | `var(--container)` | `45rem` |
| `.nav__inner` | `min-height` | `68px` | `52px` |
| `.nav__inner` | `padding-block` | `var(--space-sm)` | `var(--space-2xs)` |
| `.nav__inner` | `border-radius` | `0` | `var(--radius-pill)` |
| `.nav__inner` | `background-color` | `transparent` | `color-mix(in oklab, var(--color-paper) 82%, transparent)` |
| `.nav__inner` | `backdrop-filter` | `blur(0)` | `blur(18px)` |
| `.nav__inner` | `box-shadow` | `none` | `var(--shadow-card), inset 0 0 0 1px var(--color-rule)` |
| `.nav__inner` | `transform` | `translateY(0)` | `translateY(var(--space-sm))` |

The outer is `position: sticky; top: 0; z-index: var(--z-sticky-nav)`. The translucent backgrounds and the `backdrop-filter` rows are the atmospheric recipe; elsewhere both backgrounds are `var(--color-paper)` and the two blur rows go. Use `blur(0)`, not `none`: `none` snaps, `blur(0)` transitions. `backdrop-filter` transitions are baseline in every current browser.

##### The scroll handler

```js
(() => {
  const nav = document.querySelector(".nav");
  if (!nav) return;
  const sentinel = document.createElement("div");
  sentinel.setAttribute("aria-hidden", "true");
  sentinel.style.cssText = "position:absolute;top:0;left:0;width:1px;height:80px;pointer-events:none";
  document.body.prepend(sentinel);
  new IntersectionObserver(([entry]) => nav.classList.toggle("is-floating", !entry.isIntersecting)).observe(sentinel);
})();
```

An observer on an 80px sentinel at the top of the page flips the class once per change: no scroll listener, no throttle, nothing running while the reader scrolls (`craft.md` § 5).

##### What breaks it

1. Two `<header>` elements swapped by opacity: double DOM, broken focus order, content that desyncs.
2. A sentinel shorter than 60px: the morph fires on the slightest scroll.

## Knobs

- Scroll: always a pill · morphs from a full bar past 80 to 120px
- Width: content sized · capped at 720px · capped at 560px
- Backdrop: blur and saturate (atmospheric only) · solid paper
- Anchor: top centre · top right

## Mobile

- Below 60rem: the morph is off and links that no longer fit go behind a menu control (two or three short ones that fit stay in the pill, `craft.md` § 9); wordmark, menu and action stay in the pill. Below 40rem: a corner chip, wordmark left, menu right.
