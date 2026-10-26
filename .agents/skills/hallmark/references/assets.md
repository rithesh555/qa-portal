# Assets: sources for icons, logos, illustration, photography and video

Loaded when an enrichment needs an external asset. Before reaching here, two questions in order: does the brief want imagery at all ([`hero-enrichment.md`](hero-enrichment.md) § Image-need check), and can it be built by hand ([`custom-craft.md`](custom-craft.md))? This file is for when both answers send you here.

## Placeholder order

When imagery is needed and the user has not supplied it, take the first that fits:

1. **A demo slot** (`craft.md` § 8): a `data-slot` container with a designed placeholder in the theme's colours and one corner label. The default for every product capture and every photo the user will supply.
2. **The imagery kit** ([`imagery-kit.md`](imagery-kit.md)): manifest-listed washes, brushstrokes, marks and textures, only where a listed file fits.
3. **A hand-built composition** (tier B in [`custom-craft.md`](custom-craft.md)): a stamp, a mark, a colour-blocked figure, when the kit does not carry the register.

A placeholder reads as a slot, never as content: no random stock photo, no kitten service, no kit image standing in for a real product photo. Alt text (or the slot's `data-alt`) describes the intended subject, so it is already right when the real image lands.

**Remote assets** are prototype defaults: before production, prefer vendored or self-hosted files. An asset source supplies files, never scripts, pixels or widgets. When a page keeps third-party hosting, the handoff says so (privacy, uptime). A customer's logo comes from their own asset page or the user's files, never hotlinked from an unrelated site.

## Icons

| Library | Count | Best for |
| --- | --- | --- |
| [Lucide](https://lucide.dev) | 1,600+ | The default for product and developer pages |
| [Phosphor](https://phosphoricons.com) | 9,000+ in six weights | Several weights of one icon without mixing sets |
| [Heroicons](https://heroicons.com) | about 300 | Tailwind and shadcn projects |
| [Tabler](https://tabler.io/icons) | 5,900+ | Breadth, when the others lack a symbol |
| [Iconoir](https://iconoir.com) | about 1,500 | A lighter, rounder stroke |

1. **One library per page** (30b); a brand or platform mark in at most two slots is the exception.
2. **Sizes 16, 20, 24 and 32** at the set's own grid, `currentColor`, the regular stroke (bold only under 20px or for emphasis).
3. **Never an emoji as an icon** (30a), never an icon in a coloured coin (F5).
4. Avoid Font Awesome's free set (the generic-glyph look), Material Icons outside a Material project, and any pack whose strokes disagree.

```jsx
import { Check } from "lucide-react";
<Check size={20} strokeWidth={2} aria-hidden="true" />
```

## Brand and customer logos

| Source | Best for |
| --- | --- |
| [Simple Icons](https://simpleicons.org) | 3,400+ monochrome SVG marks with each brand's hex |
| [SVGL](https://svgl.app) | A smaller, hand-checked set |
| The brand's own media page | Always first when accuracy matters |

1. **A logo wall exists only with the user's own customers or partners** (46a). Without them: a `data-slot="logos"` sized for the count the user gave, or no wall; never ACME, Initech or Hooli.
2. **Monochrome**, one treatment per wall (all marks or all wordmarks), aspect ratio kept.
3. **Height-aligned:** 32 to 48px tall in a wall (20 to 28px in a footer, `craft.md` § 9), gaps two to three times the height, no borders, no halos.

```html
<img src="https://cdn.simpleicons.org/github/888888" alt="GitHub" height="32">
```

## Generated stills (tier E)

Only when the user asked for a generated image and `TOGETHER_API_KEY` is set: [`scripts/imagegen.mjs`](../scripts/imagegen.mjs) calls Together AI (FLUX.1.1 pro by default; `--model` takes another model id Together serves) and writes a provenance sidecar. A model run by hand elsewhere is fine when the user supplies the output. The discipline is in `craft/tier-e-generated.md`:

1. **Always post-process:** grain, an asymmetric crop, a colour grade toward the theme's paper. Raw output looks generated.
2. **Prompt for specifics:** one concrete subject in one pose, a named style (*risograph print*, *ink line drawing*), an off-centre crop, a named light, and a negative clause (*no mesh gradient, no aurora, no symmetric layout, no people smiling at laptops*).
3. **Stamp the provenance:** `generated: <model> via imagegen.mjs · post-processed`.
4. **No animation** assembled from stills.

## Library illustration (tier F, last resort)

| Source | Licence |
| --- | --- |
| [Humaaans](https://www.humaaans.com) | CC0 |
| [Open Peeps](https://www.openpeeps.com) | CC0 |
| [unDraw](https://undraw.co) | Free, own licence |
| [Storyset](https://storyset.com) | Free with attribution |

Recolour to the theme's anchor hue, crop or recompose, one library per page, and none of the giveaway poses (a person on a laptop under a speech bubble, a headset on a cloud, a giant phone). An unmodified library figure is on a hundred other pages.

## Screenshots

A real capture in a `<figure>` whose `<figcaption>` carries a fact (the view, the build, the date), or a `data-slot` until the user supplies one (`craft.md` § 8). One frame at most and only with real content inside (47b); never a drawn browser bar, traffic lights, a URL pill or an OS title bar (47a); tilt only as E4's knob; never a styled-div dashboard with invented figures (47c).

## Video

The product's own screen recording first; stock footage only for an ambient loop.

| Source | Licence |
| --- | --- |
| [Mixkit](https://mixkit.co) | Free, no attribution |
| [Coverr](https://coverr.co) | Free commercial use |
| [Pexels Videos](https://www.pexels.com/videos/) | Pexels licence |

- Sources in order AV1, VP9 WebM, H.264 MP4; `autoplay muted loop playsinline`, a `poster`, preloaded when the video is the LCP (`<link rel="preload" as="image" href="…" fetchpriority="high">`, since `fetchpriority` does nothing on `<video>`), never `loading="lazy"` on it (28a, 28b).
- Captions when the video has speech; never sound on autoplay; a visible pause control on a loop over 5 seconds.
- Compress with ffmpeg: `ffmpeg -i in.mp4 -c:v libvpx-vp9 -b:v 0 -crf 30 -an out.webm` (VP9); `-c:v libx264 -preset slow -crf 23 -an` (H.264).
- Never watermarked stock, never a music-led demo without a mute control.

## Photography

| Source | Licence |
| --- | --- |
| [Unsplash](https://unsplash.com) | Unsplash licence |
| [Pexels](https://www.pexels.com) | Pexels licence |
| [Nappy](https://nappy.co) | Free, curated for representation |

Change every stock photo (a crop, a grade, a duotone in the theme's inks), match its light to the scene sentence, and keep visible logos out. Never a stock face as social proof (F9), never staged team shots, never over-processed HDR.

## Backgrounds

A background is a surface, not an asset: the paper token, a change of paper, or one `texture.md` artifact under its budget. No mesh generators, aurora blobs, orbs or starfields (29).

## Lottie and Rive (tier F)

Only for character-articulated motion that cannot be built in CSS or SVG; commission rather than pull a community file; under 2 MB; pause and resume controls; a static reduced-motion frame. Spinners, check draws and hover effects are CSS (F10).

## Which source for which job

| Need | First reach | Second reach |
| --- | --- | --- |
| UI icon | Lucide | Phosphor or Heroicons |
| A customer logo | The user's file | Simple Icons |
| An illustration the brand owns | Hand-built, tier A or B | Commissioned |
| A character illustration | Generated still, post-processed | Commissioned, then a library |
| A photograph | The user's | Stock, changed |
| A product demo | The user's screen recording | A slot |
| A texture | One `texture.md` artifact | Nothing |
| A loader or a check draw | CSS or SVG `stroke-dasharray` | Never Lottie |
