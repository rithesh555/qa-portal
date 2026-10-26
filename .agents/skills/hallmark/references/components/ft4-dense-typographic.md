### Ft4 · Dense typographic
One block of text (credits, references, licence, address) in the body face a step smaller, ragged-right or justified with `hyphens: auto`. A colophon, not a sitemap. Mono only when mono is the theme's material (64).
*Use when:* the brand is editorial and a colophon-style sign-off fits.
*Not:* Ft3 (which navigates).

```html
<footer class="foot-dense">
  <div class="foot-dense__inner"><p>MIT licensed. 137 Marlow Street, 2026. Set in … and …</p></div>
</footer>
```
```css
.foot-dense { padding-block: var(--space-2xl); }
.foot-dense__inner { max-width: var(--container); margin-inline: auto; padding-inline: var(--gutter); }
.foot-dense p { max-width: 65ch; margin: 0; font-size: var(--text-sm); color: var(--color-muted); line-height: 1.6; }
```

## Knobs

- Family: body · display at text size · mono, only on a mono theme
- Layout: single block · short paragraphs · a log, one entry per line
- Includes: build hash · date · type credit
