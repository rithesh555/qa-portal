# Comp before build: composing in pixels before composing in CSS

Loaded at the comp step after the Picks block, and **only** when the pre-flight found both `TOGETHER_API_KEY` and `scripts/imagegen.mjs`. With no key this file never loads, the step never runs, and the build goes from the Picks block straight to Step 6. The comp step is never a blocker, never a dependency, and never something to apologise for skipping.

**Why it exists.** Prose is bad at composition: it can say "asymmetric spans" but not where the weight sits. A rendered comp carries mass, interval and alignment at a glance, and reproducing an approved image is an easier task than inventing a composition from a paragraph.

---

## § What the comp is, and is not

| It is | It is not |
| --- | --- |
| a composition proposal: mass, interval, alignment, where the eye lands first | a design system; the palette and pairing were settled in the Picks block and do not move |
| the first viewport only, at the surface's own dimensions | a full page; comping below the fold buys nothing and costs a call per region |
| a target to reproduce in code, measured against | a texture source; nothing from the comp is ever embedded in the page |
| disposable once the build matches it | an asset; comps are not shipped and not committed |

**The comp does not get a vote on the Floor.** An image generator will hand you eyebrows, a violet-to-cyan gradient, glassmorphism, and a fake browser window, because nothing in it has read the gates. Same rule as an archive exemplar: **take its composition, not its compliance.** A comp is never evidence that a gate is wrong, and "the comp had it" is not a waiver reason.

---

## § The call

Two comps, three when the direction genuinely forks. One is not a choice and four is a shopping trip.

```
node <skill-dir>/scripts/imagegen.mjs "<prompt>" --size 1280x800 --n 1 --out .hallmark/comps/c1.png
```

The prompt is built from the direction contract, not from the brief. A prompt that reads like the brief produces the category default in pixels, which is the exact thing R.1 spent its budget refusing. Carry, in this order: the **scene sentence** (R.5), the **direction** in three or four words, the **paper and accent** as plain colour words, the **display class** (not the face name; no generator knows Erode), and the **macrostructure** as a compositional instruction. Then one negative clause naming what the category does, so the generator is pushed off it too.

> *"Web page hero, top 1280x800 only. A postal sorting office at 4am, one clerk under a single lamp. Warm kraft paper ground, one frank-red mark, deep ink. Huge condensed sans headline set hard against the left margin, three lines, enormous empty right two-thirds. A thin rule under the headline, nothing else above the fold. Flat, printed, no depth. Not a centred hero, no cards, no gradient, no screenshot."*

**Vary the comps on one axis only.** Two comps that differ in everything are two briefs, and comparing them tells you nothing about the decision you are actually making. Vary the composition (where the weight sits, symmetry against asymmetry, type-led against image-led) and hold the system fixed.

---

## § The approval point

Show both, side by side, at their own size. One line each on what differs. Then stop and ask which one, or whether neither.

This is the second and last redirect window (the Picks block was the first) and it is much cheaper than the one after the build. **Do not build past a comp the user has not chosen.** "I'll build A and we can adjust" is how the approval point turns into decoration.

If the user picks neither, that is information: ask which of the two was closer on composition, change that axis, and re-call once. Two rounds is the ceiling, same as the finish review. After that, build without a comp and say so in one line.

---

## § Reproduction discipline

**A model reliably believes its recreation succeeded when it did not.** This is the failure mode that makes the whole step worthless if unguarded, because the belief is what stops you looking.

So, before building anything below the fold:

1. Screenshot the built page at **exactly the comp's dimensions** (1280x800).
2. Put the two side by side and answer three questions in writing, one line each:
   - **Mass.** Does the weight sit in the same place, at the same size, relative to the viewport?
   - **Interval.** Are the gaps between the major elements the same proportion of the height?
   - **Entry.** Does the eye land on the same element first?
3. Name the largest divergence and fix it, or state in one line why the built version is right and the comp was wrong. Both are legitimate. Silence is not.

The comp is the target, not the authority: reproducing a comp that misjudged the copy length is worse than diverging from it deliberately. What is banned is diverging without noticing.

Record it in the stamp: `comp: 2 rendered · c1 approved · reproduced (checked at 1280x800)`, or `comp: skipped (no key)`, or `comp: 2 rendered · none approved · built unconstrained`.

---

## § The medium inventory

Before writing a line of the build, every region of the approved comp gets a written implementation medium. Six or eight regions, one line each, and it takes about a minute.

**The gate: a CSS gradient or a layered background is not a texture.** Writing "CSS" against a woven cloth, a sculpted panel, a printed halftone, a photographed material, or anything with grain is how a committed comp silently becomes a flat page with the same section order and none of its ambition. The inventory exists to make that substitution visible while it is still cheap.

| Medium | What it is right for |
| --- | --- |
| **Code** (CSS/SVG) | what the page *draws*: rules, type, geometry, diagrams, anything that animates or reacts, anything that must reflow |
| **Raster** (generated or supplied) | what the world *paints*: material, grain, cloth, paper fibre, photography, painted or sculpted surfaces, real depth |
| **Neither** | the region the comp invented and the copy does not support. Cut it here, not after building it |

Two rules on top:

- **A raster region needs a real source.** The generated-still rung of the enrichment hierarchy, a user-supplied asset, or a placeholder that is honestly labelled. An invented stock photograph is not a source, and the hierarchy in `craft.md` § 4 still binds: typography, then CSS art, then SVG, then generated, and Lottie last.
- **A region cannot change medium silently during the build.** Downgrading raster to CSS mid-build is the whole failure this section catches. Change it if the code argues for it, and say so in one line.

Ship the inventory as part of the comp message, under the comps:

```
Hero ground        raster    kraft paper fibre, generated
Headline           code      type, must reflow
Rule under head    code      1px, tokenised
Frank mark         code      SVG, it animates on scroll
Right two-thirds   neither   empty; the comp's floating card has no copy behind it
```
