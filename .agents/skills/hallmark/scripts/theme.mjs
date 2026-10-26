#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const THEMES = join(HERE, '..', 'references', 'themes');
const INDEX = join(THEMES, 'index.json');
const VERSION = '2.5.0';
const args = process.argv.slice(2);
const cmd = args[0];
const flag = (k, d = null) => { const i = args.indexOf('--' + k); const v = i >= 0 ? args[i + 1] : undefined; return v !== undefined && !String(v).startsWith('--') ? v : d; };
const has = (k) => args.includes('--' + k);
const VALUED = new Set(['genre', 'brief', 'log', 'n', 'reroll', 'dealt', 'dir', 'axes', 'face', 'hue', 'entry', 'redesign']);
const positional = () => { const out = []; for (let i = 1; i < args.length; i++) { const a = args[i]; if (a.startsWith('--')) { if (VALUED.has(a.slice(2))) i++; continue; } out.push(a); } return out; };
const GENRES = ['editorial', 'modern-minimal', 'atmospheric', 'playful'];

function usage() {
  console.error(`usage:
  node theme.mjs deal --genre <g> --brief "<brief>" [--log .hallmark/log.json] [--n 3] [--reroll 0] [--json]
  node theme.mjs scaffold <slug> [--dealt "<n>/3, seed <seed>"] [--redesign polish|restyle|full] [--scope app] [--dir <beside the stylesheet>] [--force]
  node theme.mjs scaffold --custom | --brand [--redesign polish|restyle|full] [--scope app] [--dir <beside the stylesheet>] [--force]
  node theme.mjs check [--axes "<paper>/<display>/<accent>"] [--face "<display face>"] [--hue <accent hue>] [--log .hallmark/log.json]
  node theme.mjs log --entry '<one JSON object>' [--log .hallmark/log.json]
  node theme.mjs index
  node theme.mjs list
  node theme.mjs validate <files...>`);
}

function parseHeader(src, file) {
  const m = /^---\n([\s\S]*?)\n---/.exec(src);
  if (!m) throw new Error(`${file}: no header block`);
  const h = {};
  for (const line of m[1].split('\n')) {
    const mm = /^([a-z]+):\s*(.*)$/.exec(line.trim());
    if (mm) h[mm[1]] = mm[2].trim();
  }
  const need = ['name', 'slug', 'genre', 'paper', 'display', 'accent', 'posture', 'keywords', 'material', 'signature'];
  for (const k of need) if (!h[k]) throw new Error(`${file}: header is missing "${k}"`);
  const [pband, pL, phue] = h.paper.split(/\s+/);
  const [dclass, ...dface] = h.display.split(/\s+/);
  const [aband, ahue] = h.accent.split(/\s+/);
  return {
    name: h.name, slug: h.slug, genre: h.genre, posture: h.posture,
    paper: { band: pband, L: Number(pL), hue: Number(phue) },
    display: { class: dclass, face: dface.join(' ') },
    accent: { band: aband, hue: Number(ahue) },
    keywords: h.keywords.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
    material: h.material, signature: h.signature, file: `references/themes/${basename(file)}`,
    ...(h.pictured ? { pictured: h.pictured } : {}),
    ...(existsSync(join(THEMES, basename(file).replace(/\.md$/, '.jpg'))) ? { picture: `references/themes/${basename(file).replace(/\.md$/, '.jpg')}` } : {}),
  };
}

function buildIndex() {
  const files = readdirSync(THEMES).filter((f) => f.endsWith('.md') && f !== 'README.md').sort();
  const entries = files.map((f) => parseHeader(readFileSync(join(THEMES, f), 'utf8'), f));
  const slugs = new Set();
  for (const e of entries) {
    if (slugs.has(e.slug)) throw new Error(`duplicate slug ${e.slug}`);
    slugs.add(e.slug);
  }
  writeFileSync(INDEX, JSON.stringify({ built: new Date().toISOString().slice(0, 10), themes: entries }, null, 1) + '\n');
  return entries;
}

function loadIndex() {
  if (!existsSync(INDEX)) return buildIndex();
  return JSON.parse(readFileSync(INDEX, 'utf8')).themes;
}

