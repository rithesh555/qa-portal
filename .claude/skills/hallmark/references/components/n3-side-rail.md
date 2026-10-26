### N3 · Side rail
A thin vertical strip on one edge: the wordmark set vertically, then the page's sections as text links in the same writing mode, the current one in ink. Every link is a real section name; never an empty dot (33, 63).
*Use when:* a long, sectioned page where a sticky object (a ticket, a contents list) earns the rail. Never the default nav; a top bar is (N9).
*Not:* N9 (horizontal). The wordmark and the section names are the only rotated text; rotated words with nothing to say are decoration (66).

```html
<nav class="nav-rail" aria-label="Sections">
  <a class="wordmark" href="/" aria-label="Studio, home">Studio</a>
  <ol class="nav-rail__list">
    <li><a href="#work" aria-current="location">Work</a></li>
    <li><a href="#about">About</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</nav>
```
```css
.nav-rail { position: fixed; inset: 0 auto 0 0; width: 3rem; z-index: var(--z-sticky-nav); display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: var(--space-md) 0; background: var(--color-paper); border-right: var(--rule-hair) solid var(--color-rule); writing-mode: vertical-rl; }
.nav-rail__list { list-style: none; margin: 0; padding: 0; display: flex; gap: var(--space-lg); }
.nav-rail__list a { font-size: var(--text-sm); color: var(--color-muted); text-decoration: none; }
.nav-rail__list a[aria-current] { color: var(--color-ink); }
body { padding-inline-start: 3rem; }
```

## Knobs

- Side: left · right
- Current: colour · a hairline beside the name

## Mobile

- Below 60rem: the rail becomes a top bar with a menu disclosure; the body padding drops.
