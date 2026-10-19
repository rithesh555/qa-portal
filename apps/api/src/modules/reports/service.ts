import {
  AGE_BUCKETS,
  ageBucket,
  CASE_PRIORITIES,
  can,
  DEFECT_STATUSES,
  type DefectStatus,
  exitChecks,
  formatCaseKey,
  formatDefectKey,
  formatRunKey,
  isActiveDefect,
  quantile,
  type Report,
  reportSchema,
  type ReportDefectRow,
  type RunCaseStatus,
  type RunCounts,
  emptyCounts,
  weekStart,
} from "@qa/shared"
import { httpError } from "../../lib/http-error.ts"
import type { Prisma, PrismaClient } from "../../lib/prisma.ts"
import type { ProjectAccess } from "../projects/access.ts"

type Db = PrismaClient | Prisma.TransactionClient

const ACTIVE: DefectStatus[] = DEFECT_STATUSES.filter(isActiveDefect)
const DAY = 24 * 60 * 60 * 1000
const WEEKS_SHOWN = 6

interface Scope {
  project: { id: string; key: string }
  /** null: runs and defects with no release. */
  releaseId: string | null
  /** May see the per-person workload (QA Leads, admins). */
  workload: boolean
  now: Date
}

export interface LatestRow {
  case_id: string
  run_case_id: string
  status: RunCaseStatus
  result_at: Date
  run_number: number
}

/**
 * Each case's latest result across the scope's runs, counted once (by when it
 * was recorded). The one definition of "latest result": the report and its
 * CSV export both use it.
 */
export async function latestPerCase(
  db: Db,
  projectId: string,
  releaseId: string | null
) {
  return db.$queryRaw<LatestRow[]>`
    SELECT DISTINCT ON (rc.case_id)
      rc.case_id, rc.id AS run_case_id, rc.status::text AS status, rc.result_at,
      r.number AS run_number
    FROM run_cases rc
    JOIN test_runs r ON r.id = rc.run_id
    WHERE r.project_id = ${projectId}::uuid
      AND r.release_id IS NOT DISTINCT FROM ${releaseId}::uuid
      AND rc.result_at IS NOT NULL
    ORDER BY rc.case_id, rc.result_at DESC, rc.id DESC`
}

function passRateOf(rows: { status: RunCaseStatus }[]): number | null {
  let p = 0
  let decided = 0
  for (const r of rows) {
    if (r.status === "passed") p++
    if (
      r.status === "passed" ||
      r.status === "failed" ||
      r.status === "blocked"
    )
      decided++
  }
  return decided ? p / decided : null
}

const days = (ms: number) => Math.max(0, Math.floor(ms / DAY))

