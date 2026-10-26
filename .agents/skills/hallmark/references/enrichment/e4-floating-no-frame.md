### E4 · Screenshot in a figure

Display headline left, a real screenshot right in a `<figure>` whose `<figcaption>` states a fact (what the capture shows, where it was taken). No drawn chrome of any kind: no traffic lights, URL pill, toolbar or title bar (47a). The capture floats with a soft shadow and a card radius, optionally tilted, optionally annotated with numbered pins.

*Use when:* you are selling a web app and have a clean, well-lit capture.
*Avoid when:* you have no capture. The figure's image area is a `data-slot` that shows the designed placeholder (`craft.md` § 8) until the user's capture replaces it; never a styled-div dashboard with invented figures (47c).

**Knobs:**
- Shadow (hairline · card · none)
- Corner radius (0 · card)
- Tilt (0° · 1.5° · 3°), removed under 60rem
- Numbered pins (none · up to three), each a small numbered pin on the capture with its caption in the margin beside it, never arrows and labels; the annotated version is F5 in the cookbook
- Background (paper · tinted well)

**Example.** A code-review web app. Headline left ("Review the whole diff on one screen."), one capture right of the before and after diff, card radius, card shadow, tilted 1.5°, on a `--color-paper-2` well. The caption reads "The diff view, run on this repository."

```html
<section class="hero hero--figure">
  <div class="hero__copy">
    <h1>Review the whole diff on one screen.</h1>
    <p>Comments, suggestions and checks sit beside the line they mean.</p>
    <a class="btn" href="#start">Review a pull request</a>
  </div>
  <figure class="hero__figure">
    <div data-slot="hero" data-alt="The diff view, before and after, three comments open" style="--tilt: 1.5deg">
      <div class="slot__placeholder" aria-hidden="true"><span>your screenshot</span></div>
    </div>
    <figcaption>The diff view, run on this repository.</figcaption>
  </figure>
</section>
```

```css
.hero--figure {
  display: grid;
  grid-template-columns: minmax(20rem, 1fr) minmax(0, 1.2fr);
  gap: var(--space-2xl);
  align-items: center;
}
.hero__figure { margin: 0; }
.hero__figure [data-slot] {
  aspect-ratio: 16 / 10;
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  transform: rotate(var(--tilt, 0deg));
}
.slot__placeholder { position: absolute; inset: 0; background: linear-gradient(160deg, var(--color-paper-2), var(--color-paper-3)); }
.slot__placeholder span { position: absolute; left: var(--space-md); bottom: var(--space-sm); font-size: var(--text-sm); color: var(--color-muted); }
.hero__figure figcaption {
  margin-block-start: var(--space-md);
  font-size: var(--text-sm);
  color: var(--color-muted);
}

@media (max-width: 60rem) {
  .hero--figure { grid-template-columns: 1fr; }
  .hero__figure [data-slot] { transform: none; }
}
```

The slot contract (`[data-slot] > img` absolute, placeholder hidden once an image is present) comes from the scaffold; inside the placeholder, sketch the diff view in three to five shapes (`craft.md` § 8). The caption sits outside the slot so it survives the swap.
