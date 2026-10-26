---
name: Cobalt
slug: cobalt
genre: modern-minimal
paper: light 98.5 250
display: grotesk-sans Familjen Grotesk
accent: cool 256
posture: restrained
keywords: api, sdk, cli, dev tool, developer platform, docs, documentation, infrastructure, backend, database, observability, webhooks, type-safe, open source, ship, deploy, developer experience, technical
material: cool engineered near-white, hairlines instead of boxes, Familjen Grotesk over IBM Plex Sans, a graphite code surface in JetBrains Mono, one electric cobalt signal
signature: a graphite request and response pair under a filename caption, with one cobalt syntax token, hairline-framed on cool white
pictured: Map / Diagram, Settled hero
---

# Cobalt

Cool near-white paper ruled with hairlines, Familjen Grotesk heads over IBM Plex Sans, a graphite code surface in JetBrains Mono, one electric cobalt signal. The signature is a graphite request and response pair under a real filename caption, with one cobalt syntax token.

## Tokens

```css
:root {
  --color-paper: oklch(98.5% 0.005 250); --color-paper-2: oklch(96% 0.006 250); --color-paper-3: oklch(93% 0.008 250);
  --color-ink: oklch(24% 0.020 258); --color-ink-2: oklch(34% 0.018 257); --color-muted: oklch(50% 0.015 256);
  --color-rule: oklch(90% 0.008 250); --color-rule-2: oklch(84% 0.010 250);
  --color-graphite: oklch(22% 0.016 260); --color-graphite-ink: oklch(92% 0.010 250);
  --color-accent: oklch(51% 0.20 256); --color-accent-2: oklch(72% 0.16 256); --color-accent-ink: oklch(98.5% 0.005 250); --color-focus: oklch(51% 0.20 256);
  --font-display: "Familjen Grotesk", system-ui, sans-serif; --font-body: "IBM Plex Sans", system-ui, sans-serif;
  --font-outlier: "JetBrains Mono", ui-monospace, monospace;
  --radius-card: 10px; --radius-input: 6px; --radius-pill: 999px;
  --rule-hair: 1px; --shadow-card: 0 1px 2px oklch(24% 0.02 258 / 0.05);
  --tracking-display: -0.02em;
}
```

## Faces

- **Display:** Familjen Grotesk 500 and 600, `--tracking-display`, roman. Flared terminals keep it from reading as a default grotesk.
- **Body:** IBM Plex Sans 400 and 500, body only.
- **Labels, captions, table heads, status, meta:** Familjen Grotesk 500 one step smaller, sentence case, in `--color-muted`, the theme's label face. Never mono.
- **Code register:** JetBrains Mono 400 and 500, lowercase, for code blocks, commands, the request and response object, and syntax tokens. Mono is this theme's material only there, because the content is code; never a label, a head or a chip.

## Material

- Hairlines do the work: 1px `--color-rule` defines every surface. No boxed cards; `--shadow-card` is the only lift and it is barely there. No texture, no gradient text; every neutral tilts to hue 250 to 260.
- One cobalt signal under 5% of any viewport: a hover underline, the primary button, a status chip, a syntax token. On graphite the token is `--color-accent-2`, the lighter cobalt.
- Tight technical radii, 6px on controls and 10px on surfaces. The control pair: a solid cobalt 6px button with `--color-accent-ink` text beside a hairline-outlined 6px button in ink.
- Graphite is the dark material: `--color-graphite` with `--color-graphite-ink` text, as the code surface or as one full-bleed band giving the page a light-dark-light rhythm. The code surface carries a real filename line as a `<figcaption>` and no bar above it; no traffic lights, no tabs, no chrome.
- The object family is that code surface and its request and response pair.

## Motion

One settle: the code surface fades in once over `--dur-long` on `--ease-out`, or one line of the demo types in once and stays; never both. Hover grows a cobalt underline on a link and shifts a hairline to cobalt on a focusable surface. No bounce, no parallax.

## Voice

Declarative, technical, specific: name the endpoint, the command, the number. No hype adjectives.

## Do-nots

- Never a warm accent; the signal is cobalt at hue 256.
- Never a pill or gradient button; one solid cobalt button at 6px plus typographic links.
- Never a floating pill nav; chrome stays as flat as every other surface.
- Never fake code; a snippet compiles, resolves or returns, and an invented endpoint is the theme's worst failure. A brief with no endpoint still gets the pair: its own command or call as written, against `example.com`, with the field names it gives and sample values.
- Never a second dark beat; two graphite bands turn the light theme into a striped one.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@500;600&family=IBM+Plex+Sans:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

```css
body { background: var(--color-paper); color: var(--color-ink-2); font-family: var(--font-body); }
h1, h2, .display { font-family: var(--font-display); font-weight: 600; letter-spacing: var(--tracking-display); color: var(--color-ink); }
.graphite { background: var(--color-graphite); color: var(--color-graphite-ink); border: var(--rule-hair) solid var(--color-rule-2); border-radius: var(--radius-card); box-shadow: var(--shadow-card); }
.graphite figcaption { font: 500 var(--text-xs)/1.4 var(--font-display); color: var(--color-graphite-ink); padding: var(--space-xs) var(--space-md); border-bottom: var(--rule-hair) solid var(--color-rule-2); }
.code { font: 400 var(--text-sm)/1.6 var(--font-outlier); } .code .token { color: var(--color-accent-2); }
.btn--primary { background: var(--color-accent); color: var(--color-accent-ink); border-radius: var(--radius-input); }
::selection { background: color-mix(in oklab, var(--color-accent) 22%, transparent); }
```
