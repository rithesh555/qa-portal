# Direction: deriving the world

The opt-in path. A build takes it only when the user asks (**custom**, "derive it", "bespoke", "no theme", "a world of its own"). The direction is made to measure for one brief, written inline into the page's `:root`, never a catalog entry. Two depths: **tuned** (a complete OKLCH palette and a free-font pairing on Hallmark's structures) and **bespoke** (the structure and composition designed from first principles too).

The ritual exists because the model's own taste is an attractor: asked for "something unique", a model ships the same two or three looks per category every time, and letting it choose is letting it repeat itself. The steps below are outside interventions: named rejections, a deterministic draw, a scene the palette must obey, and a contract the build is audited against. Every gate fires unchanged at every depth; the Picks block surfaces the direction, posture, palette and pairing before code so the user can redirect.

**Nothing from the catalog.** A custom run never runs the deal, never opens a theme file, and never borrows a theme's faces, palette or signature object; the catalog's coordinates are the one thing it reads, through `theme.mjs check`, so that it can stay away from them. The test is the reviewer's: if a fresh reader could name the catalog theme this page resembles, the run failed and the world is reworked before the sweep.

**The catalog takes it back** when the user names a theme ("custom, something like Newsprint" is a theme pick with a mood note), when a `design.md` or a real brand already exists (inherit it), and in component scope. `--fast` on a custom ask is a contradiction: take the catalog and say so.

## The ritual

Runs in order before any palette work. Each step is one or two written lines; the whole ritual reads as a short paragraph of decisions, not a form.

**R.1 Reflex check.** Name the category's obvious aesthetic and its tasteful second-order fallback, then reject both in writing: *Reflex check: rejecting sage-and-cream (the category default) and editorial serif on bone (the tasteful fallback).* The default and its predictable opposite are both the rut. Two more altitudes: would the slate you are about to write fit the category's other products unchanged (then it is category gravity), and could someone guess the aesthetic from the category plus what Hallmark always avoids (then the avoidance is the pattern)? If either is obvious, rework.

**R.2 Spent defaults.** Already worn out for the brief family, declared before the slate: warm, bookish, food, family → cream paper, serif display, lamplight amber; tech, developer, AI → near-black, one neon accent, mono labels; editorial, studio, portfolio → bone paper, high-contrast serif, hairlines everywhere; playful, consumer → rounded sans, candy accent on white, blobs; luxury, craft → ivory, letterspaced small caps, no accent; health, science → clinical white, single blue, geometric sans; finance → navy, emerald, tabular mono; events, music → black, duotone photo, condensed caps. Spent in every family: pill buttons, cream or off-white paper, an italic accent word, `01 / 02 / 03` labels and mono labels, the defaults the field's own guides now name. A spent look can still be earned by a draw that demands it; drifting there is what is banned.

Your own rendition prior is spent too, and it bites at execution rather than selection. Claude renders warm, bookish and child-facing subjects as cream, serif, italic accents and lamplight whatever the draw said; before writing code, re-read the OWN-WORLD block, and if it says cream, paper, parchment, ivory or lamplight on a brief that never pinned them, rework from the world's saturated materials. Codex renders a tight grotesk at 600 on near-white with one blue accent and a bordered soft-shadow card. Gemini renders gradient ramps as material and hover motion on images. Open-weight models revert mid-build: the first viewport commits, section three becomes a card grid on white.

The catalog's own coordinates are spent as well: `node <skill-dir>/scripts/theme.mjs check --axes "<paper>/<display>/<accent>"` at § D tells you whether the triple you are about to build already exists.

**R.3 The slate.** Seven grounded directions, numbered, one line each: a concrete visual system, artifact, place or ritual this audience already knows, with the germ of a system grammar. *3. The pharmacy blotter: clinical buff card, one federal-blue rule system, dosage-table typography.* Not adjectives, not moods. Two questions pull the list off the obvious: what would this thing look like as a physical object, and what did its world look like before the web? The audience's graphic traditions count (a notation system, a documentation standard, a school of poster). Spread across at least three material families; the brief's own noun gets at most one seat.

**R.4 The draw and the challengers.** The model never hand-picks from its own slate. Run:

