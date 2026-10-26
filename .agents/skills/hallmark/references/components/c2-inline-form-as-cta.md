### C2 · Inline form as CTA
The CTA is the form: one email field and a verb button on the same rule. No separate sign-up page.
*Use when:* the action is collecting an email.
*Not:* a two-step flow ("Continue" is for a second step); a field and a button sharing one border (`craft.md` § 9); a button that says "Submit" (`craft.md` § 6).

```html
<form class="cta-form" method="post" data-endpoint="">
  <label for="email">Email address</label>
  <input id="email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required />
  <button class="btn" type="submit">Send the letter</button>
  <p class="cta-form__help" aria-live="polite"></p>
</form>
```
```css
.cta-form { display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: var(--space-md); align-items: end; border-bottom: var(--rule-hair) solid var(--color-ink); }
.cta-form label { grid-column: 1 / -1; font-size: var(--text-sm); color: var(--color-muted); }
.cta-form input { min-height: 44px; padding: var(--space-sm) 0; background: none; border: 0; color: var(--color-ink); }
.cta-form input:focus-visible { outline: 2px solid var(--color-focus); outline-offset: -2px; }
.cta-form button { min-height: 44px; padding: var(--space-sm) var(--space-md); }
.cta-form__help { grid-column: 1 / -1; min-height: 1lh; margin: 0; font-size: var(--text-sm); color: var(--color-muted); }
```

The button takes the page's control states (`patterns.md`) at the field's 44px. `data-endpoint` stays empty until the brief gives the endpoint; until then the form validates and says that nothing was sent, never a success (`craft.md` § 9, gate 70).

## Knobs

- Fields: one · two (email and name)
- Button: end of the row · its own line beneath
- Helper: below · none (the line stays reserved either way, F14)

## Mobile

- Below 40rem: field and button stack, both full width, under the label.
