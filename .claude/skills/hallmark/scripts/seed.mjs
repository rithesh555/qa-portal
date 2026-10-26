#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const TIERS = ['graphic-system', 'instrument', 'atmosphere'];
const PREFIXES = [
  'Palette/material:',
  'Type/composition:',
  'Topology/navigation:',
  'Controls/state:',
  'Responsive/motion:',
];

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] !== undefined && !String(args[i + 1]).startsWith('--') ? args[i + 1] : dflt;
};
const ASK = new Set(['build', 'make', 'create', 'design', 'need', 'want', 'please', 'page', 'site', 'website', 'landing', 'called', 'for', 'and', 'the', 'with', 'that', 'this', 'our', 'your']);
const briefFlag = flag('brief', null);
if (!briefFlag && (args.length === 0 || args[0].startsWith('--'))) {
  console.error('usage: node seed.mjs --brief "<the brief>" [--n 7] [--reroll 0] [--wild 3] [--atlas <path>]');
  process.exit(2);
}
const slug = briefFlag
  ? briefFlag.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !ASK.has(w)).slice(0, 4).join('-') || 'brief'
  : args[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const n = Math.max(2, parseInt(flag('n', '7'), 10) || 7);
const reroll = Math.max(0, parseInt(flag('reroll', '0'), 10) || 0);
const wildRaw = parseInt(flag('wild', '3'), 10);
const wild = Math.max(0, Number.isNaN(wildRaw) ? 3 : wildRaw);
const date = new Date().toISOString().slice(0, 10);

const seedKey = `${slug}·${date}·r${reroll}`;
const hash = fnv1a(seedKey);
const index = (hash % n) + 1;

function validateEntry(e, i) {
  const fail = (msg) => {
    console.error(`malformed atlas entry ${i} (${e && e.name ? e.name : 'unnamed'}): ${msg}`);
    process.exit(1);
  };
  if (!e || typeof e !== 'object') fail('not an object');
  for (const k of ['name', 'tier', 'lineage', 'spark', 'webLeverage']) {
    if (typeof e[k] !== 'string' || !e[k].trim()) fail(`missing or empty "${k}"`);
  }
  if (!TIERS.includes(e.tier)) fail(`tier "${e.tier}" is not one of ${TIERS.join(' / ')}`);
  if (!Array.isArray(e.system) || e.system.length !== 5) fail('system must be exactly five lines');
  e.system.forEach((line, j) => {
    if (typeof line !== 'string' || !line.startsWith(PREFIXES[j])) {
      fail(`system line ${j + 1} must start with "${PREFIXES[j]}"`);
    }
  });
  if (!Array.isArray(e.fits) || e.fits.length === 0) fail('fits must be a non-empty array');
}

let challengers = [];
if (wild > 0) {
  const atlasPath = flag('atlas', join(dirname(fileURLToPath(import.meta.url)), 'atlas.json'));
  try {
    const atlas = JSON.parse(readFileSync(atlasPath, 'utf8'));
    if (!Array.isArray(atlas) || atlas.length === 0) throw new Error('atlas is empty');
    atlas.forEach(validateEntry);

    const byTier = Object.fromEntries(TIERS.map((t) => [t, atlas.filter((e) => e.tier === t)]));
    const dealt = new Set();
    for (let k = 0; k < wild; k++) {
      const tier = TIERS[k % TIERS.length];
      const pool = byTier[tier].filter((e) => !dealt.has(e.name));
      if (pool.length === 0) continue;
      const j = fnv1a(`${seedKey}·t${tier}·k${k}`) % pool.length;
      dealt.add(pool[j].name);
      challengers.push(pool[j]);
    }
  } catch (e) {
    if (e && e.code === 'ENOENT') {
      console.error(`(atlas unavailable at ${atlasPath}; drawing without challengers)`);
    } else {
      console.error(`atlas error: ${e.message}`);
      process.exit(1);
    }
  }
}

let line = `draw: ${index}/${n} (seed ${seedKey})`;
if (challengers.length) line += ` · challengers: ${challengers.map((c) => c.name).join(' · ')}`;
console.log(line);

for (const c of challengers) {
  console.log(`  challenger · ${c.name} [${c.tier}] · lineage: ${c.lineage}`);
  console.log(`    spark: ${c.spark}`);
  for (const s of c.system) console.log(`    ${s}`);
  console.log(`    webLeverage: ${c.webLeverage}`);
  console.log(`    fits: ${c.fits.join(', ')}`);
}
