import {
  CASE_PRIORITY_LABELS,
  CASE_STATUS_LABELS,
  CASE_TYPE_LABELS,
  type CaseFields,
} from "@qa/shared"

/*
 * When someone saves a case while you edit it, compare three versions: the
 * one you opened (base), yours, and theirs. Only fields you changed are
 * yours to keep; everything else stays as they saved it.
 */

export const CASE_FIELDS = [
  "title",
  "suiteId",
  "priority",
  "type",
  "status",
  "labels",
  "references",
  "preconditions",
  "steps",
] as const

export type CaseField = (typeof CASE_FIELDS)[number]

const normal = (value: unknown): string =>
  JSON.stringify(value, (_key, v: unknown) =>
    typeof v === "string" ? v.trim() : v
  )

/** Fields where `mine` differs from the version the editor started from. */
export function changedFields(base: CaseFields, mine: CaseFields): CaseField[] {
  return CASE_FIELDS.filter((f) => normal(base[f]) !== normal(mine[f]))
}

/** Their version with only my changed fields applied. */
export function mergeMine(
  theirs: CaseFields,
  mine: CaseFields,
  fields: readonly CaseField[]
): CaseFields {
  const merged = { ...theirs }
  for (const field of fields) {
    ;(merged as Record<CaseField, unknown>)[field] = mine[field]
  }
  return merged
}

export interface DiffRow {
  field: string
  theirs: string
  mine: string
  /** They changed it too, so saving mine replaces their change. */
  both: boolean
}

const stepText = (s?: { action: string; expected: string }) =>
  s
    ? `${s.action.trim()}${s.expected.trim() ? `. Expected: ${s.expected.trim()}` : ""}`
    : ""

/** One row per field I changed (one per changed step for steps). */
export function conflictRows(
  base: CaseFields,
  mine: CaseFields,
  theirs: CaseFields,
  suiteName: (id: string | null) => string
): DiffRow[] {
  const theyChanged = new Set(changedFields(base, theirs))
  const rows: DiffRow[] = []
  const show: Record<
    Exclude<CaseField, "steps">,
    [string, (v: CaseFields) => string]
  > = {
    title: ["Title", (v) => v.title],
    suiteId: ["Suite", (v) => suiteName(v.suiteId)],
    priority: ["Priority", (v) => CASE_PRIORITY_LABELS[v.priority]],
    type: ["Type", (v) => CASE_TYPE_LABELS[v.type]],
    status: ["Status", (v) => CASE_STATUS_LABELS[v.status]],
    labels: ["Labels", (v) => v.labels.join(", ")],
    references: ["References", (v) => v.references],
    preconditions: ["Preconditions", (v) => v.preconditions],
  }
  for (const field of changedFields(base, mine)) {
    const both = theyChanged.has(field)
    if (field === "steps") {
      for (let i = 0; i < Math.max(base.steps.length, mine.steps.length); i++) {
        const before = stepText(base.steps[i])
        const after = stepText(mine.steps[i])
        if (before === after) continue
        rows.push({
          field: `Step ${i + 1}`,
          theirs: stepText(theirs.steps[i]) || "—",
          mine: after || "(removed)",
          both,
        })
      }
      continue
    }
    const [label, text] = show[field]
    rows.push({
      field: label,
      theirs: text(theirs) || "—",
      mine: text(mine) || "—",
      both,
    })
  }
  return rows
}
