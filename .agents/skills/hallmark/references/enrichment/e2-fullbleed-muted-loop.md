### E2 · Demo video, full-bleed muted loop with a ghost overlay

Video fills the fold, ghosted through `mix-blend-mode: multiply` over a paper-coloured overlay so the type stays readable. The video is wallpaper, not subject.

*Use when:* the product's feel is the message (mood, tactility, atmosphere).
*Avoid when:* the product needs to be seen clearly; use E1 or E4 instead.

**Knobs:**
- Ghost opacity (0.3 · 0.5 · 0.7), text contrast measured on the darkest frame (40)
- Text alignment (left-bias · centred)

The video is the LCP: `autoplay muted loop playsinline`, a `poster` preloaded with `<link rel="preload" as="image" fetchpriority="high">`, never `loading="lazy"` (28a, 28b), and `aria-hidden="true"`, since it is wallpaper. It loops past 5 seconds, so the fold carries the loop contract in [`../patterns.md`](../patterns.md) § A loop that can pause: still off-screen and under reduced motion, paused on hover and focus (18), with a visible pause button. Without the user's footage the fold is a `data-slot` with its designed placeholder (`craft.md` § 8), never a stock clip passed off as the product.

**Example.** A small fashion label's spring lookbook. An eight-second muted loop of fabric draping in a studio, multiplied over a 0.5-opacity warm-cream overlay so the display headline ("Lookbook four, spring 2026.") reads over the moving footage. It pauses on hover and focus so the lede can be read, and its pause button sits in the fold's lower corner.
