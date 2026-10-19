import { z } from "zod"
import { casePrioritySchema } from "./cases.ts"
import { defectStatusSchema, severitySchema } from "./defects.ts"
import { activityItemSchema } from "./projects.ts"
import { runCountsSchema, runCaseStatusSchema } from "./runs.ts"

// ---------------------------------------------------------------------------
// Exit checks: fixed defaults, the same for every project (v1)
// ---------------------------------------------------------------------------

export const EXIT_THRESHOLDS = {
  /** Pass rate of each case's latest result in the release, counted once. */
  passRate: 0.95,
  maxOpenCritical: 0,
  maxOpenMajor: 3,
} as const

export interface ExitCheckInput {
  /** 0–1; null when nothing passed, failed or was blocked yet. */
  passRate: number | null
  readyCases: number
  /** Ready cases with a latest result (skipped counts) in the release. */
  testedReady: number
  untestedHighPriority: number
  openCritical: number
  openMajor: number
  /** Critical or High priority cases whose latest result is Blocked. */
  blockedHighPriority: number
  /** Defects of the release that are Fixed – awaiting retest. */
  awaitingRetest: number
}

export const EXIT_CHECK_IDS = [
  "critical",
  "major",
  "coverage",
  "passRate",
  "blocked",
  "retest",
] as const
export type ExitCheckId = (typeof EXIT_CHECK_IDS)[number]

export interface ExitCheck {
  id: ExitCheckId
  label: string
  /** null: can't be judged yet (no results). */
  ok: boolean | null
  detail: string
}

const pct = (v: number) => `${Math.round(v * 100)}%`

/** The release's exit checks, in the order the readiness panel shows them. */
export function exitChecks(i: ExitCheckInput): ExitCheck[] {
  const untested = i.readyCases - i.testedReady
  return [
    {
      id: "critical",
      label: "No open Critical defects",
      ok: i.openCritical <= EXIT_THRESHOLDS.maxOpenCritical,
      detail: i.openCritical ? `${i.openCritical} open` : "None open",
    },
    {
      id: "major",
      label: `At most ${EXIT_THRESHOLDS.maxOpenMajor} open Major defects`,
      ok: i.openMajor <= EXIT_THRESHOLDS.maxOpenMajor,
      detail: `${i.openMajor} open`,
    },
    {
      id: "coverage",
      label: "Every Ready case has a result",
      ok: i.readyCases === 0 ? null : untested === 0,
      detail:
        i.readyCases === 0
          ? "No Ready cases yet"
          : untested === 0
            ? `All ${i.readyCases} tested`
            : `${i.testedReady} of ${i.readyCases} tested; ${untested} untested` +
              (i.untestedHighPriority
                ? `, ${i.untestedHighPriority} of them High or Critical priority`
                : ""),
    },
    {
      id: "passRate",
      label: `Pass rate at least ${pct(EXIT_THRESHOLDS.passRate)}`,
      ok: i.passRate === null ? null : i.passRate >= EXIT_THRESHOLDS.passRate,
      detail: i.passRate === null ? "No results yet" : pct(i.passRate),
    },
    {
      id: "blocked",
      label: "No blocked Critical or High priority cases",
      ok: i.blockedHighPriority === 0,
      detail: i.blockedHighPriority
        ? `${i.blockedHighPriority} blocked`
        : "None blocked",
    },
    {
      id: "retest",
      label: "Every fixed defect retested",
      ok: i.awaitingRetest === 0,
      detail: i.awaitingRetest
        ? `${i.awaitingRetest} waiting for a retest`
        : "Nothing is waiting for a retest",
    },
  ]
}

// ---------------------------------------------------------------------------
// Number helpers shared by the API and the web
// ---------------------------------------------------------------------------

/** Linear-interpolated quantile (0–1) of the values; null when there are none. */
export function quantile(values: readonly number[], q: number): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo)
}

/** Age buckets for open defects, in whole days; none overlap. */
export const AGE_BUCKETS = [
  { label: "0–2 days", max: 2 },
  { label: "3–7 days", max: 7 },
  { label: "8–14 days", max: 14 },
  { label: "15–30 days", max: 30 },
  { label: "Over 30 days", max: Infinity },
] as const

export const ageBucket = (days: number) =>
  AGE_BUCKETS.findIndex((b) => days <= b.max)

/** The Monday (UTC) of the week a moment falls in, as YYYY-MM-DD. */
export function weekStart(date: Date): string {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )
  const back = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - back)
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

const person = z.object({ id: z.string(), name: z.string() })

export const exitCheckSchema = z.object({
  id: z.enum(EXIT_CHECK_IDS),
  label: z.string(),
  ok: z.boolean().nullable(),
  detail: z.string(),
})

const defectRow = z.object({
  id: z.string(),
  key: z.string(),
  title: z.string(),
  severity: severitySchema,
  priority: z.enum(["high", "medium", "low"]).nullable(),
  status: defectStatusSchema,
  /** Whole days since confirmed (or last reopened, or logged). */
  ageDays: z.number().int(),
  assignee: person.nullable(),
  foundIn: z.string().nullable(),
})

export type ReportDefectRow = z.infer<typeof defectRow>

/** Which runs a report covers: a release, or runs with no release. */
export const reportQuerySchema = z.object({
  release: z.union([z.uuid(), z.literal("none")]),
  /** For a released release: skip its snapshot and compute live numbers. */
  live: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
})

