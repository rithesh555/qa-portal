import {
  emptyCounts,
  formatDefectKey,
  formatRunKey,
  type Home,
  type ReleaseSummary,
  type SessionUser,
} from "@qa/shared"
import type { Prisma, PrismaClient } from "../../lib/prisma.ts"
import { computeReport } from "./service.ts"

const ACTIVITY_SHOWN = 8
const SUMMARY_CONCURRENCY = 4
const LIST_SHOWN = 20

/** Projects the person can open (admins: all), not archived. */
const visible = (user: SessionUser): Prisma.ProjectWhereInput => ({
  archivedAt: null,
  ...(user.role === "admin" ? {} : { members: { some: { userId: user.id } } }),
})

/** Active (not yet released) releases of these projects, each summarised by its own report. */
async function summariseReleases(
  prisma: PrismaClient,
  projects: Prisma.ProjectWhereInput,
  now: Date
): Promise<ReleaseSummary[]> {
  const releases = await prisma.release.findMany({
    where: { project: projects, status: { not: "released" } },
    orderBy: [{ targetDate: { sort: "asc", nulls: "last" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      status: true,
      targetDate: true,
      project: {
        select: {
          id: true,
          key: true,
          name: true,
          members: {
            where: {
              role: "lead",
              user: { banned: false },
            },
            orderBy: { createdAt: "asc" },
            take: 1,
            select: { user: { select: { name: true } } },
          },
        },
      },
    },
  })
  const summarise = async (r: (typeof releases)[number]) => {
    const report = await computeReport(prisma, {
      project: r.project,
      releaseId: r.id,
      workload: false,
      summary: true,
      now,
    })
    return {
      project: { key: r.project.key, name: r.project.name },
      release: report.release!,
      lead: r.project.members[0]?.user.name ?? null,
      hasRuns: report.hasRuns,
      failingChecks: report.checks.filter((c) => c.ok === false).length,
      totalChecks: report.checks.length,
      passRate: report.kpis.passRate,
      readyCases: report.kpis.readyCases,
      testedReady: report.kpis.testedReady,
      openCritical: report.kpis.openCritical,
      openMajor: report.kpis.openMajor,
    }
  }
  // A few at a time: each summary runs several queries of its own, and the
  // connection pool is shared with every other request.
  const out: ReleaseSummary[] = new Array(releases.length)
  let next = 0
  await Promise.all(
    Array.from(
      { length: Math.min(SUMMARY_CONCURRENCY, releases.length) },
      async () => {
        while (next < releases.length) {
          const i = next++
          out[i] = await summarise(releases[i]!)
        }
      }
    )
  )
  return out
}

const defectSelect = {
  number: true,
  title: true,
  severity: true,
  status: true,
  project: { select: { key: true } },
} satisfies Prisma.DefectSelect

type DefectRow = Prisma.DefectGetPayload<{ select: typeof defectSelect }>
const toHomeDefect = (d: DefectRow) => ({
  projectKey: d.project.key,
  key: formatDefectKey(d.project.key, d.number),
  title: d.title,
  severity: d.severity,
  status: d.status,
})
const bySeverity = [{ severity: "asc" }, { number: "asc" }] as const

/** The signed-in person's work across their projects, and how their releases are doing. */
export async function getHome(
  prisma: PrismaClient,
  user: SessionUser
): Promise<Home> {
  const projects = visible(user)
  const led = await prisma.project.findMany({
    where: {
      archivedAt: null,
      members: { some: { userId: user.id, role: "lead" } },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })
  const [hasProjects, myRunCases, assigned, readyToRetest, toTriage, activity] =
    await Promise.all([
      prisma.project.count({ where: projects }),
      prisma.runCase.groupBy({
        by: ["runId", "status"],
        where: {
          assigneeId: user.id,
          run: { state: "open", project: projects },
        },
        _count: { _all: true },
      }),
      prisma.defect.findMany({
        where: {
          assigneeId: user.id,
          status: { in: ["new", "open", "in_progress", "reopened"] },
          project: projects,
        },
        orderBy: [...bySeverity],
        take: LIST_SHOWN,
        select: defectSelect,
      }),
      prisma.defect.findMany({
        where: { reporterId: user.id, status: "fixed", project: projects },
        orderBy: [...bySeverity],
        take: LIST_SHOWN,
        select: defectSelect,
      }),
      led.length
        ? prisma.defect.findMany({
            where: { status: "new", projectId: { in: led.map((p) => p.id) } },
            orderBy: [...bySeverity],
            take: LIST_SHOWN,
            select: defectSelect,
          })
        : null,
      prisma.activityLog.findMany({
        where: { inFeed: true, project: projects },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: ACTIVITY_SHOWN,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          changes: true,
          createdAt: true,
          actor: { select: { id: true, name: true } },
          project: { select: { key: true, name: true } },
        },
      }),
    ])

  // Open runs with cases assigned to me, most of mine left first.
  const runIds = [...new Set(myRunCases.map((g) => g.runId))]
  const [runs, allCounts] = await Promise.all([
    prisma.testRun.findMany({
      where: { id: { in: runIds } },
      select: {
        id: true,
        number: true,
        name: true,
        environment: true,
        project: { select: { key: true, name: true } },
      },
    }),
    prisma.runCase.groupBy({
      by: ["runId", "status"],
      where: { runId: { in: runIds } },
      _count: { _all: true },
    }),
  ])
  const homeRuns = runs
    .map((r) => {
      const counts = emptyCounts()
      for (const g of allCounts)
        if (g.runId === r.id) counts[g.status] = g._count._all
      const mine = myRunCases.filter((g) => g.runId === r.id)
      return {
        projectKey: r.project.key,
        projectName: r.project.name,
        key: formatRunKey(r.project.key, r.number),
        name: r.name,
        environment: r.environment,
        counts,
        mine: mine.reduce((a, g) => a + g._count._all, 0),
        mineLeft: mine
          .filter((g) => g.status === "untested")
          .reduce((a, g) => a + g._count._all, 0),
      }
    })
    .filter((r) => r.mineLeft > 0)
    .sort((a, b) => b.mineLeft - a.mineLeft || a.key.localeCompare(b.key))

  // Open runs where every case has a result, that this person may close.
  const runsReadyToClose = await prisma.testRun.count({
    where: {
      state: "open",
      project: projects,
      cases: { some: {}, none: { status: "untested" } },
      ...(user.role === "admin"
        ? {}
        : {
            OR: [
              // Testers close their own or assigned runs; leads any run.
              {
                project: {
                  members: { some: { userId: user.id, role: "tester" } },
                },
                OR: [
                  { createdById: user.id },
                  { cases: { some: { assigneeId: user.id } } },
                ],
              },
              { projectId: { in: led.map((p) => p.id) } },
            ],
          }),
    },
  })

  return {
    runs: homeRuns,
    runsReadyToClose,
    assigned: assigned.map(toHomeDefect),
    readyToRetest: readyToRetest.map(toHomeDefect),
    toTriage: toTriage ? toTriage.map(toHomeDefect) : null,
    triageProjects: led.map((p) => p.name),
    releases: hasProjects
      ? await summariseReleases(prisma, projects, new Date())
      : [],
    activity: activity.map(({ project, ...row }) => ({
      ...row,
      changes: (row.changes as Record<string, unknown> | null) ?? null,
      createdAt: row.createdAt.toISOString(),
      projectKey: project!.key,
      projectName: project!.name,
    })),
    hasProjects: hasProjects > 0,
  }
}

/**
 * Every active release a person oversees, side by side: all of them for an
 * admin, those of the projects they lead for everyone else.
 */
export async function releasesOverview(
  prisma: PrismaClient,
  user: SessionUser
): Promise<ReleaseSummary[]> {
  const projects: Prisma.ProjectWhereInput = {
    archivedAt: null,
    ...(user.role === "admin"
      ? {}
      : { members: { some: { userId: user.id, role: "lead" } } }),
  }
  return summariseReleases(prisma, projects, new Date())
}
