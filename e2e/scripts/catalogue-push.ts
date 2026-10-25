// Adds catalogue cases the E2E project on the dev portal doesn't have yet,
// through the same import the UI uses. Cases already there (matched by the id
// at the start of their title) are left alone.
import { importRows } from "../catalogue/rows.ts"
import { allCases } from "../catalogue/index.ts"
import { portalCaseIds } from "./portal-cases.ts"
import { portalSettings, signInToPortal } from "./portal.ts"

const s = portalSettings()
const portal = await signInToPortal(s.url, s.username, s.password())
const existing = await portalCaseIds(portal, s.projectKey)
const missing = new Set(
  allCases()
    .map((c) => c.id)
    .filter((id) => !existing.has(id))
)
const extra = [...existing.keys()].filter(
  (id) => !allCases().some((c) => c.id === id)
)

if (missing.size === 0)
  console.log(`All ${existing.size} catalogue cases are in ${s.projectKey}.`)
else {
  const request = {
    fileName: "e2e-catalogue",
    defaultSuiteId: null,
    rows: importRows(missing),
  }
  const check = await portal.call<{
    errorRows: number
    problems: { row: number; severity: string; message: string }[]
  }>("POST", `/projects/${s.projectKey}/imports/check`, request)
  if (check.errorRows > 0) {
    console.error(
      check.problems
        .filter((p) => p.severity === "error")
        .map((p) => `row ${p.row}: ${p.message}`)
        .join("\n")
    )
    process.exit(1)
  }
  const done = await portal.call<{
    created: number
    firstKey: string
    lastKey: string
  }>("POST", `/projects/${s.projectKey}/imports`, request)
  console.log(
    `Imported ${done.created} cases (${done.firstKey}–${done.lastKey}) into ${s.projectKey}.`
  )
}
if (extra.length)
  console.log(
    `In the portal but no longer in the catalogue (archive them there): ${extra.join(", ")}`
  )
