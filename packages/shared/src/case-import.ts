import { z } from "zod"
import { FORMULA_START } from "./case-export.ts"
import {
  CASE_PRIORITIES,
  CASE_PRIORITY_LABELS,
  CASE_STATUS_LABELS,
  CASE_STATUSES,
  CASE_TYPE_LABELS,
  CASE_TYPES,
  type CaseFields,
  caseInputSchema,
  type CaseStep,
  labelSchema,
  suiteNameSchema,
} from "./cases.ts"

/*
 * Turning spreadsheet rows into test cases. The browser reads the file and
 * maps its columns and values; the API checks and imports the mapped rows.
 * Both use these functions, so the preview and the import always agree.
 */

export const MAX_IMPORT_ROWS = 2000
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024

export const IMPORT_FIELDS = [
  "title",
  "suite",
  "priority",
  "type",
  "status",
  "labels",
  "references",
  "preconditions",
  "steps",
  "expected",
] as const

export type ImportField = (typeof IMPORT_FIELDS)[number]

export const IMPORT_FIELD_LABELS: Record<ImportField, string> = {
  title: "Title",
  suite: "Suite",
  priority: "Priority",
  type: "Type",
  status: "Status",
  labels: "Labels",
  references: "References",
  preconditions: "Preconditions",
  steps: "Steps",
  expected: "Expected results",
}

const HEADER_NAMES: Record<ImportField, string[]> = {
  title: [
    "title",
    "name",
    "test name",
    "test case",
    "test case name",
    "case",
    "summary",
  ],
  suite: ["suite", "section", "folder", "module", "component", "test suite"],
  priority: ["priority"],
  type: ["type", "category", "test type"],
  status: ["status", "state"],
  labels: ["labels", "label", "tags", "tag"],
  references: [
    "references",
    "reference",
    "refs",
    "jira",
    "requirement",
    "requirements",
    "ticket",
  ],
  preconditions: [
    "preconditions",
    "precondition",
    "setup",
    "prerequisites",
    "prerequisite",
  ],
  steps: ["steps", "step", "test steps", "actions"],
  expected: [
    "expected",
    "expected result",
    "expected results",
    "expected outcome",
  ],
}

const squash = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLowerCase()

/** The field a column header most likely holds; null (don't import) when unsure. ID columns are never imported. */
export function guessField(header: string): ImportField | null {
  const name = squash(header)
  for (const field of IMPORT_FIELDS) {
    if (HEADER_NAMES[field].includes(name)) return field
  }
  return null
}

const NUMBERED = /^\s*(\d{1,3})\s*[.)]\s*(.*)$/

/**
 * Reads "1. …\n2. …" from one cell. Lines without a number continue the item
 * above. A cell with no numbers at all is one item per non-empty line.
 */
export function parseNumberedList(text: string): {
  items: Map<number, string>
  error?: string
} {
  const lines = text.split(/\r?\n/)
  const items = new Map<number, string>()
  if (!lines.some((line) => NUMBERED.test(line))) {
    lines
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line, i) => items.set(i + 1, line))
    return { items }
  }
  let current: number | null = null
  for (const line of lines) {
    const match = NUMBERED.exec(line)
    if (match) {
      current = Number(match[1])
      if (items.has(current))
        return { items, error: `${current} appears twice` }
      items.set(current, match[2]!.trim())
    } else if (line.trim()) {
      if (current === null) {
        const first = lines.map((l) => NUMBERED.exec(l)).find(Boolean)![1]
        return {
          items,
          error: `There's text before ${first} — number every item`,
        }
      }
      items.set(current, `${items.get(current)}\n${line.trim()}`.trim())
    }
  }
  return { items }
}

/** Steps and expected results matched by their numbers, in number order. */
export function pairSteps(
  stepsText: string,
  expectedText: string
): { steps: CaseStep[]; errors: string[] } {
  const steps = parseNumberedList(stepsText)
  const expected = parseNumberedList(expectedText)
  const errors: string[] = []
  if (steps.error) errors.push(`Steps: ${steps.error}`)
  if (expected.error) errors.push(`Expected results: ${expected.error}`)
  if (errors.length > 0) return { steps: [], errors }
  for (const number of expected.items.keys()) {
    if (!steps.items.has(number)) {
      errors.push(`Expected result ${number} has no matching step ${number}`)
    }
  }
  if (steps.items.size === 0) errors.push("Add at least one step")
  const paired = [...steps.items.keys()]
    .sort((a, b) => a - b)
    .map((number) => ({
      action: steps.items.get(number)!,
      expected: expected.items.get(number) ?? "",
    }))
  return { steps: errors.length > 0 ? [] : paired, errors }
}

