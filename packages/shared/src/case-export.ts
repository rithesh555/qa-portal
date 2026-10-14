import { z } from "zod"
import {
  CASE_PRIORITY_LABELS,
  CASE_STATUS_LABELS,
  CASE_TYPE_LABELS,
  type CasePriority,
  type CaseStatus,
  type CaseStep,
  type CaseType,
  casePrioritySchema,
  caseStatusSchema,
  caseTypeSchema,
} from "./cases.ts"

/** The import template's columns plus the ID, which import ignores. */
export const EXPORT_HEADERS = [
  "ID",
  "Title",
  "Suite",
  "Priority",
  "Type",
  "Status",
  "Labels",
  "References",
  "Preconditions",
  "Steps",
  "Expected results",
] as const

export const MAX_EXPORT = 10_000

export const exportableCaseSchema = z.object({
  key: z.string(),
  title: z.string(),
  suitePath: z.string(),
  priority: casePrioritySchema,
  type: caseTypeSchema,
  status: caseStatusSchema,
  labels: z.array(z.string()),
  references: z.string(),
  preconditions: z.string(),
  steps: z.array(z.object({ action: z.string(), expected: z.string() })),
})

export interface ExportableCase {
  key: string
  title: string
  /** "Parent › Child", or "" for no suite. */
  suitePath: string
  priority: CasePriority
  type: CaseType
  status: CaseStatus
  labels: string[]
  references: string
  preconditions: string
  steps: CaseStep[]
}

/**
 * Spreadsheet apps run cells starting with = + - @ (or a tab/CR) as formulas,
 * so a malicious title could execute when someone opens the export. A leading
 * ' makes them plain text; import strips it again.
 */
export function safeCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
}

/** A case's cells in EXPORT_HEADERS order, as plain text (for .xlsx, where text cells never run). */
export function caseExportCells(c: ExportableCase): string[] {
  const steps = c.steps.map((s, i) => `${i + 1}. ${s.action}`).join("\n")
  const expected = c.steps
    .map((s, i) => (s.expected ? `${i + 1}. ${s.expected}` : ""))
    .filter(Boolean)
    .join("\n")
  return [
    c.key,
    c.title,
    c.suitePath,
    CASE_PRIORITY_LABELS[c.priority],
    CASE_TYPE_LABELS[c.type],
    CASE_STATUS_LABELS[c.status],
    c.labels.join(", "),
    c.references,
    c.preconditions,
    steps,
    expected,
  ]
}

/** The cells guarded against formula injection, for CSV. */
export function caseExportRow(c: ExportableCase): string[] {
  return caseExportCells(c).map(safeCell)
}

/** RFC 4180 CSV with a UTF-8 BOM so Excel reads accented characters correctly. */
export function toCsv(rows: readonly (readonly string[])[]): string {
  const field = (value: string) =>
    /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
  return "﻿" + rows.map((row) => row.map(field).join(",") + "\r\n").join("")
}
