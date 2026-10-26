---
name: Bloom
slug: bloom
genre: atmospheric
paper: light 97 72
display: grotesk-sans Figtree
accent: warm 35
posture: committed
keywords: generative, ai creative, music, song, video, image, voice, art, make, create, compose, render, imagine, prompt, creative studio, playground, expressive, warm, daylight, consumer creative, portrait, headshot, selfie, retouch
material: warm off-white paper under two terracotta blooms, Figtree throughout, one roman Gambarino line, raised warm cards
signature: warm light on light paper, a plain sans headline with one serif sentence beneath it, the made thing on a raised warm card
pictured: Narrative Workflow, Stage hero
---

# Bloom

Warm off-white paper under two fixed terracotta blooms, Figtree throughout with one roman Gambarino line, the made thing on a raised warm card. The signature is a plain sans headline with one serif sentence beneath it.

## Tokens

```css
:root {
  --color-paper: oklch(97% 0.010 72); --color-paper-2: oklch(94.5% 0.012 70); --color-paper-3: oklch(91% 0.014 68);
  --color-ink: oklch(20% 0.022 40); --color-ink-2: oklch(30% 0.022 46); --color-muted: oklch(50% 0.018 58);
  --color-rule: oklch(88% 0.012 65);
  --color-accent: oklch(54% 0.13 35); --color-accent-2: oklch(64% 0.09 55);
  --color-accent-ink: oklch(98% 0.010 72); --color-focus: oklch(54% 0.13 35);
  --font-display: "Figtree", ui-sans-serif, system-ui, sans-serif; --font-body: var(--font-display);
  --font-outlier: "Gambarino", Georgia, serif;
  --font-code: "Geist Mono", ui-monospace, monospace;
  --radius-card: 14px; --radius-pill: 999px; --rule-hair: 1px; --shadow-card: 0 6px 20px oklch(20% 0.022 40 / 0.10);
  --tracking-display: -0.022em; --display-weight: 600;
}
```

## Faces

- **Display:** Figtree at `--display-weight`, 600 by default within 500 to 700, one weight for every head; `--tracking-display`, line-height 1.06, up to 5.75rem, roman. Plain-English, never decorative.
- **Body:** Figtree 400 and 500.
- **The serif gesture:** Gambarino, roman, once: a lede sentence, a pulled line or a large numeral. Never the H1, never italic.
- **Labels, captions, tags, meta:** Figtree 500 one step smaller, sentence case, in `--color-muted`. Geist Mono appears only inside code and on figures that compare (a duration column); it never sets a tag or a caption.

## Material

- Two warm blooms and no more, fixed and static: `--color-accent` top-right at about 10% alpha, `--color-accent-2` bottom-left at about 7%, each 25 to 40% of the viewport. Sunlight on paper, the genre's light-paper exception; the whole canvas treatment.
- Elevated warm surfaces, not hairlines: `--color-paper-2` and `--color-paper-3` over `--shadow-card` (a warm ink shadow with offset and blur) and a `--color-rule` edge; depth is that step and that shadow.
- Soft pills on controls, 14px on surfaces. The control pair: a terracotta-filled pill with `--color-accent-ink` text beside a hairline-outlined pill in ink. The accent stays under 8% of any viewport: that pill, links, small tags.
- The object family is the studio card: the made thing (a waveform, a frame, a canvas) on a raised warm surface, drawn in CSS and SVG, lit by the bloom. Every neutral carries a warm cast, hue 40 to 72. No texture and no glass, except a speck grain at 0.03 inside the bloom layer alone, which keeps the blooms from banding into rings at 1920.

## Motion

One settle: the studio card fades in once over `--dur-long` on `--ease-out`, or one line types in once and stays; never both. Hover deepens the shadow of a card that links, and nothing else moves. The blooms never move; no slide, no bounce, no parallax.

## Voice

Warm, daylight, expressive, specific: say the verb (make, hum, describe) and say the output (song, scene, image).

## Do-nots

- Never a dark canvas; the paper stays at L 97.
- Never cool paper or a cool accent; warm throughout.
- Never an accent flood; a large terracotta field reads as a warning colour.
- Never a hard-edged or drifting bloom. Soft, low alpha, fixed.
- Never an italic serif line, and never the serif in the headline.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400..700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
<link href="https://api.fontshare.com/v2/css?f[]=gambarino@400&display=swap" rel="stylesheet">
```

```css
body { background: var(--color-paper); color: var(--color-ink-2); font-family: var(--font-body); }
body::before { content: ""; position: fixed; inset: 0; z-index: -1; pointer-events: none;
  background: radial-gradient(42% 38% at 72% 16%, color-mix(in oklab, var(--color-accent) 10%, transparent), transparent 70%),
              radial-gradient(46% 40% at 18% 90%, color-mix(in oklab, var(--color-accent-2) 7%, transparent), transparent 72%); }
.display { font: var(--display-weight) clamp(2.75rem, 6vw + 1rem, 5.75rem)/1.06 var(--font-display); letter-spacing: var(--tracking-display); color: var(--color-ink); }
.lede--serif { font: 400 var(--text-xl)/1.35 var(--font-outlier); font-style: normal; }
.card { background: var(--color-paper-2); border: var(--rule-hair) solid var(--color-rule); border-radius: var(--radius-card); box-shadow: var(--shadow-card); }
.btn--primary { background: var(--color-accent); color: var(--color-accent-ink); border-radius: var(--radius-pill); }
::selection { background: color-mix(in oklab, var(--color-accent) 25%, transparent); }
```
