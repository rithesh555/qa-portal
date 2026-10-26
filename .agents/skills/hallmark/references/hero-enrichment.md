# Hero enrichment: whether, what and how much

Loaded at Step 4, only when the hero may carry imagery. Run the image-need check first; if it says no, close this file and ship the typographic hero. If it says yes, pick a tier, pick at most one archetype and one polish pattern, and load only the matching file from `enrichment/`.

**The promise.** Enrichment is an option, never a default. A typographic hero is always an acceptable answer. Video, illustration, a screenshot, a loop, a background, a photograph: each has to earn its place. The hero must still work with the enrichment deleted; if it collapses, the enrichment was a crutch under weak typography.

**The bar.** A quiet, well-set typographic hero beats a stock illustration, a Lottie checkmark, a blob background or a generic centred video block every time.

---

## Image-need check: does this brief want imagery at all?

The default is typography only. Match the brief against this table and act on the first row that fires; the product decides the row, not its subject (an app about bread takes the app row):

| Brief signal | Image strategy |
| --- | --- |
| API, docs, changelog, CLI, library, SDK, package | No imagery. Typography only; code blocks if needed |
| SaaS landing, app, platform, dashboard, developer tool | A real capture in a slot: E4 (screenshot) or E1 (demo video). No capture, a designed placeholder (`craft.md` § 8), never a drawn mockup (47c) |
| music, record, EP, album, release, label, band | The release's cover in a slot, or the theme's drawn record or tape; never a stock studio photo |
| e-commerce, shop, store, product catalogue, brand, fashion, lookbook | Real product photos; until the user provides them, one hero slot and the range in type (68) |
| photography, portfolio, gallery, artist | Imagery is the page; slots until the user provides it |
| food, restaurant, menu, dish, coffee, wine, recipe | A hero photo and product crops; until the user provides them, one hero slot and the dishes in type (68) |
| team, staff, about us, portraits, hiring, careers | A team `data-slot` sized for the user's real photos, the names and roles set in type (68); never a generated, stock or avatar-service face (F9) |
| travel, hotel, destination, real estate, listing, property | A cover photo and tile photos; until the user provides them, one cover slot and the places in type (68) |
| news, blog, magazine, journal, publication | A feature image per post; until the user provides them, one slot on the lead post and the rest in type (68) |
| atmospheric, slow and editorial | E7 (a two-colour gradient with grain) or E6 (one small loop), built in-page at tier A or B; any external asset obeys [`imagery-kit.md`](imagery-kit.md) (no URL outside its manifest) and [`assets.md` § Placeholder order](assets.md) |
| agency, studio | E8 photography, or none |
| manifesto, essay, letter, foundry, type specimen, broadside | No imagery. Display typography is the design |
| anything else, vague or unspecified | Typography only |

Rules:

- When the user attached an image (or `.hallmark/preflight.json` cached one), use it. Never overwrite it with a placeholder.
- When the brief sits between a photo row and a no-imagery row, the Step 1 material answer decides: photos or "leave slots" take the photo row, silence takes the type row.
- A placeholder looks like a placeholder, never like a confident decision. The skill never invents stock photos as if they were the final design.
- The rows above do not override the genre file or the theme file. Modern-minimal still suppresses decorative kit imagery (`imagery-kit.md` § Never), and a theme whose object is hand-built (a drawn jar, a lamp, a record) keeps it in the hero; a capture or photo row then puts its slot below the fold.

The tier is chosen after this check says imagery is needed. Skipping the check is what produces a blob illustration on every page.

---

## The craft tiers

One alphabet, shared with [`custom-craft.md`](custom-craft.md). Typography only is not a tier; it is the answer when no tier is needed.

| Tier | What | When |
| --- | --- | --- |
| **A · CSS art** | Pure CSS shapes, gradients, clip-paths; no asset, no dependency | Geometric shapes, gradient compositions, glyph-style decoration |
| **B · Hand-built SVG** | Written by hand, optimised, animated declaratively | Illustration past what CSS handles cleanly: a loaf, a mascot, a diagram |
| **C · Declarative animation** | Motion on top of A or B; CSS first, a library only for orchestration | A loop, a draw-on, a staggered entrance |
| **D · WebGL** | Three.js or shaders | Only when the 3D is the product and the user interacts with it |
| **E · Generated still** | An image model, with provenance and post-processing | Characters or scenes that hand-building cannot reach economically; always post-processed |
| **F · Library asset or Lottie** | Storyset, Humaaans, unDraw, LottieFiles, customised | Last resort, when budget and timeline force a shortcut; never unmodified |

**The discipline.** If A can do it, do it in A. If A cannot reach it, B. Drop to E only when characters demand it, and to F only when the brief says fast and cheap or the motion is character-articulated. Reaching for F because it is familiar is the signature of a templated page.

