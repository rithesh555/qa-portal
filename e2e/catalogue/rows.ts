import type { ImportRowInput } from "@qa/shared"
import { allCases } from "./index.ts"
import { portalTitle } from "./types.ts"

const numbered = (items: string[]) =>
  items.map((s, i) => `${i + 1}. ${s}`).join("\n")
const capitalise = (s: string) => s[0]!.toUpperCase() + s.slice(1)

/** The catalogue as the portal's import rows (row numbers count the header). */
export function importRows(only?: Set<string>): ImportRowInput[] {
  return allCases()
    .filter((c) => !only || only.has(c.id))
    .map((c, i) => ({
      row: i + 2,
      title: portalTitle(c),
      suite: c.suite,
      priority: capitalise(c.priority),
      type: capitalise(c.type ?? "functional"),
      status: "Ready",
      labels: ["e2e", c.label].join(", "),
      references: c.id,
      preconditions: c.preconditions ?? "",
      steps: numbered(c.steps.map((s) => s[0])),
      expected: numbered(c.steps.map((s) => s[1])),
    }))
}