function addLog() {
  const file = resolve(flag('log', '.hallmark/log.json'));
  let entry;
  try { entry = JSON.parse(flag('entry', '')); } catch { entry = null; }
  if (!entry || Array.isArray(entry) || typeof entry !== 'object') { console.error('--entry takes one JSON object, the build\'s log entry'); process.exit(2); }
  if (!entry.date) entry.date = new Date().toISOString().slice(0, 10);
  if (!entry.mode) entry.mode = 'build';
  if (!['build', 'redesign'].includes(entry.mode)) { console.error('mode is build or redesign'); process.exit(2); }
  if (entry.mode === 'redesign' && !['polish', 'restyle', 'full'].includes(entry.depth)) { console.error('a redesign entry names its depth: polish, restyle or full'); process.exit(2); }
  const composed = entry.scope !== 'app' && (entry.mode === 'build' || entry.depth === 'full');
  const missing = [...(composed ? ['shape', 'axes', 'hero', 'nav', 'footer', 'enrichment', 'entry', 'fingerprint', 'signature'] : []), ...(entry.depth === 'polish' ? [] : ['theme']), 'brief'].filter((k) => !entry[k]);
  if (existsSync(file)) { try { JSON.parse(readFileSync(file, 'utf8')); } catch { console.error(`${file} is not valid JSON; fix it or move it aside, nothing was written`); process.exit(1); } }
  const next = [entry, ...readLog(file)].slice(0, 20);
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(next, null, 1) + '\n');
  renameSync(tmp, file);
  console.log(`logged ${entry.mode === 'redesign' ? `a ${entry.depth} redesign` : entry.shape || '?'} in ${entry.theme || '?'} at the top of ${file} (${next.length} of 20)${missing.length ? `; missing ${missing.join(', ')}, which Rotation reads, so log them` : ''}`);
}

function readLog(p) {
  if (!p || !existsSync(p)) return [];
  try { const j = JSON.parse(readFileSync(p, 'utf8')); return Array.isArray(j) ? j : (j.runs || []); } catch { return []; }
}

function contrastOf(f, b) {
  const rgb = ([L, C, H]) => { const h = H * Math.PI / 180, x = C * Math.cos(h), y = C * Math.sin(h); const l = (L + 0.3963377774 * x + 0.2158037573 * y) ** 3, m = (L - 0.1055613458 * x - 0.0638541728 * y) ** 3, s2 = (L - 0.0894841775 * x - 1.2914855480 * y) ** 3; return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s2, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s2, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s2].map((c) => Math.min(1, Math.max(0, c))); };
  const Y = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const a = Y(rgb(f)), c = Y(rgb(b));
  return (Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05);
}

