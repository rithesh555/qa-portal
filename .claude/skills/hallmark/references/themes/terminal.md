---
name: Terminal
slug: terminal
genre: atmospheric
paper: dark 11 145
display: mono JetBrains Mono
accent: chromatic-green 138
posture: committed
keywords: cli, terminal, shell, command-line, tui, self-hosted, open-source, binary, ssh, sysadmin, devops, homelab, install script, package manager, repl, retro, phosphor, hacker
material: green-black ground, phosphor-green ink on one hue, every glyph JetBrains Mono, box-drawn chrome, square corners
signature: a typed command with its prompt and a block caret, framed in box-drawing rules on one green hue
pictured: Long Document set as a man page, Stage hero
---

# Terminal

A green-black ground, phosphor-green ink on one hue, every glyph JetBrains Mono, square corners, and a typed command with its prompt and block caret framed in box-drawing rules typed as characters. The page is a terminal surface, not a page that shows a screenshot of one.

## Tokens

```css
:root {
  --color-paper: oklch(11% 0.018 145); --color-paper-2: oklch(15% 0.020 145); --color-paper-3: oklch(19% 0.022 145);
  --color-ink: oklch(86% 0.160 138); --color-ink-2: oklch(78% 0.140 138); --color-muted: oklch(60% 0.090 140);
  --color-rule: oklch(28% 0.030 140);
  --color-accent: oklch(78% 0.190 138); --color-accent-ink: oklch(11% 0.018 145); --color-focus: oklch(78% 0.19 138);
  --font-display: "JetBrains Mono", ui-monospace, monospace; --font-body: var(--font-display);
  --font-outlier: var(--font-display);
  --radius-card: 0; --radius-pill: 0; --rule-hair: 1px;
  --shadow-card: none;
  --tracking-display: 0.01em; --display-weight: 500;
}
```

## Faces

- **Every glyph is JetBrains Mono:** display 500 up to 4rem, body 400, bold 700, tabular figures. Mono is the material here, gate 64 waived: no proportional face exists on the page, not even a friendlier body.
- **Labels, captions, table heads, meta, exit codes, units:** the same mono one step smaller, sentence case, `--color-muted`.
- **The prompt is the grammar:** a `$`, `>` or `~/` prefix marks genuine commands or destinations (a nav item, an inline command, a path). The block caret lives only at the end of a typed command, never on a heading or floating alone.

## Material

- One hue, top to bottom: everything sits on hue 138 to 145, and hierarchy comes from the lightness ramp. The two brightest greens are reserved for the active prompt, the caret, a status chip and one emphasised word in running text, never inside a heading.
- Depth by lightness: the three paper steps stack; a raised block is one paper step up, never a floating window with a shadow. No phosphor bloom, no scanline, no vignette: the CRT is implied by hue and mono, never drawn.
- Zero radius everywhere; the hard edge is the bezel.
- Rules are TUI chrome: 1px `--color-rule` borders as terminal furniture, box-drawing dividers typed as characters, a prompt line, a path line; never a title bar, never traffic lights. The control pair: an accent-filled block with `--color-accent-ink` text beside one bordered in `--color-ink-2`, both square.
- The object family: the session. A command block with a typed command and its output under a prompt line, a man-page block, an install one-liner, a status table with exit codes. No emoji, no colour icons.

## Motion

One live command may type itself once; only then does its caret blink at the end of that line, 1s `step-end`, five times, then hold solid. Nothing else moves: no reveals, no fades.

## Voice

Commands, flags, paths and exit codes. Declarative, terse, specific: name the command, the flag, the code, never the adjective.

## Do-nots

- Never a second hue: no warm bloom, no cyan, no amber.
- Never a proportional face, not even one paragraph.
- Never a rounded corner, a pill or a soft card.
- Never a light section; dark end to end.
- Never the CRT costume: no scanlines, no glow, no bezel, no title bar, no caret hung above a heading.

## Build hint

```html
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
```

```css
body { font-family: var(--font-body); font-variant-numeric: tabular-nums; }
.display { font: var(--display-weight) min(var(--text-display), 4rem)/1.1 var(--font-display); letter-spacing: var(--tracking-display); }
.block { background: var(--color-paper-2); border: 1px solid var(--color-rule); border-radius: 0; }
.block--raised { background: var(--color-paper-3); }
.prompt::before { content: "~/ "; color: var(--color-muted); }
.cmd::before { content: "$ "; color: var(--color-muted); }
.cmd.is-live::after { content: "\2588"; color: var(--color-accent); animation: caret 1s step-end 5; }
@keyframes caret { 50% { opacity: 0; } }
.btn { border-radius: 0; padding: var(--space-md); font: 500 0.9375rem/1 var(--font-body); }
.btn--primary { background: var(--color-accent); color: var(--color-accent-ink); }
.btn--secondary { border: 1px solid var(--color-ink-2); color: var(--color-ink); }
::selection { background: color-mix(in oklab, var(--color-accent) 35%, transparent); color: var(--color-ink); }
```
