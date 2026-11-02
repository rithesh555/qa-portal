// Build step for the API and migrate images (see the Dockerfile).
//
//   node prune-node-modules.mjs <package-to-skip>...
//
// pnpm's `--filter` and `--prod` still leave packages the image never loads:
// - @prisma/client, better-auth and @better-auth/prisma-adapter list the
//   `prisma` CLI as an *optional* peer. @qa/api has the CLI as a
//   devDependency, so the lockfile resolves that peer, and even
//   `pnpm install --prod` links the CLI, Studio and an embedded Postgres
//   (~200 MB) into the API image.
// - A filtered install also links the workspace root's dev tools (eslint,
//   lefthook, commitlint) and, through the shared store, other apps' tools.
//
// This walks pnpm's store from @qa/api and @qa/shared, never following an
// edge to a skipped package name, and deletes every store entry the walk
// can't reach, plus the links that pointed at them. The stack smoke checks
// (docker/stack.sh smoke) prove the images still run.
import fs from "node:fs"
import path from "node:path"

const store = "/app/node_modules/.pnpm"
const roots = [
  "/app/apps/api/node_modules",
  "/app/packages/shared/node_modules",
]
const skipped = new Set(process.argv.slice(2))

/** Package names in a node_modules folder, scopes expanded. */
function names(dir) {
  return fs.readdirSync(dir).flatMap((entry) => {
    if (entry === ".bin" || entry === ".pnpm" || entry.startsWith(".modules"))
      return []
    if (!entry.startsWith("@")) return [entry]
    return fs.readdirSync(path.join(dir, entry)).map((n) => `${entry}/${n}`)
  })
}

/** The store entry ("pkg@1.2.3_peers") a link resolves into, if any. */
function storeEntry(link) {
  let real
  try {
    real = fs.realpathSync(link)
  } catch {
    return undefined // dangling
  }
  const rel = path.relative(store, real)
  return rel.startsWith("..") ? undefined : rel.split(path.sep)[0]
}

const reached = new Set()
function visit(entry) {
  if (!entry || reached.has(entry)) return
  reached.add(entry)
  const dir = path.join(store, entry, "node_modules")
  for (const name of names(dir)) {
    if (!skipped.has(name)) visit(storeEntry(path.join(dir, name)))
  }
}
for (const root of roots)
  for (const name of names(root))
    if (!skipped.has(name)) visit(storeEntry(path.join(root, name)))

let removed = 0
for (const entry of fs.readdirSync(store)) {
  if (
    entry === "node_modules" ||
    entry.startsWith(".") ||
    entry === "lock.yaml"
  )
    continue
  if (!reached.has(entry)) {
    fs.rmSync(path.join(store, entry), { recursive: true, force: true })
    removed++
  }
}

// Links into what was removed: the workspace root's, pnpm's hoisted folder,
// the skipped packages' links in the roots, and the optional peers.
const linkDirs = [
  "/app/node_modules",
  path.join(store, "node_modules"),
  ...roots,
  ...[...reached].map((e) => path.join(store, e, "node_modules")),
]
for (const dir of linkDirs) {
  if (!fs.existsSync(dir)) continue
  for (const name of names(dir)) {
    const link = path.join(dir, name)
    if (!fs.existsSync(link) || (roots.includes(dir) && skipped.has(name)))
      fs.rmSync(link, { recursive: true, force: true })
  }
}
console.log(
  `prune-node-modules: kept ${reached.size}, removed ${removed} store entries`
)
