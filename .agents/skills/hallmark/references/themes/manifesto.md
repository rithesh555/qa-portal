---
name: Manifesto
slug: manifesto
genre: editorial
paper: dark 10 60
display: display-condensed Anton
accent: warm 28
posture: committed
keywords: manifesto, statement, declaration, principles, beliefs, mission, movement, protest, cause, campaign, activism, advocacy, values, take a stand, bold launch, defiant, punk, record label
material: warm charcoal, condensed uppercase caps at 9rem leaded tight, a quiet grotesque body, one fighting red
signature: a three-line block of condensed caps locked into one solid mass against the left margin, with a single red word in it
pictured: Manifesto, Ledge hero
---

# Manifesto

A warm near-black ground, Anton uppercase up to 9rem leaded at 0.92 and slammed to the left margin, a Public Sans body at 1rem, and one red word inside the hero block. The whole drama is the gap between 9rem caps and 1rem body.

## Tokens

```css
:root {
  --color-paper: oklch(10% 0.005 60); --color-paper-2: oklch(15% 0.006 60); --color-paper-3: oklch(20% 0.007 60);
  --color-ink: oklch(98% 0.005 90); --color-ink-2: oklch(88% 0.006 80); --color-muted: oklch(60% 0.012 65);
  --color-rule: oklch(28% 0.010 60);
  --color-accent: oklch(56% 0.23 28); --color-accent-text: oklch(62% 0.23 28); --color-accent-ink: oklch(98% 0.003 90);
  --color-focus: oklch(56% 0.23 28);
  --font-display: "Anton", "Impact", sans-serif; --font-body: "Public Sans", ui-sans-serif, system-ui, sans-serif;
  --font-outlier: "JetBrains Mono", ui-monospace, monospace;
  --radius-card: 0; --radius-pill: 0; --rule-hair: 1px; --rule-bar: 3px; --shadow-card: none;
  --tracking-display: 0; --lh-tight: 0.92; --text-display: clamp(4rem, 8vw + 1rem, 9rem);
}
```

## Faces

- **Display:** Anton 400, one weight, uppercase only, at `--text-display`, leaded at `--lh-tight` so a three-line block locks into one mass, slammed left; each line is its own element that never wraps (`white-space: nowrap`, stamp `waive 55b`), because Anton's capitals touch below 0.92; any other head that can wrap leads at 1.02 (55a). One red word on the whole page, inside the hero block, in `--color-accent-text`: the signature (stamp `waive 38iii`). Every other head is one colour.
- **Body:** Public Sans 400 and 600, set small and plain at a 56ch measure in `--color-ink-2`.
- **Labels, captions, table heads, meta, dates, folios:** Public Sans 500 one step smaller, sentence case, `--color-muted`. Mono appears only inside code.

## Material

- Hairlines divide, one thick red bar accents: `--rule-hair` in `--color-rule` separates like a printed broadsheet; a single `--rule-bar` red bar is the emphatic mark. Rules do the structural work: no boxed cards, no drop shadows.
- Square, ruler-drawn controls: a flat red block with `--color-accent-ink` text beside a hairline-outlined block that inverts to red on hover. No pills, no soft radii, no gradients.
- One red, under 5% of a viewport, and at most one red-inverted surface on the whole page; everywhere else red is a signal. Text on red is always the light ink.
- Everything warm-tinted (hue 60 to 90), never neutral grey; no texture, no ornament. Scale and red carry the page.
- The object family is the declaration block: a numbered list of claims, a locked display mass over a hairline, a red bar under a date.

## Motion

One clip reveal: the hero block clip-reveals upward once (`clip-path: inset()`, never a soft fade) over `--dur-long`. Nothing else moves; no bounce, no parallax, no red pulsing.

## Voice

Imperative, short, declarative: fighting words, verbs over adjectives, one red word. No hedging; state it and stand behind it.

## Do-nots

- Never a second accent; red is the only colour.
- Never a red flood beyond the single inverted surface; red is a signal, not a background.
- Never a light ground; the sheet stays dark.
- Never ornament: no fleurons, stickers, hard-offset shadows or tinted-paper tricks.
- Never a serif, lowercase or title-case display; the voice is uppercase and declarative.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Public+Sans:wght@400;500;600&display=swap" rel="stylesheet">
```

```css
body { font-family: var(--font-body); color: var(--color-ink-2); }
.display { font: 400 var(--text-display)/var(--lh-tight) var(--font-display); text-transform: uppercase;
  letter-spacing: var(--tracking-display); color: var(--color-ink); }
.display > span { display: block; white-space: nowrap; }
.display .hot { color: var(--color-accent-text); }
.rule-red { height: var(--rule-bar); background: var(--color-accent); border: 0; }
.btn--primary { border-radius: 0; background: var(--color-accent); color: var(--color-accent-ink); font-weight: 600; }
.btn--secondary { border-radius: 0; border: var(--rule-hair) solid var(--color-ink-2); color: var(--color-ink); font-weight: 600; }
.reveal { animation: wipe var(--dur-long) var(--ease-out) both; }
@keyframes wipe { from { clip-path: inset(100% 0 0 0); } to { clip-path: inset(0); } }
::selection { background: var(--color-accent); color: var(--color-accent-ink); }
```
