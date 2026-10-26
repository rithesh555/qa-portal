### H2 · Split
Headline, one sentence and the action on one side; one visual on the other, beside the text (vertical centres within 60px, 48 to 120px apart, 44c). The visual is the page's proof, so it is real material, a labelled slot, or a built drawing of the thing itself where the theme builds one, never a drawn screen or dashboard (47c).
*Use when:* the claim has something to show.
*Not:* H6 (the photograph fills the fold); a visual pinned to the viewport corner beside a text block hugging the opposite edge, the most recognisable machine-made hero there is.

```html
<section class="hero-split">
  <div class="hero-split__copy"><h1>…</h1><p>…</p><a class="btn btn--primary" href="#">…</a></div>
  <figure class="hero-split__visual">
    <div class="hero-split__media" data-slot="hero" data-alt="…"><!-- the user's material, or the theme's placeholder (craft.md § 8) --></div>
    <figcaption>…</figcaption>
  </figure>
</section>
```
```css
.hero-split { min-height: 80dvh; display: grid; grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); gap: var(--space-3xl); align-items: center; padding-block: var(--space-2xl) var(--space-3xl); }
.hero-split__copy { display: grid; gap: var(--space-md); justify-items: start; }
.hero-split__visual { margin: 0; display: grid; gap: var(--space-sm); }
.hero-split__media { aspect-ratio: 16 / 10; border-radius: min(1vw, var(--radius-card)); outline: 1px solid color-mix(in oklab, var(--color-ink) 8%, transparent); outline-offset: -1px; }
.hero-split__visual figcaption { font-size: var(--text-sm); color: var(--color-muted); }
@media (max-width: 60rem) { .hero-split { grid-template-columns: minmax(0, 1fr); gap: var(--space-xl); } }
```

The caption sits outside the slot, so the slot script does not hide it when the image lands. A caption states a fact (what the capture shows, where the photograph was taken), never a label for the picture.

## The visual

Pick one; its recipe is the enrichment file, read only that one.

- **Capture plate.** One real screenshot, set like a plate in a catalogue, a hairline inset at most, a slight tilt only as E4's knob: no browser bar, traffic lights or stack (47a, 47b). Recipe: [`enrichment/e4-floating-no-frame.md`](../enrichment/e4-floating-no-frame.md).
- **Clipped demo video.** The user's footage, its outer 10 to 20% running past the viewport edge at every width, the section keeping `overflow: visible` and the page clipping at `html` and `body` (34); the sizing is in the recipe. Recipe: [`enrichment/e1-clipped-demo-video.md`](../enrichment/e1-clipped-demo-video.md).
- **Built illustration.** One hand-built SVG or CSS shape that is the brand's own thing (a loaf, a mark, a process), fills from tokens (48), an `aria-label` or `aria-hidden` (33), never a library illustration. Recipe: [`enrichment/e5-custom-illustration-centerpiece.md`](../enrichment/e5-custom-illustration-centerpiece.md).
- **Photograph.** The user's photograph, cropped tighter than feels safe, toned toward the paper. Recipe: [`enrichment/e8-hero-photography.md`](../enrichment/e8-hero-photography.md).

## Knobs

- Ratio: 7/5 · 6/6 · 5/7 (the visual leads)
- Side: visual right · visual left
- Media: 16/10 · 4/3 · 1/1 · one phone-tall 9/16 with real content
- Caption: beneath · in the margin beside · none (when nothing true can be said)

## Mobile

- Below 60rem: one column, text first, the visual beneath; a clipped video stops clipping and runs full width.
