### T3 · Single huge quote
One quote, set big, centred, taking a whole section. No supporting text, no attribution box: the attribution is one quiet line beneath, in the body face. The quote and the name are the user's material, verbatim; without both the block does not ship (46a).
*Use when:* one quote is so good it earns the room.
*Not:* T1 (the quote at the side, not the room).

```html
<section class="proof-room">
  <blockquote><p><!-- the user's quote, verbatim --></p></blockquote>
  <p class="attribution"><!-- the user's name, then their company if given --></p>
</section>
```
```css
.proof-room { padding-block: var(--space-3xl); text-align: center; }
.proof-room blockquote { margin: 0 auto; max-width: 60ch; font-family: var(--font-display); font-size: var(--text-2xl); line-height: 1.15; text-wrap: balance; }
.proof-room .attribution { font-family: var(--font-body); font-size: var(--text-sm); color: var(--color-muted); margin-block-start: var(--space-lg); }
```

## Knobs

- Quote face: display roman · display italic (the whole quote)
- Measure: 60ch · 45ch · the container
- Attribution position: under the quote · a hairline band beneath

## Mobile

- Below 40rem: the quote steps down to `--text-xl`; the attribution stays one line.
