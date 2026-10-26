### E5 · Custom illustration centrepiece

A hand-built SVG (tier B, the default) or a generated still (tier E, when characters demand it) as the hero's single illustrative element: the bakery's loaf, the studio's mascot, the diagram of how the workflow flows.

*Use when:* the brand has a story or a thing it makes that benefits from being drawn.
*Avoid when:* the brand is a generic "modern professional team"; illustrating that is the new template.

**Knobs:**
- Build method (tier A CSS · tier B SVG · tier E generated · tier F library)
- Animation (none · loop, held to E6's rules · scroll-linked, as one named pattern in `scroll-choreography.md`)
- Scale (small accent · dominant)

**Example.** Maple Street Bread, a bakery. Letter-style hero copy left ("Saturday, 6:14 a.m. The dough went in at midnight."), a 60-line hand-built SVG loaf right, three paths (body, shade, score marks). On a theme that lets something move, `@property --rise` lifts it 4px and back in about 3.8s, the page's one E6 loop under the loop contract (`patterns.md` § A loop that can pause); the score marks draw themselves once on first paint via `stroke-dasharray`. Tier B, dominant scale, animation: loop. Reduced motion shows the static loaf.

How to draw the loaf and animate it with `@property` is in [`custom-craft.md`](../custom-craft.md): the tier B file carries the bakery worked example, and the recipes cover a workflow diagram, a mascot, an architecture diagram and a botanical accent.
