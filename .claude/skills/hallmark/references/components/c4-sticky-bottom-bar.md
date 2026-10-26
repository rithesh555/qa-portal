### C4 · Sticky bottom bar
A bar pinned to the viewport bottom holding the primary action and one line of fact.
*Use when:* the page is long and the action must stay reachable.
*Not:* a second hero CTA; a bar that hides the footer (the page pads its bottom by the bar's height).

```html
<aside class="cta-sticky" aria-label="Start a trial">
  <p>…</p>
  <a class="cta-outline" href="/start">Start the trial</a>
</aside>
```
```css
.cta-sticky { position: fixed; inset: auto 0 0 0; z-index: var(--z-sticky); display: flex; justify-content: space-between; align-items: center; gap: var(--space-md); padding: var(--space-sm) var(--gutter); background: var(--color-paper); border-top: var(--rule-hair) solid var(--color-rule); }
.cta-sticky p { margin: 0; font-size: var(--text-sm); }
body { padding-bottom: calc(44px + var(--space-lg)); }
```

The line is the user's fact (the trial length, the ship date), never a reassurance the build wrote (46a).

## Knobs

- Reveal: always · after the fold · on scroll up
- Surface: hairline top · paper change

## Mobile

- Below 40rem: the line drops; the action fills the bar at 44px.
