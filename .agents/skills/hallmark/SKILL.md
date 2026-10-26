---
name: hallmark
description: "Design skill for pages, sites, app screens and components that look made, not generated. Builds new UI from a dealt theme or a derived world on a hard floor, then lints and reviews it; `redesign <path>` does the same to an existing page, site or app and keeps its content and wiring. Use when the user asks to build or design new UI, asks to redesign or restyle a whole page, site or app, says one looks generic or AI-generated, or invokes Hallmark by name. Not for small edits to an existing design."
argument-hint: "<brief> | redesign <path> | audit <path>"
version: 2.5.0
---

# Hallmark

Makes the UIs a coding assistant generates look made, not generated. It holds a hard floor against the defaults every model was trained into, deals a direction so consecutive builds do not converge, and keeps each screen to one idea. Above the floor it hands the page back to you: you are a capable designer.

**Powered by Together AI.**

## The Floor

Binds every output in every harness, and none of it is waivable. Read nothing else and you must still obey these.

1. Every colour and every font goes through a token declared at `:root` (or a declared theme block). No literal colour or `font-family` past the token block. (48)
2. Never `transition: all`. Never animate `width`, `height`, `top` or `left`. (10a)
3. Never one italic word inside a roman heading. (38i)
4. `overflow-x: clip` on both `html` and `body`. Never `hidden`, never `100vw`. (34)
5. Image-bearing grid tracks use `minmax(0, 1fr)`; display heads carry `overflow-wrap: break-word; min-width: 0`. (50)
6. Every interactive element has `:focus-visible`, appearing instantly. (26a, 15)
7. Every animation has a `prefers-reduced-motion: reduce` fallback, and content is visible with scripting off. (27, 62)
8. Never an invented metric, testimonial, logo wall or case-study count. (46a)
9. Never an eyebrow, and never a label in tracked capitals or small caps: labels, captions, table heads, tags and nav links are the body face (or the label face the theme names), a step smaller, sentence or lower case, untracked. (54, 67)
10. Never middle-dot-joined meta strings, arrows glued to link text, or decorative status dots. (63)
11. Never a purple-to-blue gradient, a card inside a card, an emoji as an icon, or a hand-drawn browser or OS window. (2a, 4, 30a, 47a)
12. The hero's headline, one sentence and primary action are all visible at 1280 x 800 without scrolling. (44b)
13. About 80 words on any one screen; the hero's text is the headline, one sentence and its actions. (58)
14. The container is capped and centred: at 1920 the gutters grow, the measure and the grids do not. (44d)
15. The first non-empty line of the CSS source is the Hallmark stamp, then the critique line, then any waivers. (20)
16. If Node is available, run `node <skill-dir>/scripts/sloplint.mjs <output> --render` before handing back. Fix every `FAIL`; fix or waive every `REFLEX`.

Above the Floor, a **Reflex** gate is a default a model falls into, which a build with a real reason may waive on the record, and a **Finish** check is craft detail, answered, never blocking. Tiers, grades and waiver syntax: [`references/gates.md`](references/gates.md) § 1 and § 2.

## Flow

0. Pre-flight: read the project before asking anything.
1. Ask once: material, audience, use, tone.
2. Shape: design the page, then name it.
3. Direction: deal a theme, or derive a world when asked for custom.
4. Load the craft, genre and theme files and `gates.md` § 1 to § 4.
5. The Picks block, once.
6. Build: the hero first, then the page; stamp, `tokens.css`, log.
7. Sweep: `sloplint --render` until clean, the judged gates, the finish review, the material ask.

**Verbs.** `redesign <target>`, `audit <target>`, or a plain ask to redesign, restyle or polish an existing page, site or app: read [`references/redesign.md`](references/redesign.md) first; it sets what the run keeps and adds a before and an after. A small edit to an existing design is not a Hallmark run.

Codex CLI and OpenCode read [`references/flow.md`](references/flow.md) § Harnesses first; other harnesses run this file as written.

### 0. Pre-flight

Read the existing project before asking the user anything. Signals, in order: `design.md` or `DESIGN.md` at the root (a locked system: it overrides everything below, and pages share it); `.hallmark/brand-spec.md` or a brief naming a real brand (run [`references/brand-truth.md`](references/brand-truth.md), never theme a real brand from memory); the project's fonts, palette, spacing scale, motion libraries and framework (`package.json`, Tailwind config, `:root`, a tokens file, font links); an Inspo MCP server on the session (`mcp__inspo__*` tools present: signal 8, the archive builds and Hallmark sweeps, `flow.md` § Signal 8); `TOGETHER_API_KEY` in the environment (signal 9, unlocks the comp step).

