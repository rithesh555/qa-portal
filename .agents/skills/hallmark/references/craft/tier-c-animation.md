## Tier C · Declarative animation (CSS first, JS when needed)

Use the platform first; reach for JS only when the platform cannot express the orchestration. The page-level motion rules (three easings, three durations, one reveal per page, `transform` and `opacity` only) are in `craft.md` § 5 and bind here too.

### CSS keyframes plus `@property`

`@property` defines typed custom properties (`<color>`, `<length>`, `<angle>`, `<number>`, `<percentage>`) that the browser interpolates smoothly. Without it, an animated custom property steps from start to end with nothing between. A functional loader, the one infinite loop that is always legal:

```css
@property --turn {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}

@keyframes turn { to { --turn: 360deg; } }

.loader {
  width: var(--space-lg);
  aspect-ratio: 1;
  border-radius: var(--radius-pill);
  background: conic-gradient(from var(--turn), var(--color-accent) 0 25%, var(--color-paper-2) 25% 100%);
  animation: turn calc(var(--dur-long) * 3) linear infinite;   /* linear is right for progress */
}
```

No JS, no library. Give it the scaffold's `keep-motion` class: base.css stops every other animation under reduced motion, and a functional loader keeps running (`craft.md` § 5).

### Loops

Past the loader, a page carries at most one E6 loop, 4s or less a cycle and only where the theme lets something move, and the one ambient loop a theme may declare, 8s or slower (`craft.md` § 5). Write the cycle as a multiple of `--dur-long` and ease it with a token. Anything that moves past 5 seconds, a looping video included, takes the loop contract in `patterns.md` § A loop that can pause.

### Scroll-driven animations

`animation-timeline: scroll()` and `view()` ship in Chromium and Safari; Firefox still needs a flag. On a page they appear only as one of the named patterns in `scroll-choreography.md`, once (F8), inside `@supports` and `@media (prefers-reduced-motion: no-preference)`, over base CSS that already shows the finished layout. A reveal on entry is not one of them: it runs once, from the IntersectionObserver pattern in `patterns.md`, never as a `view()` timeline that replays on every scroll.

### View Transitions API

Same-document view transitions are Baseline; cross-document ones are in Chromium and Safari. Use them for a theme switch or any DOM swap:

```js
function applyTheme(theme) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const apply = () => { /* mutate the DOM */ };
  if (!reduced && document.startViewTransition) {
    document.startViewTransition(apply);
  } else {
    apply();
  }
}
```

The browser handles the cross-fade. No library for state changes.

### Motion, GSAP and friends: when each earns its bundle

| Library | When | Bundle | Verdict |
| --- | --- | --- | --- |
| **[Motion](https://motion.dev)** (`motion/react`, `motion`) | Orchestrated multi-element entrances in React (variants, `AnimatePresence`, viewport hooks) | About 6 KB with the React layer; Web Animations API backed | First reach for React |
| **[GSAP](https://gsap.com)** | Long timelines, a named scroll pattern that needs JS, SVG path morphing across mismatched anchors | About 50 KB core; 100 KB or more with plugins | Worth it when timelines are the product; overkill for a fade-in |
| **AutoAnimate** | Trivial layout transitions in React (a list reflows, an element appears) | About 2 KB | Fine for what it does |
| **Anime.js** | Lightweight stagger and simple animation in vanilla JS | About 15 KB | Acceptable |
| **Theatre.js** | A visual editor plus code API for ambitious orchestration | Heavy, 80 KB or more | Single-page interactive art only |

**The decision rule:**

```
Single element, simple motion            → CSS keyframes / @property
Multiple elements, orchestrated entrance → Motion (React) or GSAP (vanilla, complex)
Scroll-progress-linked                   → one pattern from scroll-choreography.md (animation-timeline); GSAP ScrollTrigger only when that pattern needs JS
State change between two layouts         → View Transitions API
A list reflows in React                  → AutoAnimate
```

Motion for a single fade-in is the bundle-bloat tell; GSAP for a list reflow is the same tell, louder.

### Anti-patterns of declarative animation

- **Animating `width`, `height`, `top`, `left`, `margin` or `padding`.** Layout thrash; `transform` and `opacity` composite (10a, 10b).
- **Linear easing on UI.** Linear belongs to progress, loaders and scroll scrubbing only.
- **Bouncy elastic on hero entrances** (`cubic-bezier(0.34, 1.56, …)` and friends). Reserved for a playful theme's declared spring posture, on the primary control and one character moment (12).
- **Importing Motion or GSAP for one fade-in.** `transition: opacity var(--dur-long) var(--ease-out)` is zero bytes.
- **Scroll-fade everything.** One orchestrated entrance on first load; the rest is simply there.
- **A reveal with no `prefers-reduced-motion` fallback.** Every transform and animation is guarded (27).