/** The last release that shipped before this one: Released and created earlier. */
async function previousRelease(
  db: Db,
  projectId: string,
  release: { createdAt: Date }
) {
  return db.release.findFirst({
    where: {
      projectId,
      status: "released",
      createdAt: { lt: release.createdAt },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  })
}

/** The report for one release (or "no release") of a project, computed live. */
export async function computeReport(db: Db, scope: Scope): Promise<Report> {
  const { project, releaseId, now } = scope
  const release = releaseId
    ? await db.release.findFirst({
        where: { id: releaseId, projectId: project.id },
        select: {
          id: true,
          name: true,
          status: true,
          targetDate: true,
          createdAt: true,
        },
      })
    : null
  if (releaseId && !release) throw httpError(404, "Release not found")

  // One query at a time: a snapshot runs this inside a transaction, where
  // queries can't run side by side on its single connection.
  const latest = await latestPerCase(db, project.id, releaseId)
  const readyCases = await db.testCase.findMany({
    where: { projectId: project.id, archivedAt: null, status: "ready" },
    select: {
      id: true,
      number: true,
      title: true,
      priority: true,
      suiteId: true,
    },
  })
  const runs = await db.testRun.findMany({
    where: { projectId: project.id, releaseId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      number: true,
      name: true,
      state: true,
      closedAt: true,
    },
  })
  const defects = await db.defect.findMany({
    where: { projectId: project.id, foundInReleaseId: releaseId },
    select: {
      id: true,
      number: true,
      title: true,
      severity: true,
      priority: true,
      status: true,
      detectedIn: true,
      caseId: true,
      openedAt: true,
      createdAt: true,
      assignee: { select: { id: true, name: true } },
      statusChanges: {
        select: { toStatus: true, at: true },
        orderBy: { at: "asc" },
      },
    },
  })
  const previous = release
    ? await previousRelease(db, project.id, release)
    : null

  // --- Results: latest per case ------------------------------------------------
  const latestByCase = new Map(latest.map((l) => [l.case_id, l]))
  const testedReady = readyCases.filter((c) => latestByCase.has(c.id)).length
  const passRate = passRateOf(latest)
  const untested = readyCases.filter((c) => !latestByCase.has(c.id))
  const untestedByPriority = CASE_PRIORITIES.map((priority) => ({
    priority,
    count: untested.filter((c) => c.priority === priority).length,
  }))
  const highPriority = new Set(["critical", "high"])
  const untestedHighPriority = untested.filter((c) =>
    highPriority.has(c.priority)
  ).length

  // Cases with a latest result that aren't Ready now (drafted or archived since) still count for pass rate.
  const failingRows = latest.filter(
    (l) => l.status === "failed" || l.status === "blocked"
  )
  const caseInfo = new Map(
    (
      await db.testCase.findMany({
        where: { id: { in: failingRows.map((f) => f.case_id) } },
        select: { id: true, number: true, title: true, priority: true },
      })
    ).map((c) => [c.id, c])
  )
  const blockedHighPriority = failingRows.filter(
    (f) =>
      f.status === "blocked" &&
      highPriority.has(caseInfo.get(f.case_id)?.priority ?? "")
  ).length

  // --- Defects ----------------------------------------------------------------
  const active = defects.filter((d) => ACTIVE.includes(d.status))
  const sinceOf = (d: (typeof defects)[number]) => {
    const reopened = [...d.statusChanges]
      .reverse()
      .find((c) => c.toStatus === "reopened")
    return (reopened?.at ?? d.openedAt ?? d.createdAt).getTime()
  }
  const row = (d: (typeof defects)[number]): ReportDefectRow => ({
    id: d.id,
    key: formatDefectKey(project.key, d.number),
    title: d.title,
    severity: d.severity,
    priority: d.priority,
    status: d.status,
    ageDays: days(now.getTime() - sinceOf(d)),
    assignee: d.assignee,
    foundIn: release?.name ?? null,
  })
  const openCritical = active.filter((d) => d.severity === "critical").length
  const openMajor = active.filter((d) => d.severity === "major").length
  const severityOrder = { critical: 0, major: 1, minor: 2, trivial: 3 }
  const blocking = active
    .filter((d) => d.severity === "critical" || d.severity === "major")
    .map(row)
    .sort(
      (a, b) =>
        severityOrder[a.severity] - severityOrder[b.severity] ||
        b.ageDays - a.ageDays
    )

  // Time to fix: first time Open → first time Fixed, in days.
  const fixDays: number[] = []
  for (const d of defects) {
    const opened = d.statusChanges.find((c) => c.toStatus === "open")
    const fixed = d.statusChanges.find((c) => c.toStatus === "fixed")
    if (opened && fixed && fixed.at >= opened.at)
      fixDays.push((fixed.at.getTime() - opened.at.getTime()) / DAY)
  }
  const round1 = (v: number | null) =>
    v === null ? null : Math.round(v * 10) / 10

  // Weekly found vs closed (Monday-start weeks, UTC), the last few weeks.
  const thisWeek = weekStart(now)
  const weeks: string[] = []
  for (let i = WEEKS_SHOWN - 1; i >= 0; i--)
    weeks.push(weekStart(new Date(Date.parse(thisWeek) - i * 7 * DAY)))
  const weekly = weeks.map((week) => ({ week, found: 0, closed: 0 }))
  const byWeek = new Map(weekly.map((w) => [w.week, w]))
  for (const d of defects) {
    const found = byWeek.get(weekStart(d.createdAt))
    if (found) found.found++
    for (const c of d.statusChanges) {
      if (c.toStatus !== "closed" && c.toStatus !== "rejected") continue
      const w = byWeek.get(weekStart(c.at))
      if (w) w.closed++
    }
  }
  const current = byWeek.get(thisWeek)!

  // Aging of what's still open.
  const aging = AGE_BUCKETS.map((b) => ({ label: b.label, count: 0 }))
  let oldest: { key: string; ageDays: number } | null = null
  for (const d of active) {
    const age = days(now.getTime() - sinceOf(d))
    aging[ageBucket(age)]!.count++
    if (!oldest || age > oldest.ageDays)
      oldest = { key: formatDefectKey(project.key, d.number), ageDays: age }
  }

  // Failing cases, with an active defect on the case if there is one.
  const caseDefects = await db.defect.findMany({
    where: {
      projectId: project.id,
      status: { in: ACTIVE },
      OR: [
        { caseId: { in: failingRows.map((f) => f.case_id) } },
        {
          links: {
            some: { caseId: { in: failingRows.map((f) => f.case_id) } },
          },
        },
      ],
    },
    select: {
      number: true,
      status: true,
      caseId: true,
      links: { select: { caseId: true } },
    },
    orderBy: { number: "desc" },
  })
  const defectForCase = (caseId: string) =>
    caseDefects.find(
      (d) => d.caseId === caseId || d.links.some((l) => l.caseId === caseId)
    )
  const failedSteps = new Map(
    (
      await db.testResult.findMany({
        where: { runCaseId: { in: failingRows.map((f) => f.run_case_id) } },
        orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
        select: { runCaseId: true, failedStep: true },
      })
    )
      .reverse()
      .map((r) => [r.runCaseId, r.failedStep])
  )
  const failing = failingRows
    .sort((a, b) => b.run_number - a.run_number)
    .slice(0, 50)
    .map((f) => {
      const c = caseInfo.get(f.case_id)
      const d = defectForCase(f.case_id)
      return {
        runCaseId: f.run_case_id,
        caseKey: c ? formatCaseKey(project.key, c.number) : "",
        title: c?.title ?? "",
        status: f.status,
        failedStep: failedSteps.get(f.run_case_id) ?? null,
        runKey: formatRunKey(project.key, f.run_number),
        defect: d
          ? { key: formatDefectKey(project.key, d.number), status: d.status }
          : null,
      }
    })

  // Runs, with their counts.
  const grouped = await db.runCase.groupBy({
    by: ["runId", "status"],
    where: { runId: { in: runs.map((r) => r.id) } },
    _count: { _all: true },
  })
  const countsFor = (runId: string): RunCounts => {
    const c = emptyCounts()
    for (const g of grouped) if (g.runId === runId) c[g.status] = g._count._all
    return c
  }

  // Coverage per suite (each suite's own Ready cases), least tested first.
  const suites = await db.suite.findMany({
    where: { projectId: project.id, archivedAt: null },
    select: { id: true, name: true, parentId: true },
  })
  const casesBySuite = new Map<string | null, typeof readyCases>()
  for (const c of readyCases) {
    const list = casesBySuite.get(c.suiteId) ?? []
    list.push(c)
    casesBySuite.set(c.suiteId, list)
  }
  const coverageRow = (
    suiteId: string | null,
    suite: string,
    depth: number
  ) => {
    const cases = casesBySuite.get(suiteId) ?? []
    const results = cases
      .map((c) => latestByCase.get(c.id))
      .filter((l): l is LatestRow => !!l)
    const ids = new Set(cases.map((c) => c.id))
    return {
      suiteId,
      suite,
      depth,
      ready: cases.length,
      tested: results.length,
      passRate: passRateOf(results),
      openDefects: active.filter((d) => d.caseId && ids.has(d.caseId)).length,
    }
  }
  const ratio = (r: { ready: number; tested: number }) =>
    r.ready ? r.tested / r.ready : 2
  const coverage = suites
    .filter((s) => !s.parentId)
    .map((top) => ({
      top: coverageRow(top.id, top.name, 0),
      children: suites
        .filter((s) => s.parentId === top.id)
        .map((s) => coverageRow(s.id, s.name, 1))
        .sort((a, b) => ratio(a) - ratio(b)),
    }))
    .sort((a, b) => ratio(a.top) - ratio(b.top))
    .flatMap((g) => [g.top, ...g.children])
  if (casesBySuite.has(null)) coverage.push(coverageRow(null, "No suite", 0))

  // Carry-over: active defects from earlier releases.
  const carriedOver =
    release === null
      ? []
      : (
          await db.defect.findMany({
            where: {
              projectId: project.id,
              status: { in: ACTIVE },
              foundInRelease: { createdAt: { lt: release.createdAt } },
            },
            orderBy: [{ severity: "asc" }, { number: "asc" }],
            take: 20,
            select: {
              id: true,
              number: true,
              title: true,
              severity: true,
              priority: true,
              status: true,
              openedAt: true,
              createdAt: true,
              assignee: { select: { id: true, name: true } },
              foundInRelease: { select: { name: true } },
              statusChanges: {
                where: { toStatus: "reopened" },
                orderBy: { at: "desc" },
                take: 1,
                select: { at: true },
              },
            },
          })
        ).map((d) => ({
          id: d.id,
          key: formatDefectKey(project.key, d.number),
          title: d.title,
          severity: d.severity,
          priority: d.priority,
          status: d.status,
          // Same rule as the release's own defects: since confirmed or last reopened.
          ageDays: days(
            now.getTime() -
              (d.statusChanges[0]?.at ?? d.openedAt ?? d.createdAt).getTime()
          ),
          assignee: d.assignee,
          foundIn: d.foundInRelease?.name ?? null,
        }))

  // Workload: untested cases per person in this scope's open runs.
  let workload: Report["workload"] = null
  if (scope.workload) {
    const open = runs.filter((r) => r.state === "open").map((r) => r.id)
    const rows = await db.runCase.groupBy({
      by: ["assigneeId"],
      where: { runId: { in: open }, status: "untested" },
      _count: { _all: true },
    })
    const people = new Map(
      (
        await db.user.findMany({
          where: {
            id: {
              in: rows.map((r) => r.assigneeId).filter((x): x is string => !!x),
            },
          },
          select: { id: true, name: true },
        })
      ).map((u) => [u.id, u])
    )
    workload = rows
      .map((r) => ({
        person: r.assigneeId ? (people.get(r.assigneeId) ?? null) : null,
        untested: r._count._all,
      }))
      // Alphabetical, unassigned last: for balancing, never a ranking.
      .sort((a, b) =>
        a.person && b.person
          ? a.person.name.localeCompare(b.person.name)
          : a.person
            ? -1
            : 1
      )
  }

  // The previous release, for the deltas.
  let passRatePrevious: number | null = null
  let escapesPrevious: number | null = null
  if (previous) {
    passRatePrevious = passRateOf(
      await latestPerCase(db, project.id, previous.id)
    )
    escapesPrevious = await db.defect.count({
      where: {
        projectId: project.id,
        foundInReleaseId: previous.id,
        detectedIn: "production",
      },
    })
  }

  const checks = exitChecks({
    passRate,
    readyCases: readyCases.length,
    testedReady,
    untestedHighPriority,
    openCritical,
    openMajor,
    blockedHighPriority,
    awaitingRetest: active.filter((d) => d.status === "fixed").length,
  })

  return {
    release: release
      ? {
          id: release.id,
          name: release.name,
          status: release.status,
          targetDate: release.targetDate
            ? release.targetDate.toISOString().slice(0, 10)
            : null,
        }
      : null,
    asOf: now.toISOString(),
    snapshot: false,
    hasRuns: runs.length > 0,
    previousRelease: previous?.name ?? null,
    checks,
    kpis: {
      passRate,
      passRatePrevious,
      readyCases: readyCases.length,
      testedReady,
      openDefects: active.length,
      openCritical,
      openMajor,
      productionEscapes: defects.filter((d) => d.detectedIn === "production")
        .length,
      productionEscapesPrevious: escapesPrevious,
      timeToFix: {
        medianDays: round1(quantile(fixDays, 0.5)),
        p90Days: round1(quantile(fixDays, 0.9)),
        count: fixDays.length,
      },
      netOpenThisWeek: current.found - current.closed,
      foundThisWeek: current.found,
      closedThisWeek: current.closed,
    },
    blocking,
    failing,
    untestedByPriority,
    carriedOver,
    runs: runs.map((r) => ({
      key: formatRunKey(project.key, r.number),
      name: r.name,
      state: r.state,
      counts: countsFor(r.id),
      closedAt: r.closedAt ? r.closedAt.toISOString() : null,
    })),
    aging,
    oldestOpen: oldest,
    weekly,
    coverage,
    workload,
  }
}

const mayWorkload = (access: ProjectAccess) =>
  can("reports:workload", {
    portalRole: access.user.role,
    projectRole: access.role,
  })

/**
 * The report a person asked for: a released release's frozen snapshot unless
 * they ask for live numbers; otherwise computed now.
 */
export async function getReport(
  prisma: PrismaClient,
  access: ProjectAccess,
  query: { release: string; live: boolean }
): Promise<Report> {
  const releaseId = query.release === "none" ? null : query.release
  const workload = mayWorkload(access)
  if (releaseId && !query.live) {
    const snap = await prisma.releaseReportSnapshot.findFirst({
      where: {
        releaseId,
        // Only while it's still Released: moved back, it's live again.
        release: { projectId: access.project.id, status: "released" },
      },
      select: {
        report: true,
        release: {
          select: { name: true, status: true, targetDate: true },
        },
      },
    })
    // A snapshot saved under an older report shape is skipped for live
    // numbers rather than failing the page.
    const parsed = snap ? reportSchema.safeParse(snap.report) : null
    if (snap && parsed?.success) {
      const report = parsed.data
      return {
        ...report,
        // The numbers are frozen; the release's name and dates are today's.
        release: report.release && {
          ...report.release,
          name: snap.release.name,
          status: snap.release.status,
          targetDate: snap.release.targetDate
            ? snap.release.targetDate.toISOString().slice(0, 10)
            : null,
        },
        snapshot: true,
        workload: workload ? report.workload : null,
      }
    }
  }
  return computeReport(prisma, {
    project: access.project,
    releaseId,
    workload,
    now: new Date(),
  })
}

/**
 * Freezes a release's report when it's marked Released (replacing an earlier
 * snapshot). Called inside the transaction that changes the status, under the
 * project lock, so it captures exactly the state at sign-off.
 */
export async function snapshotRelease(
  prisma: Db,
  access: ProjectAccess,
  releaseId: string
) {
  const report = await computeReport(prisma, {
    project: access.project,
    releaseId,
    workload: true,
    now: new Date(),
  })
  const data = {
    report: report as unknown as Prisma.InputJsonValue,
    takenAt: new Date(report.asOf),
    takenById: access.user.id,
  }
  await prisma.releaseReportSnapshot.upsert({
    where: { releaseId },
    create: { releaseId, ...data },
    update: data,
  })
}
