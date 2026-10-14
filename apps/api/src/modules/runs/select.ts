import {
  type CaseStep,
  MAX_RUN_CASES,
  type RunPreview,
  type runSelectionSchema,
} from "@qa/shared"
import type { z } from "zod"
import { httpError } from "../../lib/http-error.ts"
import type { Prisma, PrismaClient } from "../../lib/prisma.ts"
import type { ProjectAccess } from "../projects/access.ts"

type Selection = z.output<typeof runSelectionSchema>
type Db = PrismaClient | Prisma.TransactionClient

const CASE_SNAPSHOT_SELECT = {
  id: true,
  number: true,
  title: true,
  preconditions: true,
  steps: true,
  priority: true,
  type: true,
  status: true,
  labels: true,
  revision: true,
  suiteId: true,
} as const satisfies Prisma.TestCaseSelect

export type SnapshotCase = Prisma.TestCaseGetPayload<{
  select: typeof CASE_SNAPSHOT_SELECT
}> & { suitePath: string; topSuite: string }

/**
 * Suite paths and the run order: top-level suites by name (a suite's own
 * cases before its sub-suites'), then case number; cases without a suite last.
 */
async function withOrder(
  tx: Prisma.TransactionClient,
  projectId: string,
  cases: Prisma.TestCaseGetPayload<{ select: typeof CASE_SNAPSHOT_SELECT }>[]
): Promise<SnapshotCase[]> {
  const suites = await tx.suite.findMany({
    where: { projectId },
    select: { id: true, name: true, parentId: true },
  })
  const byId = new Map(suites.map((s) => [s.id, s]))
  const sortName = (s: string) => s.toLocaleLowerCase()
  const keyed = cases.map((c) => {
    const suite = c.suiteId ? byId.get(c.suiteId) : undefined
    const parent = suite?.parentId ? byId.get(suite.parentId) : undefined
    const top = parent ?? suite
    return {
      ...c,
      suitePath: suite
        ? parent
          ? `${parent.name} › ${suite.name}`
          : suite.name
        : "",
      topSuite: top?.name ?? "",
      // "~" sorts after letters: cases without a suite go last.
      sortKey: [
        top ? sortName(top.name) : "~",
        parent ? `1${sortName(suite!.name)}` : "0",
        String(c.number).padStart(10, "0"),
      ].join("\u0000"),
    }
  })
  keyed.sort((a, b) =>
    a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0
  )
  return keyed.map(({ sortKey: _sortKey, ...c }) => c)
}

/** Which active cases of the project a selection picks. */
async function selectionWhere(
  tx: Db,
  projectId: string,
  selection: Selection
): Promise<Prisma.TestCaseWhereInput> {
  const statuses: Prisma.TestCaseWhereInput = selection.includeDrafts
    ? {}
    : { status: "ready" }
  let where: Prisma.TestCaseWhereInput
  if (selection.mode === "all") {
    where = statuses
  } else if (selection.mode === "filter") {
    where = {
      ...statuses,
      ...(selection.label ? { labels: { has: selection.label } } : {}),
      ...(selection.priority ? { priority: selection.priority } : {}),
      ...(selection.type ? { type: selection.type } : {}),
    }
  } else {
    // A top-level suite brings its sub-suites.
    const children = await tx.suite.findMany({
      where: { projectId, parentId: { in: selection.suiteIds } },
      select: { id: true },
    })
    const suiteIds = [...selection.suiteIds, ...children.map((c) => c.id)]
    where = {
      OR: [
        {
          ...statuses,
          OR: [
            { suiteId: { in: suiteIds } },
            ...(selection.includeNoSuite ? [{ suiteId: null }] : []),
          ],
        },
        // Picked one by one: taken even if they're drafts.
        { id: { in: selection.caseIds } },
      ],
    }
  }
  return { AND: [{ projectId, archivedAt: null }, where] }
}

const tooMany = () =>
  httpError(
    400,
    `A run can hold at most ${MAX_RUN_CASES.toLocaleString("en")} test cases — choose fewer`
  )

/** The active cases a selection picks, in run order. */
export async function selectCases(
  tx: Prisma.TransactionClient,
  access: ProjectAccess,
  selection: Selection
): Promise<SnapshotCase[]> {
  const projectId = access.project.id
  const cases = await tx.testCase.findMany({
    where: await selectionWhere(tx, projectId, selection),
    select: CASE_SNAPSHOT_SELECT,
    take: MAX_RUN_CASES + 1,
  })
  if (cases.length > MAX_RUN_CASES) throw tooMany()
  return withOrder(tx, projectId, cases)
}

/** How many cases a selection takes, per top-level suite, without copying anything. */
export async function previewSelection(
  db: Db,
  access: ProjectAccess,
  selection: Selection
): Promise<RunPreview> {
  const projectId = access.project.id
  const [cases, withDrafts, suites] = await Promise.all([
    db.testCase.findMany({
      where: await selectionWhere(db, projectId, selection),
      select: { suiteId: true },
    }),
    selection.includeDrafts
      ? null
      : db.testCase.count({
          where: await selectionWhere(db, projectId, {
            ...selection,
            includeDrafts: true,
          }),
        }),
    db.suite.findMany({
      where: { projectId },
      select: { id: true, name: true, parentId: true },
    }),
  ])
  const byId = new Map(suites.map((s) => [s.id, s]))
  const counts = new Map<string | null, number>()
  for (const c of cases) {
    const suite = c.suiteId ? byId.get(c.suiteId) : undefined
    const top = suite?.parentId ? byId.get(suite.parentId) : suite
    const name = top?.name ?? null
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  const groups = [...counts]
    .map(([suite, count]) => ({ suite, count }))
    .sort((a, b) =>
      a.suite === null
        ? 1
        : b.suite === null
          ? -1
          : a.suite
              .toLocaleLowerCase()
              .localeCompare(b.suite.toLocaleLowerCase())
    )
  return {
    total: cases.length,
    groups,
    draftsLeftOut: withDrafts === null ? 0 : withDrafts - cases.length,
  }
}

/** The current versions of the given source cases that are still active, in run order. */
export async function currentCases(
  tx: Prisma.TransactionClient,
  projectId: string,
  caseIds: string[]
): Promise<SnapshotCase[]> {
  const cases = await tx.testCase.findMany({
    where: { projectId, archivedAt: null, id: { in: caseIds } },
    select: CASE_SNAPSHOT_SELECT,
  })
  return withOrder(tx, projectId, cases)
}

/** The run-case columns that hold a copy of a case. */
export function snapshotData(c: SnapshotCase) {
  return {
    title: c.title,
    preconditions: c.preconditions,
    steps: c.steps as unknown as Prisma.InputJsonValue,
    suitePath: c.suitePath,
    priority: c.priority,
    type: c.type,
    caseStatus: c.status,
    labels: c.labels,
    revision: c.revision,
  }
}

export const stepsOf = (row: { steps: Prisma.JsonValue }) =>
  row.steps as unknown as CaseStep[]
