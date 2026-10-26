### HP1 · Vertical rail title

A fact runs vertically beside the body: the issue and its date, or the wordmark alone. Never a string of words joined by dots, never tracked capitals; the rail carries a fact or the pattern is not used (66). `writing-mode: vertical-rl; text-orientation: mixed;` on the rail; the body sits in normal flow beside it.

*Use when:* the hero is otherwise centred or marquee-shaped and wants a structural anchor that is not a rule or a numeral.
*Avoid when:* the body title is itself big and centred; a vertical rail beside a huge horizontal display makes two competing axes. The rail is the supporting voice; pick one direction.

```html
<header class="hero hero--rail container">
  <p class="hero__rail">Issue 12, spring 2026</p>
  <div class="hero__body">
    <h1 class="hero__display">A working archive.</h1>
    <p class="hero__lede">Twelve years of selected projects, in their own time.</p>
  </div>
</header>
```
```css
.hero--rail { display: grid; grid-template-columns: auto 1fr; gap: var(--space-2xl); padding-block: var(--space-2xl); align-items: end; }
.hero__rail { writing-mode: vertical-rl; text-orientation: mixed; font-family: var(--font-body); font-size: var(--text-sm); color: var(--color-ink-2); margin: 0; }
@media (max-width: 60rem) { .hero--rail { grid-template-columns: 1fr; } .hero__rail { writing-mode: horizontal-tb; order: 2; } }
```

Under 60rem the rail turns horizontal and moves below the body, so it never sits above the heading as an eyebrow (54).
