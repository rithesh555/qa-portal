# Component cookbook

The component archetypes, one file each: what it is, *Use when*, *Not* (what it is mistaken for), a structural sketch, its knobs and, where something changes, a mobile line. Pick here when you are building a section and do not know which shape to reach for.

The same page shape (say, Bento Grid) can be built from many combinations of these archetypes. The shape from `macrostructures.md` picks the *page*; this file picks the *components inside it*.

---

## Archetype index: load only the picks you need

**Pick your archetype names here, then read only those files** from `references/components/`. Do not load the whole cookbook. A build has four to eight sections chosen for the brief, footer included, and no default sequence: the hero, the sections and the footer are each decided, and a nav only when the page needs one.

### Heroes

- **H1 · Marquee.** A single statement fills the fold; one sentence and the primary action sit small at its foot. [`components/h1-marquee.md`](components/h1-marquee.md)
- **H2 · Split.** Headline, one sentence and the action on one side; one visual on the other, beside the text: a capture plate, a clipped demo video, a built illustration or a photograph, each with its enrichment recipe. [`components/h2-split-diptych.md`](components/h2-split-diptych.md)
- **H3 · Quote led.** A pull-quote with attribution is the hero, both the user's material. The headline is borrowed credibility. [`components/h3-quote-led.md`](components/h3-quote-led.md)
- **H4 · Stat led.** One figure the user gave, with its unit, is the hero. A small qualifier line below says what it means. [`components/h4-stat-led.md`](components/h4-stat-led.md)
- **H5 · Letter hero.** First-person opening, "Dear reader,". No buttons; the action is one typographic link inside the fold. Reads as personal correspondence. [`components/h5-letter-hero.md`](components/h5-letter-hero.md)
- **H6 · Photographic fold.** A single full-bleed image fills the viewport. The caption sits in a corner. [`components/h6-photographic-fold.md`](components/h6-photographic-fold.md)

### Section heads

**Read `craft.md` § 7 before picking one.** These five are the structural shells; that section is the twelve ways in.

- **S1 · Ordinal by structure.** A genuinely ordered run numbered by `<ol>` and `counter()`, the numeral inline at heading size, never a small label above the heading. [`components/s1-left-margin-numbered.md`](components/s1-left-margin-numbered.md)
- **S2 · Hanging.** Air above, the heading flush; no border, no rule, no file: `craft.md` § 7, item 1.
- **S3 · Sticky pinned.** The heading remains in the viewport while content scrolls beneath. An orientation aid. [`components/s3-sticky-pinned.md`](components/s3-sticky-pinned.md)
- **S4 · Inline, no break.** The heading is a heavier phrase that opens the paragraph; no spatial break, no file: `craft.md` § 7, item 3.
- **S5 · Bottom anchored.** A caption carrying a fact sits *below* the section's content. Inverts the hierarchy. [`components/s5-bottom-anchored.md`](components/s5-bottom-anchored.md)

### Feature blocks

- **F1 · Bento grid.** An asymmetric grid of six to nine tiles in mixed spans (1×1, 2×1, 1×2, 2×2). Visual rhythm from size. [`components/f1-bento-grid.md`](components/f1-bento-grid.md)
- **F2 · Sticky scroll stack.** A sticky left pane and a scrolling right pane that cycles through related screenshots. [`components/f2-sticky-scroll-stack.md`](components/f2-sticky-scroll-stack.md)
- **F3 · Tabular spec sheet.** Each row is a feature; columns hold name, value, footnote. Hairline rules between rows, tabular numerals. [`components/f3-tabular-spec-sheet.md`](components/f3-tabular-spec-sheet.md)
- **F4 · Step sequence.** Numbered stages flow vertically. Each stage has a heading, a paragraph, sometimes a small visual. [`components/f4-step-sequence.md`](components/f4-step-sequence.md)
- **F5 · Annotated screenshot.** A product capture sits centre-stage with short labels pointing to UI details. [`components/f5-annotated-screenshot.md`](components/f5-annotated-screenshot.md)
- **F6 · Product card grid.** Each card is a product, not a feature: image, name, price, one micro-action. Reads like a shop floor, not a marketing site. [`components/f6-product-card-grid.md`](components/f6-product-card-grid.md)

