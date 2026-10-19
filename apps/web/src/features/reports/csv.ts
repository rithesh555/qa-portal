import { safeCell, toCsv } from "@qa/shared"
import { save } from "@/features/cases/spreadsheet"

type Cell = string | number | null

export interface CsvTable {
  /** "Payments · Release 4.2": what the numbers cover. */
  scope: string
  /** When the numbers were computed (or the snapshot taken). */
  asOf: string
  columns: readonly string[]
  rows: readonly (readonly Cell[])[]
}

/** A report table as CSV: a "scope · as of" line, then the header and rows, formula-safe. */
export function reportCsv(t: CsvTable): string {
  const text = (c: Cell) => (c === null ? "" : safeCell(String(c)))
  return toCsv([
    [safeCell(`${t.scope} · as of ${t.asOf}`)],
    t.columns.map(text),
    ...t.rows.map((r) => r.map(text)),
  ])
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-|-$/g, "")

/** "PAY-4.2-pass-rate-by-run.csv" */
export function csvFileName(
  projectKey: string,
  release: string | null,
  what: string
) {
  return `${projectKey}-${release ? slug(release) : "no-release"}-${slug(what)}.csv`
}

export function downloadCsv(fileName: string, table: CsvTable) {
  save(
    new Blob([reportCsv(table)], { type: "text/csv;charset=utf-8" }),
    fileName
  )
}