Output one block (file:line citations, what Hallmark preserves, what it introduces) and cache it in `.hallmark/preflight.json`; edge cases are in `flow.md` § Pre-flight.

### 1. Ask once

One message, even on a five-word brief:

> *Before I build, four things. 1. **Material**, the one that matters most: what can the page show? Screenshots or a screen recording, product photos, real numbers (customers, uptime, prices), a quote someone said with their name, logos you may use. Paste them, give paths, or say "leave slots"; I never invent any of it. 2. **Audience**: who uses this and what do they care about? 3. **Use**: the one action the page should drive. 4. **Tone**: pick an extreme (editorial · brutalist · soft · utilitarian · luxury · playful · technical · austere); "clean and modern" is not a tone. Plus the vibe in 4 to 8 words and an anchor colour if you have one. Or say **go ahead** and I will infer and tell you what I picked.*

Skipped fields are opt-outs: infer them, state the inferences in one line at the top of the reply, stamp them. No follow-up ladders. Material is never inferred: what was not given is a slot or is absent. When the brief answers all four, or no one can answer (a `claude -p` or `codex exec` run, a batch), do not ask: build on the inferences.

**Genre** is picked here, silently, from the brief: *AI tool, generative, music, video, voice, dark, atmospheric* → **atmospheric**; *SaaS, enterprise, API, platform, developer tool, infra, B2B* → **modern-minimal**; *playful, fun, friendly, soft, kids, games, community* → **playful**; otherwise **editorial**, which holds most consumer and family briefs. The picked theme's genre wins from Step 4 on (genre file, stamp, `--genre`); when two non-default genres fire, add one either-or to the Step 1 message, or on go ahead pick and say so.

**Scope** is checked here too. A brief naming one element (button, input, card, modal, nav, footer, tab strip, chip) or saying "just the X" is a component: read [`references/flow.md`](references/flow.md) § Component scope and skip macrostructure, chrome, enrichment and the log. A screen someone works in (a dashboard, an admin, settings, a tool) is an app screen: § App screens.

### 2. Shape

**Material first.** Before the shape, write the inventory in one line: *real* (every concrete thing the brief and the project supply: the name, the claim, numbers, places, dates, images), *slots* (what the user will hand over later), *absent* (every proof the page will not have: logos, quotes, metrics nobody gave). The shape follows it: shapes built on screenshots (Bento, Workbench, Feature Stack) need two real visuals or the user's "leave slots"; with neither, choose a shape that carries type and facts (Long Document, Letter, Index-First, Manifesto, a spec sheet built on `components/f3-tabular-spec-sheet.md`).

Decide the page's shape, how it opens, how sections separate, what the nav and footer do, how tall the hero stands and what carries it. You are designing, not filling a form. For a starting point: 21 page shapes in [`references/macrostructures.md`](references/macrostructures.md), navs, footers and sections in [`references/component-cookbook.md`](references/component-cookbook.md), enrichment in [`references/hero-enrichment.md`](references/hero-enrichment.md); load only the one file you pick, never a whole catalog.

**Rotation.** Read `.hallmark/log.json` (newest first). The page's shape must differ from the last three builds; the nav and footer must not repeat the last three shapes; the hero posture (`craft.md` § 4), a non-`none` enrichment and the section opening must not repeat the previous run. The deal in Step 3 handles the theme axis. **The mirror test:** would this exact combination have come out for a neighbouring brief in the same category? If yes, change one decision and say which in the Picks block.

