import { z } from "zod"
import { parseKeyRef } from "./keys.ts"
import { listQuerySchema } from "./list.ts"

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

/** The readable ID of a test case, e.g. PAY-TC-12. */
export function formatCaseKey(projectKey: string, number: number): string {
  return `${projectKey}-TC-${number}`
}

/**
 * The case number from a URL segment: either this project's full key
 * (PAY-TC-12, any case) or a bare number. Null for anything else, including
 * another project's key.
 */
export function parseCaseRef(projectKey: string, ref: string): number | null {
  return parseKeyRef(projectKey, "TC", ref)
}

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const CASE_PRIORITIES = ["critical", "high", "medium", "low"] as const
export const casePrioritySchema = z.enum(CASE_PRIORITIES)
export type CasePriority = z.infer<typeof casePrioritySchema>
export const CASE_PRIORITY_LABELS: Record<CasePriority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
}

export const CASE_TYPES = [
  "functional",
  "security",
  "performance",
  "usability",
  "other",
] as const
export const caseTypeSchema = z.enum(CASE_TYPES)
export type CaseType = z.infer<typeof caseTypeSchema>
export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  functional: "Functional",
  security: "Security",
  performance: "Performance",
  usability: "Usability",
  other: "Other",
}

/** Archived is separate (a lead-only action), not a status. */
export const CASE_STATUSES = ["draft", "ready"] as const
export const caseStatusSchema = z.enum(CASE_STATUSES)
export type CaseStatus = z.infer<typeof caseStatusSchema>
export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  draft: "Draft",
  ready: "Ready",
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const MAX_LABELS = 20

/** Lowercase, spaces become dashes; letters, digits and . _ - only. */
export const labelSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform((value) => value.replace(/\s+/g, "-"))
  .pipe(
    z
      .string()
      .min(1, "Enter a label")
      .max(32, "Labels are at most 32 characters")
      .regex(
        /^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u,
        "Use letters, digits, dots, dashes or underscores"
      )
  )

/** Normalised, without duplicates, in first-seen order. Invalid labels are dropped. */
export function normalizeLabels(labels: readonly string[]): string[] {
  const out: string[] = []
  for (const raw of labels) {
    const parsed = labelSchema.safeParse(raw)
    if (parsed.success && !out.includes(parsed.data)) out.push(parsed.data)
  }
  return out
}

const labelListSchema = z
  .array(labelSchema)
  .transform((labels) => [...new Set(labels)])
  .pipe(z.array(z.string()).max(MAX_LABELS, `At most ${MAX_LABELS} labels`))

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

export const MAX_STEPS = 100

export const caseStepSchema = z.object({
  action: z
    .string()
    .trim()
    .min(1, "Describe what the tester does")
    .max(2000, "At most 2,000 characters"),
  expected: z.string().trim().max(2000, "At most 2,000 characters").default(""),
})

export type CaseStep = z.infer<typeof caseStepSchema>

export const caseTitleSchema = z
  .string()
  .trim()
  .min(1, "Enter a title")
  .max(200, "Titles are at most 200 characters")

export const caseInputSchema = z.object({
  title: caseTitleSchema,
  suiteId: z.uuid().nullable(),
  priority: casePrioritySchema,
  type: caseTypeSchema,
  status: caseStatusSchema,
  labels: labelListSchema.default([]),
  references: z.string().trim().max(200, "At most 200 characters").default(""),
  preconditions: z
    .string()
    .trim()
    .max(4000, "At most 4,000 characters")
    .default(""),
  steps: z
    .array(caseStepSchema)
    .min(1, "Add at least one step")
    .max(MAX_STEPS, `At most ${MAX_STEPS} steps`),
})

export type CaseInput = z.input<typeof caseInputSchema>
export type CaseFields = z.output<typeof caseInputSchema>

export const updateCaseSchema = caseInputSchema.extend({
  /** The version the editor started from; a mismatch means someone else saved. */
  version: z.number().int().min(1),
  /** Set after the user compared versions and chose to keep theirs anyway. */
  overwrite: z.boolean().default(false),
})

export type UpdateCaseInput = z.input<typeof updateCaseSchema>

export const archiveCaseSchema = z.object({
  reason: z.string().trim().max(200, "At most 200 characters").default(""),
})

const personSchema = z.object({ id: z.string(), name: z.string() })

