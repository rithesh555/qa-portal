# Patterns

How the parts every page repeats are written, in the shape that passes the gates. Take the code's shape; the names, the copy, the values and the composition are yours. The scaffold already wrote `tokens.css` and `base.css` and printed the slot script.

## Controls, all eight states

```css
.btn { display: inline-flex; align-items: center; gap: var(--space-xs); min-height: 48px; padding: 0 var(--space-lg); border: 1px solid var(--color-ink); border-radius: var(--radius-input, var(--radius-pill)); background: var(--color-ink); color: var(--color-paper); font: 500 var(--text-md)/1 var(--font-body); white-space: nowrap; text-decoration: none; cursor: pointer; transition: background-color var(--dur-short) var(--ease-out), transform var(--dur-micro) var(--ease-out); }
.btn:hover { background: var(--color-ink-2); }
.btn:active { transform: translateY(1px); }
.btn:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }
.btn:disabled, .btn[aria-disabled="true"] { opacity: 0.55; cursor: not-allowed; transform: none; }
.btn[aria-busy="true"] { cursor: progress; }
.btn--quiet { background: transparent; color: var(--color-ink); border-color: var(--color-rule); }
.btn--quiet:hover { background: var(--color-paper-2); }
@media (prefers-reduced-motion: reduce) { .btn { transition: background-color var(--dur-short) linear; } }
```

One filled primary per page; the quiet one goes somewhere else. Error and success belong to the form, below.

## A slot

```html
<figure class="shot" data-slot="hero" data-alt="The invoices screen, three invoices, one overdue">
  <div class="shot__ph" aria-hidden="true">
    <svg viewBox="0 0 320 200" focusable="false"><!-- three to five shapes of this product's own structure --></svg>
  </div>
  <figcaption class="shot__label">your invoices screen</figcaption>
</figure>
```

```css
.shot { aspect-ratio: 16 / 10; border: 1px solid var(--color-rule); border-radius: var(--radius-card); background: linear-gradient(160deg, var(--color-paper-2), var(--color-paper-3)); }
.shot__ph { position: absolute; inset: 0; display: grid; place-items: center; padding: var(--space-xl); }
.shot__label { position: absolute; left: var(--space-md); bottom: var(--space-sm); font-size: var(--text-sm); color: var(--color-muted); }
```

