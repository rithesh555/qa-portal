### Ft6 · Letter close
Closes the page like a letter: a sign-off, a name, a date. Optional postscript beneath. Sets the page as a piece of writing rather than a product.
*Use when:* the page voice is warm, hand-written, editorial-quiet (Garden, Atelier, personal sites).
*Not:* Ft1 (a wordmark anchor, not a sign-off); a stat-led or B2B product page, where the voice turns twee.

```html
<footer class="foot-letter">
  <p class="foot-letter__close">Yours,<br><span class="foot-letter__sign">The studio, March 2026</span></p>
  <p class="foot-letter__ps">P.S. Letters back are welcome at <a href="mailto:hello@example.com">hello@example.com</a>.</p>
</footer>
```
```css
.foot-letter { padding: var(--space-2xl) var(--gutter); }
.foot-letter__close { font-family: var(--font-display); font-style: italic; font-size: var(--text-lg); line-height: 1.4; margin: 0; }
.foot-letter__sign { font-style: normal; font-weight: 600; }
.foot-letter__ps { max-width: 60ch; font-size: var(--text-sm); color: var(--color-muted); margin: var(--space-md) 0 0; }
```

## Knobs

- Sign-off: italic · roman · monogram
- Postscript: yes · no
- Measure: 45ch · 60ch · 75ch
