### HP4 · Decorative numeral

A huge edition number, year or chapter set at display scale behind or beside the hero's head, never as the hero's visual pinned in a corner. The numeral means something: issue 22, year 2026, chapter 03, version 0.8. Roman, never italic: a display-scale figure is display type, and an italic one is an italic display system (38ii) with everything that entails.

*Use when:* the page has a real edition, issue, chapter or version semantic: magazines, journals, archived work, dated essays.
*Avoid when:* the numeral has no anchor. A random "42" in the corner is decoration text (66). If you cannot name what the number is, drop it.

The numeral is the opening move; nothing labels the hero above the headline (54), and nothing sits under the lede but the actions (58).

```html
<header class="hero hero--num container">
  <span class="hero__num" aria-hidden="true">22</span>
  <h1 class="hero__display">A working archive.</h1>
  <p class="hero__lede">Twelve years of selected projects, in their own time.</p>
</header>
```
```css
.hero--num { position: relative; padding-block: var(--space-2xl) var(--space-3xl); overflow: hidden; }
.hero--num > :not(.hero__num) { position: relative; }   /* later in the DOM, so the text paints above the numeral (73) */
.hero__num { position: absolute; right: var(--gutter); top: 50%; translate: 0 -50%; font-family: var(--font-display); font-weight: 600; font-size: clamp(8rem, 22vw, 18rem); line-height: 1; color: color-mix(in oklab, var(--color-ink) 8%, transparent); pointer-events: none; user-select: none; }
@media (max-width: 60rem) { .hero__num { font-size: clamp(5rem, 26vw, 9rem); right: -0.1em; } }
```
