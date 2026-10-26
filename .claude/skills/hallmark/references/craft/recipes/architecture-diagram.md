### Recipe 3 · Three-tier architecture diagram

Browser to API to database, drawn at about 16/9 with three labelled boxes and animated `stroke-dashoffset` flow lines. The lines pulse to suggest live traffic; they are the page's one E6 loop, held to the loop contract in [`../../patterns.md`](../../patterns.md) § A loop that can pause. Use case: a developer-tool landing page showing where the product sits in the stack. Every label is a fact; the hop labels name the real protocols and sit on two lines rather than joined by a dot (63). Labels are the body face, sentence case, untracked, 11 units or more, about 13px at full width (64, 67); the box names take the display face.

```html
<figure class="arch-figure" data-loop>
  <svg class="arch" viewBox="0 0 640 360" role="img" aria-label="Three-tier architecture: browser, API, database">
    <g class="arch__tier">
      <rect x="28"  y="100" width="152" height="160" />
      <text x="104" y="172" text-anchor="middle" class="arch__name">Browser</text>
      <text x="104" y="208" text-anchor="middle" class="arch__sub">Your web app</text>
    </g>

    <line class="arch__flow" x1="180" y1="180" x2="240" y2="180" />
    <text class="arch__hop" x="210" y="150" text-anchor="middle">HTTPS</text>
    <text class="arch__hop" x="210" y="166" text-anchor="middle">OTLP</text>

    <g class="arch__tier arch__tier--mid">
      <rect x="240" y="100" width="160" height="160" />
      <text x="320" y="172" text-anchor="middle" class="arch__name">API</text>
      <text x="320" y="208" text-anchor="middle" class="arch__sub">Edge runtime</text>
    </g>

    <line class="arch__flow arch__flow--reverse" x1="400" y1="180" x2="460" y2="180" />
    <text class="arch__hop" x="430" y="150" text-anchor="middle">SQL</text>
    <text class="arch__hop" x="430" y="166" text-anchor="middle">gRPC</text>

    <g class="arch__tier">
      <rect x="460" y="100" width="152" height="160" />
      <text x="536" y="172" text-anchor="middle" class="arch__name">Database</text>
      <text x="536" y="208" text-anchor="middle" class="arch__sub">Postgres</text>
    </g>
  </svg>
  <button class="btn btn--quiet" type="button" data-loop-toggle>Pause</button>
</figure>
```

```css
@property --flow-offset {
  syntax: "<number>";
  initial-value: 0;
  inherits: false;
}

.arch-figure { margin: 0; display: grid; justify-items: center; gap: var(--space-sm); }
.arch { width: 100%; max-width: 48rem; height: auto; color: var(--color-ink); display: block; margin: 0 auto; }

.arch__tier rect {
  fill: var(--color-paper-2);
  stroke: var(--color-ink);
  stroke-width: 1.5;
}
.arch__tier--mid rect {
  fill: color-mix(in oklab, var(--color-paper-2) 92%, var(--color-accent));
  stroke: color-mix(in oklab, var(--color-accent) 60%, var(--color-ink));
}

.arch__name { font-family: var(--font-display); font-size: 22px; font-weight: 500; fill: var(--color-ink); }
.arch__sub  { font-family: var(--font-body); font-size: 14px; fill: var(--color-muted); }
.arch__hop  { font-family: var(--font-body); font-size: 11px; fill: var(--color-muted); }

.arch__flow {
  stroke: var(--color-accent);
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-dasharray: 4 4;
  stroke-dashoffset: var(--flow-offset);
  animation: arch-flow calc(var(--dur-long) * 4) var(--ease-in-out) infinite;
}
.arch__flow--reverse { animation-direction: reverse; }
@keyframes arch-flow { to { --flow-offset: -8; } }

@media (max-width: 40rem) { .arch-figure { overflow-x: auto; justify-items: start; } .arch { min-width: 48rem; } }
@media (prefers-reduced-motion: reduce) {
  .arch__flow { animation: none; stroke-dasharray: 0; }
}
```

Font sizes are in viewBox units and scale with the drawing; at the 48rem cap they render at about 1.2 times the value, and under 40rem the drawing keeps that width and scrolls sideways inside the figure. **Use when** the brief is a developer-facing product that needs to show its position in a stack: observability, edge functions, ORMs, ingestion. **Avoid when** the architecture has more than five tiers or a non-linear topology; this recipe is the three-box flow only. A graph wants its own arrangement, placed by hand on a grid, under the same label rules.