export type ReportQuery = z.output<typeof reportQuerySchema>

export const reportSchema = z.object({
  release: z
    .object({
      id: z.string(),
      name: z.string(),
      status: z.enum(["planned", "in_progress", "released"]),
      targetDate: z.iso.date().nullable(),
    })
    .nullable(),
  /** When these numbers were computed; for a snapshot, when it was taken. */
  asOf: z.iso.datetime(),
  snapshot: z.boolean(),
  hasRuns: z.boolean(),
  previousRelease: z.string().nullable(),
  checks: z.array(exitCheckSchema),
  kpis: z.object({
    passRate: z.number().nullable(),
    passRatePrevious: z.number().nullable(),
    readyCases: z.number().int(),
    testedReady: z.number().int(),
    openDefects: z.number().int(),
    openCritical: z.number().int(),
    openMajor: z.number().int(),
    productionEscapes: z.number().int(),
    productionEscapesPrevious: z.number().int().nullable(),
    timeToFix: z.object({
      medianDays: z.number().nullable(),
      p90Days: z.number().nullable(),
      count: z.number().int(),
    }),
    netOpenThisWeek: z.number().int(),
    foundThisWeek: z.number().int(),
    closedThisWeek: z.number().int(),
  }),
  blocking: z.array(defectRow),
  failing: z.array(
    z.object({
      runCaseId: z.string(),
      caseKey: z.string(),
      title: z.string(),
      status: runCaseStatusSchema,
      failedStep: z.number().int().nullable(),
      runKey: z.string(),
      defect: z
        .object({ key: z.string(), status: defectStatusSchema })
        .nullable(),
    })
  ),
  untestedByPriority: z.array(
    z.object({ priority: casePrioritySchema, count: z.number().int() })
  ),
  carriedOver: z.array(defectRow),
  runs: z.array(
    z.object({
      key: z.string(),
      name: z.string(),
      state: z.enum(["open", "closed"]),
      counts: runCountsSchema,
      closedAt: z.iso.datetime().nullable(),
    })
  ),
  aging: z.array(z.object({ label: z.string(), count: z.number().int() })),
  oldestOpen: z
    .object({ key: z.string(), ageDays: z.number().int() })
    .nullable(),
  weekly: z.array(
    z.object({
      week: z.iso.date(),
      found: z.number().int(),
      closed: z.number().int(),
    })
  ),
  coverage: z.array(
    z.object({
      suiteId: z.string().nullable(),
      suite: z.string(),
      depth: z.number().int(),
      ready: z.number().int(),
      tested: z.number().int(),
      passRate: z.number().nullable(),
      openDefects: z.number().int(),
    })
  ),
  /** Untested cases assigned per person in open runs; QA Leads only, else null. */
  workload: z
    .array(z.object({ person: person.nullable(), untested: z.number().int() }))
    .nullable(),
})

export type Report = z.infer<typeof reportSchema>

/** One active release in a cross-project table. */
export const releaseSummarySchema = z.object({
  project: z.object({ key: z.string(), name: z.string() }),
  release: z.object({
    id: z.string(),
    name: z.string(),
    status: z.enum(["planned", "in_progress", "released"]),
    targetDate: z.iso.date().nullable(),
  }),
  lead: z.string().nullable(),
  hasRuns: z.boolean(),
  failingChecks: z.number().int(),
  totalChecks: z.number().int(),
  passRate: z.number().nullable(),
  readyCases: z.number().int(),
  testedReady: z.number().int(),
  openCritical: z.number().int(),
  openMajor: z.number().int(),
})

export type ReleaseSummary = z.infer<typeof releaseSummarySchema>

const homeRun = z.object({
  projectKey: z.string(),
  projectName: z.string(),
  key: z.string(),
  name: z.string(),
  environment: z.string(),
  counts: runCountsSchema,
  mine: z.number().int(),
  mineLeft: z.number().int(),
})

const homeDefect = z.object({
  projectKey: z.string(),
  key: z.string(),
  title: z.string(),
  severity: severitySchema,
  status: defectStatusSchema,
})

export const homeSchema = z.object({
  runs: z.array(homeRun),
  runsReadyToClose: z.number().int(),
  assigned: z.array(homeDefect),
  readyToRetest: z.array(homeDefect),
  /** Null when the person leads no project. */
  toTriage: z.array(homeDefect).nullable(),
  triageProjects: z.array(z.string()),
  releases: z.array(releaseSummarySchema),
  /** Recent activity across the person's projects. */
  activity: z.array(
    activityItemSchema.extend({
      projectKey: z.string(),
      projectName: z.string(),
    })
  ),
  hasProjects: z.boolean(),
})

export type Home = z.infer<typeof homeSchema>

/** One CSV export of a report: the rows behind it, as of a moment. */
export const REPORT_EXPORT_KINDS = ["cases", "defects", "runs"] as const
export type ReportExportKind = (typeof REPORT_EXPORT_KINDS)[number]

export const reportExportQuerySchema = reportQuerySchema
  .omit({ live: true })
  .extend({ kind: z.enum(REPORT_EXPORT_KINDS) })

export const reportExportSchema = z.object({
  asOf: z.iso.datetime(),
  /** "Payments · Release 4.2" or "Payments · No release". */
  scope: z.string(),
  columns: z.array(z.string()),
  rows: z.array(z.array(z.union([z.string(), z.number(), z.null()]))),
})

export type ReportExport = z.infer<typeof reportExportSchema>
