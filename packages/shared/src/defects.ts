import { z } from "zod"
import { parseKeyRef } from "./keys.ts"
import { listQuerySchema } from "./list.ts"

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

/** The readable ID of a defect, e.g. PAY-D-14. */
export function formatDefectKey(projectKey: string, number: number): string {
  return `${projectKey}-D-${number}`
}

/** The defect number from this project's key (PAY-D-14, any case) or a bare number; null otherwise. */
export function parseDefectRef(projectKey: string, ref: string): number | null {
  return parseKeyRef(projectKey, "D", ref)
}

// ---------------------------------------------------------------------------
// Fixed vocabularies (the same in every project)
// ---------------------------------------------------------------------------

export const DEFECT_STATUSES = [
  "new",
  "open",
  "in_progress",
  "fixed",
  "reopened",
  "closed",
  "rejected",
] as const
export const defectStatusSchema = z.enum(DEFECT_STATUSES)
export type DefectStatus = z.infer<typeof defectStatusSchema>

export const DEFECT_STATUS_LABELS: Record<DefectStatus, string> = {
  new: "New",
  open: "Open",
  in_progress: "In progress",
  fixed: "Fixed – awaiting retest",
  reopened: "Reopened",
  closed: "Closed",
  rejected: "Rejected",
}

/** Closed and rejected defects are done; everything else is active. */
export const isActiveDefect = (status: DefectStatus) =>
  status !== "closed" && status !== "rejected"

export const SEVERITIES = ["critical", "major", "minor", "trivial"] as const
export const severitySchema = z.enum(SEVERITIES)
export type Severity = z.infer<typeof severitySchema>

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: "Critical",
  major: "Major",
  minor: "Minor",
  trivial: "Trivial",
}

export const SEVERITY_HELP: Record<Severity, string> = {
  critical: "Blocks a main flow, no workaround",
  major: "Main flow broken, has a workaround",
  minor: "Side flow, or cosmetic in a main flow",
  trivial: "Typo or tiny visual issue",
}

export const DEFECT_PRIORITIES = ["high", "medium", "low"] as const
export const defectPrioritySchema = z.enum(DEFECT_PRIORITIES)
export type DefectPriority = z.infer<typeof defectPrioritySchema>

export const DEFECT_PRIORITY_LABELS: Record<DefectPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
}

export const DEFECT_PRIORITY_HELP: Record<DefectPriority, string> = {
  high: "Fix before the release",
  medium: "Fix this release if possible",
  low: "Fix when convenient",
}

export const REPRODUCIBILITY = ["always", "intermittent", "once"] as const
export const reproducibilitySchema = z.enum(REPRODUCIBILITY)
export type Reproducibility = z.infer<typeof reproducibilitySchema>

export const REPRODUCIBILITY_LABELS: Record<Reproducibility, string> = {
  always: "Always",
  intermittent: "Intermittent",
  once: "Once",
}

export const DETECTED_IN = ["qa", "uat", "production"] as const
export const detectedInSchema = z.enum(DETECTED_IN)
export type DetectedIn = z.infer<typeof detectedInSchema>

export const DETECTED_IN_LABELS: Record<DetectedIn, string> = {
  qa: "QA",
  uat: "UAT",
  production: "Production",
}

export const RESOLUTIONS = [
  "duplicate",
  "cannot_reproduce",
  "works_as_designed",
  "not_a_defect",
  "wont_fix",
] as const
export const resolutionSchema = z.enum(RESOLUTIONS)
export type Resolution = z.infer<typeof resolutionSchema>

export const RESOLUTION_LABELS: Record<Resolution, string> = {
  duplicate: "Duplicate",
  cannot_reproduce: "Cannot reproduce",
  works_as_designed: "Works as designed",
  not_a_defect: "Not a defect",
  wont_fix: "Won't fix",
}

// ---------------------------------------------------------------------------
// Workflow
// ---------------------------------------------------------------------------

/** What a move asks for: a rejection reason, a note, the fixed-in release/build, or nothing. */
export type TransitionNeeds =
  | "resolution"
  | "note"
  | "fixedIn"
  /** A confirm step with an optional note (closing as verified). */
  | "confirm"
  | "nothing"

export interface Transition {
  to: DefectStatus
  needs: TransitionNeeds
  /** Only a QA Lead (or admin) may make it. */
  leadOnly: boolean
}

const WORKFLOW: Record<DefectStatus, Transition[]> = {
  // Triage: a lead confirms or rejects what testers log.
  new: [
    { to: "open", needs: "nothing", leadOnly: true },
    { to: "rejected", needs: "resolution", leadOnly: true },
  ],
  // In progress and fixed mirror the external tracker; anyone in QA sets them.
  open: [
    { to: "in_progress", needs: "nothing", leadOnly: false },
    { to: "rejected", needs: "resolution", leadOnly: true },
  ],
  in_progress: [{ to: "fixed", needs: "fixedIn", leadOnly: false }],
  fixed: [
    { to: "closed", needs: "confirm", leadOnly: false },
    { to: "reopened", needs: "note", leadOnly: false },
  ],
  reopened: [{ to: "in_progress", needs: "nothing", leadOnly: false }],
  // A done defect comes back only through a lead; testers log a new linked one.
  closed: [{ to: "reopened", needs: "note", leadOnly: true }],
  rejected: [{ to: "reopened", needs: "note", leadOnly: true }],
}

