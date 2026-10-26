### E6 · Animated loop, pure CSS or SVG

One small custom-built loop: an orbiting dot, a breathing rectangle, a moving gradient stop. It is the page's one E6 loop (`craft.md` § 5) and runs only where the theme lets something move.

*Use when:* the page is otherwise still and one small animated element gives it life.
*Avoid when:* the page already has movement; more movement makes the page anxious.

**Knobs:**
- Medium (CSS keyframes · SVG with CSS · a library only when orchestration needs it, see `craft/tier-c-animation.md`)
- Placement (margin · inline with the headline · corner accent)
- Loop duration (4s or less a cycle, a multiple of `--dur-long`; anything longer drags)

It loops past 5 seconds, so it carries the loop contract in [`../patterns.md`](../patterns.md) § A loop that can pause: still off-screen and under reduced motion, paused on hover and focus (18), with a visible pause button beside it.

**Example.** A collaborative whiteboard app. A pure-CSS loop of `calc(var(--dur-long) * 5)`, about two seconds, beside the headline: a single dot orbiting a slow ellipse, standing for real-time presence without a Lottie. Built with `@property --angle` interpolating 0deg to 360deg on `transform: rotate()`. Margin-placed, about 64 by 64px, the accent at low chroma, its pause button beside it. Zero bytes of bundle; `animation: none` under reduced motion.
