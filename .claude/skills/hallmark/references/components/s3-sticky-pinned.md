### S3 · Sticky pinned
Heading remains in viewport while content scrolls beneath. Orientation aid.
*Use when:* the section is dense and the reader benefits from always seeing where they are. The persistence is itself the opening: nothing needs to introduce a heading that never leaves (`craft.md` § 7 item 12).
*Not:* S1 (which does not move).

```html
<header class="head-sticky">
  <h2>…</h2>
</header>
```
```css
.head-sticky { position: sticky; top: var(--banner-height, 0px); background: var(--color-paper); padding-block: var(--space-sm); border-bottom: var(--rule-hair) solid var(--color-rule); z-index: var(--z-sticky); }
```

With a sticky nav on the page, the page declares `--banner-height` as the nav's height in px so the head docks under it (under N12, under the banner and the bar together); the scaffold's `--z-sticky` already sits below the nav's `--z-sticky-nav`. Without the offset the head paints over the nav (gate 56).

## Knobs

- Offset: `--banner-height` dock · 0 (no sticky nav)
- Border-bottom: hairline · ink, 1px
- Dock behaviour: pinned throughout · released at the section's end

## Mobile

- Below 60rem: `--banner-height` takes the collapsed nav's height. Below 40rem: the head unsticks (`position: static`) and its border stays as the section rule.