/** "Parent › Child", "Parent / Child" or "Parent > Child"; at most one level of nesting. */
export function parseSuitePath(
  text: string
): { path: string[] } | { error: string } {
  const path = text
    .split(/[›/>]/)
    .map((part) => part.trim().replace(/\s+/g, " "))
    .filter(Boolean)
  if (path.length > 2) {
    return {
      error: "Suite is nested too deep — use one sub-suite level, e.g. A › B",
    }
  }
  for (const name of path) {
    const parsed = suiteNameSchema.safeParse(name)
    if (!parsed.success)
      return { error: `Suite “${name}”: ${parsed.error.issues[0]!.message}` }
  }
  return { path }
}

/** Suite names that differ only in case or spacing are the same suite. */
export function suiteKey(name: string): string {
  return squash(name)
}

const ENUMS = {
  priority: {
    values: CASE_PRIORITIES,
    labels: CASE_PRIORITY_LABELS as Record<string, string>,
  },
  type: {
    values: CASE_TYPES,
    labels: CASE_TYPE_LABELS as Record<string, string>,
  },
  status: {
    values: CASE_STATUSES,
    labels: CASE_STATUS_LABELS as Record<string, string>,
  },
} as const

export type EnumField = keyof typeof ENUMS

export const ENUM_FIELDS = Object.keys(ENUMS) as EnumField[]

/** The portal value for a cell: undefined when empty, null when it isn't a known value. */
export function matchEnumValue(
  field: EnumField,
  raw: string
): string | null | undefined {
  const value = squash(raw)
  if (!value) return undefined
  const { values, labels } = ENUMS[field]
  return (
    values.find((v) => v === value || labels[v]!.toLowerCase() === value) ??
    null
  )
}

export function enumLabels(field: EnumField): string {
  const { values, labels } = ENUMS[field]
  return values.map((v) => labels[v]).join(", ")
}

export interface UnknownValue {
  field: EnumField
  /** As first seen in the file. */
  value: string
  count: number
}

/** Enum cells the portal doesn't recognise, grouped case-insensitively, in file order. */
export function collectUnknownValues(
  rows: readonly Partial<Record<EnumField, string>>[]
): UnknownValue[] {
  const found = new Map<string, UnknownValue>()
  for (const field of ENUM_FIELDS) {
    for (const row of rows) {
      const raw = row[field] ?? ""
      if (matchEnumValue(field, raw) !== null) continue
      const key = valueMapKey(field, raw)
      const entry = found.get(key)
      if (entry) entry.count += 1
      else found.set(key, { field, value: raw.trim(), count: 1 })
    }
  }
  return [...found.values()]
}

export interface ValueChoice {
  value: string
  /** Also add this label, e.g. a "Smoke" type becomes Functional + label "smoke". */
  addLabel?: string
}

export type ValueMap = Record<string, ValueChoice>

export function valueMapKey(field: EnumField, raw: string): string {
  return `${field}:${squash(raw)}`
}

/** A row with the user's value choices applied; cells without a choice are left alone. */
export function applyValueMap<
  T extends Partial<Record<EnumField | "labels", string>>,
>(row: T, map: ValueMap): T {
  const out = { ...row }
  for (const field of ENUM_FIELDS) {
    const choice = map[valueMapKey(field, row[field] ?? "")]
    if (!choice || matchEnumValue(field, row[field] ?? "") !== null) continue
    out[field] = choice.value as T[typeof field]
    if (choice.addLabel) {
      out.labels = (
        out.labels ? `${out.labels}, ${choice.addLabel}` : choice.addLabel
      ) as T["labels"]
    }
  }
  return out
}

/** Our export prefixes formula-like cells with ' so spreadsheets don't run them; undo that. */
function unescapeCell(value: string): string {
  return value.startsWith("'") && FORMULA_START.test(value.slice(1))
    ? value.slice(1)
    : value
}

const cell = z.string().max(32_767).default("")

/** One spreadsheet row after column and value mapping: still raw text. */
export const importRowSchema = z.object({
  /** The spreadsheet row number, for messages. */
  row: z.number().int().min(1),
  title: cell,
  suite: cell,
  priority: cell,
  type: cell,
  status: cell,
  labels: cell,
  references: cell,
  preconditions: cell,
  steps: cell,
  expected: cell,
})

export type ImportRowInput = z.input<typeof importRowSchema>

export const importRequestSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  /** Where rows without a suite go; null = no suite. */
  defaultSuiteId: z.uuid().nullable().default(null),
  rows: z
    .array(importRowSchema)
    .min(1, "The file has no rows to import")
    .max(
      MAX_IMPORT_ROWS,
      `At most ${MAX_IMPORT_ROWS.toLocaleString("en")} test cases per import`
    ),
})

export type ImportRequest = z.input<typeof importRequestSchema>

export type ProblemSeverity = "error" | "warning" | "note"

export interface ImportProblem {
  row: number
  severity: ProblemSeverity
  message: string
}