### CTAs / signups

- **C1 · Outlined chip.** A bordered, transparent button with a typographic verb ("Save changes"). [`components/c1-outlined-chip.md`](components/c1-outlined-chip.md)
- **C2 · Inline form as CTA.** The CTA is the form, one email field and a verb button on the same rule. No separate sign-up page. [`components/c2-inline-form-as-cta.md`](components/c2-inline-form-as-cta.md)
- **C3 · Typographic link.** A verb phrase with a 1px underline. No box, no fill, no arrow. [`components/c3-typographic-link.md`](components/c3-typographic-link.md)
- **C4 · Sticky bottom bar.** A horizontal bar pinned to the viewport bottom, holding a CTA and one fact. [`components/c4-sticky-bottom-bar.md`](components/c4-sticky-bottom-bar.md)

### Testimonials / proof

Every block here is built from the user's material: their quote, their name, their figures, their logo files. With none supplied the block does not ship (46a).

- **T1 · Pull quote with marginalia.** A quote sits in the wide column; the attribution and source link sit in the narrow margin column. [`components/t1-pull-quote-with-marginalia.md`](components/t1-pull-quote-with-marginalia.md)
- **T2 · Logo wall hairline.** A row of the user's customer logos, monochromatic, separated by hairline rules; a `data-slot="logos"` placeholder sized to the count they gave when the files are not in yet. No card boxes, no shadows. [`components/t2-logo-wall-hairline.md`](components/t2-logo-wall-hairline.md)
- **T3 · Single huge quote.** One quote, set big, centred, taking a whole section. No supporting text, no attribution box; the attribution is one quiet line beneath. [`components/t3-single-huge-quote.md`](components/t3-single-huge-quote.md)
- **T4 · Numbered stat strip.** A horizontal strip of three to five of the user's figures, each with its unit, across one row in tabular numerals. [`components/t4-numbered-stat-strip.md`](components/t4-numbered-stat-strip.md)

### Footers

- **Ft1 · Mast headed.** A wordmark and tagline anchor a single horizontal band. Two or three small links beside, address or licence below. [`components/ft1-mast-headed.md`](components/ft1-mast-headed.md)
- **Ft2 · Inline rule single line.** A single line of credits, address and copyright, each its own element. Hairline rule above. No columns. [`components/ft2-inline-rule-single-line.md`](components/ft2-inline-rule-single-line.md)
- **Ft3 · Index style category list.** Three or four short columns, each headed by a category one weight up, holding four to six links each, and a colophon line. Docs roots and hubs only. [`components/ft3-index-style-category-list.md`](components/ft3-index-style-category-list.md)
- **Ft4 · Dense typographic.** One block of text (credits, references, licence, address) in the body face a step smaller, ragged-right or hyphenated. An editorial colophon. [`components/ft4-dense-typographic.md`](components/ft4-dense-typographic.md)
- **Ft5 · Statement.** One large display sentence dominates the footer: a concrete closing line, not a sitemap. Wordmark, minimal links and copyright sit beneath, a step smaller. [`components/ft5-statement.md`](components/ft5-statement.md)
- **Ft6 · Letter close.** Closes the page like a letter: a sign-off, a name, a date. Optional postscript beneath. Sets the page as a piece of writing rather than a product. [`components/ft6-letter-close.md`](components/ft6-letter-close.md)
- **Ft7 · Newsletter first.** The form (label, input, submit) is the *primary* element of the footer; wordmark, links and copyright sit beneath, a step smaller. For brands that publish and have already offered a subscription above. [`components/ft7-newsletter-first.md`](components/ft7-newsletter-first.md)
- **Ft8 · Marquee scroll.** A horizontal infinite-scroll line repeating one short phrase in sentence case with a dot between repeats, paused on hover and focus and by a visible control; loud voices on a theme that allows an ambient loop. [`components/ft8-marquee-scroll.md`](components/ft8-marquee-scroll.md)

