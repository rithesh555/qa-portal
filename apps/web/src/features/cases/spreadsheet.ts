import {
  caseExportCells,
  caseExportRow,
  EXPORT_HEADERS,
  type ExportableCase,
  MAX_IMPORT_BYTES,
  toCsv,
} from "@qa/shared"

/*
 * Spreadsheet files are read and written in the browser. The Excel and CSV
 * libraries load on demand, so they stay out of the main bundle.
 */

export interface SheetRow {
  /** The row number in the spreadsheet (1 = first row), for messages. */
  number: number
  cells: string[]
}

export interface SheetTable {
  name: string
  /** Non-empty rows as text, header row first. */
  rows: SheetRow[]
}

export type SpreadsheetProblem = "type" | "size" | "empty" | "unreadable"

export class SpreadsheetError extends Error {
  readonly problem: SpreadsheetProblem
  constructor(problem: SpreadsheetProblem, message: string) {
    super(message)
    this.problem = problem
  }
}

const extension = (name: string) => name.toLowerCase().split(".").pop() ?? ""

function cellText(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value)
}

/** Text cells, skipping empty rows but keeping each row's original number. */
function tidy(rows: unknown[][]): SheetRow[] {
  return rows
    .map((row, i) => ({ number: i + 1, cells: row.map(cellText) }))
    .filter((row) => row.cells.some((cell) => cell.trim() !== ""))
}

/** Reads a .csv or .xlsx file into its sheets (a CSV has one). */
export async function readSpreadsheet(file: File): Promise<SheetTable[]> {
  const ext = extension(file.name)
  if (ext !== "csv" && ext !== "xlsx") {
    throw new SpreadsheetError(
      "type",
      ext === "xls"
        ? "Older .xls files aren't supported. Open it in Excel and save it as .xlsx."
        : "Choose a .csv or .xlsx file."
    )
  }
  if (file.size > MAX_IMPORT_BYTES) {
    throw new SpreadsheetError(
      "size",
      "That file is larger than 5 MB. Split it into smaller files and import them one at a time."
    )
  }
  let sheets: SheetTable[]
  try {
    if (ext === "csv") {
      const { default: Papa } = await import("papaparse")
      const text = (await file.text()).replace(/^\uFEFF/, "")
      // Keep empty lines so row numbers match the file; tidy() drops them.
      const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false })
      sheets = [{ name: file.name, rows: tidy(parsed.data) }]
    } else {
      const { default: readExcelFile } = await import("read-excel-file/browser")
      const book = await readExcelFile(file)
      sheets = book.map(({ sheet, data }) => ({
        name: sheet,
        rows: tidy(data as unknown[][]),
      }))
    }
  } catch {
    throw new SpreadsheetError(
      "unreadable",
      "We couldn't read that file. Check it opens in Excel, then try again."
    )
  }
  const usable = sheets.filter((s) => s.rows.length > 1)
  if (usable.length === 0) {
    throw new SpreadsheetError(
      "empty",
      "No test cases found — the file needs a header row and at least one row under it."
    )
  }
  return usable
}

function save(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export type ExportFormat = "xlsx" | "csv"

/** Downloads cases (or, with none, an empty template) as .xlsx or .csv. */
export async function downloadCases(
  cases: readonly ExportableCase[],
  format: ExportFormat,
  baseName: string
) {
  const fileName = `${baseName}.${format}`
  if (format === "csv") {
    const csv = toCsv([[...EXPORT_HEADERS], ...cases.map(caseExportRow)])
    save(new Blob([csv], { type: "text/csv;charset=utf-8" }), fileName)
    return
  }
  const { default: writeXlsxFile } = await import("write-excel-file/browser")
  const header = EXPORT_HEADERS.map((value) => ({
    value,
    fontWeight: "bold" as const,
  }))
  // Text cells (type String) are never evaluated as formulas, so no guard is needed.
  const body = cases.map((c) =>
    caseExportCells(c).map((value) => ({ value, type: String, wrap: true }))
  )
  await writeXlsxFile([header, ...body], {
    columns: [12, 40, 24, 10, 12, 8, 20, 18, 30, 50, 50].map((width) => ({
      width,
    })),
  }).toFile(fileName)
}