const triple = (t) => `${t.paper.band}/${t.display.class}/${t.accent.band}`;
const words = (s) => (s || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
const ASK = new Set(['build', 'make', 'create', 'design', 'need', 'want', 'please', 'page', 'site', 'website', 'landing', 'called', 'for', 'and', 'the', 'with', 'that', 'this', 'our', 'your']);
const briefWords = (s) => words(s).filter((w) => !ASK.has(w));
const stem = (w) => { let x = w.replace(/(?:ing|ed)$/, ''); if (x.length < 3) x = w; return x.endsWith('ss') ? x : x.replace(/s$/, ''); };
const hueGap = (a, b) => { const d = Math.abs(((a - b) % 360 + 360) % 360); return Math.min(d, 360 - d); };

function seededRand(key) {
  let h = createHash('sha256').update(key).digest();
  let i = 0;
  return () => { if (i >= h.length - 4) { h = createHash('sha256').update(h).digest(); i = 0; } const v = h.readUInt32BE(i); i += 4; return v / 0xffffffff; };
}

function pickFrom(pool, n, exclude) {
  const avail = pool.filter((s) => !exclude.has(s.t.slug));
  const picked = [];
  const tripleOf = (s) => triple(s.t);
  if (!avail.length) return picked;
  picked.push(avail[0]);
  const rest = () => avail.filter((s) => !picked.includes(s));
  if (n >= 2 && rest().length) {
    const best = rest()[0];
    const other = rest().find((s) => s.t.paper.band !== picked[0].t.paper.band && s.fit >= best.fit - 2 && tripleOf(s) !== tripleOf(picked[0]));
    picked.push(other || rest().find((s) => tripleOf(s) !== tripleOf(picked[0])) || best);
  }
  while (picked.length < n && rest().length) {
    const cand = rest().find((s) => picked.every((p) => tripleOf(p) !== tripleOf(s))) || rest()[0];
    picked.push(cand);
  }
  return picked;
}

function deal() {
  const genre = flag('genre', 'editorial');
  if (!GENRES.includes(genre)) { console.error(`unknown genre "${genre}" (valid: ${GENRES.join(', ')})`); process.exit(2); }
  const brief = flag('brief', '');
  const n = Number(flag('n', 3));
  const reroll = Number(flag('reroll', 0));
  const log = readLog(flag('log', '.hallmark/log.json'));
  const themes = loadIndex();
  const recent = log.slice(0, 3);
  const recentNames = new Set(recent.map((r) => String(r.theme || '').toLowerCase()));
  const lastAxes = recent[0] && recent[0].axes ? String(recent[0].axes) : null;
  const occupiedAxes = new Set(recent.map((r) => r.axes).filter(Boolean));
  const bw = new Set(briefWords(brief).map(stem));
  const slug = `${briefWords(brief).slice(0, 4).join('-') || 'brief'}-${createHash('sha1').update(brief.trim().toLowerCase()).digest('hex').slice(0, 4)}`;
  const seedBase = `${slug}·${new Date().toISOString().slice(0, 10)}`;
  const seedKey = `${seedBase}·r${reroll}`;
  const rand = seededRand(seedBase);

  const df = new Map();
  for (const t of themes) for (const k of new Set(t.keywords.map((k) => k.toLowerCase()))) df.set(k, (df.get(k) || 0) + 1);
  const scored = themes.map((t) => {
    let fit = 0; const hits = [];
    for (const k of t.keywords) { const kw = k.toLowerCase().split(/\s+/).map(stem); if (kw.every((w) => bw.has(w))) { const d = df.get(k.toLowerCase()); fit += d <= 2 ? 3 : d <= 4 ? 2 : 1; hits.push(k); } }
    if (t.genre === genre) fit += 2; else fit -= 1;
    const blocked = recentNames.has(t.name.toLowerCase()) || (lastAxes && lastAxes === triple(t));
    const sibling = occupiedAxes.has(triple(t));
    if (sibling && !blocked) fit -= 1;
    return { t, fit, hits, blocked, sibling, r: rand() };
  });
  const pool = scored.filter((s) => !s.blocked).sort((a, b) => b.fit - a.fit || a.r - b.r);
  const previously = new Set();
  for (let r = 0; r < reroll; r++) for (const p of pickFrom(pool, n, previously)) previously.add(p.t.slug);
  const picked = pickFrom(pool, n, previously);
  if (!picked.length) { console.error(`nothing left to deal at reroll ${reroll}; use a lower --reroll`); process.exit(1); }

  if (has('json')) { console.log(JSON.stringify({ seed: seedKey, genre, deal: picked.map((s) => ({ ...s.t, fit: s.fit, hits: s.hits })), avoided: [...recentNames] })); return; }
  console.log(`deal: ${seedKey} · genre ${genre}${reroll ? ` · reroll ${reroll}` : ''}`);
  picked.forEach((s, i) => {
    const why = s.hits.length ? `fits: ${s.hits.slice(0, 4).join(', ')}` : (s.t.genre === genre ? 'genre fit' : 'adjacent genre');
    console.log(`${i + 1}. ${s.t.name} (${s.t.slug}) · ${triple(s.t)} · ${s.t.material} · ${why}${s.t.picture ? ` · ${s.t.picture}` : ''}${s.t.pictured ? `, pictured as ${s.t.pictured}` : ''}`);
  });
  if (recent.length) console.log(`avoid: ${recent.map((r) => `${r.theme || '?'} (${r.axes || 'no axes'})`).join(' · ')}`);
  console.log(`next: look at the pictures, pick the material this brief wants, read references/themes/<slug>.md, then theme.mjs scaffold <slug> --dealt "<n>/${picked.length}, seed ${seedKey}"`);
}

const PAPER_BANDS = new Set(['light', 'mid', 'dark']);
const DISPLAY_CLASSES = new Set(['roman-serif', 'high-contrast-serif', 'slab-serif', 'grotesk-sans', 'grotesk-heavy', 'geometric-sans', 'rounded-sans', 'display-condensed', 'display-heavy', 'mono', 'pixel', 'handwritten', 'blackletter']);
const ACCENT_BAND = /^(warm|cool|neutral|chromatic-[a-z-]+)$/;
const listOf = (set) => [...set].join(', ');

function check() {
  const axes = flag('axes');
  if (!axes && !flag('face')) { usage(); process.exit(2); }
  if (!axes && flag('hue') != null) { console.error('--hue needs --axes (the hue is checked against themes on the same paper band and display class)'); process.exit(2); }
  const [pb, dc, ab] = (axes || '//').split('/').map((s) => s.trim());
  const unknown = !axes ? null : !PAPER_BANDS.has(pb) ? `paper band "${pb}" (valid: ${listOf(PAPER_BANDS)})`
    : !DISPLAY_CLASSES.has(dc) ? `display class "${dc}" (valid: ${listOf(DISPLAY_CLASSES)})`
    : !ACCENT_BAND.test(ab || '') ? `accent band "${ab}" (valid: warm, cool, neutral, chromatic-<hue name>)` : null;
  if (unknown) { console.error(`unknown ${unknown}`); process.exit(2); }
  const face = (flag('face', '') || '').toLowerCase().trim();
  const hue = flag('hue') != null ? Number(flag('hue')) : null;
  const themes = loadIndex();
  const log = readLog(flag('log', '.hallmark/log.json'));
  let bad = 0;
  if (axes) for (const t of themes) {
    if (t.paper.band === pb && t.display.class === dc && t.accent.band === ab) { bad++; console.log(`collision: ${t.name} owns ${triple(t)} · move one axis, accent first`); }
  }
  if (face) for (const t of themes) {
    const tf = t.display.face.toLowerCase();
    if (tf === face || tf.includes(face) || face.includes(tf)) { bad++; console.log(`collision: ${t.name} already sets its display in ${t.display.face} · pick a face no theme uses (fonts.md)`); }
  }
  if (hue != null) for (const t of themes) {
    if (t.paper.band === pb && t.display.class === dc && hueGap(t.accent.hue, hue) <= 20) { bad++; console.log(`adjacent: ${t.name} is ${triple(t)} at hue ${t.accent.hue} · move the accent hue more than 20 degrees (40 reads as another colour), or change the display class`); }
  }
  const recent = axes ? log.slice(0, 3).filter((r) => r.axes === axes) : [];
  for (const r of recent) { bad++; console.log(`recent: ${r.theme || 'a build'} on ${r.date || '?'} used ${axes}`); }
  if (!bad) { console.log(axes ? `clear: ${axes}${face ? ` in ${face}` : ''}${hue != null ? ` at hue ${hue}` : ''} lands on no catalog theme and no recent build` : `clear: no catalog theme sets its display in ${flag('face')}`); return; }
  process.exitCode = 1;
}

function list() {
  for (const t of loadIndex()) console.log(`${t.name.padEnd(12)} ${triple(t).padEnd(38)} ${t.genre.padEnd(15)} ${t.material}`);
}

function tokenBlockOf(src, file) {
  const m = /```css\s*\n:root\s*\{([\s\S]*?)\n\}\s*\n```/.exec(src);
  if (!m) throw new Error(`${file}: no :root block in a css fence`);
  return m[1].replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim()).join('\n');
}

