---
name: Ledger
slug: ledger
genre: modern-minimal
paper: dark 20 255
display: grotesk-sans Instrument Sans
accent: chromatic-teal 185
posture: committed
keywords: treasury, banking, fintech, payments, reconciliation, ledger, accounting, close, audit, balance, cash management, payouts, settlement, compliance, controller, bookkeeping, invoicing, payroll
material: a ruled navy sheet with money columns, tabular mono on every figure, two inks with one job each, totals footed under a double rule
signature: a column of mono figures closing on a total under a double rule, with an as-of line beneath it
pictured: Workbench, Settled hero
---

# Ledger

A navy sheet that carries its own ruling, figures in tabular IBM Plex Mono, two inks with one job each (credit and debit), and totals footed under a double rule with an as-of line beneath. A page of a book, never a console of widgets.

## Tokens

```css
:root {
  --color-paper: oklch(20% 0.025 255); --color-paper-2: oklch(24% 0.025 255); --color-paper-3: oklch(22.5% 0.025 255);
  --color-ink: oklch(93% 0.008 255); --color-ink-2: oklch(84% 0.010 255); --color-muted: oklch(66% 0.012 255);
  --color-rule: oklch(32% 0.020 255);
  --color-accent: oklch(78% 0.12 185); --color-accent-2: oklch(76% 0.115 82); --color-accent-ink: oklch(20% 0.025 255);
  --color-focus: oklch(78% 0.12 185);
  --font-display: "Instrument Sans", ui-sans-serif, system-ui, sans-serif; --font-body: var(--font-display);
  --font-outlier: "IBM Plex Mono", ui-monospace, monospace;
  --radius-card: 10px; --radius-input: 6px; --radius-pill: 0; --rule-hair: 1px;
  --shadow-card: 0 12px 32px -16px oklch(8% 0.02 255 / 0.6);
  --tracking-display: -0.02em;
}
```

Three dials, each stated in the stamp (`ledger: navy/teal-brass/banded`); two Ledger pages in one run differ on at least two of them.

| Dial | Options |
| --- | --- |
| **Binding** (the ground; every neutral carries its hue) | `navy` (default): `oklch(20% 0.025 255)`. `bordeaux`: `oklch(19% 0.032 15)`. `cloth`: `oklch(19% 0.024 168)` |
| **Inks** (credit, then debit) | `teal-brass` (default): `oklch(78% 0.12 185)` and `oklch(76% 0.115 82)`. `sage-clay`: `oklch(76% 0.10 150)` and `oklch(72% 0.11 45)`. `ice-oxide`: `oklch(82% 0.085 215)` and `oklch(64% 0.14 38)`. Both inks sit at least 40 degrees of hue from the binding, so bordeaux takes teal-brass only and cloth takes ice-oxide only |
| **Ruling** (the sheet) | `banded` (default): row bands in `--color-paper-3` at 28 to 34px. `columnar`: 1px vertical money columns the full height of a band. `journal`: a two-page spread with a gutter rule, left page narrating, right page tabulating |

Credit is money in: it takes the headline figure and the one solid button. Debit is money out: set on the figure itself, never on a background. Debits are never red; a figure with no side takes `--color-ink`; a third meaning uses a label, not a hue.

## Faces

- **Display:** Instrument Sans 600, `--tracking-display`. No thin weight.
- **Body:** Instrument Sans 400 and 500 at 1.0625rem, line-height 1.55.
- **Figures:** IBM Plex Mono 400 and 500 with `tabular-nums` on every number; a column head is mono only over a column of figures, and the body face over a column of words (64), 12px, sentence case, untracked. Mono is this theme's material; columns align digit for digit. The headline figure is mono 500 at `clamp(2.4rem, 6vw, 3.6rem)` in its side's ink.
- **Captions, field labels, status words, meta:** Instrument Sans 500 one step smaller, sentence case, `--color-muted`.

## Material

- The sheet is ruled, and the ruling is the theme: it never brightens, never animates, never carries chroma.
- Every figure foots and carries an as-of: columns sum to their totals and balances state their moment. A figure without a date is an assertion, not a record.
- The foot: a 1px rule above the total, the total, then a double rule (two 1px rules 3px apart). The kit: the T-account, the statement extract as a real `<table>` with right-aligned amounts, one credit-ink sparkline with no axes, a status column, and a rotated outline stamp in one ink. A stamp carries a fact, a date or a frame number, or does not appear.
- Rows, never tiles: repeated data is a ruled table; a row lifts one paper step on hover only when the whole row is a link (11). At most one chart, and it is the sparkline.
- Depth: 1px `--color-rule` on every edge, raised paper on `--color-paper-2` under one deep offset shadow. Radii 10px and 6px, never a pill.
- The control pair: one solid credit-ink button at 6px with `--color-accent-ink` text beside a hairline-outlined one in `--color-rule`.

## Motion

Near-still, the way a printed page behaves: linked rows shift one paper step on hover; buttons dip 1px on active; a dot that marks a live feed, once per page, holds still. Nothing counts up, nothing reveals, nothing pulses.

## Voice

Declarative, numeric, audited: the figure, the folio, the lock time, what is not yet reconciled.

## Do-nots

- Never a dashboard: no KPI card grids, no widget walls; never a proportional numeral on a figure.
- Never a red debit and never a third hue; two inks, two jobs.
- Never a total that does not foot.
- Never a pill, and never hide the ruling; deleting it as scaffolding removes the theme.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
```

```css
.ruled { background-image: repeating-linear-gradient(to bottom, transparent 0 31px, var(--color-paper-3) 31px 62px); }
.fig { font-family: var(--font-outlier); font-variant-numeric: tabular-nums; }
th { font-size: 12px; font-weight: 500; color: var(--color-muted); }
.cr { color: var(--color-accent); } .dr { color: var(--color-accent-2); }
.total { border-top: 1px solid var(--color-rule); }
.foot::after { content: ""; display: block; height: 3px; border-top: 1px solid var(--color-ink); border-bottom: 1px solid var(--color-ink); }
.btn--primary { border-radius: var(--radius-input); background: var(--color-accent); color: var(--color-accent-ink); }
::selection { background: color-mix(in oklab, var(--color-accent) 30%, transparent); }
```
