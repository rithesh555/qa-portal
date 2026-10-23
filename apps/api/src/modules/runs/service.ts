import {
  type CopyRunInput,
  type CreateRunInput,
  emptyCounts,
  formatRunKey,
  type Page,
  parseRunRef,
  type RunCounts,
  type RunListQuery,
  type RunSummary,
  type TestRun,
  type copyRunSchema,
  type createRunSchema,
  type updateRunSchema,
} from "@qa/shared"
import type { z } from "zod"
import { recordActivity, staleChange } from "../../lib/activity.ts"
import { nextNumbers } from "../../lib/counters.ts"
import { httpError } from "../../lib/http-error.ts"
import type { Prisma, PrismaClient } from "../../lib/prisma.ts"
import {
  lockForWrite,
  type ProjectAccess,
  type WriteScope,
} from "../projects/access.ts"
import { LONG_TX } from "../cases/bulk.ts"
import {
  currentCases,
  selectCases,
  type SnapshotCase,
  snapshotData,
} from "./select.ts"

type Db = PrismaClient | Prisma.TransactionClient
type CreateRun = z.output<typeof createRunSchema>
type UpdateRun = z.output<typeof updateRunSchema>
type CopyRun = z.output<typeof copyRunSchema>
export type { CopyRunInput, CreateRunInput }

const person = { select: { id: true, name: true } } as const

const RUN_SELECT = {
  id: true,
  number: true,
  name: true,
  description: true,
  environment: true,
  state: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  closedAt: true,
  createdById: true,
  release: { select: { id: true, name: true } },
  createdBy: person,
  closedBy: person,
} as const satisfies Prisma.TestRunSelect

type RunRow = Prisma.TestRunGetPayload<{ select: typeof RUN_SELECT }>

/** The run behind `:ref` (PAY-R-12 or 12) in this project, or 404. */
/** A run's own write lock (results, edits, close, reopen): other runs aren't held up. */
export const runScope = (
  access: ProjectAccess,
  ref: string,
  { readCases = false }: { readCases?: boolean } = {}
): WriteScope => ({
  // Snapshotting cases into the run: not while they're being changed.
  ...(readCases ? { cases: "read" as const } : {}),
  run: { number: parseRunRef(access.project.key, ref), mode: "write" },
})

export async function findRun(db: Db, access: ProjectAccess, ref: string) {
  const number = parseRunRef(access.project.key, ref)
  const run = number
    ? await db.testRun.findUnique({
        where: {
          projectId_number: { projectId: access.project.id, number },
        },
        select: {
          id: true,
          number: true,
          state: true,
          version: true,
          createdById: true,
        },
      })
    : null
  if (!run) throw httpError(404, "Test run not found")
  return run
}

export type RunRef = Awaited<ReturnType<typeof findRun>>

const isLeadOrAdmin = (access: ProjectAccess) =>
  access.user.role === "admin" || access.role === "lead"

/** Editing a run, its cases and assignments: its creator or a QA Lead. */
export function assertCanManage(access: ProjectAccess, run: RunRef) {
  if (!isLeadOrAdmin(access) && run.createdById !== access.user.id) {
    throw httpError(
      403,
      "Only the person who started this run or a QA Lead can change it"
    )
  }
}

export function assertOpen(run: RunRef, what = "changed") {
  if (run.state === "closed") {
    throw httpError(409, `This run is closed, so it can't be ${what}`)
  }
}

async function countsFor(db: Db, runIds: string[]) {
  const rows = await db.runCase.groupBy({
    by: ["runId", "status"],
    where: { runId: { in: runIds } },
    _count: { _all: true },
  })
  const map = new Map<string, RunCounts>()
  for (const row of rows) {
    const counts = map.get(row.runId) ?? emptyCounts()
    counts[row.status] = row._count._all
    map.set(row.runId, counts)
  }
  return (id: string) => map.get(id) ?? emptyCounts()
}

async function assigneesFor(db: Db, runIds: string[]) {
  const rows = await db.runCase.findMany({
    where: { runId: { in: runIds }, assigneeId: { not: null } },
    distinct: ["runId", "assigneeId"],
    select: { runId: true, assignee: person },
  })
  const map = new Map<string, { id: string; name: string }[]>()
  for (const row of rows) {
    if (!row.assignee) continue
    map.set(row.runId, [...(map.get(row.runId) ?? []), row.assignee])
  }
  return (id: string) =>
    (map.get(id) ?? []).sort((a, b) => a.name.localeCompare(b.name))
}

