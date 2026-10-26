### Ft7 · Newsletter-first
The form (label, input, submit) is the *primary* element of the footer; wordmark, links and copyright sit beneath in the body face, a step smaller.
*Use when:* the brand legitimately publishes and the page has *already* offered a subscription above the fold. The footer is a final invitation, not an ambush.
*Not:* Ft1 (which asks for nothing); a page that never offered the subscription above, where the form is an ambush and Ft2 fits.

```html
<footer class="foot-news">
  <form class="foot-news__form" method="post" data-endpoint="">
    <label for="foot-email">Email address, for the monthly letter</label>
    <div class="foot-news__row">
      <input id="foot-email" name="email" type="email" required autocomplete="email">
      <button type="submit" class="cta-outline">Subscribe</button>
    </div>
    <p class="foot-news__help" aria-live="polite"></p>
  </form>
  <ul class="foot-news__meta">
    <li class="wordmark">Studio</li>
    <li>© 2026</li>
    <li><a href="/imprint">Imprint</a></li>
  </ul>
</footer>
```
```css
.foot-news { padding: var(--space-2xl) var(--gutter); display: grid; gap: var(--space-lg); }
.foot-news__form { max-width: 56ch; }
.foot-news__form label { display: block; font-size: var(--text-sm); margin-block-end: var(--space-2xs); }
.foot-news__row { display: flex; gap: var(--space-xs); }
.foot-news__row input, .foot-news__row button { min-height: 44px; }
.foot-news__row input { flex: 1; min-width: 0; padding-inline: var(--space-sm); border: var(--rule-hair) solid var(--color-muted); border-radius: var(--radius-input, var(--radius-card)); background: var(--color-paper); font-size: var(--text-md); }
.foot-news__row input:focus-visible { outline: 2px solid var(--color-focus); outline-offset: -2px; }
.foot-news__help { min-height: 1lh; margin: var(--space-2xs) 0 0; font-size: var(--text-sm); color: var(--color-muted); }
.foot-news__meta { display: flex; gap: var(--space-lg); list-style: none; padding: 0; margin: 0; font-size: var(--text-sm); color: var(--color-muted); }
```

When the form is the page's main action (a petition, a mailing list that is the product), the submit is the page's primary style; otherwise the one filled primary lives above and the footer submit is secondary (F4). Input and button share a height (39a). `data-endpoint` stays empty until the brief gives the endpoint; until then the help line says that nothing was sent, never a success (70).

## Knobs

- Layout: stacked · inline · split (form left, meta right)
- Submit style: outline · typographic · the filled primary, when the form is the page's main action
- Privacy line under the form: yes · no

## Mobile

- Below 40rem: the input and button stack, each full width.