export type ParsedImportCase = Omit<CaseFields, "suiteId"> & {
  row: number
  /** [] = the default suite; [parent] or [parent, child] by name. */
  suitePath: string[]
}

const FIELD_NAMES: Record<string, string> = {
  title: "Title",
  references: "References",
  preconditions: "Preconditions",
  steps: "Steps",
  labels: "Labels",
}

const FIELD_LABEL: Record<EnumField, string> = {
  priority: "Priority",
  type: "Type",
  status: "Status",
}

/** Turns one mapped row into a case, or explains every reason it can't be imported. */
export function parseImportRow(input: ImportRowInput): {
  value?: ParsedImportCase
  problems: ImportProblem[]
} {
  const row = importRowSchema.parse(input)
  const errors: string[] = []
  const text = (value: string) => unescapeCell(value.trim())

  const title = text(row.title)
  if (!title) errors.push("Title is empty")

  const suite = parseSuitePath(text(row.suite))
  if ("error" in suite) errors.push(suite.error)

  const enums: Record<EnumField, string> = {
    priority: "medium",
    type: "functional",
    status: "draft",
  }
  for (const field of ENUM_FIELDS) {
    const matched = matchEnumValue(field, row[field])
    if (matched === null) {
      errors.push(
        `${FIELD_LABEL[field]} “${row[field].trim()}” isn’t one of ${enumLabels(field)}`
      )
    } else if (matched) {
      enums[field] = matched
    }
  }

  const labels: string[] = []
  for (const raw of text(row.labels)
    .split(/[,;]/)
    .map((l) => l.trim())
    .filter(Boolean)) {
    const parsed = labelSchema.safeParse(raw)
    if (parsed.success) {
      if (!labels.includes(parsed.data)) labels.push(parsed.data)
    } else {
      errors.push(
        `Label “${raw}” can only use letters, digits, dots, dashes or underscores`
      )
    }
  }

  const paired = pairSteps(row.steps, row.expected)
  errors.push(...paired.errors)

  if (errors.length === 0) {
    const parsed = caseInputSchema.safeParse({
      title,
      suiteId: null,
      ...enums,
      labels,
      references: text(row.references),
      preconditions: text(row.preconditions),
      steps: paired.steps,
    })
    if (parsed.success) {
      const { suiteId: _suiteId, ...fields } = parsed.data
      return {
        value: {
          row: row.row,
          ...fields,
          suitePath: "path" in suite ? suite.path : [],
        },
        problems: [],
      }
    }
    for (const issue of parsed.error.issues) {
      const field = FIELD_NAMES[String(issue.path[0])] ?? String(issue.path[0])
      errors.push(`${field}: ${issue.message}`)
    }
  }
  return {
    problems: errors.map((message) => ({
      row: row.row,
      severity: "error" as const,
      message,
    })),
  }
}

/** Warns on later rows that repeat an earlier row's suite and title. */
export function findFileDuplicates(
  cases: readonly Pick<ParsedImportCase, "row" | "title" | "suitePath">[]
): ImportProblem[] {
  const seen = new Map<string, number>()
  const problems: ImportProblem[] = []
  for (const c of cases) {
    const key = [...c.suitePath.map(suiteKey), squash(c.title)].join("\u0000")
    const first = seen.get(key)
    if (first === undefined) seen.set(key, c.row)
    else
      problems.push({
        row: c.row,
        severity: "warning",
        message: `Same title as row ${first} in this file`,
      })
  }
  return problems
}

// ---------------------------------------------------------------------------
// API responses
// ---------------------------------------------------------------------------

export const importProblemSchema = z.object({
  row: z.number().int(),
  severity: z.enum(["error", "warning", "note"]),
  message: z.string(),
})

export const importCheckSchema = z.object({
  total: z.number().int(),
  errorRows: z.number().int(),
  problems: z.array(importProblemSchema),
  /** Suites the import would create, as "Parent › Child". */
  newSuites: z.array(z.string()),
  /** The first rows, for the preview table. */
  preview: z.array(
    z.object({
      row: z.number().int(),
      title: z.string(),
      suite: z.string(),
      priority: z.string(),
      stepCount: z.number().int(),
    })
  ),
})

export type ImportCheck = z.infer<typeof importCheckSchema>

export const importResultSchema = z.object({
  importNumber: z.number().int(),
  created: z.number().int(),
  firstKey: z.string(),
  lastKey: z.string(),
  newSuites: z.array(z.string()),
})

export type ImportResult = z.infer<typeof importResultSchema>

export const importBatchSchema = z.object({
  number: z.number().int(),
  fileName: z.string(),
  caseCount: z.number().int(),
  archived: z.boolean(),
  createdBy: z.object({ id: z.string(), name: z.string() }),
  createdAt: z.iso.datetime(),
})

export type ImportBatch = z.infer<typeof importBatchSchema>