/** The moves open to someone from `status`, in the order the screen offers them. */
export function nextStatuses(
  status: DefectStatus,
  { lead }: { lead: boolean }
): Transition[] {
  return WORKFLOW[status].filter((t) => lead || !t.leadOnly)
}

/** The move from one status to another, if the workflow has it. */
export function findTransition(
  from: DefectStatus,
  to: DefectStatus
): Transition | undefined {
  return WORKFLOW[from].find((t) => t.to === to)
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

const noteSchema = z
  .string()
  .trim()
  .max(4000, "At most 4,000 characters")
  .default("")
const longText = (message: string) =>
  z.string().trim().min(1, message).max(10_000, "At most 10,000 characters")
// Shapes without defaults: an edit must carry only what was sent (a default
// would fill missing keys with "" and blank them). Creation adds defaults.
const optionalLongText = z
  .string()
  .trim()
  .max(10_000, "At most 10,000 characters")

export const defectTitleSchema = z
  .string()
  .trim()
  .min(1, "Give the defect a title")
  .max(200, "Titles are at most 200 characters")

export const trackerUrlSchema = z
  .string()
  .trim()
  .max(500, "At most 500 characters")
  .refine(
    (v) => v === "" || /^https?:\/\/\S+$/i.test(v),
    "Use a full link starting with https://"
  )

const environmentSchema = z.string().trim().max(200, "At most 200 characters")
const developerSchema = z.string().trim().max(120, "At most 120 characters")
const stepsSchema = longText("Add the steps, so someone else can see it happen")
const actualSchema = longText("Say what actually happens")

/** What a person writes about a new defect. */
const defectFields = {
  title: defectTitleSchema,
  description: optionalLongText.default(""),
  steps: stepsSchema,
  expected: optionalLongText.default(""),
  actual: actualSchema,
  severity: severitySchema,
  reproducibility: reproducibilitySchema.default("always"),
  detectedIn: detectedInSchema.default("qa"),
  environment: environmentSchema.default(""),
  assigneeId: z.string().min(1).nullable().default(null),
  developer: developerSchema.default(""),
  trackerUrl: trackerUrlSchema.default(""),
}

/** A defect found outside a run. */
export const createDefectSchema = z.object({
  ...defectFields,
  foundInReleaseId: z.uuid().nullable().default(null),
  /** A test case it relates to, optional. */
  caseId: z.uuid().nullable().default(null),
})

export type CreateDefectInput = z.input<typeof createDefectSchema>

/**
 * "Log defect" on a failed or blocked result: a new defect (release, run,
 * case and environment default from the run), or a link to an existing one,
 * optionally reopening it when it was fixed.
 */
export const logDefectSchema = z.object({
  runCaseId: z.uuid(),
  defect: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("new"), ...defectFields }),
    z.object({
      mode: z.literal("link"),
      defectId: z.uuid(),
      note: noteSchema,
      /** Reopen it (it was fixed or closed); needs a note and the version seen. */
      reopen: z.boolean().default(false),
      /** The defect's version the person was looking at; stale → 409 when reopening. */
      version: z.number().int().min(1).optional(),
    }),
  ]),
})

export type LogDefectInput = z.input<typeof logDefectSchema>

/** Field edits; each save is checked against the version the person saw. */
export const updateDefectSchema = z.object({
  title: defectTitleSchema.optional(),
  description: optionalLongText.optional(),
  steps: stepsSchema.optional(),
  expected: optionalLongText.optional(),
  actual: actualSchema.optional(),
  severity: severitySchema.optional(),
  /** QA Lead only. */
  priority: defectPrioritySchema.nullable().optional(),
  reproducibility: reproducibilitySchema.optional(),
  detectedIn: detectedInSchema.optional(),
  environment: environmentSchema.optional(),
  assigneeId: z.string().min(1).nullable().optional(),
  developer: developerSchema.optional(),
  trackerUrl: trackerUrlSchema.optional(),
  version: z.number().int().min(1),
})

export type UpdateDefectInput = z.input<typeof updateDefectSchema>

