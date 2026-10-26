### Ft8 · Marquee scroll
A horizontal infinite-scroll line repeating one short phrase with a dot between repeats (a marquee's separator is a legal middle dot, 63). Sentence case, untracked, in the display face. It pauses on hover and on focus, and carries a visible pause control because it moves for longer than five seconds (18).
*Use when:* the voice is loud and kinetic and the theme's Motion section admits an ambient loop; the footer is then the page's one loop, 8s or slower a cycle.
*Not:* Ft4 (static text); a quiet or editorial page, or a theme that keeps still, where the motion is noise.

```html
<footer class="foot-marquee" data-loop>
  <div class="foot-marquee__track" aria-hidden="true">
    <span>Open all summer · Open all summer · Open all summer · Open all summer · </span>
    <span>Open all summer · Open all summer · Open all summer · Open all summer · </span>
  </div>
  <button class="foot-marquee__pause" type="button" data-loop-toggle>Pause</button>
  <p class="visually-hidden">Studio, open all summer. MIT licensed.</p>
</footer>
```
```css
.foot-marquee { overflow: clip; border-top: 2px solid var(--color-ink); }
.foot-marquee__track { display: flex; width: max-content; white-space: pre; padding-block: var(--space-md); animation: foot-marquee 32s linear infinite; }
.foot-marquee__track span { font-family: var(--font-display); font-weight: 700; font-size: clamp(1rem, 2.5vw, 1.5rem); }
.foot-marquee__pause { min-height: 44px; margin: 0 var(--gutter) var(--space-sm); padding: 0; background: none; border: 0; color: var(--color-muted); font-size: var(--text-sm); text-decoration: underline; text-underline-offset: 0.16em; cursor: pointer; transition: color var(--dur-short) var(--ease-out); }
.foot-marquee__pause:hover { color: var(--color-ink); }
@keyframes foot-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@media (prefers-reduced-motion: reduce) { .foot-marquee__track { animation: none; } }
```

The two spans are identical and the track is exactly as wide as they are (`max-content`, no gap, `pre` keeping the trailing space), so the loop is seamless at -50%. `html` and `body` still carry the page's `overflow-x: clip` (34); the footer's clip is local. The pause, the hover and focus holds and the off-screen stop are the loop contract in `patterns.md` § A loop that can pause.

## Knobs

- Speed: 24s · 32s · 48s a cycle
- Direction: left · right

## Mobile

- Below 60rem: the cycle runs about a quarter longer, so the phrase stays readable on a narrow screen.