`custom-craft.md` says how to build at each tier; [`assets.md`](assets.md) catalogues the sources for generated stills, libraries and Lottie.

---

## Picking the archetype

If the brief carries an explicit visual cue, pick from this map:

- "demo", "show how it works", "product tour": E1 or E2 demo video
- "platform", "tool", "infra", "dashboard", "developer": E4 screenshot in a figure
- "shop", "store", "menu", "products", "items": E8 photography (or the F6 product grid)
- "bakery", "kitchen", "café", "atelier" with no photos coming: E5 custom illustration, tier B
- "agency", "studio", "portfolio": E8 photography or none
- "manifesto", "essay", "book", "letter": none

Otherwise the archetype is none; state the inference in one sentence, beside the shape inference.

---

## Seven enrichment archetypes

Each file carries the recipe: definition, use-when and avoid-when, knobs, a worked example, and a sketch where the build is not obvious. **Pick zero or one. Then read only that one file.**

- **E1 · Demo video, clipped by the viewport edge**: headline left, a real capture right in a slot, the rightmost 10 to 20% cut off past the viewport. [`enrichment/e1-clipped-demo-video.md`](enrichment/e1-clipped-demo-video.md)
- **E2 · Demo video, full-bleed muted loop**: video as wallpaper under a ghost overlay; the feel is the message, not the detail. [`enrichment/e2-fullbleed-muted-loop.md`](enrichment/e2-fullbleed-muted-loop.md)
- **E4 · Screenshot in a figure**: a real capture in a `<figure>` with a caption that states a fact, no drawn chrome, optional tilt and numbered pins. [`enrichment/e4-floating-no-frame.md`](enrichment/e4-floating-no-frame.md)
- **E5 · Custom illustration centrepiece**: one hand-built SVG (tier B) or generated still (tier E) as the hero's single illustrative element. [`enrichment/e5-custom-illustration-centerpiece.md`](enrichment/e5-custom-illustration-centerpiece.md)
- **E6 · Animated loop**: one small custom CSS or SVG loop, 4s or less, that gives an otherwise still page life. [`enrichment/e6-animated-loop.md`](enrichment/e6-animated-loop.md)
- **E7 · Abstract background**: a two-colour low-chroma gradient plus feTurbulence grain; paper texture, never aurora. [`enrichment/e7-abstract-background.md`](enrichment/e7-abstract-background.md)
- **E8 · Hero photography**: one tightly cropped photograph with a margin-aligned caption; cookbook H6 cross-reference. [`enrichment/e8-hero-photography.md`](enrichment/e8-hero-photography.md)

---

## Hero polish, beyond enrichment

The archetypes decide what sits next to the headline. The polish patterns decide how the headline itself sits: layout, type and scale, not decoration on top. They are admissible on any hero shape. Pick one when the hero feels flat, symmetric or predictable.

A hero may carry one polish pattern and one enrichment archetype, never two polish patterns. **Pick zero or one. Then read only that one file.**

- **HP1 · Vertical rail title**: a fact runs vertically beside the body. [`enrichment/hp1-vertical-rail-title.md`](enrichment/hp1-vertical-rail-title.md)
- **HP2 · Marquee overflow**: the h1 bleeds past the viewport edge; short loud titles only. [`enrichment/hp2-marquee-overflow.md`](enrichment/hp2-marquee-overflow.md)
- **HP4 · Decorative numeral**: a huge figure that means something (an issue, a year, a version, a chapter). [`enrichment/hp4-decorative-numeral.md`](enrichment/hp4-decorative-numeral.md)

The sequence:

1. The hero shape is already decided at Step 2 (see [`macrostructures.md`](macrostructures.md)).
2. Pick zero or one enrichment archetype.
3. Pick zero or one polish pattern.
4. Apply [`craft.md` § 4](craft.md): the posture, the fold, the entrance, and the before-it-ships list (every item must be yes or the typographic hero ships).
5. Stamp the choices.

---

## Stamp

The enrichment and polish go on the stamp's second line, in the `enrichment:` field:

```css
/* Hallmark · shape: Workbench · genre: modern-minimal · theme: Cobalt (deal 1/3, seed tracejam·2026-09-22·r0)
 * hero: Stage · nav: edge-aligned · footer: colophon line · enrichment: E1 demo capture, clip right, 16/10, hairline · polish: HP4 numeral, issue 22 · signature: the trace runs off the page
 * axes: light/grotesk-sans/cool · posture: restrained · contrast: pass · fold: pass · v2.5.0 */
```

No polish, omit `polish:`. No enrichment, write `enrichment: none`. Never fake either. The log entry's `enrichment` field carries the same value so Rotation can read it.
