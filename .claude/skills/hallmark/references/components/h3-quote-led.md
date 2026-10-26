### H3 · Quote led
A pull quote with its attribution is the hero. The headline is borrowed.
*Use when:* the user supplied a real quote from a named person who agreed to it (46a). Without one this hero does not exist.
*Not:* T3 (mid page, not the fold). The whole quote is set one way, roman or italic; one italic word inside it is 38i.

```html
<section class="hero-quote">
  <blockquote class="hero-quote__text"><p>…”</p></blockquote>
  <p class="hero-quote__by"><cite>…</cite></p>
  <a class="link" href="#">Read the case</a>
</section>
```
```css
.hero-quote { min-height: 70dvh; display: grid; align-content: center; gap: var(--space-lg); padding: var(--space-2xl) var(--gutter); }
.hero-quote__text { margin: 0; font-family: var(--font-display); font-size: var(--text-display-s); line-height: 1.1; letter-spacing: var(--tracking-display); max-width: 24ch; }
.hero-quote__text p { position: relative; }
.hero-quote__text p::before { content: "“"; position: absolute; transform: translateX(-100%); }
.hero-quote__by { margin: 0; font-size: var(--text-sm); color: var(--color-muted); }
.hero-quote__by cite { font-style: normal; }
```

## Knobs

- Quote face: display roman · display italic (whole quote) · body, large
- Attribution: beneath · margin aligned · right flush
- Length: 80 characters or fewer · 81 to 160

## Mobile

- Below 40rem: the quote steps down to `--text-2xl`.
