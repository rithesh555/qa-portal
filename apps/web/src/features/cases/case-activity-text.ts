import {
  type ActivityItem,
  CASE_PRIORITY_LABELS,
  CASE_STATUS_LABELS,
  CASE_TYPE_LABELS,
} from "@qa/shared"

// History entries are stored JSON, possibly written by older versions, so
// every field is read defensively.
const text = (value: unknown): string | null =>
  typeof value === "string" && value ? value : null

const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : []

const change = (value: unknown): { from: unknown; to: unknown } | null =>
  typeof value === "object" && value !== null && "to" in value
    ? (value as { from: unknown; to: unknown })
    : null

const LABELS = {
  priority: CASE_PRIORITY_LABELS as Record<string, string>,
  type: CASE_TYPE_LABELS as Record<string, string>,
  status: CASE_STATUS_LABELS as Record<string, string>,
}

function enumChange(field: keyof typeof LABELS, value: unknown): string | null {
  const c = change(value)
  const from = typeof c?.from === "string" ? LABELS[field][c.from] : undefined
  const to = typeof c?.to === "string" ? LABELS[field][c.to] : undefined
  return from && to ? `changed ${field} from ${from} to ${to}` : null
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

/** One line (without the actor's name) for an entry in a test case's history. */
export function describeCaseChange(item: ActivityItem): string {
  const c = item.changes ?? {}
  switch (item.action) {
    case "created": {
      const copy = text(c.duplicatedFrom)
      if (copy) return `created this case as a copy of ${copy}`
      if (typeof c.importNumber === "number") {
        return `created this case in import #${c.importNumber}`
      }
      return "created this case"
    }
    case "updated": {
      const parts: string[] = []
      const title = text(change(c.title)?.to)
      if (title) parts.push(`renamed it to “${title}”`)
      for (const field of ["priority", "type", "status"] as const) {
        const line = enumChange(field, c[field])
        if (line) parts.push(line)
      }
      const suite = change(c.suite)
      if (suite) {
        parts.push(
          `moved it from ${text(suite.from) ?? "No suite"} to ${text(suite.to) ?? "No suite"}`
        )
      }
      if (typeof c.labels === "object" && c.labels !== null) {
        const { added, removed } = c.labels as Record<string, unknown>
        const a = strings(added)
        const r = strings(removed)
        if (a.length)
          parts.push(
            `added ${plural(a.length, "label", "labels")} ${a.join(", ")}`
          )
        if (r.length)
          parts.push(
            `removed ${plural(r.length, "label", "labels")} ${r.join(", ")}`
          )
      }
      if (change(c.references)) parts.push("changed the references")
      if (change(c.preconditions)) parts.push("changed the preconditions")
      const steps = strings(c.steps)
      if (steps.length) {
        parts.push(
          steps
            .map((s, i) =>
              /^(added|removed|reordered)/.test(s) || i > 0 ? s : `changed ${s}`
            )
            .join(", ")
        )
      }
      if (parts.length === 0) return "updated it"
      let line = parts.join("; ")
      if (typeof c.revision === "number") line += ` (version ${c.revision})`
      if (c.overwrote === true) line += " (saved over a newer version)"
      if (c.bulk === true) line += " (bulk change)"
      return line
    }
    case "archived": {
      const reason = text(c.reason)
      return reason ? `archived it: ${reason}` : "archived it"
    }
    case "restored": {
      if (typeof c.importNumber === "number") {
        return `restored it with import #${c.importNumber}`
      }
      const suites = strings(c.restoredSuites)
      return suites.length
        ? `restored it, and its ${plural(suites.length, "suite", "suites")} ${suites.join(", ")}`
        : "restored it"
    }
    default:
      return "changed it"
  }
}
