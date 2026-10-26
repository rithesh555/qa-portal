### H1 · Marquee
A single statement fills the fold; one sentence and one action sit small at its foot (Floor 12, 13).
*Use when:* the brand or person is the message.
*Not:* H4 (a number, not a statement); a marquee with a paragraph under it (58).

```html
<section class="hero-marquee">
  <h1 class="display-xxl">…</h1>
  <div class="hero-marquee__foot"><p>…</p><a class="link" href="#">…</a></div>
</section>
```
```css
.hero-marquee { min-height: 80dvh; display: grid; align-content: end; gap: var(--space-lg); padding: 0 var(--gutter) var(--space-2xl); }
.hero-marquee__foot { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: var(--space-md); max-width: 60rem; }
.display-xxl { font-size: clamp(4rem, 10vw, 9rem); line-height: 1; letter-spacing: var(--tracking-display); max-width: 12ch; overflow-wrap: break-word; min-width: 0; text-wrap: balance; }
```

## Knobs

- Size: the poster clamp shown (`craft.md` § 1) for a head of 20 characters or fewer · `var(--text-display)` for 21 to 50, so the fold still holds the sentence and the action (44b)
- Alignment: left · centred · right
- Rule: none · one hairline above · one hairline below

## Mobile

- Below 40rem: the clamp floor drops to 2.75rem.
