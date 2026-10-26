# Writing a theme file

Read only when creating or editing a theme. A build never needs it. `node scripts/theme.mjs validate <file>` checks the contract below and must pass before a theme ships.

**A theme is a material, not a plan.** It says what the page is made of: paper, ink, faces, rule weight, radius, shadow stance, texture budget, motion character, voice. It never says what the page contains, in what order, or in what shape; two pages in one theme should not share a section sequence. Every rule the Floor or `craft.md` already binds is left out; a theme file that repeats `overflow-x: clip` or the reduced-motion block is padding.

## The header block

Every file opens with this block, which `scripts/theme.mjs index` compiles into `index.json` (the deal reads the index, never the files):

```
---
name: Coral
slug: coral
genre: modern-minimal
paper: light 96.5 50
display: grotesk-sans General Sans
accent: warm 28
posture: restrained
keywords: saas, platform, billing, payments, dashboard, b2b, startup, pricing, analytics, fintech, workflow, onboarding, trust, warm, human
material: warm grey paper, one coral signal, General Sans throughout, soft pills
signature: the ink-filled pill beside an outlined one, and nothing else coloured
---
```

- `paper`: band (`light` over 85% L, `mid` 30 to 85, `dark` under 30), then L and hue of `--color-paper`.
- `display`: class, then the face. Classes: `roman-serif`, `high-contrast-serif`, `slab-serif`, `grotesk-sans`, `grotesk-heavy`, `geometric-sans`, `rounded-sans`, `display-condensed`, `display-heavy`, `mono`, `pixel`, `handwritten`, `blackletter`.
- `accent`: band (`warm` 10 to 60°, `cool` 200 to 300°, `neutral` chroma under 0.05, or `chromatic-<name>` for anything else), then the hue.
- `posture`: `restrained`, `committed`, `full-palette` or `drenched`.
- `keywords`: the words in a brief that route here, lowercase, comma-separated, ten to twenty.
- `material` and `signature`: one line each; the deal prints them.
- `pictured`: written by `scripts/picture.mjs`, the shape and hero posture of the page in the theme's picture, so a build knows which composition is already taken.

## The picture

Every theme ships `<slug>.jpg` beside its file: the first screen and one lower screen of a finished page built in the theme with the skill, each at 1440 x 900, scaled to 960 wide and stacked (`node scripts/picture.mjs <slug> <page.html> <y of the lower screen>`). The page must sweep clean, its lower screen must show the theme's material (the signature object, its rules, its plates), never an empty slot, and the page must be one a designer would sign. A build reads the picture with the file and takes its scale, density, colour balance and objects, never its composition. A theme without a picture validates with a warning.

## The body, in order, 3.5 to 7 KB

1. **One paragraph:** what the theme feels like and what it is not. No brand names, ever: describe the register, never the sites that have it.
2. **Tokens:** a `:root` block with the real values in OKLCH: paper, paper-2, paper-3, ink, ink-2, muted, rule, accent, accent-ink, focus; the three font tokens; `--radius-card`, `--radius-pill`, `--rule-hair`, `--shadow-card`; `--tracking-display`. No comments inside the block: `theme.mjs scaffold` copies it verbatim into a page's `tokens.css`. A theme with dials (colourways, cabinets) lists the alternates in a short table under the block and says the page states its choice in the stamp.
3. **Faces:** display, body, and the outlier if any, with weights, tracking, case. Labels, captions, table heads, tags and nav links are the body face at a smaller size, sentence case, untracked, or one label face the theme names (a small sans under a serif body, say), never mono unless mono is this theme's material; say which. A head is one weight and one colour; a theme built on an accented word names it as the signature and says it appears once.
4. **Material:** four to six bullets: rule weight, radius, shadow stance, texture budget (naming the `texture.md` recipe if any), the control pair, the one object family the theme builds (plates, cards, a ledger, a marquee).
5. **Motion:** one to three lines: how fast, how it eases, what may move.
6. **Voice:** one or two lines on the copy's register.
7. **Do-nots:** three to five bullets specific to this theme's own failure modes, never restatements of a gate.
8. **Build hint:** at most 25 lines of CSS carrying only the rules that make the theme recognisable (the display setting, the control pair, the signature object), every colour, duration, easing and space a token (validate refuses raw milliseconds, a bare `ease`, named colours and raw spacing). Font links as one line.

## What a theme may not carry

A section sequence, a page outline, a mandated nav, footer, hero or enrichment, HTML scaffolds, page-part class names, verbatim copy, invented brand names or people, an eyebrow in any form, a label in tracked capitals or small caps, a stamp or a badge that carries no fact, counts that fix a layout, neighbour comparison tables (the deal computes distance from the header block), or a list of reference sites.

## Contradictions to avoid

The field's calibration of the AI look, which the gates enforce: cream paper with a high-contrast serif and a terracotta accent (65); a monospace label voice on a theme whose material is not mono (64); labels, tags or controls in tracked capitals (67); one coloured or bold word inside a head (38iii); middle-dot meta strings and arrow suffixes (63); italic display as a flourish (38); glow shadows and radial halos on dark themes (29). A theme that wants one of these declares it as its material in the header and the file, with the Reflex it waives named once, or it does not have it.
