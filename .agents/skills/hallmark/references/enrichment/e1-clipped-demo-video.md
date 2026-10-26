### E1 · Demo video, clipped by the viewport edge

A display headline left, a real product capture right, and the rightmost 10 to 20% of the capture extending past the viewport so it is cut off on purpose. The clip is the design: it says there is more product than fits on this screen.

*Use when:* the brief is a SaaS, developer tool, dashboard or platform and you have real footage of the product.
*Avoid when:* you have no footage. The visual is a `data-slot` holding a real capture or the slot's designed placeholder (`craft.md` § 8); never a drawn mockup, a CSS-art chart or a stock clip standing in for the product (47c).

**Knobs:**
- Clip side (right · left · both)
- Aspect ratio (16/10 · 16/9 · 4/3)
- Frame (hairline · none); never drawn browser chrome (47a)

**Example.** Tracejam, an observability tool. Headline left ("Distributed tracing that explains itself."); the trace waterfall capture right in the hero slot, running 18% of its column past the viewport's right edge at every width, aspect 16/10, hairline frame. Without footage the slot shows its designed placeholder. Under 60rem the clip goes and the two stack.

```html
<section class="hero hero--clipped">
  <div class="container hero__grid">
    <div class="hero__copy">
      <h1>Distributed tracing that explains itself.</h1>
      <p>Every alert opens on the slow span that caused it.</p>
      <a class="btn" href="#start">Trace a request</a>
    </div>
    <figure class="hero__media" data-slot="hero" data-alt="The trace waterfall, one slow span highlighted" data-loop>
      <!-- without footage: the slot's designed placeholder (craft.md § 8) instead of the video and its button -->
      <video autoplay muted loop playsinline preload="metadata"
             poster="/hero-poster.webp"
             aria-label="The trace waterfall, opened from an alert">
        <source src="/hero.av1.mp4"  type='video/mp4; codecs="av01.0.05M.08"'>
        <source src="/hero.vp9.webm" type="video/webm">
        <source src="/hero.h264.mp4" type="video/mp4">
      </video>
      <button class="btn btn--quiet hero__pause" type="button" data-loop-toggle>Pause</button>
    </figure>
  </div>
</section>
```

```css
.hero--clipped { container-type: inline-size; }   /* full width, so 100cqw is the page; overflow stays visible and html and body clip (34) */
.hero__grid {
  display: grid;
  grid-template-columns: minmax(20rem, 1fr) minmax(0, 1.4fr);
  gap: var(--space-2xl);
  align-items: center;
}
.hero__media {
  /* its column, the gutter, any page past the capped container, then 18% more that the viewport cuts */
  width: calc(118% + var(--gutter) + (100cqw - min(100cqw, var(--container))) / 2);
  aspect-ratio: 16 / 10;
  border-radius: var(--radius-card);
  border: var(--rule-hair) solid var(--color-rule);
  margin: 0;
}
.hero__media video { width: 100%; height: 100%; object-fit: cover; }
.hero__pause { position: absolute; left: var(--space-sm); bottom: var(--space-sm); background: var(--color-paper); }

@media (max-width: 60rem) {
  .hero__grid { grid-template-columns: minmax(0, 1fr); }
  .hero__media { width: 100%; }    /* a clipped edge on a phone looks broken */
}

@media (prefers-reduced-motion: reduce) {
  .hero__media video { display: none; }
  .hero__media { background: url('/hero-poster.webp') center / cover; }
}
```

The video is the LCP: never `loading="lazy"` on it (28a); always a `poster`, preloaded in the head with `<link rel="preload" as="image" href="/hero-poster.webp" fetchpriority="high">` (28b; `fetchpriority` does nothing on `<video>`), and a `<track kind="captions">` when the footage has speech. It loops past 5 seconds, so the figure carries the loop contract in [`../patterns.md`](../patterns.md) § A loop that can pause: still off-screen and under reduced motion, paused on hover and focus (18), its pause button in the corner nearest the text, which the viewport never cuts. The hairline frame is the only chrome: never traffic lights, a URL pill or a title bar.