```
node <skill-dir>/scripts/seed.mjs --brief "<the brief, as the user wrote it>" --n 7
```

It prints a reproducible line (`draw: n/7 (seed <slug>·<date>·r0) · challengers: <a> · <b> · <c>`) and deals three challengers from `scripts/atlas.json`, one from each tier (a graphic system, an instrument language, an atmosphere world), each with a five-line system grammar and one named browser technique. Judge each against the drawn entry on exactly two axes, audience identification and product clarity, one written line per challenger ending in **wins** (it replaces the drawn entry), **competitive** or **declined**. A winning challenger supplies the form and its grammar; the product supplies every fact, name and claim; clarity wins every conflict. A losing challenger still donates: the strongest loser names the one discipline the drawn direction lacks, and the direction is raised to match (*raise: the mixing desk's per-function control colouring, on the pricing tiers*). Every custom run ships a winning challenger or one named raise. Re-roll only when the user asks (`--reroll 1`). Without Node: N = letter count of the brief mod 7, entry N + 1, printed so it is reproducible; skip challengers; stamp `seed: fallback-<letters>·<date>·r<n>`.

**R.5 The scene sentence.** One concrete sentence placing a real person at a real time and place with the product: *a subscriber in Vermont, 6:43 am in early January; the kettle just clicked off; one lamp on.* It decides surface lightness and light temperature before any palette work, and it is the scene sentence `craft.md` § 4 asks for before an enrichment; write it once.

**R.6 Colour posture.** Exactly one, with a one-line reason: Restrained (accent under 5%), Committed (one colour carries 30 to 60% through the field or paper tokens), Full palette (three or four named roles with jobs), Drenched (the surface is the colour). Declared in the stamp and the log; gate 23 reads it.

**R.7 The direction contract.** Five blocks, 150 words or fewer, as a comment directly below the stamp and critique line. The Picks block mirrors it and replaces its Theme row with **Direction** (the draw, the challengers, the raise) and **System** (palette, pairing, the catalog coordinates it cleared):

```
/* direction contract · seed <key>
 * THESIS: the one-sentence position this page takes.
 * OWN-WORLD: what makes it not-anyone's-page; the drawn direction, named.
 * STORY: the scene sentence.
 * FIRST-VIEWPORT: what the fold shows, concretely.
 * FORM: structure plus the one signature move a visitor would describe to a friend. */
```

If a block reads like a mood ("elegant, premium feel"), the direction is not decided yet. The stamp adds `theme: custom · direction: "<drawn>" · vibe: "<4 to 8 words>" · paper: oklch(…) · accent: oklch(…) · display: <face> · body: <face> · axes: <triple> · posture: <posture> · seed: <key> · challenger: <name> (<verdict or raise>) · contract: kept (5/5)`, the last field written only after the finish review confirms it; the log entry carries the same fields.

## Bespoke depth

The brief's structure itself is the ask and no catalog shape fits (a scroll-assembled poem, a ticket-shaped page). The ritual runs identically; the build may drop the shape catalog, the genre routing and the rotation (a one-off must still not clone a recent bespoke run). It keeps every gate, access and contrast, the font discipline, the OKLCH discipline, one orchestrated motion, the Picks block, the stamp and the log. Bespoke is more judgement, not less, and it is rare; reaching for it on a vanilla brief is over-reach.

## A. The vibe

Step 1 already asks for it, with an anchor colour if there is one, never in a second message. Two words are enough to proceed (*archival warmth, hand-set, no varnish*; *moss, lichen, soft pink, herbal*); a paragraph compresses to eight for the stamp.

## B. Palette construction

1. **Posture and scene set the frame.** The scene fixes the paper's lightness band and light temperature; the posture decides where large colour lives.
2. **Anchor accent first.** Convert the given anchor to OKLCH and clamp chroma to 0.12 to 0.20; a real brand's anchor comes from `.hallmark/brand-spec.md`, never memory. No anchor: derive the hue from the vibe (warmth 30 to 60°, technical 220 to 250°, botanical 130 to 160°, late-night neon 280 to 320°, sun-drenched 60 to 80°), chroma 0.12 to 0.16.
3. **Paper.** From the scene: bright and airy L 95 to 98 warm-tinted; archival L 92 to 95; clinical L 98 to 99 cool-tinted; dark and late-night L 12 to 18 anchor-tinted. Always tinted toward the anchor at chroma 0.005 to 0.020. Committed posture puts the carried colour in `--color-field`; Drenched makes paper the anchor at a usable lightness. Paper-2 steps 2 to 4% L, paper-3 5 to 7%.
4. **Ink.** Paper under 50% L: ink L 88 to 96; over: L 16 to 24; tinted 0.005 to 0.014. Ink-2 sits 4 to 8% L toward paper.
5. **Neutrals.** Rule (L 70 to 82 on light paper, 26 to 34 on dark), rule-2 closer to paper, muted (L 38 to 56), all tinted 0.005 to 0.018.
6. **Focus.** The accent's hue, chroma 0.18 to 0.22, L within 5% of the accent.
7. **Accent-ink.** Ink on an accent lighter than 50% L, paper on a darker one; verify 4.5:1.
8. **Texture** only on a print-lineage draw (riso, letterpress, ticket stock, line printer), one artifact from `texture.md` under its budget.
9. **Verify** against gates 7, 22, 23, 65: paper and ink both carry chroma, every grey is 0.005 or more, the accent has a stated role, and the triple is not cream, high-contrast serif and clay unless the brief pinned it.

## C. Font pairing

A derived system pulls from `fonts.md` and may mix tones (an editorial display over a technical body, a brutalist display over an editorial body). One display face, one body face, an optional outlier for one role. The display face is one no catalog theme sets (`theme.mjs check --face` refuses the ones in use). Free faces only unless the user confirms licences; the banned defaults stay banned; variable fonts preferred. The drawn direction should be audible in the pairing: a ledger wants tabular figures, a playbill wants wood-type energy. Labels take the body face, sentence case, untracked, unless mono is the world's material (64, 67); a head is one weight and one colour (38iii).

## D. Axes and posture

Declare the triple so Rotation reads it like a catalog theme's: paper band (dark under 30% L, mid 30 to 85, light over 85), display class (roman-serif, high-contrast-serif, slab-serif, grotesk-sans, grotesk-heavy, geometric-sans, rounded-sans, display-condensed, display-heavy, mono, pixel, handwritten, blackletter), accent band (warm 10 to 60°, cool 200 to 300°, neutral under 0.05 chroma, chromatic-<name>), plus the posture. Then:

```
node <skill-dir>/scripts/theme.mjs check --axes "light/roman-serif/cool" --face "Sentient" --hue 250 --log .hallmark/log.json
```

It refuses a triple a theme owns, a display face a theme sets, and an accent within 20 degrees of a theme that shares the paper band and display class. A collision with a catalog theme or a recent build is a failed reflex check, not a coincidence: move one axis, the one the brief cares least about (usually the accent, occasionally the paper, rarely the display), and say it happened in one line: *Landed on Cobalt's triple; moved accent to chromatic-moss ~145.* Two narrow exceptions: the user asked for that theme's feel (stamp `axes: <triple> (Cobalt, by request)`), or the draw genuinely demands the coordinate, argued in one line. Siblings built side by side in other projects count as occupied too.

## The finish review

Before the sweep, re-read the contract promise by promise: is THESIS still the page's position, is OWN-WORLD visible in the shipped surface or did the build drift back toward a spent default, is STORY's light still in the palette, is FIRST-VIEWPORT what the fold shows, is FORM's signature move present and load-bearing? Any unkept promise is a revision, not a ship. Then Step 7 runs as normal, and the fresh-context reviewer in `gates.md` § 6 gets the contract.

## What derivation does not do

It does not lower the floor (a derived page that trips a gate is broken, not expressive). It does not extend the catalog (the system is inline for this page). It does not invent facts (gate 46a binds hardest where a fresh world makes invented proof feel at home). It does not skip the draw (a stamp with no seed line is over-invented; audit it). It does not mean more decoration: a derived system is a tighter argument than a catalog theme, not a louder one.
