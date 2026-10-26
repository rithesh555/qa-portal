# Fonts

Loaded on a custom run. A catalog theme has already named its faces; do not read this to second-guess it.

**Needs before reading:** the drawn direction, the genre, and the tone word from Step 1. **Gives:** a display face, a body face, an optional outlier, and the load rules.

## The rule

One display face, one body face, an optional outlier that carries exactly one role (a wordmark, a headline figure, code). A custom run picks a display face no catalog theme sets: `node <skill-dir>/scripts/theme.mjs check --face "<face>"` refuses the ones in use, so run it before writing the token. The lists below already leave those faces out. Free faces only unless the user has confirmed a licence; variable fonts preferred; the drawn direction should be audible in the pairing (a ledger wants tabular figures, a playbill wants wood-type energy).

## Banned as a default

Every model reaches for these first, so they read as unchosen: Inter, Roboto, Open Sans, Lato, Poppins, Source Sans, Nunito, Montserrat, Raleway, Work Sans, DM Sans, Plus Jakarta Sans, system-ui, Arial and Helvetica as a display or body face; Merriweather, Lora and Georgia as the body serif; Courier New or the system mono. A page may still use one of them when the user asks for it or the pre-flight found it in the project; then the stamp says so.

**Saturated** (fine faces, but the first answer, so they want an argument in the Picks block): Playfair Display, Cormorant Garamond, DM Serif Display, Fraunces, Instrument Serif, Recoleta, Space Grotesk, Bebas Neue and Unbounded as display; Geist, Instrument Sans and Mona Sans as the body or the whole page.

## Sources

- **Google Fonts.** Free, served from a CDN, works everywhere. The default source.
- **Fontshare** (Indian Type Foundry). Free for commercial use, foundry grade. One line: `<link href="https://api.fontshare.com/v2/css?f[]=<family>@<weights>&display=swap" rel="stylesheet">`.
- **A foundry** (Klim, Pangram Pangram, Production Type, Lineto, Colophon) only when the user has confirmed the licence; then ask which and pick from it directly.

## Display faces the catalog does not use

| Class | Faces (source) |
| --- | --- |
| Roman serif | EB Garamond, Cardo, Castoro, Piazzolla, Alegreya, Marcellus (Google); Gambetta, Recia (Fontshare) |
| High-contrast serif | Gloock, Libre Bodoni, Abril Fatface, Rozha One, Besley (Google); Boska, Melodrama (Fontshare) |
| Slab serif | Arvo, Hepta Slab, Domine, Alfa Slab One, Solway (Google); Bespoke Slab (Fontshare; old-style figures that ignore `lining-nums`, so figures go in the body face) |
| Grotesk sans | Hubot Sans, Gabarito, Rethink Sans, Reddit Sans, Wix Madefor Display (Google); Cabinet Grotesk, Clash Grotesk, Supreme (Fontshare) |
| Geometric sans | Lexend, Geologica, League Spartan, Funnel Display, Afacad (Google); Satoshi, Ranade, Technor, Excon (Fontshare) |
| Rounded sans | Inclusive Sans, Nunito Sans at 700 only with an argument, Varela Round (Google); Chubbo, Comico (Fontshare) |
| Condensed and heavy | Teko, Tektur, Michroma, Antonio (Google); Clash Display, Panchang, Khand, Telma, Stardom, Array (Fontshare) |
| Mono as display | Martian Mono, Fragment Mono, Red Hat Mono, Spline Sans Mono, Sometype Mono (Google) |
| Pixel | Press Start 2P, VT323, Pixelify Sans, Tiny5, DotGothic16, Workbench (Google) |
| Handwritten | Shantell Sans, Caveat, Gochi Hand, Reenie Beanie (Google); Sharpie (Fontshare) |

## Body faces

A body face may be one the catalog uses; bodies are not a theme's signature. Sans: Hanken Grotesk, IBM Plex Sans, Figtree, Onest, Sofia Sans, Golos Text, Karla, Chivo, Albert Sans, Public Sans, Archivo, Manrope (Google); Switzer, General Sans, Satoshi (Fontshare). Serif: Newsreader, Source Serif 4, Literata, Spectral, Crimson Pro, EB Garamond, Piazzolla (Google); Sentient (Fontshare). Mono for code, figures and measurements: Geist Mono, JetBrains Mono, IBM Plex Mono, DM Mono, Fira Code, Azeret Mono, Chivo Mono, Overpass Mono (Google).

## Pairings by tone

Free faces, working out of the box. The display column lists faces no theme sets; take one, not a blend.

| Tone | Display | Body |
| --- | --- | --- |
| Editorial | Gambetta, Castoro, Gloock, Cabinet Grotesk | IBM Plex Sans, Switzer, Source Serif 4 |
| Technical | Martian Mono, Fragment Mono, Rethink Sans 700 | IBM Plex Sans, Switzer, Onest |
| Brutalist | Clash Display 700, Panchang, Alfa Slab One, Teko | Archivo, Switzer, Public Sans |
| Soft | Satoshi, Recia, Alegreya, Chubbo | Figtree, Crimson Pro, Onest |
| Luxury | Boska, Libre Bodoni, Marcellus, Gloock | EB Garamond, Crimson Pro, Source Serif 4 |
| Playful | Comico, Gabarito 800, Shantell Sans, Tiny5 | Onest, Karla, Satoshi |
| Austere | Geologica 300, Rethink Sans, Reddit Sans | Switzer, Hanken Grotesk, Public Sans |
| Atmospheric | Melodrama, Supreme 600, Piazzolla, Michroma | Sofia Sans, Sentient, Albert Sans |

## The wordmark

The wordmark in the nav and footer may take a different face from the body, and on tone-rich pages it should: collapsing it into the body family flattens the hierarchy and the page reads as un-branded. It is the outlier's one role when the page has no other:

```css
:root { --font-body: "Switzer", ui-sans-serif, system-ui, sans-serif; --font-outlier: "Gambetta", ui-serif, serif; }
.wordmark { font-family: var(--font-outlier); font-weight: 600; letter-spacing: -0.015em; }
```

Collapse to one family only when the body voice is the brand (a letter, a manifesto, a long document). A product page whose wordmark is the body face at 600 is the un-designed default.

## Loading

- Load only the weights the page uses, as one `<link>` per source, with `display=swap`; `<link rel="preconnect">` to the host first.
- `@font-face` for a self-hosted face carries `font-display: swap` and a metric-matched fallback (`size-adjust`, `ascent-override`, `descent-override`, `line-gap-override`) so the swap does not reflow the fold.
- Never synthesise bold or italic: `font-synthesis: none`, and load the italic if a head uses it.
- A variable font loads once and gives every weight; prefer it where the family ships one.
