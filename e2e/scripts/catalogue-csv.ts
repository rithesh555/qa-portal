// Writes the catalogue as a file the portal's Test cases › Import reads as is.
import { mkdirSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { IMPORT_FIELD_LABELS as L, IMPORT_FIELDS, toCsv } from "@qa/shared"
import { importRows } from "../catalogue/rows.ts"

const rows = importRows()
const out = fileURLToPath(
  new URL("../results/qa-portal-e2e-cases.csv", import.meta.url)
)
mkdirSync(fileURLToPath(new URL("../results", import.meta.url)), {
  recursive: true,
})
writeFileSync(
  out,
  toCsv([
    IMPORT_FIELDS.map((f) => L[f]),
    ...rows.map((r) => IMPORT_FIELDS.map((f) => r[f] ?? "")),
  ])
)
console.log(`${rows.length} cases → ${out}`)