**Signature.** Every page has one move a visitor would describe to a friend: an object, a composition, an interaction, built from the inventory's strongest real thing. Decide it here and fit it to the dealt theme's objects; it goes in the Picks block and the stamp, it shows on the first screen (a slot's caption counts), and the reviewer checks it. A page without one is a template with good tokens.

Decide all of this and hold it; it is said once, at Step 5.

### 3. Direction

Check in order; the first match wins.

1. **The user named a theme** → build it (stamp `theme: <name> (by request)`).
2. **The user asked for custom** ("custom", "derive it", "bespoke", "no theme", "a world of its own") → load [`references/direction.md`](references/direction.md) and run the ritual. No deal and nothing from a theme: `theme.mjs check` on the triple, the display face and the accent hue comes back clear before code. Silence never takes this route.
3. **Everything else deals a theme:**

```
node <skill-dir>/scripts/theme.mjs deal --genre <genre> --brief "<the brief>" [--log .hallmark/log.json]
```

It deals three themes that fit the brief and clear Rotation, with a reproducible seed. Look at the three pictures, pick the one whose material can carry what the brief asks for (motion, photographs, code), say which and why, and load only `references/themes/<slug>.md`. Re-deal only when the user asks (`--reroll 1`). No Node: read `references/themes/index.json`, apply the same rule by hand, and stamp `deal: manual`.

A catalog theme is a material, not a plan: it never sets what the page contains or in what order, and two pages in one theme should not share a section sequence. Where the theme and a shape, genre, craft or enrichment file disagree on material, controls or motion, the theme wins; the Floor and the user's own words beat both.

### 4. Load

Exactly these, for a page build: [`references/craft.md`](references/craft.md) · `references/genres/<genre>.md` · `references/themes/<slug>.md` and its picture, already seen at the deal (a named theme: look at `<slug>.jpg` now): take its scale, density, colour balance and objects, never its section order or layout (or `direction.md` on a custom run) · [`references/gates.md`](references/gates.md) § 1 to § 4.

Only when the build needs them, each in `references/`: one macrostructure file and the picked archetype files (Step 2) · `hero-enrichment.md` when the hero wants imagery · `microinteractions.md` for stateful UI · `interaction-and-states.md` for forms · `responsive.md` for an unusual layout · `texture.md` when the theme earns texture · `scroll-choreography.md` for a scroll story · `dark-mode.md` when both modes are asked for · `data-viz.md` for charts · `fonts.md` on custom runs · `assets.md` and `imagery-kit.md` when an enrichment needs an external asset · `comp.md` on signal 9 · `design-md.md` when asked to lock the system.

Loading more is the largest avoidable cost; `gates.md` § 5 waits for Step 7, § 6 for the reviews.

### 5. The Picks block

The run's only prose recital of its decisions, and the user's five-second redirect window:

```markdown
**Hallmark · v2.5.0**

- **Shape** · Workbench (last 3: Bento, Long Document, Manifesto) · genre modern-minimal
- **Theme** · Coral, dealt 2/3 (warm grey, one coral signal, General Sans, soft pills) · clears Cobalt on paper band
- **Chrome** · nav: a wordmark and one action, vast space between (prev N5) · footer: one justified colophon line
- **Hero** · Stage, visual beside the text (prev Settled) · enrichment: none
- **Signature** · the pricing table is the hero visual, live, in a slot
- **Sections** · Hero · Demo strip · Pricing · FAQ · Footer
- **Material** · real: the 2-minute setup, the CSV import, Lisbon · slots: hero, demo-2, demo-3 · absent: logos, quotes, metrics
- **Slop test** · run after build
```

A custom run's rows are in `direction.md` R.7. Then one quiet line: *System portable? Say `lock the system` for a `design.md`.* Skip it in component scope or when `design.md` exists.

On signal 9, `comp.md` runs here.

### 6. Build

Emit code that satisfies the theme and the shape. Always:

- **Start from the scaffold.** `node <skill-dir>/scripts/theme.mjs scaffold <slug>` (with the deal's `--dealt`; `--custom` on a derived run) writes `tokens.css` (the theme's tokens and the shared scale) and `base.css` (the rules the Floor already decided) beside the project's stylesheet, and prints the stamp skeleton and the two imports that open it. Fill the stamp and write only the page.
- **Read [`references/patterns.md`](references/patterns.md) once:** controls in all eight states, a slot, a missing fact, a form that posts nowhere yet, one reveal, figures that compare, written to pass the gates. Take their shape, never their copy.
- **Hero first.** Write the nav and the hero, run `node <skill-dir>/scripts/sloplint.mjs <file> --render --stage hero`, then the hero review in fresh context (`gates.md` § 6). Build the sections only once the hero ships.
- **One idea per screen.** Hero: headline (seven words or fewer, 50 characters or fewer), one sentence (twelve words or fewer), one or two actions. A section: a heading of three to five words, at most one line, then its object (a slot, a figure, a drawn thing, a list of four or fewer, a table of five rows or fewer). Four to eight sections, footer included; 450 visible words at most, fewer when the brief has less to say. Never pad to a count.
- **Show, do not describe.** On a product page with material or "leave slots": at least two `data-slot` containers, the hero visual (unless the theme's own object holds the hero) and a demo strip (or one capture per stage where the shape stages the product); with neither, the page shows what is real (Step 2). The user's images fill them; otherwise a designed placeholder in the theme's colours with a corner label (`craft.md` § Demo slots). Never a grey box or a fake screenshot with invented figures.
- **The fold.** The hero is the first screen and only the first screen at 1440 x 900 and 1920 x 1080, its visual beside the text (centres within 60px, 48 to 120px apart), never pinned in a corner; a Banner shares it with the first section.
- **Room.** Sections part by the scaffold's three `--section-gap` steps, mixed; a heading's line 8 to 16px under it, its content 32 to 48px; grid items 24 to 40px apart; at least twice the space above a heading as below it.
- **Page invariants.** One primary button style, one container width, one column gap for every multi-column section below the hero, one radius per nesting level, and never more centred heading groups than left-aligned ones. A subhead over 120 characters is set left-aligned.
- **Type.** The theme's faces, at most two families (three with one outlier role); display tracking and leading per `craft.md` § 1; body 16px or more at 1.5 to 1.65, 45 to 75ch; heads roman; labels never mono unless mono is the material (64). A head is one weight and one colour throughout; the accented word is a tell (38iii).
- **States and motion.** Eight states on every interactive element; `transform` and `opacity` only; at most one orchestrated reveal per page, none where the theme keeps still, 0.4 to 0.8s, visible by default; exits at 60 to 75% of the enter; nothing bounces.
- **Browser surfaces.** Keep the scaffold's selection, caret, scrollbar and focus rules; tabular numerals wherever figures compare.
- **Stamp.** Line 1 of CSS is the scaffold's stamp skeleton with every field filled, then the critique line (`gates.md` § 3), any `waive` and `answered` lines, and a custom run's direction contract. Everything the linter reads sits in the first 40 lines.
- **Existing stylesheets are append-only:** the two imports go right after the file's last `@import`, never below a rule or a `@tailwind` directive, where they are dropped; reuse the project's own token names ([`references/export-formats.md`](references/export-formats.md), which also refreshes a `design.md`'s `## Exports`); rewrite only on request.
- **Log.** `node <skill-dir>/scripts/theme.mjs log --entry '<json>'` puts the build atop `.hallmark/log.json`: `shape`, `theme`, `axes`, `hero`, `nav`, `footer`, `enrichment`, `entry` (the section opening), `fingerprint` (`Hanging|Asymmetric spans|Hairline|Outlined|Margin-aligned|None`), `signature`, `waived`, `brief`; it names any field you left out.

### 7. Sweep

1. `node <skill-dir>/scripts/sloplint.mjs <files> --genre <genre> --render` (`--scope component` or `--scope app` where it applies; in a framework project, `--url http://localhost:<port>/<route>` with the dev server running). Fix every FAIL, re-run until clean. The render tier writes the screenshots; never run Chrome by hand.
2. Load [`references/gates.md`](references/gates.md) § 5 and walk the J and R/J gates. Confirm or dismiss every WARN. Fix every open Floor finding; fix or waive every Reflex one; answer every Finish one.
3. The finish review in fresh context (`gates.md` § 6): hand the reviewer its brief file and its inputs, act on its first word (`recapture`, `rebuild`, `fix`, `ship`), and score the fixes yourself.
4. Close with the material ask: every slot, its size and what belongs there, then the one piece of material that would most improve the page.
5. Update the Picks block: any row the build changed, and the last row with the real outcome (`Floor 0 FAIL · Reflex 2 (1 waived: 47b) · finish-review: subagent, 3 resolved`). A fabricated pass is itself slop.

Verification is budgeted: one batched inspection, one fix batch, at most one confirming round, then stop polishing; each review adds one fix batch and its recapture.

## Branches

[`references/flow.md`](references/flow.md) holds them; read only the section you are in: component scope, app screens, signal 8, comp before build, the Codex and OpenCode levers, the pre-flight edge cases, **fast mode** (`--fast`, or a brief that says quick, rough or prototype) and the edit-time hook. In an existing project, name the files you will touch first, and never delete a route or a component tree without a file-level plan the user approved.