export const caseSummarySchema = z.object({
  id: z.string(),
  number: z.number().int(),
  key: z.string(),
  title: z.string(),
  suiteId: z.string().nullable(),
  priority: casePrioritySchema,
  type: caseTypeSchema,
  status: caseStatusSchema,
  labels: z.array(z.string()),
  archived: z.boolean(),
  stepCount: z.number().int(),
  updatedAt: z.iso.datetime(),
})

export type CaseSummary = z.infer<typeof caseSummarySchema>

export const caseSchema = caseSummarySchema.extend({
  references: z.string(),
  preconditions: z.string(),
  steps: z.array(z.object({ action: z.string(), expected: z.string() })),
  /** Shown to people as "version": counts changes to title, preconditions or steps. */
  revision: z.number().int(),
  /** Optimistic-concurrency token: changes on every save. */
  version: z.number().int(),
  archiveReason: z.string(),
  duplicatedFrom: z.string().nullable(),
  importNumber: z.number().int().nullable(),
  createdBy: personSchema,
  /** Who saved the current version. */
  updatedBy: personSchema,
  createdAt: z.iso.datetime(),
})

export type TestCase = z.infer<typeof caseSchema>

// ---------------------------------------------------------------------------
// Lists and bulk actions
// ---------------------------------------------------------------------------

export const caseSuiteFilterSchema = z.union([
  z.literal("all"),
  z.literal("none"),
  z.uuid(),
])

export const CASE_LIST_STATUSES = ["draft", "ready", "archived"] as const

/** The filters of the case list; shared by the list, "select all matching" and export. */
export const caseFilterSchema = z.object({
  suite: caseSuiteFilterSchema.default("all"),
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => value || undefined),
  /** None = all active cases (draft and ready). */
  status: z.enum(CASE_LIST_STATUSES).optional(),
  priority: casePrioritySchema.optional(),
  type: caseTypeSchema.optional(),
  label: labelSchema.optional(),
})

export type CaseFilter = z.output<typeof caseFilterSchema>

export const caseListQuerySchema = listQuerySchema([
  "number",
  "updatedAt",
  "priority",
  "title",
]).extend(caseFilterSchema.omit({ q: true }).shape)

export type CaseListQuery = z.output<typeof caseListQuerySchema>

export const MAX_BULK = 2000

export const bulkCaseActionSchema = z.object({
  selection: z.union([
    z.object({
      ids: z.array(z.uuid()).min(1, "Select at least one case").max(MAX_BULK),
    }),
    z.object({
      filter: caseFilterSchema,
      /** Cases unticked after "select all matching". */
      exclude: z.array(z.uuid()).max(MAX_BULK).default([]),
    }),
  ]),
  action: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("move"), suiteId: z.uuid().nullable() }),
    z.object({ kind: z.literal("setPriority"), priority: casePrioritySchema }),
    z.object({ kind: z.literal("setType"), type: caseTypeSchema }),
    z.object({ kind: z.literal("setStatus"), status: caseStatusSchema }),
    z.object({
      kind: z.literal("addLabels"),
      labels: labelListSchema.pipe(z.array(z.string()).min(1)),
    }),
    z.object({
      kind: z.literal("archive"),
      reason: archiveCaseSchema.shape.reason,
    }),
  ]),
})

export type BulkCaseAction = z.input<typeof bulkCaseActionSchema>

// ---------------------------------------------------------------------------
// Suites
// ---------------------------------------------------------------------------

export const suiteNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a suite name")
  .max(80, "Suite names are at most 80 characters")
  .refine((name) => !/[/›>]/.test(name), "Suite names can't contain / › or >")

export const suiteInputSchema = z.object({
  name: suiteNameSchema,
  /** One level of nesting: a parent must itself be top-level. */
  parentId: z.uuid().nullable().default(null),
})

export type SuiteInput = z.input<typeof suiteInputSchema>

export const updateSuiteSchema = suiteInputSchema.extend({
  version: z.number().int().min(1),
})

export type UpdateSuiteInput = z.input<typeof updateSuiteSchema>

export const suiteSchema = z.object({
  id: z.string(),
  name: z.string(),
  parentId: z.string().nullable(),
  /** Active cases directly in this suite (not its sub-suites). */
  caseCount: z.number().int(),
  version: z.number().int(),
})

export type Suite = z.infer<typeof suiteSchema>
