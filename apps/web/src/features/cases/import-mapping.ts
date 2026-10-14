import {
  applyValueMap,
  collectUnknownValues,
  guessField,
  type ImportField,
  type ImportProblem,
  IMPORT_FIELDS,
  type ImportRowInput,
  labelSchema,
  toCsv,
  type UnknownValue,
  type ValueChoice,
  type ValueMap,
} from "@qa/shared"
import type { SheetTable } from "./spreadsheet"

/** Which field each column (by header text) imports as; null = don't import. */
export type ColumnMapping = Record<string, ImportField | null>

/**
 * Header texts made unique, so every column has its own key: a repeated
 * "Title" becomes "Title (2)", and an empty header names its position.
 */
export function uniqueHeaders(headers: readonly string[]): string[] {
  const seen = new Map<string, number>()
  return headers.map((raw, i) => {
    const header = raw.trim() || `(column ${i + 1})`
    const count = (seen.get(header) ?? 0) + 1
    seen.set(header, count)
    return count === 1 ? header : `${header} (${count})`
  })
}

/** A first guess from the header names: each field at most once, the first column wins. */
export function guessMapping(headers: readonly string[]): ColumnMapping {
  const used = new Set<ImportField>()
  const mapping: ColumnMapping = {}
  for (const header of uniqueHeaders(headers)) {
    const field = guessField(header.replace(/ \(\d+\)$/, ""))
    if (field && !used.has(field)) {
      used.add(field)
      mapping[header] = field
    } else {
      mapping[header] = null
    }
  }
  return mapping
}

/** Data rows as the API expects them, with value choices applied. */
export function buildRows(
  sheet: SheetTable,
  mapping: ColumnMapping,
  values: ValueMap
): ImportRowInput[] {
  const [header, ...data] = sheet.rows
  const columns = uniqueHeaders(header?.cells ?? []).map(
    (name) => mapping[name] ?? null
  )
  return data.map(({ number, cells }) => {
    const row = Object.fromEntries(IMPORT_FIELDS.map((f) => [f, ""])) as Record<
      ImportField,
      string
    >
    columns.forEach((field, i) => {
      if (field) row[field] = cells[i] ?? ""
    })
    return { row: number, ...applyValueMap(row, values) }
  })
}

export function unknownValues(rows: readonly ImportRowInput[]): UnknownValue[] {
  return collectUnknownValues(rows)
}

/** Common priority words from other tools, mapped to the closest portal priority. */
const PRIORITY_WORDS: [RegExp, string][] = [
  [/^(p0|blocker|urgent|highest|showstopper|sev(erity)?\s*1|s1)$/, "critical"],
  [/^(p1|major|sev(erity)?\s*2|s2)$/, "high"],
  [/^(p2|normal|moderate|sev(erity)?\s*3|s3)$/, "medium"],
  [/^(p3|p4|minor|trivial|lowest|sev(erity)?\s*4|s4)$/, "low"],
]

/** Statuses that mean the case is reviewed and runnable. */
const READY_WORDS =
  /^(approved|reviewed|done|final|active|complete(d)?|ok|ready to run)$/

/** What an unknown value becomes until the user picks: an unknown type keeps its name as a label. */
export function defaultValueChoice(unknown: UnknownValue): ValueChoice {
  const word = unknown.value.trim().toLowerCase()
  if (unknown.field === "priority") {
    const level = PRIORITY_WORDS.find(([pattern]) => pattern.test(word))
    return { value: level?.[1] ?? "medium" }
  }
  if (unknown.field === "status") {
    return { value: READY_WORDS.test(word) ? "ready" : "draft" }
  }
  const label = labelSchema.safeParse(unknown.value)
  return label.success
    ? { value: "functional", addLabel: label.data }
    : { value: "functional" }
}

/** The rows with errors, as they were in the file, plus what's wrong — to fix and upload again. */
export function errorRowsCsv(
  sheet: SheetTable,
  problems: readonly ImportProblem[]
): string {
  const byRow = new Map<number, string[]>()
  for (const p of problems) {
    if (p.severity !== "error") continue
    byRow.set(p.row, [...(byRow.get(p.row) ?? []), p.message])
  }
  const [header, ...data] = sheet.rows
  const width = header?.cells.length ?? 0
  const pad = (cells: string[]) =>
    Array.from({ length: width }, (_, i) => cells[i] ?? "")
  return toCsv([
    ["Row", "Problems", ...pad(header?.cells ?? [])],
    ...data
      .filter((r) => byRow.has(r.number))
      .map((r) => [
        String(r.number),
        byRow.get(r.number)!.join("; "),
        ...pad(r.cells),
      ]),
  ])
}
