import { z } from "zod"
import {
  casePrioritySchema,
  caseStatusSchema,
  caseTypeSchema,
  labelSchema,
  MAX_BULK,
} from "./cases.ts"
import { listQuerySchema } from "./list.ts"

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

/** The readable ID of a test run, e.g. PAY-R-12. */
export function formatRunKey(projectKey: string, number: number): string {
  return `${projectKey}-R-${number}`
}

/** The run number from this project's key (PAY-R-12, any case) or a bare number; null otherwise. */
export function parseRunRef(projectKey: string, ref: string): number | null {
  const match = new RegExp(
    `^(?:${projectKey}-R-)?([1-9][0-9]{0,9})$`,
    "i"
  ).exec(ref.trim())
  if (!match) return null
  const number = Number(match[1])
  return number <= 2_147_483_647 ? number : null
}

// ---------------------------------------------------------------------------
// Statuses and the numbers every screen and report shares
// ---------------------------------------------------------------------------

/** What a tester records. */
export const RESULT_STATUSES = [
  "passed",
  "failed",
  "blocked",
  "skipped",
] as const
export const resultStatusSchema = z.enum(RESULT_STATUSES)
export type ResultStatus = z.infer<typeof resultStatusSchema>

/** A run case's current state: a result, or untested. */
export const RUN_CASE_STATUSES = [...RESULT_STATUSES, "untested"] as const
export const runCaseStatusSchema = z.enum(RUN_CASE_STATUSES)
export type RunCaseStatus = z.infer<typeof runCaseStatusSchema>

export const RUN_CASE_STATUS_LABELS: Record<RunCaseStatus, string> = {
  passed: "Passed",
  failed: "Failed",
  blocked: "Blocked",
  skipped: "Skipped",
  untested: "Untested",
}

/** Failed and Blocked need a note saying what went wrong. */
export const needsNote = (status: RunCaseStatus) =>
  status === "failed" || status === "blocked"

export const runCountsSchema = z.object({
  passed: z.number().int(),
  failed: z.number().int(),
  blocked: z.number().int(),
  skipped: z.number().int(),
  untested: z.number().int(),
})

export type RunCounts = z.infer<typeof runCountsSchema>

export const emptyCounts = (): RunCounts => ({
  passed: 0,
  failed: 0,
  blocked: 0,
  skipped: 0,
  untested: 0,
})

export const countTotal = (c: RunCounts) =>
  c.passed + c.failed + c.blocked + c.skipped + c.untested

/** Share of cases with a result (skipped counts), 0–1; null for an empty run. */
export function completion(c: RunCounts): number | null {
  const total = countTotal(c)
  return total === 0 ? null : (total - c.untested) / total
}

/**
 * Passed ÷ (passed + failed + blocked), 0–1. Skipped cases say nothing about
 * quality, so they're left out; null until something passed, failed or blocked.
 */
export function passRate(c: RunCounts): number | null {
  const decided = c.passed + c.failed + c.blocked
  return decided === 0 ? null : c.passed / decided
}

