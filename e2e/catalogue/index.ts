import { readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import type { CatalogueCase, CatalogueSuite } from "./types.ts"

// Every other file in this folder is a module: `export default` its suites.
const NOT_MODULES = new Set(["index.ts", "types.ts", "rows.ts"])
const dir = fileURLToPath(new URL(".", import.meta.url))
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".ts") && !NOT_MODULES.has(f))
  .sort()

export const catalogue: CatalogueSuite[] = (
  await Promise.all(
    files.map(
      async (f) =>
        (
          (await import(new URL(f, import.meta.url).href)) as {
            default: CatalogueSuite[]
          }
        ).default
    )
  )
).flat()

export const allCases = (): (CatalogueCase & {
  suite: string
  label: string
})[] =>
  catalogue.flatMap((s) =>
    s.cases.map((c) => ({ ...c, suite: s.suite, label: s.label }))
  )
