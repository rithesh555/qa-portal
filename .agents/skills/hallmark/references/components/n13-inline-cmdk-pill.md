### N13 · Command palette
A spotlight dialog with grouped, keyboard-navigable results, opened by ⌘K or Ctrl K. The trigger is a visible search pill in the bar (placeholder text and a `⌘K` hint) for newcomers, or, for a keyboard-first audience, one small control showing the shortcut and no other nav at all.
*Use when:* search is a primary action (developer docs, a library, a large catalogue).
*Not:* a search icon that focuses an input in place. The dialog is a `<dialog>` that traps focus and closes on Escape: ship the pill, ship the keyboard model. The pill reads as search (an icon and a placeholder), not as a generic button.

```html
<header class="nav" id="nav"><div class="nav__inner">
  <a class="nav__brand" href="/" aria-label="Studio, home">Studio</a>
  <button class="searchpill" type="button" aria-haspopup="dialog" aria-controls="cmdk" aria-keyshortcuts="Meta+K Control+K">
    <svg class="searchpill__ico" aria-hidden="true">…</svg><span class="searchpill__text">Search the docs</span>
    <span class="searchpill__kbd"><kbd>⌘</kbd><kbd>K</kbd></span>
  </button>
  <nav class="nav__right" aria-label="Primary"><a class="nav__link" href="/docs">Docs</a><a class="btn btn--accent" href="/start">Start</a></nav>
</div></header>
<dialog class="cmdk" id="cmdk" aria-label="Search">
  <form class="cmdk__field" method="dialog"><label for="cmdk-input" class="visually-hidden">Search</label><input id="cmdk-input" type="search" name="q" placeholder="Search the docs"><kbd>Esc</kbd></form>
  <div class="cmdk__results" role="listbox"><p class="cmdk__group">Suggested</p><button class="cmdk__item" type="button" role="option" aria-selected="true">…</button></div>
  <p class="cmdk__foot"><span><kbd>↑</kbd><kbd>↓</kbd> Move</span><span><kbd>↵</kbd> Open</span><span><kbd>Esc</kbd> Close</span></p>
</dialog>
```
```css
.searchpill { display: flex; align-items: center; gap: var(--space-xs); min-height: 44px; padding: 0 var(--space-xs) 0 var(--space-sm); background: var(--color-paper-2); border: var(--rule-hair) solid var(--color-rule); border-radius: var(--radius-pill); color: var(--color-muted); cursor: pointer;
  transition: border-color var(--dur-micro) var(--ease-out), background-color var(--dur-micro) var(--ease-out); }
.searchpill:hover { border-color: var(--color-rule-2, var(--color-muted)); }
.searchpill:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }
.searchpill kbd, .cmdk kbd { font-family: var(--font-outlier); font-size: var(--text-xs); padding: 0 var(--space-2xs); border: var(--rule-hair) solid var(--color-rule-2, var(--color-rule)); border-radius: var(--radius-input, var(--radius-card)); }
.cmdk { width: min(560px, calc(100% - var(--space-xl))); margin: 14vh auto 0; padding: 0; background: var(--color-paper); color: var(--color-ink); border: var(--rule-hair) solid var(--color-rule); border-radius: var(--radius-card); box-shadow: var(--shadow-card); }
.cmdk::backdrop { background: oklch(from var(--color-ink) l c h / 0.28); }
.cmdk[open] { animation: cmdk-in var(--dur-long) var(--ease-out); }
@keyframes cmdk-in { from { opacity: 0; transform: scale(0.96); } }
@media (prefers-reduced-motion: reduce) { .cmdk[open] { animation: none; } }
.cmdk__field { display: flex; align-items: center; gap: var(--space-sm); margin: 0; padding: var(--space-sm) var(--space-md); border-bottom: var(--rule-hair) solid var(--color-rule); }
.cmdk__field input { flex: 1; min-width: 0; border: 0; background: none; font: inherit; color: inherit; }
.cmdk__field input:focus-visible { outline-offset: -2px; }
.cmdk__group { margin: 0; padding: var(--space-sm) var(--space-md) var(--space-2xs); font-size: var(--text-sm); color: var(--color-muted); }
.cmdk__foot { display: flex; gap: var(--space-md); margin: 0; padding: var(--space-xs) var(--space-md); border-top: var(--rule-hair) solid var(--color-rule); font-size: var(--text-xs); color: var(--color-muted); }
```

JS: ⌘K or Ctrl K toggles, Escape closes (native), a backdrop click closes, the arrows move the selected option, Enter opens it, focus lands in the input on open and body scroll locks.

## Knobs

- Pill placement: centred · beside the brand
- Results: flat · grouped
- Footer hints: shown · hidden
- Trigger: a search pill in the bar and ⌘K · one small `Menu ⌘K` control fixed top right, no other nav (the palette lists every destination)

## Mobile

- Below 60rem: the pill narrows and the hint hides. Below 40rem: an icon-only search control opening a full-height dialog.