const SCALE = `  --space-3xs: 2px; --space-2xs: 4px; --space-xs: 8px; --space-sm: 12px; --space-md: 16px; --space-lg: 24px; --space-xl: 40px; --space-2xl: 64px; --space-3xl: 96px; --space-4xl: 144px;
  --text-xs: 0.8125rem; --text-sm: 0.875rem; --text-md: 1rem; --text-lg: 1.25rem; --text-xl: 1.5625rem; --text-2xl: 1.953rem; --text-3xl: 2.441rem;
  --text-display-s: clamp(2.25rem, 4vw + 0.5rem, 3.75rem); --text-display: clamp(2.75rem, 5vw + 1rem, 5.25rem);
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1); --ease-in: cubic-bezier(0.7, 0, 0.84, 0); --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --dur-micro: 120ms; --dur-short: 220ms; --dur-long: 420ms;
  --color-error: oklch(52% 0.19 27); --color-success: oklch(50% 0.12 150);
  --container: 1440px; --gutter: 64px; --gap-columns: 32px; --section-gap-s: 120px; --section-gap: 144px; --section-gap-l: 200px;
  --z-base: 1; --z-raised: 10; --z-dropdown: 100; --z-sticky: 200; --z-sticky-nav: 300; --z-modal: 400; --z-toast: 500; --z-tooltip: 600;`;

