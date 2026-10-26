### S5 · Bottom-anchored
The caption sits *below* the section's content and carries a fact: a plate number, a date, a place. Legal under gate 54 because it comes *after* and names something present; order is the discriminator between a caption and a kicker.
*Use when:* the content is the primary act and the line beneath is a caption to it (a plate in a catalogue). No fact to carry, no caption: the section ends on its content.
*Not:* S1 (which carries the sequence in the markup).

```html
<section>
  <div class="content">…</div>
  <p class="section__caption">Plate 4, March 2026</p>
</section>
```
```css
.section__caption { font-family: var(--font-body); font-size: var(--text-sm); color: var(--color-muted); margin-block-start: var(--space-md); }
```

## Knobs

- Fact: plate number · date · place
- Rule: none · a hairline above the caption
- Alignment: left · right-flush
