### N8 · Terminal command
The nav is a command line: `> studio --catalog --voice --get`, the links are flags. A block caret ends the line, legal because the line is a typed command (66); it blinks four times, under five seconds, then holds, and nothing else on the page blinks.
*Use when:* the page is a CLI tool, developer docs, or a theme whose material is mono.
*Not:* N13 (a palette, not a bar). On a non-developer site the `>` prompt is set decoration.

```html
<header class="nav-term">
  <nav aria-label="Primary"><pre class="nav-term__line"><span class="prompt">&gt;</span> studio <a href="#catalog">--catalog</a> <a href="#voice">--voice</a> <a href="#get">--get</a><span class="caret" aria-hidden="true">▮</span></pre></nav>
</header>
```
```css
.nav-term { padding: var(--space-sm) var(--gutter); border-bottom: var(--rule-hair) solid var(--color-rule); }
.nav-term__line { margin: 0; font-family: var(--font-outlier); font-size: var(--text-sm); }
.nav-term__line .prompt { color: var(--color-accent); padding-right: 0.4ch; }
.nav-term__line a { color: var(--color-ink); text-decoration: underline; text-underline-offset: 2px; }
.caret { display: inline-block; width: 1ch; color: var(--color-accent); animation: blink calc(var(--dur-long) * 2.5) steps(2) 4; }
@keyframes blink { 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .caret { animation: none; opacity: 1; } }
```

`--font-outlier` is the theme's mono face here; the theme names it.

## Knobs

- Prompt: `>` · `$` · `~/$`
- Caret: at the line end · none
- Width: full bleed · content · 80ch

## Mobile

- Below 60rem: flags that no longer fit go behind a `--menu` flag that opens the disclosure. Below 40rem: `--menu` alone; the caret stays at the end.