### Navigation

- **N2 · Floating chip.** A small fixed chip in a corner: wordmark and a single action ("Try it"). Does not sit in document flow. [`components/n2-floating-chip.md`](components/n2-floating-chip.md)
- **N3 · Side rail.** A thin vertical strip on one edge, wordmark rotated, plus named section links with `aria-current`; never the default nav, only where a sticky object earns it. [`components/n3-side-rail.md`](components/n3-side-rail.md)
- **N5 · Floating pill.** A content-sized pill detached from the edges, in a hairline ring on solid paper (a backdrop blur only on atmospheric pages); from the first paint, or morphing from a full bar once the reader scrolls (one DOM, one curve, constant height). [`components/n5-floating-pill.md`](components/n5-floating-pill.md)
- **N6 · Newspaper masthead.** Full-width header: a large centred wordmark on the top row, a thin issue and date line above or below in the body face, an optional inline link row beneath, a double rule under the whole thing. [`components/n6-newspaper-masthead.md`](components/n6-newspaper-masthead.md)
- **N7 · Brutal slab.** A heavy, full-width nav with a 2px solid border-bottom, a wordmark that may be capitals and a heavy sentence-case link row; dense rhythm, no shadow, no rounded corners. [`components/n7-brutal-slab.md`](components/n7-brutal-slab.md)
- **N8 · Terminal command.** A nav formatted as a CLI prompt: `> studio --catalog --voice --get`. The links are command flags; a cursor may end the typed line and nothing else on the page blinks. [`components/n8-terminal-command.md`](components/n8-terminal-command.md)
- **N9 · Edge-aligned.** Wordmark at one edge, one action or two text links at the other, nothing between. The first nav for a page with one or two destinations. [`components/n9-edge-aligned-minimal.md`](components/n9-edge-aligned-minimal.md)
- **N1 · Three-section bar.** Wordmark left, a centred cluster of three to five links (some with small dropdowns), sign-in and one quiet action right. The reflex product bar (42): only for four or more real top-level destinations, named in the stamp. [`components/n1-three-section-bar.md`](components/n1-three-section-bar.md)
- **N11 · Mega-menu panel.** A top bar whose triggers open a full-width multi-column panel (icon, title and description per item, grouped, plus a feature card); the page dims behind a scrim. For platforms and hubs with many grouped destinations. [`components/n11-mega-menu.md`](components/n11-mega-menu.md)
- **N12 · Announcement banner + retracting nav.** A coloured promo banner stacked above one real nav; the banner retracts on scroll-down, returns on scroll-up, dismisses via ×. The banner is not a second nav (colour contrast keeps them distinct). [`components/n12-banner-retract.md`](components/n12-banner-retract.md)
- **N13 · Command palette.** A spotlight dialog of grouped, keyboard-navigable results opened by ⌘K; triggered by a visible search pill in the bar, or by one small `Menu ⌘K` control with no other nav for keyboard-first audiences. [`components/n13-inline-cmdk-pill.md`](components/n13-inline-cmdk-pill.md)

---

## Within-archetype variation knobs

Picking an archetype is the first axis of variety. The second is *how you build it*. Two pages built with the same archetype should not be identical: each archetype file carries two or three *variation knobs*. Pick one value per knob per output, so that every Bento you build is not the same Bento.

When you pick an archetype, **state the knob values you chose** in the stamp (SKILL.md Step 6), on the second line with the other structural picks:

```css
/* Hallmark · shape: Bento Grid · genre: modern-minimal · theme: Coral (deal 2/3, seed tracejam·2026-09-22·r0)
 * hero: Stage · nav: edge-aligned · footer: colophon line · F1 knobs: tiles=6, spans=irregular, accent=corner-only · ... */
```

The knob values live **inside each archetype file** (`## Knobs`), next to the code they vary; this index never carries them.