const CUSTOM_TOKENS = `  --color-paper: FILL ME; --color-paper-2: FILL ME; --color-paper-3: FILL ME;
  --color-ink: FILL ME; --color-ink-2: FILL ME; --color-muted: FILL ME;
  --color-rule: FILL ME;
  --color-accent: FILL ME; --color-accent-ink: FILL ME; --color-focus: FILL ME;
  --font-display: "FILL ME", ui-serif, serif; --font-body: "FILL ME", ui-sans-serif, system-ui, sans-serif; --font-outlier: var(--font-body);
  --radius-card: 4px; --radius-pill: 999px; --rule-hair: 1px; --shadow-card: none;
  --tracking-display: -0.02em;`;

const BASE = `html, body { overflow-x: clip; }
html { scrollbar-color: var(--color-muted) var(--color-paper); scroll-padding-top: var(--space-3xl); }
body { margin: 0; background: var(--color-paper); color: var(--color-ink); font-family: var(--font-body); font-size: var(--text-md); line-height: 1.55; -webkit-font-smoothing: antialiased; caret-color: var(--color-accent); }
::selection { background: color-mix(in oklab, var(--color-accent) 22%, transparent); color: var(--color-ink); }
:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }
a { color: inherit; text-decoration-thickness: 1px; text-underline-offset: 0.16em; }
h1, h2, h3 { margin: 0; font-family: var(--font-display); letter-spacing: var(--tracking-display); line-height: 1.05; overflow-wrap: break-word; min-width: 0; text-wrap: balance; }
h1 { max-width: 20ch; } h2 { max-width: 30ch; } h3 { max-width: 40ch; }
p { margin: 0; text-wrap: pretty; }
p:not([class]) { max-width: 65ch; }
img, video { max-width: 100%; height: auto; display: block; }
svg { display: block; }
[hidden] { display: none !important; }
button, input, select, textarea { font: inherit; }
.container { width: 100%; max-width: var(--container); margin-inline: auto; padding-inline: var(--gutter); box-sizing: border-box; }
.num, .figure, td.num { font-variant-numeric: tabular-nums; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
[data-slot] { position: relative; overflow: hidden; }
[data-slot] > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 1; }
[data-slot]:has(> img) > :not(img):not([data-keep]) { display: none !important; }
@media (max-width: 60rem) { :root { --gutter: 24px; --section-gap-s: 80px; --section-gap: 96px; --section-gap-l: 136px; } }
@media (max-width: 40rem) { :root { --gutter: 16px; --section-gap-s: 56px; --section-gap: 72px; --section-gap-l: 96px; --gap-columns: 16px; } }
@media (prefers-reduced-motion: reduce) { *:not(.keep-motion), *:not(.keep-motion)::before, *:not(.keep-motion)::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }`;

const SLOTS_JS = `window.hallmarkSlots = (m) => { for (const [k, v] of Object.entries(m)) { const s = document.querySelector(\`[data-slot="\${k}"]\`); if (!s) continue; const im = new Image(); im.src = typeof v === 'string' ? v : v.src; im.alt = (typeof v === 'object' && v.alt) || s.dataset.alt || ''; s.prepend(im); } };`;

