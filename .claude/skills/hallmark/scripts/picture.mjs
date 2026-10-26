#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const THEMES = join(HERE, '..', 'references', 'themes');
const [slug, pageArg, yArg] = process.argv.slice(2);
if (!slug || !pageArg) {
  console.error('usage: node picture.mjs <theme slug> <page index.html> [y of the lower screen at 1440x900]');
  process.exit(2);
}
const page = resolve(pageArg);
const themeFile = join(THEMES, `${slug}.md`);
if (!existsSync(themeFile)) { console.error(`no theme at ${themeFile}`); process.exit(1); }
if (!existsSync(page)) { console.error(`no page at ${page}`); process.exit(1); }

let puppeteer = null;
const roots = [process.env.HALLMARK_PUPPETEER, process.cwd(), HERE].filter(Boolean);
try { const { execSync } = await import('node:child_process'); roots.push(dirname(execSync('npm root -g', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim())); } catch {}
for (const root of roots) {
  for (const name of ['puppeteer-core', 'puppeteer']) {
    try { puppeteer = (await import(pathToFileURL(createRequire(join(root, 'noop.js')).resolve(name)).href)).default; } catch {}
    if (puppeteer) break;
  }
  if (puppeteer) break;
}
if (!puppeteer) { console.error('picture.mjs needs puppeteer-core or puppeteer (local, global or HALLMARK_PUPPETEER)'); process.exit(1); }
const chromes = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
let chrome = chromes.find((p) => p && existsSync(p));
if (!chrome && typeof puppeteer.executablePath === 'function') chrome = puppeteer.executablePath();
const browser = await puppeteer.launch({ executablePath: chrome, headless: true });
const p = await browser.newPage();
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await p.goto(pathToFileURL(page).href, { waitUntil: 'networkidle0', timeout: 45000 }).catch(() => {});
await p.evaluate(async () => { document.documentElement.classList.add('shot'); await document.fonts.ready; for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); });
await new Promise((r) => setTimeout(r, 800));
const first = await p.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1440, height: 900 } });
let y = Number(yArg);
if (!yArg || Number.isNaN(y)) y = await p.evaluate(() => { const s = [...document.querySelectorAll('section')].map((e) => e.getBoundingClientRect().top + scrollY).filter((t) => t > 700); return s.length ? Math.round(s[0] - 40) : 1800; });
await p.evaluate((v) => window.scrollTo(0, v), y);
await new Promise((r) => setTimeout(r, 700));
const lower = await p.screenshot({ type: 'png' });
const stamp = await p.evaluate(() => [...document.querySelectorAll('style')].map((s) => s.textContent.slice(0, 600)).join('\n'));
const cssPath = join(dirname(page), 'style.css');
const head = (existsSync(cssPath) ? readFileSync(cssPath, 'utf8').slice(0, 600) : '') + '\n' + stamp;
const shape = (/shape:\s*([^·*\n]+?)\s*[·*\n]/.exec(head) || [])[1];
const hero = (/hero:\s*([^·*\n]+?)\s*[·*\n]/.exec(head) || [])[1];
const c = await browser.newPage();
await c.setViewport({ width: 960, height: 1208, deviceScaleFactor: 1 });
await c.setContent(`<body style="margin:0;background:#8a8a8a"><img src="data:image/png;base64,${first.toString('base64')}" style="display:block;width:960px;height:600px"><div style="height:8px"></div><img src="data:image/png;base64,${lower.toString('base64')}" style="display:block;width:960px;height:600px"></body>`, { waitUntil: 'load' });
const out = join(THEMES, `${slug}.jpg`);
writeFileSync(out, await c.screenshot({ type: 'jpeg', quality: 80, clip: { x: 0, y: 0, width: 960, height: 1208 } }));
await browser.close();
if (shape && hero) {
  let src = readFileSync(themeFile, 'utf8');
  const short = shape.trim().split(/\s*[(;]/)[0].replace(/,\s*$/, '');
  const way = (new RegExp(`\\b${slug}:\\s*([a-z][a-z-]*)`).exec(head) || [])[1];
  const fallback = (/`([a-z][a-z-]*)`\s*\(default\)/.exec(src) || [])[1];
  const line = `pictured: ${short}, ${hero.trim().split(/[ ,(]/)[0]} hero${way && fallback && way !== fallback ? `, in the ${way} colourway` : ''}`;
  src = /^pictured:.*$/m.test(src) ? src.replace(/^pictured:.*$/m, line) : src.replace(/^(signature:.*)$/m, `$1\n${line}`);
  writeFileSync(themeFile, src);
  try { const { execFileSync } = await import('node:child_process'); execFileSync(process.execPath, [join(HERE, 'theme.mjs'), 'index'], { stdio: 'ignore' }); } catch {}
}
console.log(`${out} (lower screen at y ${y}${shape ? `; ${shape.trim()}, ${hero ? hero.trim() : '?'} hero` : ''})`);