The slot base rules (`position`, `overflow`, the image's cover and the hide-on-fill) come from the scaffold; a child that must survive the image takes `data-keep`. Placeholder recipes per material are in `craft.md` § 8.

## A fact the brief did not give

```html
<p>Doors at <span class="fill" data-fill="time">time to be announced</span>, at <a href="#venue">the venue</a>.</p>
```

```css
.fill { padding: 0 0.2em; border-radius: 2px; color: var(--color-muted); background: color-mix(in oklch, var(--color-muted) 14%, transparent); }
```

At most three on a page, each named in the handoff. A link whose URL the brief did not give points at the section of this page that does the most of it.

## A form that posts nowhere yet

```html
<form class="signup" data-endpoint="" novalidate>
  <label for="email">Email address</label>
  <div class="signup__row">
    <input id="email" name="email" type="email" autocomplete="email" required>
    <button class="btn" type="submit">Send me the date</button>
  </div>
  <p class="signup__help" id="email-help" aria-live="polite"></p>
</form>
```

```js
document.querySelectorAll('form[data-endpoint]').forEach((form) => {
  const input = form.querySelector('input'), help = form.querySelector('[aria-live]');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = input.checkValidity();
    input.toggleAttribute('aria-invalid', !ok);
    if (!ok) { input.setAttribute('aria-describedby', help.id); help.textContent = 'That address looks incomplete. Write it as name@example.com.'; input.focus(); return; }
    if (!form.dataset.endpoint) { help.textContent = 'Nothing was sent: this form is not connected yet.'; return; }
    fetch(form.dataset.endpoint, { method: 'POST', body: new FormData(form) })
      .then((r) => { help.textContent = r.ok ? 'Thanks. The date goes to ' + input.value.trim() + '.' : 'That did not go through. Try again in a minute.'; })
      .catch(() => { help.textContent = 'That did not go through. Try again in a minute.'; });
  });
});
```

```css
.signup__row { display: flex; gap: var(--space-xs); }
.signup input { flex: 1; min-width: 0; min-height: 48px; padding: 0 var(--space-md); border: 1px solid var(--color-muted); border-radius: var(--radius-input, var(--radius-pill)); background: var(--color-paper); color: var(--color-ink); outline: 2px solid transparent; outline-offset: -3px; }
.signup input:focus-visible { outline-color: var(--color-focus); }
.signup input[aria-invalid] { border-color: var(--color-error); }
.signup__help { min-height: 1lh; margin-top: var(--space-2xs); font-size: var(--text-sm); color: var(--color-muted); }
```

## One reveal that survives no script

```html
<script>document.documentElement.classList.add('js');</script>
```

```css
.js [data-reveal] { opacity: 0; transform: translateY(8px); transition: opacity var(--dur-long) var(--ease-out), transform var(--dur-long) var(--ease-out); transition-delay: calc(var(--i, 0) * 40ms); }
.js [data-reveal].is-in { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) { .js [data-reveal] { opacity: 1; transform: none; transition: none; } }
```

```js
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
```

Visible with scripting off (62), at its end state under reduced motion, once, and only where the theme lets something move.

## Figures that compare

```css
.stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.stats > * { padding-inline: var(--space-lg); border-left: 1px solid var(--color-rule); }
.stats > :first-child { padding-left: 0; border-left: 0; }
.stats b { display: block; font: 600 var(--text-3xl)/1 var(--font-display); font-variant-numeric: tabular-nums; }
@media (max-width: 60rem) { .stats { grid-template-columns: minmax(0, 1fr); } .stats > * { padding: var(--space-md) 0; border-left: 0; border-top: 1px solid var(--color-rule); } .stats > :first-child { border-top: 0; } }
```

Only figures the user gave (46a), each with its unit and what it counts.

## A loop that can pause

Anything that moves past 5 seconds (a marquee, an ambient loop, a looping video) holds still until the script runs, stops off-screen and under reduced motion, pauses on hover and focus, and carries a visible pause control (18, WCAG 2.2.2). A motion that ends inside 5 seconds needs none of this.

```html
<figure data-loop>
  <!-- the drawing, the loop or the video -->
  <button class="btn btn--quiet" type="button" data-loop-toggle>Pause</button>
</figure>
```

```css
[data-loop]:not(.is-running), [data-loop]:not(.is-running) *, [data-loop]:not(.is-running) *::before, [data-loop]:not(.is-running) *::after { animation-play-state: paused !important; }
html:not(.js) [data-loop-toggle] { display: none; }
@media (prefers-reduced-motion: reduce) { [data-loop-toggle] { display: none; } }
```

```js
document.querySelectorAll('[data-loop]').forEach((el) => {
  const btn = el.querySelector('[data-loop-toggle]');
  const s = { seen: false, hover: false, focus: false, held: matchMedia('(prefers-reduced-motion: reduce)').matches };
  const sync = () => {
    const run = s.seen && !s.hover && !s.focus && !s.held;
    el.classList.toggle('is-running', run);
    el.querySelectorAll('video').forEach((v) => (run ? v.play().catch(() => {}) : v.pause()));
    btn.textContent = s.held ? 'Play' : 'Pause';
  };
  btn.addEventListener('click', () => { s.held = !s.held; sync(); });
  [['pointerenter', 'hover', true], ['pointerleave', 'hover', false], ['focusin', 'focus', true], ['focusout', 'focus', false]].forEach(([t, k, v]) => el.addEventListener(t, () => { s[k] = v; sync(); }));
  new IntersectionObserver(([e]) => { s.seen = e.isIntersecting; sync(); }).observe(el);
});
```

## A way past the nav

```html
<a class="skip" href="#main">Skip to content</a>
```

```css
.skip { position: absolute; left: var(--space-md); top: calc(-1 * var(--space-3xl)); z-index: var(--z-toast); padding: var(--space-xs) var(--space-md); background: var(--color-ink); color: var(--color-paper); }
.skip:focus-visible { top: var(--space-md); }
```