function toSummary(
  row: RunRow,
  projectKey: string,
  counts: RunCounts,
  assignees: { id: string; name: string }[]
): RunSummary {
  return {
    id: row.id,
    number: row.number,
    key: formatRunKey(projectKey, row.number),
    name: row.name,
    environment: row.environment,
    release: row.release,
    state: row.state,
    counts,
    assignees,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    closedAt: row.closedAt?.toISOString() ?? null,
    closedBy: row.closedBy,
  }
}

export async function listRuns(
  prisma: PrismaClient,
  access: ProjectAccess,
  query: RunListQuery
): Promise<Page<RunSummary>> {
  const me = access.user.id
  const number = query.q ? parseRunRef(access.project.key, query.q) : null
  const where: Prisma.TestRunWhereInput = {
    projectId: access.project.id,
    state: query.state,
    ...(query.releaseId ? { releaseId: query.releaseId } : {}),
    ...(query.mine
      ? { OR: [{ createdById: me }, { cases: { some: { assigneeId: me } } }] }
      : {}),
    ...(query.q
      ? {
          AND: [
            {
              OR: [
                { name: { contains: query.q, mode: "insensitive" } },
                ...(number ? [{ number }] : []),
              ],
            },
          ],
        }
      : {}),
  }
  // Not an array transaction: its relation loads would share one connection.
  const [total, rows] = await Promise.all([
    prisma.testRun.count({ where }),
    prisma.testRun.findMany({
      where,
      select: RUN_SELECT,
      orderBy: [{ [query.sort]: query.order }, { number: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ])
  const ids = rows.map((r) => r.id)
  const [counts, assignees] = await Promise.all([
    countsFor(prisma, ids),
    assigneesFor(prisma, ids),
  ])
  return {
    items: rows.map((r) =>
      toSummary(r, access.project.key, counts(r.id), assignees(r.id))
    ),
    total,
    page: query.page,
    pageSize: query.pageSize,
  }
}

async function loadRun(
  prisma: PrismaClient,
  access: ProjectAccess,
  id: string
): Promise<TestRun> {
  const row = await prisma.testRun.findUniqueOrThrow({
    where: { id },
    select: RUN_SELECT,
  })
  const [counts, assignees] = await Promise.all([
    countsFor(prisma, [id]),
    assigneesFor(prisma, [id]),
  ])
  return {
    ...toSummary(row, access.project.key, counts(id), assignees(id)),
    description: row.description,
    version: row.version,
  }
}

export async function getRun(
  prisma: PrismaClient,
  access: ProjectAccess,
  ref: string
): Promise<TestRun> {
  const run = await findRun(prisma, access, ref)
  return loadRun(prisma, access, run.id)
}

export async function checkRelease(
  tx: Prisma.TransactionClient,
  projectId: string,
  releaseId: string | null
) {
  if (!releaseId) return
  const release = await tx.release.findFirst({
    where: { id: releaseId, projectId },
    select: { id: true },
  })
  if (!release) throw httpError(400, "Choose a release of this project")
}

/** Assignees must be active members who may run tests (QA Leads and Testers). */
export async function checkAssignees(
  tx: Prisma.TransactionClient,
  projectId: string,
  userIds: string[],
  message = "Assign cases only to active QA Leads and Testers of this project"
) {
  if (userIds.length === 0) return
  const members = await tx.projectMember.findMany({
    where: {
      projectId,
      userId: { in: userIds },
      role: { in: ["lead", "tester"] },
      user: { NOT: { banned: true } },
    },
    select: { userId: true },
  })
  if (members.length !== new Set(userIds).size) {
    throw httpError(400, message)
  }
}

/**
 * Shares cases out by top-level suite so a suite isn't split between people:
 * the biggest suites first, each to whoever has the fewest cases so far.
 */
export function shareOut(cases: SnapshotCase[], assigneeIds: string[]) {
  const assignment = new Map<string, string | null>()
  if (assigneeIds.length === 0) {
    cases.forEach((c) => assignment.set(c.id, null))
    return assignment
  }
  const groups = new Map<string, SnapshotCase[]>()
  for (const c of cases) {
    groups.set(c.topSuite, [...(groups.get(c.topSuite) ?? []), c])
  }
  const load = new Map(assigneeIds.map((id) => [id, 0]))
  const sorted = [...groups.values()].sort((a, b) => b.length - a.length)
  for (const group of sorted) {
    const [who] = [...load.entries()].sort((a, b) => a[1] - b[1])[0]!
    group.forEach((c) => assignment.set(c.id, who))
    load.set(who, load.get(who)! + group.length)
  }
  return assignment
}

async function insertRun(
  tx: Prisma.TransactionClient,
  access: ProjectAccess,
  fields: {
    name: string
    description: string
    environment: string
    releaseId: string | null
  },
  cases: SnapshotCase[],
  assigneeOf: (c: SnapshotCase) => string | null,
  extra: Record<string, unknown> = {}
) {
  const projectId = access.project.id
  if (cases.length === 0) {
    throw httpError(400, "No test cases match this choice")
  }
  const number = await nextNumbers(tx, projectId, "run")
  const run = await tx.testRun.create({
    data: { ...fields, projectId, number, createdById: access.user.id },
    select: { id: true },
  })
  await tx.runCase.createMany({
    data: cases.map((c, i) => ({
      runId: run.id,
      caseId: c.id,
      position: i + 1,
      assigneeId: assigneeOf(c),
      ...snapshotData(c),
    })),
  })
  await recordActivity(tx, {
    actorId: access.user.id,
    projectId,
    entityType: "run",
    entityId: run.id,
    action: "created",
    changes: {
      key: formatRunKey(access.project.key, number),
      name: fields.name,
      cases: cases.length,
      ...extra,
    },
  })
  return run.id
}

export async function createRun(
  prisma: PrismaClient,
  access: ProjectAccess,
  input: CreateRun
): Promise<TestRun> {
  const id = await prisma.$transaction(async (tx) => {
    access = await lockForWrite(tx, access, "runs:execute", {
      // Snapshots cases: not while they are being changed.
      scope: { cases: "read" },
    })
    const projectId = access.project.id
    await checkRelease(tx, projectId, input.releaseId)
    await checkAssignees(tx, projectId, input.assigneeIds)
    const cases = await selectCases(tx, access, input.selection)
    const assignment = shareOut(cases, input.assigneeIds)
    return insertRun(
      tx,
      access,
      {
        name: input.name,
        description: input.description,
        environment: input.environment,
        releaseId: input.releaseId,
      },
      cases,
      (c) => assignment.get(c.id) ?? null
    )
  }, LONG_TX)
  return loadRun(prisma, access, id)
}

export async function updateRun(
  prisma: PrismaClient,
  access: ProjectAccess,
  ref: string,
  input: UpdateRun
): Promise<TestRun> {
  const id = await prisma.$transaction(async (tx) => {
    access = await lockForWrite(tx, access, "runs:execute", {
      scope: runScope(access, ref),
    })
    const run = await findRun(tx, access, ref)
    assertCanManage(access, run)
    assertOpen(run)
    await checkRelease(tx, access.project.id, input.releaseId)
    const { count } = await tx.testRun.updateMany({
      where: { id: run.id, version: input.version },
      data: {
        name: input.name,
        description: input.description,
        environment: input.environment,
        releaseId: input.releaseId,
        version: { increment: 1 },
      },
    })
    if (count === 0) {
      throw await staleChange(tx, "run", run.id, "run")
    }
    await recordActivity(tx, {
      actorId: access.user.id,
      projectId: access.project.id,
      entityType: "run",
      entityId: run.id,
      action: "updated",
      changes: {
        key: formatRunKey(access.project.key, run.number),
        name: input.name,
      },
    })
    return run.id
  })
  return loadRun(prisma, access, id)
}

/**
 * Closing: a QA Lead any time (untested cases stay untested); otherwise the
 * run's creator or someone with cases in it, once every case has a result.
 */
export async function closeRun(
  prisma: PrismaClient,
  access: ProjectAccess,
  ref: string
): Promise<TestRun> {
  const id = await prisma.$transaction(async (tx) => {
    access = await lockForWrite(tx, access, "runs:close", {
      scope: runScope(access, ref),
    })
    const run = await findRun(tx, access, ref)
    if (run.state === "closed")
      throw httpError(409, "This run is already closed")
    const untested = await tx.runCase.count({
      where: { runId: run.id, status: "untested" },
    })
    if (!isLeadOrAdmin(access)) {
      const involved =
        run.createdById === access.user.id ||
        (await tx.runCase.count({
          where: { runId: run.id, assigneeId: access.user.id },
        })) > 0
      if (!involved) {
        throw httpError(
          403,
          "Only the person who started this run, someone with cases in it, or a QA Lead can close it"
        )
      }
      if (untested > 0) {
        throw httpError(
          403,
          `${untested} ${untested === 1 ? "case has" : "cases have"} no result yet. You can close the run once every case has a result.`
        )
      }
    }
    await tx.testRun.update({
      where: { id: run.id },
      data: {
        state: "closed",
        closedAt: new Date(),
        closedById: access.user.id,
        version: { increment: 1 },
      },
    })
    await recordActivity(tx, {
      actorId: access.user.id,
      projectId: access.project.id,
      entityType: "run",
      entityId: run.id,
      action: "closed",
      changes: { key: formatRunKey(access.project.key, run.number), untested },
    })
    return run.id
  })
  return loadRun(prisma, access, id)
}

export async function reopenRun(
  prisma: PrismaClient,
  access: ProjectAccess,
  ref: string
): Promise<TestRun> {
  const id = await prisma.$transaction(async (tx) => {
    access = await lockForWrite(tx, access, "runs:reopen", {
      scope: runScope(access, ref),
    })
    const run = await findRun(tx, access, ref)
    if (run.state === "open") throw httpError(409, "This run is already open")
    await tx.testRun.update({
      where: { id: run.id },
      data: {
        state: "open",
        closedAt: null,
        closedById: null,
        version: { increment: 1 },
      },
    })
    await recordActivity(tx, {
      actorId: access.user.id,
      projectId: access.project.id,
      entityType: "run",
      entityId: run.id,
      action: "reopened",
      changes: { key: formatRunKey(access.project.key, run.number) },
    })
    return run.id
  })
  return loadRun(prisma, access, id)
}

/**
 * A new run from an existing one: the same cases (or only its failed and
 * blocked ones) at their latest versions, with the same assignees. Cases
 * archived since are left out.
 */
export async function copyRun(
  prisma: PrismaClient,
  access: ProjectAccess,
  ref: string,
  input: CopyRun
): Promise<TestRun> {
  const id = await prisma.$transaction(async (tx) => {
    access = await lockForWrite(tx, access, "runs:execute", {
      // Snapshots cases: not while they are being changed.
      scope: { cases: "read" },
    })
    const source = await findRun(tx, access, ref)
    await checkRelease(tx, access.project.id, input.releaseId)
    const runCases = await tx.runCase.findMany({
      where: {
        runId: source.id,
        ...(input.only === "failedOrBlocked"
          ? { status: { in: ["failed", "blocked"] } }
          : {}),
      },
      select: { caseId: true, assigneeId: true },
    })
    const assigneeOf = new Map(runCases.map((rc) => [rc.caseId, rc.assigneeId]))
    // Keep only assignees who can still run tests here.
    const stillMembers = new Set(
      (
        await tx.projectMember.findMany({
          where: {
            projectId: access.project.id,
            role: { in: ["lead", "tester"] },
            user: { NOT: { banned: true } },
          },
          select: { userId: true },
        })
      ).map((m) => m.userId)
    )
    const cases = await currentCases(
      tx,
      access.project.id,
      runCases.map((rc) => rc.caseId)
    )
    return insertRun(
      tx,
      access,
      {
        name: input.name,
        description: "",
        environment: input.environment,
        releaseId: input.releaseId,
      },
      cases,
      (c) => {
        const who = assigneeOf.get(c.id) ?? null
        return who && stillMembers.has(who) ? who : null
      },
      { copiedFrom: formatRunKey(access.project.key, source.number) }
    )
  }, LONG_TX)
  return loadRun(prisma, access, id)
}
