import {
  formatCaseKey,
  formatDefectKey,
  formatRunKey,
  type ReportExport,
  type ReportExportKind,
  RUN_CASE_STATUSES,
} from "@qa/shared"
import { httpError } from "../../lib/http-error.ts"
import type { PrismaClient } from "../../lib/prisma.ts"
import type { ProjectAccess } from "../projects/access.ts"
import { latestPerCase } from "./service.ts"

const iso = (d: Date | null) => (d ? d.toISOString() : null)

/**
 * The rows behind a release's report, for CSV: each case's latest result,
 * the release's defects, or its runs. Always live numbers.
 */
export async function exportReport(
  prisma: PrismaClient,
  access: ProjectAccess,
  query: { release: string; kind: ReportExportKind }
): Promise<ReportExport> {
  const { project } = access
  const releaseId = query.release === "none" ? null : query.release
  const release = releaseId
    ? await prisma.release.findFirst({
        where: { id: releaseId, projectId: project.id },
        select: { name: true },
      })
    : null
  if (releaseId && !release) throw httpError(404, "Release not found")
  const asOf = new Date()
  const scope = `${project.name} · ${release ? `Release ${release.name}` : "No release"}`

  if (query.kind === "runs") {
    const runs = await prisma.testRun.findMany({
      where: { projectId: project.id, releaseId },
      orderBy: { number: "asc" },
      select: {
        id: true,
        number: true,
        name: true,
        environment: true,
        state: true,
        createdAt: true,
        closedAt: true,
      },
    })
    const grouped = await prisma.runCase.groupBy({
      by: ["runId", "status"],
      where: { runId: { in: runs.map((r) => r.id) } },
      _count: { _all: true },
    })
    const count = (runId: string, status: string) =>
      grouped.find((g) => g.runId === runId && g.status === status)?._count
        ._all ?? 0
    return {
      asOf: asOf.toISOString(),
      scope,
      columns: [
        "Run",
        "Name",
        "Environment",
        "State",
        ...RUN_CASE_STATUSES.map((s) => s[0]!.toUpperCase() + s.slice(1)),
        "Started",
        "Closed",
      ],
      rows: runs.map((r) => [
        formatRunKey(project.key, r.number),
        r.name,
        r.environment,
        r.state,
        ...RUN_CASE_STATUSES.map((s) => count(r.id, s)),
        iso(r.createdAt),
        iso(r.closedAt),
      ]),
    }
  }

  if (query.kind === "defects") {
    const defects = await prisma.defect.findMany({
      where: { projectId: project.id, foundInReleaseId: releaseId },
      orderBy: { number: "asc" },
      select: {
        number: true,
        title: true,
        severity: true,
        priority: true,
        status: true,
        resolution: true,
        detectedIn: true,
        createdAt: true,
        openedAt: true,
        closedAt: true,
        assignee: { select: { name: true } },
        reporter: { select: { name: true } },
      },
    })
    return {
      asOf: asOf.toISOString(),
      scope,
      columns: [
        "Defect",
        "Title",
        "Severity",
        "Priority",
        "Status",
        "Resolution",
        "Found in",
        "Assignee",
        "Reporter",
        "Logged",
        "Confirmed",
        "Closed",
      ],
      rows: defects.map((d) => [
        formatDefectKey(project.key, d.number),
        d.title,
        d.severity,
        d.priority,
        d.status,
        d.resolution,
        d.detectedIn,
        d.assignee?.name ?? null,
        d.reporter.name,
        iso(d.createdAt),
        iso(d.openedAt),
        iso(d.closedAt),
      ]),
    }
  }

  // Cases: every Ready case, plus any other case with a result here, with its latest result.
  const latest = await latestPerCase(prisma, project.id, releaseId)
  const byCase = new Map(latest.map((l) => [l.case_id, l]))
  const cases = await prisma.testCase.findMany({
    where: {
      projectId: project.id,
      OR: [
        { archivedAt: null, status: "ready" },
        { id: { in: latest.map((l) => l.case_id) } },
      ],
    },
    orderBy: { number: "asc" },
    select: {
      id: true,
      number: true,
      title: true,
      priority: true,
      status: true,
      archivedAt: true,
      suite: { select: { name: true } },
    },
  })
  return {
    asOf: asOf.toISOString(),
    scope,
    columns: [
      "Case",
      "Title",
      "Suite",
      "Priority",
      "Case status",
      "Latest result",
      "Run",
      "Recorded",
    ],
    rows: cases.map((c) => {
      const l = byCase.get(c.id)
      return [
        formatCaseKey(project.key, c.number),
        c.title,
        c.suite?.name ?? null,
        c.priority,
        c.archivedAt ? "archived" : c.status,
        l?.status ?? "untested",
        l ? formatRunKey(project.key, l.run_number) : null,
        l ? l.result_at.toISOString() : null,
      ]
    }),
  }
}