export const transitionSchema = z
  .object({
    to: defectStatusSchema,
    note: noteSchema,
    resolution: resolutionSchema.optional(),
    duplicateOfId: z.uuid().optional(),
    fixedInReleaseId: z.uuid().nullable().optional(),
    fixedInBuild: z.string().trim().max(120).default(""),
    /** A Passed result linked as evidence when closing. */
    evidenceResultId: z.uuid().optional(),
    version: z.number().int().min(1),
  })
  .refine((t) => t.to !== "rejected" || t.resolution !== undefined, {
    message: "Choose why it's rejected",
    path: ["resolution"],
  })
  .refine((t) => t.to === "rejected" || t.resolution === undefined, {
    message: "Only a rejection has a reason",
    path: ["resolution"],
  })
  .refine((t) => t.resolution !== "duplicate" || !!t.duplicateOfId, {
    message: "Choose the defect it duplicates",
    path: ["duplicateOfId"],
  })
  .refine(
    (t) => t.duplicateOfId === undefined || t.resolution === "duplicate",
    {
      message: "Only a duplicate points at another defect",
      path: ["duplicateOfId"],
    }
  )
  .refine((t) => t.to !== "reopened" || t.note.length > 0, {
    message: "Say what still fails",
    path: ["note"],
  })

export type TransitionInput = z.input<typeof transitionSchema>

export const commentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write a comment first")
    .max(10_000, "At most 10,000 characters"),
})

export const linkResultSchema = z.object({ resultId: z.uuid() })

// ---------------------------------------------------------------------------
// Lists and responses
// ---------------------------------------------------------------------------

export const defectListQuerySchema = listQuerySchema([
  "number",
  "updatedAt",
  "severity",
  "priority",
]).extend({
  state: z.enum(["active", "done"]).default("active"),
  status: defectStatusSchema.optional(),
  severity: severitySchema.optional(),
  priority: z.union([defectPrioritySchema, z.literal("none")]).optional(),
  assigneeId: z.string().min(1).optional(),
  reporterId: z.string().min(1).optional(),
  releaseId: z.uuid().optional(),
  mine: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  order: z.enum(["asc", "desc"]).default("desc"),
})

export type DefectListQuery = z.output<typeof defectListQuerySchema>

const personSchema = z.object({ id: z.string(), name: z.string() })
const releaseRefSchema = z.object({ id: z.string(), name: z.string() })

export const defectSummarySchema = z.object({
  id: z.string(),
  number: z.number().int(),
  key: z.string(),
  title: z.string(),
  status: defectStatusSchema,
  severity: severitySchema,
  priority: defectPrioritySchema.nullable(),
  assignee: personSchema.nullable(),
  reporter: personSchema,
  foundInRelease: releaseRefSchema.nullable(),
  /** The run it was first logged from, if any. */
  foundInRun: z.object({ key: z.string() }).nullable(),
  environment: z.string(),
  detectedIn: detectedInSchema,
  linkCount: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export type DefectSummary = z.infer<typeof defectSummarySchema>

export const defectResultLinkSchema = z.object({
  id: z.string(),
  resultId: z.string(),
  /** What the result was when linked: failed, blocked, or passed (evidence of a fix). */
  kind: z.enum(["failed", "blocked", "passed"]),
  runKey: z.string(),
  runCaseId: z.string(),
  caseKey: z.string(),
  caseTitle: z.string(),
  failedStep: z.number().int().nullable(),
  note: z.string(),
  recordedBy: personSchema,
  recordedAt: z.iso.datetime(),
  linkedBy: personSchema,
  linkedAt: z.iso.datetime(),
})

export type DefectResultLink = z.infer<typeof defectResultLinkSchema>

export const defectSchema = defectSummarySchema.extend({
  description: z.string(),
  steps: z.string(),
  expected: z.string(),
  actual: z.string(),
  reproducibility: reproducibilitySchema,
  developer: z.string(),
  trackerUrl: z.string(),
  source: z.enum(["result", "manual"]),
  case: z
    .object({ id: z.string(), key: z.string(), title: z.string() })
    .nullable(),
  resolution: resolutionSchema.nullable(),
  duplicateOf: z
    .object({ id: z.string(), key: z.string(), title: z.string() })
    .nullable(),
  fixedInRelease: releaseRefSchema.nullable(),
  fixedInBuild: z.string(),
  reopenCount: z.number().int(),
  openedAt: z.iso.datetime().nullable(),
  fixedAt: z.iso.datetime().nullable(),
  closedAt: z.iso.datetime().nullable(),
  links: z.array(defectResultLinkSchema),
  /** Every status the defect has had, oldest first. */
  path: z.array(defectStatusSchema),
  version: z.number().int(),
})

export type Defect = z.infer<typeof defectSchema>

export const defectActivitySchema = z.object({
  id: z.string(),
  kind: z.enum(["comment", "change"]),
  actor: personSchema,
  /** For changes: the activity action, e.g. "status_changed". */
  action: z.string(),
  changes: z.record(z.string(), z.unknown()).nullable(),
  body: z.string(),
  createdAt: z.iso.datetime(),
})

export type DefectActivity = z.infer<typeof defectActivitySchema>

/** Defects on a test case, for the known-defect badge in runs and the "log defect" duplicate check. */
export const defectRefSchema = z.object({
  id: z.string(),
  key: z.string(),
  title: z.string(),
  status: defectStatusSchema,
  severity: severitySchema,
  assignee: personSchema.nullable(),
  /** Linked to this case (vs. only similar by title). */
  onCase: z.boolean(),
  version: z.number().int(),
})

export type DefectRef = z.infer<typeof defectRefSchema>