/** "77%", or "—" when there's nothing to show. */
export function formatPercent(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`
}

// ---------------------------------------------------------------------------
// Creating and changing runs
// ---------------------------------------------------------------------------

const includeDrafts = z.boolean().default(false)

/** Which test cases a run (or "add cases") takes. Only active cases are ever taken. */
export const runSelectionSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("all"), includeDrafts }),
  z.object({
    mode: z.literal("filter"),
    label: labelSchema.optional(),
    priority: casePrioritySchema.optional(),
    type: caseTypeSchema.optional(),
    includeDrafts,
  }),
  z
    .object({
      mode: z.literal("suites"),
      /** A top-level suite includes its sub-suites. */
      suiteIds: z.array(z.uuid()).max(500).default([]),
      includeNoSuite: z.boolean().default(false),
      /** Single cases picked on top of the suites. */
      caseIds: z.array(z.uuid()).max(MAX_BULK).default([]),
      includeDrafts,
    })
    .refine(
      (s) => s.suiteIds.length > 0 || s.caseIds.length > 0 || s.includeNoSuite,
      "Choose at least one suite or case"
    ),
])

export type RunSelection = z.input<typeof runSelectionSchema>

const runNameSchema = z
  .string()
  .trim()
  .min(1, "Give the run a name")
  .max(120, "Run names are at most 120 characters")
const runFields = {
  name: runNameSchema,
  description: z
    .string()
    .trim()
    .max(2000, "At most 2,000 characters")
    .default(""),
  environment: z.string().trim().max(120, "At most 120 characters").default(""),
  releaseId: z.uuid().nullable(),
}

export const MAX_RUN_CASES = 5000

export const createRunSchema = z.object({
  ...runFields,
  /** Shared out over the cases by suite; more can be assigned inside the run. */
  assigneeIds: z.array(z.string().min(1)).max(50).default([]),
  selection: runSelectionSchema,
})

export type CreateRunInput = z.input<typeof createRunSchema>

export const updateRunSchema = z.object({
  ...runFields,
  version: z.number().int().min(1),
})

export type UpdateRunInput = z.input<typeof updateRunSchema>

/** What a selection would take, shown while a run is being set up. */
export const runPreviewSchema = z.object({ selection: runSelectionSchema })

export const runPreviewResultSchema = z.object({
  total: z.number().int(),
  /** Cases per top-level suite, in run order; `suite: null` = no suite. */
  groups: z.array(
    z.object({ suite: z.string().nullable(), count: z.number().int() })
  ),
  /** Drafts the selection would also take with "include drafts" on. */
  draftsLeftOut: z.number().int(),
})

export type RunPreview = z.infer<typeof runPreviewResultSchema>

/** Duplicate a run, or start one from its failed and blocked cases. */
export const copyRunSchema = z.object({
  name: runNameSchema,
  environment: runFields.environment,
  releaseId: runFields.releaseId,
  only: z.enum(["all", "failedOrBlocked"]).default("all"),
})

export type CopyRunInput = z.input<typeof copyRunSchema>

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

const noteSchema = z
  .string()
  .trim()
  .max(4000, "At most 4,000 characters")
  .default("")

export const recordResultSchema = z
  .object({
    /** "untested" only undoes a result (or resets after a version change). */
    status: runCaseStatusSchema,
    note: noteSchema,
    failedStep: z.number().int().min(1).max(100).nullable().default(null),
    /** The run case version the tester was looking at; stale → 409 with who recorded meanwhile. */
    expectedVersion: z.number().int().min(1),
    /** Set after the tester saw someone else's newer result and chose to record anyway. */
    overwrite: z.boolean().default(false),
  })
  .refine((r) => !needsNote(r.status) || r.note.length > 0, {
    message: "Say what went wrong",
    path: ["note"],
  })
  .refine((r) => r.failedStep === null || needsNote(r.status), {
    message: "Only Failed and Blocked results name a step",
    path: ["failedStep"],
  })

export type RecordResultInput = z.input<typeof recordResultSchema>

/** "Use the latest version": refused if someone recorded since the tester looked. */
export const refreshRunCaseSchema = z.object({
  expectedVersion: z.number().int().min(1),
})

const runCaseIdsSchema = z
  .array(z.uuid())
  .min(1, "Select at least one case")
  .max(MAX_BULK)

export const bulkResultSchema = z
  .object({
    runCaseIds: runCaseIdsSchema,
    status: resultStatusSchema,
    note: noteSchema,
  })
  .refine((r) => !needsNote(r.status) || r.note.length > 0, {
    message: "Say what went wrong",
    path: ["note"],
  })

export type BulkResultInput = z.input<typeof bulkResultSchema>

export const assignSchema = z.object({
  runCaseIds: runCaseIdsSchema,
  /** null = unassigned. */
  assigneeId: z.string().min(1).nullable(),
})

export const removeRunCasesSchema = z.object({ runCaseIds: runCaseIdsSchema })

export const addRunCasesSchema = z.object({ selection: runSelectionSchema })

// ---------------------------------------------------------------------------
// Lists and responses
// ---------------------------------------------------------------------------

export const RUN_STATES = ["open", "closed"] as const
export const runStateSchema = z.enum(RUN_STATES)

export const runListQuerySchema = listQuerySchema([
  "number",
  "updatedAt",
  "name",
]).extend({
  state: runStateSchema.default("open"),
  releaseId: z.uuid().optional(),
  /** Runs with a case assigned to me, or created by me. */
  mine: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  order: z.enum(["asc", "desc"]).default("desc"),
})

export type RunListQuery = z.output<typeof runListQuerySchema>

const personSchema = z.object({ id: z.string(), name: z.string() })

export const runSummarySchema = z.object({
  id: z.string(),
  number: z.number().int(),
  key: z.string(),
  name: z.string(),
  environment: z.string(),
  release: z.object({ id: z.string(), name: z.string() }).nullable(),
  state: runStateSchema,
  counts: runCountsSchema,
  /** Everyone with a case in the run. */
  assignees: z.array(personSchema),
  createdBy: personSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  closedAt: z.iso.datetime().nullable(),
  closedBy: personSchema.nullable(),
})

export type RunSummary = z.infer<typeof runSummarySchema>

export const runSchema = runSummarySchema.extend({
  description: z.string(),
  version: z.number().int(),
})

export type TestRun = z.infer<typeof runSchema>

export const runCaseSchema = z.object({
  id: z.string(),
  position: z.number().int(),
  caseKey: z.string(),
  title: z.string(),
  suitePath: z.string(),
  priority: casePrioritySchema,
  status: runCaseStatusSchema,
  assignee: personSchema.nullable(),
  version: z.number().int(),
})

export type RunCase = z.infer<typeof runCaseSchema>

export const testResultSchema = z.object({
  id: z.string(),
  status: runCaseStatusSchema,
  note: z.string(),
  failedStep: z.number().int().nullable(),
  /** The case version this result was recorded against. */
  revision: z.number().int(),
  recordedBy: personSchema,
  recordedAt: z.iso.datetime(),
})

export type TestResult = z.infer<typeof testResultSchema>

export const runCaseDetailSchema = runCaseSchema.extend({
  type: caseTypeSchema,
  caseStatus: caseStatusSchema,
  labels: z.array(z.string()),
  preconditions: z.string(),
  steps: z.array(z.object({ action: z.string(), expected: z.string() })),
  /** The case version this run copied. */
  revision: z.number().int(),
  /** The source case's current version; null when it has been archived. */
  latestRevision: z.number().int().nullable(),
  /** Every result in this run, newest first. */
  results: z.array(testResultSchema),
})

export type RunCaseDetail = z.infer<typeof runCaseDetailSchema>