**Anti-pattern (gate 32):** picking the same knob values across two outputs is the same templating as picking the same archetype. If your last Bento was `tiles=6, spans=irregular, accent=corner-only`, the next one changes at least one knob.

---

## Routing, which footer fits which genre

| Genre | Default | Also OK |
| --- | --- | --- |
| editorial | **Ft1 Mast-headed** | Ft2, Ft4, Ft6, Ft7 |
| modern-minimal | **Ft2 Inline single line** | Ft1, Ft5 |
| atmospheric | **Ft5 Statement** | Ft1, Ft2 |
| playful | **Ft8 Marquee scroll** | Ft5, Ft3 |
| terminal | **Ft4 Dense colophon** | Ft2 |
| docs / reference | **Ft3 Index columns** | Ft1 |

**A theme's motion rule outranks these defaults:** a theme that says nothing else moves (Hum) takes a still footer, never the marquee.

**Default away from Ft3.** The four-column index footer is the machine fingerprint when used reflexively (Product, Company, Resources and Legal columns, a social row, a tiny copyright; gate 42). Reach for Ft3 only when the page is a hub or a docs root with a genuine sitemap; default to Ft1, Ft2, Ft4, Ft5, Ft6, Ft7 or Ft8 otherwise.

---

## Routing, which nav fits which genre / theme

| Genre / cluster | Default nav | Also OK |
| --- | --- | --- |
| editorial | **N6 Masthead** on an issue or edition; **N9 Edge-aligned** otherwise | N12, N3 when a sticky object earns it |
| modern-minimal | **N9 Edge-aligned** | N5, N13, N11 for six or more grouped products, N1 for four or more destinations |
| atmospheric | **N5 Floating pill** (the blur sells the mood) | N9, N13 |
| playful | **N7 Brutal slab** on a heavy theme; **N12** or **N9** on a soft one (N7 refuses rounded corners) | N5, N13 |
| terminal / CLI | **N8 Terminal command** | N13 |
| docs / reference | **N13 Command palette** with a search pill | N9, N3 when a sticky contents list earns it |
| commerce / product launch | **N12 Banner + retract** | N9, N11 |

**Default away from N1.** Wordmark left, a centred link row, a filled button right and a hairline under it is the most recognised machine-made nav (42). Start from the page's real destinations: one or two is N9, a search-led product is N13, a launch is N12, an edition is N6. N1 is right only when four or more top-level destinations exist, and then the stamp names it.

---

## Picking from this file

When building a section:

1. Identify the section's role (hero, section head, feature, CTA, testimonial, footer, navigation).
2. Glance at the archetypes in that category.
3. Pick the one whose "Use when" fits the brief.
4. Use the same archetype twice on one page only when the shape is built on repetition and the stamp says so.
5. If the page shape suggests a default (Bento Grid wants F1 Bento), use it; if it does not, vary deliberately.

---

## Mobile collapse, per archetype

Two breakpoints to know:

- **60rem (about 960px)**: the *layout* breakpoint. Multi-column grids collapse to a single column. Tilts and clip effects drop. Sticky panes unstick.
- **40rem (about 640px)**: the *typography* breakpoint. Display sizes shrink one step. Side-margin labels move inline. Annotations consolidate.

Below 60rem the archetype must still feel like itself (same hierarchy, same tone, same rhythm) in a stacked single-column form. Below 40rem the page is a phone: one column, the scaffold's 16px gutter, sections at `--section-gap`.

An archetype file carries a mobile line only where something changes at one of these widths; no line means the sketch already stacks.

**Cross-cutting rules:**

- All hit targets at least 44 × 44px below 40rem. Never below.
- `--gutter` never under 1rem on the page container, so content does not kiss the screen edge.
- Disable any scroll-linked animation below 40rem (mobile scroll has its own physics; layered animations fight it).
- Image `loading="lazy"` always below the fold; **never on the LCP element regardless of viewport.**
- Auto-play video respects `data-saver` (`navigator.connection.saveData`) and shows the poster when it is set.
