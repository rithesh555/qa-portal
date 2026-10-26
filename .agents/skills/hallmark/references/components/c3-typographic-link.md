### C3 · Typographic link
A verb phrase with a 1px underline. No box, no fill, no arrow.
*Use when:* the page is editorial or a long document and actions should not shout.
*Not:* the primary action of a product page (that is a button); "Learn more" with nothing after it; an arrow after the words (63).

```html
<a class="link" href="/case-study">Read the case study</a>
```
```css
.link { color: var(--color-ink); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 0.16em; transition: text-decoration-color var(--dur-micro) var(--ease-out); }
.link:hover { text-decoration-color: var(--color-accent); }
.link:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }
```

## Knobs

- Underline: solid · dashed · double
- Hover: colour shift · thicken to 2px
- Weight: body · one step heavier
