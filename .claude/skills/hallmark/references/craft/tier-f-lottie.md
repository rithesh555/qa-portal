## Tier F · Library illustrations and Lottie (last resort)

When budget and timeline force a shortcut. The catalogue is in [`assets.md`](../assets.md): Storyset, Humaaans, unDraw, IRA Design, LottieFiles. Even here:

- **Customise.** Recolour to the theme's tokens, crop or recompose. Never ship the unmodified library look.
- **Avoid the giveaway poses.** Everyone has seen "person on laptop with a floating speech bubble". Anything that looks like stock illustration loses.

### Lottie, specifically

**Use Lottie only when:**
- The motion is character-articulated (a five-frame mascot wave, a multi-joint walk cycle) and CSS or SVG cannot reasonably express it
- The file is custom-commissioned and matches the brand
- It is under 2 MB
- A loop stops off-screen, pauses on hover and focus, and past 5 seconds carries a visible pause control (`patterns.md` § A loop that can pause)
- The `prefers-reduced-motion` fallback is a static keyframe

**Never Lottie for:**
- A spinning logo: CSS `@keyframes` on `rotate`
- A checkmark draw: SVG `stroke-dasharray`
- A loading spinner: a conic gradient and `rotate`
- A hover microinteraction: a CSS transition
- A hero centrepiece that could be hand-built: tier A or B

The Lottie tell is a generic LottieFiles pull where CSS would have built it stronger and lighter. F10 reports it.
