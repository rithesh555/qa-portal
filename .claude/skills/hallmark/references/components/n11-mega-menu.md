### N11 · Mega menu panel
A standard bar whose triggers open a full width, multi-column panel: an icon, a title and a one-line description per item, grouped under column heads, with an optional feature cell at one side. The page dims behind a scrim.
*Use when:* the brand has many destinations that need grouping and explanation (six or more products, a docs hub). The panel is the design problem, not the bar.
*Not:* N1 (small single-column dropdowns). At most four columns, never taller than 60vh, never opened on hover without a close grace (the panel flickers as the pointer crosses the gap). Every item carries its description; a bare link grid is N1 in disguise. Column heads are the body face, sentence case (67).

```html
<header class="nav">
  <div class="nav__inner">
    <a class="nav__brand" href="/" aria-label="Studio, home">Studio</a>
    <nav class="nav__center" aria-label="Primary">
      <div class="mega" data-mega="products"><button class="nav__link" type="button" aria-controls="mega-products" aria-expanded="false">Products</button></div>
    </nav>
    <div class="nav__right"><a class="btn btn--quiet" href="/start">Open an account</a></div>
  </div>
  <div class="mega-panel" id="mega-products" data-panel="products">
    <div class="mega-panel__inner">
      <div class="mega-col"><p class="mega-col__head">Move money</p><a class="mega-link" href="/payments"><svg class="mega-link__ico" aria-hidden="true">…</svg><span><b>Payments</b><span>cards, ACH, wires</span></span></a></div>
      <a class="mega-feature" href="/vault"><p class="mega-feature__title">Vault</p><p class="mega-feature__desc">…</p></a>
    </div>
  </div>
</header>
<div class="nav-scrim" id="scrim"></div>
```
```css
.nav { position: fixed; inset: 0 0 auto; z-index: var(--z-sticky-nav); }
.mega-panel { position: absolute; top: 100%; left: 0; right: 0; z-index: var(--z-dropdown); opacity: 0; visibility: hidden; transform: translateY(-10px);
  background: var(--color-paper); border-bottom: var(--rule-hair) solid var(--color-rule);
  transition: opacity calc(var(--dur-short) * 0.7) var(--ease-in), transform calc(var(--dur-short) * 0.7) var(--ease-in), visibility 0s linear calc(var(--dur-short) * 0.7); }
.mega-panel.is-open { opacity: 1; visibility: visible; transform: none; transition: opacity var(--dur-short) var(--ease-out), transform var(--dur-short) var(--ease-out); }
.mega-panel__inner { max-width: var(--container); margin: 0 auto; padding: var(--space-xl) var(--gutter); display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) minmax(0, 1.1fr); gap: var(--gap-columns); }
.mega-col__head { margin: 0 0 var(--space-sm); font-size: var(--text-sm); color: var(--color-muted); }
.mega-link { display: flex; gap: var(--space-sm); padding: var(--space-xs); border-radius: var(--radius-card); text-decoration: none; }
.mega-link:hover, .mega-link:focus-visible { background: var(--color-paper-2); }
.nav-scrim { position: fixed; inset: 0; z-index: var(--z-sticky); background: oklch(from var(--color-ink) l c h / 0.28);
  opacity: 0; visibility: hidden; transition: opacity calc(var(--dur-short) * 0.7) var(--ease-in), visibility 0s linear calc(var(--dur-short) * 0.7); }
.nav-scrim.is-active { opacity: 1; visibility: visible; transition: opacity var(--dur-short) var(--ease-out); }
```

JS: hover opens with a close grace of about `--dur-micro` so the pointer can travel into the panel; click toggles; Escape closes; one panel open at a time; the scrim and `aria-expanded` follow the state.

## Knobs

- Columns: 2 · 3 · 4
- Feature cell: none · a promoted item · a code sample
- Scrim: dim · none
- Opens on: hover and click · click only

## Mobile

- Below 60rem: the panels become full width sheets under the bar. Below 40rem: accordion groups inside the menu sheet.
