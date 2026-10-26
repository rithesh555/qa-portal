### T1 · Pull-quote with marginalia
A quote sits in the wide column; the attribution and source link sit in the narrow margin column. The quote and the name are the user's material, verbatim; without both the block does not ship (46a).
*Use when:* the page already has a marginalia rhythm (editorial, sidenote-led).
*Not:* T3 (centred, and it takes the room).

```html
<aside class="proof-margin">
  <blockquote><p><!-- the user's quote, verbatim --></p></blockquote>
  <p class="attribution"><!-- the user's name --><br><!-- their role, if given --></p>
</aside>
```
```css
.proof-margin { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 1fr); gap: var(--gap-columns); }
.proof-margin blockquote { margin: 0; font-family: var(--font-display); font-size: var(--text-xl); line-height: 1.3; max-width: 45ch; }
.proof-margin blockquote p { position: relative; }
.proof-margin blockquote p::before { content: "\201C"; position: absolute; transform: translateX(-100%); }
.proof-margin .attribution { font-family: var(--font-body); font-size: var(--text-sm); color: var(--color-muted); align-self: end; }
```

## Knobs

- Quote treatment: italic display · roman display · roman body, large
- Attribution: name and role · name and date · name and a source link
- Marginalia: attribution only · one footnote beside it

## Mobile

- Below 60rem: one column, the margin column under the quote.
