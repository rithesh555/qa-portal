### F5 · Annotated screenshot
A real capture sits centre stage with numbered labels pointing at UI details.
*Use when:* the product UI is the explanation.
*Not:* F2 (a sequence of captures); a drawn mockup with callouts (47c). Callouts are numbered pins or margin labels, never arrows glued to text (63).

```html
<figure class="annotated">
  <img src="/captures/inbox.png" alt="" width="1600" height="1000" />
  <ol class="callouts">
    <li class="callout" style="--x: 60%; --y: 30%;">Assigns the ticket by itself.</li>
  </ol>
  <figcaption>…</figcaption>
</figure>
```
```css
.annotated { position: relative; margin: 0; }
.callouts { list-style: none; counter-reset: pin; margin: 0; padding: 0; }
.callout { counter-increment: pin; position: absolute; left: var(--x); top: var(--y); max-width: 24ch; padding: var(--space-2xs) var(--space-xs); background: var(--color-paper); border: var(--rule-hair) solid var(--color-rule); font-size: var(--text-sm); }
.callout::before { content: counter(pin) " "; font-weight: 600; }
.annotated figcaption { font-size: var(--text-sm); color: var(--color-muted); margin-top: var(--space-sm); }
```

The caption carries a fact: what is shown, which build, when.

## Knobs

- Callouts: numbered pins · margin labels
- Frame: none · hairline inset
- Anchor: image led · text led

## Mobile

- Below 60rem: the capture goes full width; the callouts leave the image and read as the numbered list beneath it.
