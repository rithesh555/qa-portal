#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const HOOK_CMD = `node "${join(HERE, "lint-hook.mjs")}"`;
const MATCHER = "Write|Edit|MultiEdit";

const args = process.argv.slice(2);
const has = (f) => args.includes(f);

const settingsPath = has("--global")
  ? join(homedir(), ".claude", "settings.json")
  : join(process.cwd(), ".claude", "settings.json");

const hookEntry = {
  matcher: MATCHER,
  hooks: [{ type: "command", command: HOOK_CMD, timeout: 5000 }],
};

function readSettings() {
  if (!existsSync(settingsPath)) return {};
  try { return JSON.parse(readFileSync(settingsPath, "utf8")); } catch {
    console.error(`refusing to overwrite unparseable ${settingsPath}; fix or delete it first.`);
    process.exit(1);
  }
}

const ourHook = (h) => typeof h?.command === "string" && h.command.includes("lint-hook.mjs");
const withoutOurs = (list) => list.flatMap((e) => {
  if (!Array.isArray(e?.hooks) || !e.hooks.some(ourHook)) return [e];
  const rest = e.hooks.filter((h) => !ourHook(h));
  return rest.length ? [{ ...e, hooks: rest }] : [];
});

if (has("--print")) {
  console.log(`# add to ${settingsPath} :`);
  console.log(JSON.stringify({ hooks: { PostToolUse: [hookEntry] } }, null, 2));
  process.exit(0);
}

const settings = readSettings();
settings.hooks ??= {};
settings.hooks.PostToolUse ??= [];

settings.hooks.PostToolUse = withoutOurs(settings.hooks.PostToolUse);

if (has("--remove")) {
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
  console.log(`removed the Hallmark lint hook from ${settingsPath}`);
  process.exit(0);
}

settings.hooks.PostToolUse.push(hookEntry);
mkdirSync(dirname(settingsPath), { recursive: true });
writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
console.log(`installed the Hallmark edit-time lint hook into ${settingsPath}`);
console.log(`it lints Hallmark .html and .css files, and .jsx, .tsx, .vue, .svelte and .astro files inside a project with a .hallmark folder, on write; it advises and never blocks. Remove with --remove.`);
