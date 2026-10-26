### H6 · Photographic fold
One full bleed photograph fills the fold. A caption in a corner carries a fact (place, date). The headline, one sentence and the action sit on a paper plate at the base, inside the fold (44b).
*Use when:* the user supplied photography that earns full bleed.
*Not:* H2 (paired). Never a stock photograph with a credit line under it (66); never a gradient wash over the image to make text legible (29): the plate does that.

```html
<section class="hero-photo">
  <img class="hero-photo__img" src="" alt="" fetchpriority="high" />
  <div class="hero-photo__plate"><h1>…</h1><p>…</p><a class="cta-outline" href="#">…</a></div>
  <p class="hero-photo__caption">…</p>
</section>
```
```css
.hero-photo { position: relative; height: 86dvh; display: grid; align-content: end; padding: var(--space-2xl) var(--gutter); }
.hero-photo__img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.hero-photo__plate { position: relative; max-width: 40ch; padding: var(--space-lg); background: var(--color-paper); color: var(--color-ink); display: grid; gap: var(--space-md); }
.hero-photo__caption { position: absolute; bottom: var(--space-md); right: var(--gutter); margin: 0; padding: var(--space-2xs) var(--space-xs); background: var(--color-paper); font-size: var(--text-sm); }
```

## Knobs

- Image area: full bleed · a 16/7 band
- Caption: lower right · lower left · in the margin
- Plate: at the base · in the band beneath the image

## Mobile

- Below 60rem: the image keeps full bleed at 60dvh; the plate and the caption move inline beneath it.