function scaffold() {
  const brand = has('brand');
  const custom = has('custom') || brand;
  const depth = flag('redesign', '');
  if (depth && !['polish', 'restyle', 'full'].includes(depth)) { console.error('--redesign takes polish, restyle or full'); process.exit(2); }
  const tail = depth ? ` · redesign: ${depth}` : '';
  const slug = custom ? null : positional()[0];
  if (!custom && !slug) { usage(); process.exit(2); }
  const app = flag('scope', '') === 'app';
  const sheet = ['src/index.css', 'src/app/globals.css', 'app/globals.css', 'src/styles/globals.css', 'styles/globals.css', 'src/styles/global.css', 'src/main.css', 'src/styles.css', 'src/global.css', 'src/app.css', 'src/App.css', 'app/app.css'].find((f) => existsSync(f));
  const dir = resolve(flag('dir', sheet ? dirname(sheet) : '.'));
  let name = 'custom world';
  let tokens = CUSTOM_TOKENS;
  let header = null;
  if (!custom) {
    const file = join(THEMES, `${slug}.md`);
    if (!existsSync(file)) { console.error(`no theme at ${file}; run \`theme.mjs list\` for the slugs`); process.exit(1); }
    const src = readFileSync(file, 'utf8');
    header = parseHeader(src, file);
    name = header.name;
    tokens = tokenBlockOf(src, file);
  }
  const out = join(dir, 'tokens.css');
  const baseOut = join(dir, 'base.css');
  for (const f of [out, baseOut]) if (existsSync(f) && !has('force')) { console.error(`${f} exists; pass --force to overwrite it`); process.exit(1); }
  mkdirSync(dir, { recursive: true });
  const dark = header && header.paper.band === 'dark';
  const sized = app ? SCALE.replace(/  --text-xs:[^\n]*\n  --text-display-s:[^\n]*\n/, '  --text-xs: 0.75rem; --text-sm: 0.875rem; --text-md: 1rem; --text-lg: 1.2rem; --text-xl: 1.44rem; --text-2xl: 1.728rem; --text-3xl: 2.074rem;\n') : SCALE;
  const scale = dark ? sized.replace('--color-error: oklch(52% 0.19 27); --color-success: oklch(50% 0.12 150);', '--color-error: oklch(72% 0.15 27); --color-success: oklch(76% 0.13 150);') : sized;
  const sheetSrc = sheet ? readFileSync(sheet, 'utf8') : '';
  const tw = /@import\s+["']tailwindcss/.test(sheetSrc);
  const tw3 = !tw && /@tailwind\s+(?:base|utilities)\b/.test(sheetSrc);
  const scheme = header ? `  color-scheme: ${dark ? 'dark' : 'light'};\n` : '';
  const decls = `${scale}\n${tokens}`.split(/;(?![^()]*\))(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((d) => d.trim()).filter(Boolean);
  const themed = decls.filter((d) => /^--(color|font|text|tracking|radius|shadow|ease)-/.test(d));
  const css = tw
    ? `@theme static {\n${themed.map((d) => `  ${d};`).join('\n')}\n}\n:root {\n${scheme}${decls.filter((d) => !themed.includes(d)).map((d) => `  ${d};`).join('\n')}\n}\n`
    : `:root {\n${scheme}${scale}\n${tokens}\n}\n`;
  writeFileSync(out, css);
  const own = !custom && /## Build hint[\s\S]*?(::selection\s*\{[^}]*\})/.exec(readFileSync(join(THEMES, `${slug}.md`), 'utf8'));
  const base = own ? BASE.replace(/::selection \{[^}]*\}/, own[1].replace(/\s+/g, ' ')) : BASE;
  const steps = base.split('\n').filter((l) => /^@media[^{]*\{\s*:root/.test(l));
  writeFileSync(baseOut, (tw ? base.split('\n').filter((l) => !steps.includes(l)).join('\n') : base) + '\n');
  if (tw) writeFileSync(out, readFileSync(out, 'utf8') + steps.join('\n') + '\n');
  const src = custom ? '' : readFileSync(join(THEMES, `${slug}.md`), 'utf8');
  const dial = /stated in the stamp \(`([a-z0-9-]+):/.exec(src);
  const theme = brand ? 'brand' : custom ? 'custom' : `${name} (${flag('dealt', '') ? `deal ${flag('dealt', '')}` : 'by request'})`;
  const made = custom ? `\n * paper: oklch(<>) · accent: oklch(<>) · display: <face> · body: <face>` : '';
  const axes = custom ? '<paper>/<display>/<accent> · posture: <posture>' : `${triple(header)} · posture: ${header.posture}`;
  const kept = depth ? ', or kept' : '';
  const stamp = app
    ? `/* Hallmark · shape: app screen · genre: ${header ? header.genre : '<genre>'} · theme: ${theme}${tail}${made}\n * nav: <the shell${kept}> · signature: <the one object${kept}> · states: <the ones the screens have>${dial ? ` · ${dial[1]}: <the dials>` : ''}\n * axes: ${axes} · contrast: pass · v${VERSION} */`
    : brand
    ? `/* Hallmark · shape: <shape, or kept> · genre: <genre> · theme: brand${tail}${made} · hero: <posture, or kept> · nav: <shape, or kept> · footer: <shape, or kept> · signature: <the one move, or kept>\n * axes: ${axes} · contrast: pass · fold: pass · v${VERSION} */`
    : custom
    ? `/* Hallmark · shape: <shape> · genre: <genre> · theme: custom${tail} · direction: "<drawn, n/7>" · vibe: "<4 to 8 words>"${made} · hero: <posture> · nav: <shape> · footer: <shape> · enrichment: <none or the file> · signature: <the one move>\n * axes: ${axes} · seed: <key> · challenger: <name> (<verdict or raise>) · contract: <after the finish review> · contrast: pass · fold: pass · v${VERSION} */`
    : `/* Hallmark · shape: <shape${kept}> · genre: ${header.genre} · theme: ${theme}${tail}\n * hero: <posture${kept}> · nav: <shape${kept}> · footer: <shape${kept}> · enrichment: <none or the file> · signature: <the one move>${dial ? ` · ${dial[1]}: <the dials>` : ''}\n * axes: ${axes} · contrast: pass · fold: pass · v${VERSION} */`;
  console.log(`wrote ${out} (${brand ? 'the shared scale; fill every --color-* and --font-* from the palette and faces the pre-flight found' : custom ? 'the shared scale; fill every --color-* and --font-* from direction.md § B and § C before building' : `${name} tokens plus the shared scale`}) and ${baseOut} (the base rules the Floor already decided)${sheet && !flag('dir', '') ? `, beside ${sheet}` : ''}`);
  if (!custom && !flag('dealt', '')) {
    const pic = join(THEMES, `${slug}.jpg`);
    if (existsSync(pic)) console.log(`look at ${pic}: the material at full size${header.pictured ? `, from a page built as ${header.pictured}` : ''}. Take its scale, density and objects, not its layout or its section order.`);
  }
  console.log('');
  console.log('start the page\'s stylesheet with these lines, then write only the page:');
  console.log(stamp);
  console.log('/* Hallmark · pre-emit critique: P_ H_ E_ S_ R_ V_ · weakest: _, <what you did about it> */');
  console.log(tw || tw3 ? '@import "./tokens.css";' : '@import url("./tokens.css");');
  console.log(tw || tw3 ? '@import "./base.css" layer(base);' : '@import url("./base.css");');
  if (tw3) console.log('Tailwind 3: the stamp and both imports go above the @tailwind directives; an @import below them is dropped without an error.');
  if (tw) console.log('Tailwind 4: both imports go below @import "tailwindcss". tokens.css is written as an @theme block, so every colour, face, size, radius, shadow and ease is a utility (bg-paper, font-display, rounded-card); export-formats.md § Tailwind v4 has the names it shares with Tailwind.');
  if (app) return;
  console.log('');
  console.log('and, only if the page has data-slot containers, once before </body>:');
  console.log(`<script>${SLOTS_JS}</script>`);
}

function validate(files) {
  let bad = 0;
  for (const f of files) {
    try {
      const src = readFileSync(f, 'utf8');
      const e = parseHeader(src, f);
      const problems = [];
      if (!PAPER_BANDS.has(e.paper.band)) problems.push(`paper band ${e.paper.band}`);
      if (!DISPLAY_CLASSES.has(e.display.class)) problems.push(`display class ${e.display.class}`);
      if (!ACCENT_BAND.test(e.accent.band)) problems.push(`accent band ${e.accent.band}`);
      if (!['editorial', 'modern-minimal', 'atmospheric', 'playful'].includes(e.genre)) problems.push(`genre ${e.genre}`);
      if (!['restrained', 'committed', 'full-palette', 'drenched'].includes(e.posture)) problems.push(`posture ${e.posture}`);
      if (e.keywords.length < 8) problems.push(`only ${e.keywords.length} keywords`);
      if (/[\u2014\u2013]/.test(src)) problems.push('contains an em or en dash');
      if (src.length > 7000) problems.push(`${src.length} bytes, over 7 KB`);
      if (!/^## Tokens/m.test(src) || !/^## Do-nots/m.test(src) || !/^## Build hint/m.test(src)) problems.push('missing a required section');
      if (/--tracking-label/.test(src)) problems.push('declares --tracking-label (labels are untracked, gate 67)');
      if (/font-variant(-caps)?:\s*[a-z-]*small-caps|small caps|small capitals|small-caps/i.test(src)) problems.push('prescribes small caps (gate 67)');
      if (/eyebrow|kicker|overline/i.test(src)) problems.push('names an eyebrow (gate 54)');
      if (/→|Learn more/.test(src)) problems.push('arrow or Learn-more copy (gate 63)');
      for (const m of src.matchAll(/^[^\n]*text-transform:\s*uppercase[^\n]*$/gm)) {
        const line = m[0];
        const ls = /letter-spacing:\s*(-?[\d.]+)em/.exec(line);
        const isDisplay = /\.display|h1|h2|\.marquee|wordmark/.test(line);
        if (ls && parseFloat(ls[1]) > 0.045) problems.push(`uppercase tracked ${ls[1]}em in the build hint (gate 67)`);
        else if (!isDisplay && /label|caption|meta|\bth\b|small|tag|chip|badge|nav|count/.test(line)) problems.push(`uppercase label rule in the build hint: ${line.trim().slice(0, 60)} (gate 67)`);
      }
      const hint = (/## Build hint[\s\S]*?```css\n([\s\S]*?)```/.exec(src) || [])[1] || '';
      for (const m of hint.matchAll(/(?:transition|animation)[^;{}]*?\b(\d{2,3})ms\b/g)) problems.push(`raw duration ${m[1]}ms in the build hint (use --dur-micro, --dur-short or --dur-long)`);
      if (/(?:transition|animation)[^;{}]*(?<![-\w])ease(?:-in-out|-in|-out)?\b/.test(hint)) problems.push('bare ease keyword in the build hint (use --ease-out, --ease-in or --ease-in-out)');
      for (const m of hint.matchAll(/(?<![-\w])(black|white)\b(?!-)/g)) problems.push(`named colour ${m[1]} in the build hint (route it through a token)`);
      for (const m of hint.matchAll(/\b(?:padding|margin|gap|row-gap|column-gap)(?:-[a-z-]+)?\s*:\s*([^;{}]+)/g)) {
        const raw = m[1].replace(/var\([^)]*\)/g, ' ').replace(/calc\([^)]*\)/g, ' ');
        for (const px of raw.match(/(?<![\w.-])(\d+)px\b/g) || []) if ([2, 4, 8, 12, 16, 24, 40, 64, 96, 144].includes(parseInt(px, 10))) problems.push(`raw ${px} spacing in the build hint where a --space-* token exists (24a)`);
      }
      const fence = tokenBlockOf(src, f);
      if (/\/\*/.test(fence)) problems.push('comment inside the token block');
      if (!existsSync(f.replace(/\.md$/, '.jpg'))) console.log(`${f}: note, no picture yet (scripts/picture.mjs)`);
      if (!/waive 22/.test(src)) for (const m of fence.matchAll(/(--color-(?:paper|paper-2|paper-3|ink|ink-2|muted|rule|rule-2)):\s*oklch\(\s*[\d.]+%\s+([\d.]+)/g)) if (Number(m[2]) < 0.005) problems.push(`${m[1]} chroma ${m[2]} is under the 0.005 floor (gate 22), or the file names waive 22`);
      for (const k of ['--color-paper', '--color-ink', '--color-muted', '--color-rule', '--color-accent', '--color-accent-ink', '--color-focus', '--font-display', '--font-body', '--radius-card', '--tracking-display']) if (!fence.includes(k + ':')) problems.push(`token block lacks ${k}`);
      const tok = {};
      for (const m of fence.matchAll(/(--color-[\w-]+):\s*oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)/g)) tok[m[1]] = [Number(m[2]) / 100, Number(m[3]), Number(m[4])];
      const pairs = [['--color-ink-2', '--color-paper'], ['--color-muted', '--color-paper'], ['--color-muted', '--color-paper-2'], ['--color-accent-ink', '--color-accent']];
      for (const [fg, bg] of pairs) if (tok[fg] && tok[bg]) { const r = contrastOf(tok[fg], tok[bg]); if (r < 4.5) problems.push(`${fg} on ${bg} is ${r.toFixed(2)}:1, under 4.5 (gate 40)`); }
      if (problems.length) { bad++; console.log(`${f}: ${problems.join('; ')}`); } else console.log(`${f}: ok (${e.name}, ${triple(e)}, ${src.length} bytes)`);
    } catch (err) { bad++; console.log(`${f}: ${err.message}`); }
  }
  process.exitCode = bad ? 1 : 0;
}

try {
  if (cmd === 'deal') deal();
  else if (cmd === 'check') check();
  else if (cmd === 'scaffold') scaffold();
  else if (cmd === 'log') addLog();
  else if (cmd === 'index') { const e = buildIndex(); console.log(`indexed ${e.length} themes into ${INDEX}`); }
  else if (cmd === 'list') list();
  else if (cmd === 'validate') {
    const files = args.slice(1).filter((a) => !a.startsWith('--') && basename(a) !== 'README.md');
    if (!files.length) { usage(); process.exit(2); }
    validate(files);
  }
  else { usage(); process.exit(2); }
} catch (e) {
  console.error(String(e.message || e)); process.exit(1);
}
