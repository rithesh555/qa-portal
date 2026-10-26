### Recipe 1 · Workflow diagram

Three labelled boxes joined by curved arrows. A slight asymmetric rotation (-1° on box one, +0.5° on box three) for a drawn feel. One arrow carries an animated `stroke-dashoffset` flow suggesting data movement; it is the page's one E6 loop, held to the loop contract in [`../../patterns.md`](../../patterns.md) § A loop that can pause. Use case: a feature page showing data flow, a decision tree, or the steps of a journey. Step names take the display face; every other label is the body face, sentence case, untracked (64, 67); the arrowheads are geometry inside a drawing, not punctuation glued to text.

```html
<figure class="flow-figure" data-loop>
  <svg class="flow" viewBox="0 0 720 200" role="img" aria-label="Data flow: input, process, output">
    <defs>
      <marker id="flow-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
        <path d="M0,0 L8,3 L0,6" fill="currentColor" />
      </marker>
    </defs>

    <g class="flow__step flow__step--a">
      <rect class="flow__box" x="20"  y="55" width="160" height="90" rx="0" />
      <text class="flow__label" x="100" y="105" text-anchor="middle">Input</text>
    </g>

    <path class="flow__arrow flow__arrow--live" d="M 180 100 Q 220 80 260 100" marker-end="url(#flow-arrow)" />

    <g class="flow__step">
      <rect class="flow__box" x="260" y="55" width="200" height="90" rx="0" />
      <text class="flow__label" x="360" y="100" text-anchor="middle">Parse and filter</text>
      <text class="flow__sub"   x="360" y="120" text-anchor="middle">A small predicate language</text>
    </g>

    <path class="flow__arrow" d="M 460 100 Q 500 120 540 100" marker-end="url(#flow-arrow)" />

    <g class="flow__step flow__step--c">
      <rect class="flow__box" x="540" y="55" width="160" height="90" rx="0" />
      <text class="flow__label" x="620" y="105" text-anchor="middle">Output</text>
    </g>
  </svg>
  <button class="btn btn--quiet" type="button" data-loop-toggle>Pause</button>
</figure>
```

```css
@property --flow-dash {
  syntax: "<length>";
  initial-value: 0px;
  inherits: false;
}

.flow-figure { margin: 0; display: grid; justify-items: center; gap: var(--space-sm); }
.flow { width: 100%; max-width: 48rem; height: auto; display: block; margin: 0 auto; color: var(--color-ink); }
.flow__box   { fill: none; stroke: currentColor; stroke-width: 1.5; }
.flow__label { font-family: var(--font-display); font-size: 16px; fill: var(--color-ink); }
.flow__sub   { font-family: var(--font-body); font-size: 12px; fill: var(--color-muted); }
.flow__step--a { transform: rotate(-1deg); transform-origin: 100px 100px; }
.flow__step--c { transform: rotate(0.5deg); transform-origin: 620px 100px; }
.flow__arrow { fill: none; stroke: var(--color-muted); stroke-width: 1.5; stroke-linecap: round; }
.flow__arrow--live {
  stroke: var(--color-accent);
  stroke-dasharray: 6 6;
  stroke-dashoffset: var(--flow-dash);
  animation: flow calc(var(--dur-long) * 6) var(--ease-in-out) infinite;
}
@keyframes flow { to { --flow-dash: -24px; } }

@media (max-width: 40rem) { .flow-figure { overflow-x: auto; justify-items: start; } .flow { min-width: 48rem; } }
@media (prefers-reduced-motion: reduce) {
  .flow__arrow--live { animation: none; stroke-dasharray: 0; }
}
```

Under 40rem the drawing keeps its full width and scrolls sideways inside the figure, so no label shrinks below legibility. **Use when** the brief is "show how the data flows": a feature page, a docs landing, a technical narrative. **Avoid when** the diagram has more than five nodes (use a real graph layout) or the relationships are not left to right.
