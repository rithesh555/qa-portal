### H5 · Letter hero
A first person opening, "Dear reader," then one paragraph. Reads as correspondence. The one action is a typographic link at the end of the paragraph, inside the fold (44b).
*Use when:* the founder's voice is the brand.
*Not:* H1 (impersonal). Never a second paragraph in the fold (58); the letter continues below it if it must.

```html
<section class="hero-letter">
  <p class="hero-letter__salute">Dear reader,</p>
  <p class="hero-letter__body">… <a class="link" href="#">Read on</a></p>
  <p class="hero-letter__sign">…</p>
</section>
```
```css
.hero-letter { min-height: 70dvh; display: grid; align-content: center; gap: var(--space-lg); padding: var(--space-2xl) var(--gutter); }
.hero-letter__salute { margin: 0; font-family: var(--font-display); font-size: var(--text-xl); }
.hero-letter__body { margin: 0; max-width: 60ch; font-size: var(--text-lg); line-height: 1.6; }
.hero-letter__sign { margin: 0; color: var(--color-muted); }
```

## Knobs

- Salutation: a greeting · "Dear X," · a dateline in a `<time>`
- Sign off: typed name · drawn signature SVG with an `aria-label` · initials
