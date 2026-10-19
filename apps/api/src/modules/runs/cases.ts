import {
  type addRunCasesSchema,
  type assignSchema,
  type bulkResultSchema,
  formatCaseKey,
  formatRunKey,
  MAX_RUN_CASES,
  type recordResultSchema,
  RUN_CASE_STATUS_LABELS,
  type RunCase,
  type RunCaseDetail,
} from "@qa/shared"
import type { z } from "zod"
import { recordActivity } from "../../lib/activity.ts"
import { httpError } from "../../lib/http-error.ts"
import type { Prisma, PrismaClient } from "../../lib/prisma.ts"
import { lockForWrite, type ProjectAccess } from "../projects/access.ts"
import { LONG_TX } from "../cases/bulk.ts"
import { currentCases, selectCases, snapshotData, stepsOf } from "./select.ts"
import {
  assertCanManage,
  assertOpen,
  checkAssignees,
  findRun,
  type RunRef,
} from "./service.ts"

type RecordResult = z.output<typeof recordResultSchema>
type BulkResult = z.output<typeof bulkResultSchema>
type Assign = z.output<typeof assignSchema>
type AddCases = z.output<typeof addRunCasesSchema>

const person = { select: { id: true, name: true } } as const

const RUN_CASE_SELECT = {
  id: true,
  position: true,
  title: true,
  suitePath: true,
  priority: true,
  status: true,
  version: true,
  assignee: person,
  case: { select: { number: true } },
} as const satisfies Prisma.RunCaseSelect

type RunCaseRow = Prisma.RunCaseGetPayload<{ select: typeof RUN_CASE_SELECT }>

function toRunCase(row: RunCaseRow, projectKey: string): RunCase {
  return {
    id: row.id,
    position: row.position,
    caseKey: formatCaseKey(projectKey, row.case.number),
    title: row.title,
    suitePath: row.suitePath,
    priority: row.priority,
    status: row.status,
    assignee: row.assignee,
    version: row.version,
  }
}

export async function listRunCases(
  prisma: PrismaClient,
  access: ProjectAccess,
  ref: string
): Promise<RunCase[]> {
  const run = await findRun(prisma, access, ref)
  const rows = await prisma.runCase.findMany({
    where: { runId: run.id },
    orderBy: { position: "asc" },
    select: RUN_CASE_SELECT,
  })
  return rows.map((row) => toRunCase(row, access.project.key))
}

/** A run case of this run, or 404 (another run's case is "not found" too). */
async function findRunCase(
  db: Prisma.TransactionClient | PrismaClient,
  run: RunRef,
  id: string
) {
  const rc = await db.runCase.findFirst({
    where: { id, runId: run.id },
    select: {
      id: true,
      caseId: true,
      status: true,
      version: true,
      revision: true,
    },
  })
  if (!rc) throw httpError(404, "Case not found in this run")
  return rc
}

export async function runCaseDetail(
  prisma: PrismaClient,
  access: ProjectAccess,
  ref: string,
  id: string
): Promise<RunCaseDetail> {
  const run = await findRun(prisma, access, ref)
  await findRunCase(prisma, run, id)
  return loadDetail(prisma, access, id)
}

async function loadDetail(
  prisma: PrismaClient,
  access: ProjectAccess,
  id: string
): Promise<RunCaseDetail> {
  const row = await prisma.runCase.findUniqueOrThrow({
    where: { id },
    select: {
      ...RUN_CASE_SELECT,
      type: true,
      caseStatus: true,
      labels: true,
      preconditions: true,
      steps: true,
      revision: true,
      case: { select: { number: true, revision: true, archivedAt: true } },
    },
  })
  const results = await prisma.testResult.findMany({
    where: { runCaseId: id },
    orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      status: true,
      note: true,
      failedStep: true,
      revision: true,
      recordedAt: true,
      recordedBy: person,
    },
  })
  return {
    ...toRunCase(row, access.project.key),
    type: row.type,
    caseStatus: row.caseStatus,
    labels: row.labels,
    preconditions: row.preconditions,
    steps: stepsOf(row),
    revision: row.revision,
    latestRevision: row.case.archivedAt ? null : row.case.revision,
    results: results.map((r) => ({
      ...r,
      recordedAt: r.recordedAt.toISOString(),
    })),
  }
}

/** Results land in the run's "last updated" time. */
/**
 * A run case's version moves only with its result or its copy of the case,
 * so a stale version means someone recorded (or reset) it meanwhile: say who.
 */
async function assertUnchanged(
  tx: Prisma.TransactionClient,
  rc: { id: string; version: number },
  expectedVersion: number
) {
  if (rc.version === expectedVersion) return
  const latest = await tx.testResult.findFirst({
    where: { runCaseId: rc.id },
    orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
    // Relation-free: nested selects inside a transaction run in parallel on its one connection.
    select: { status: true, recordedById: true },
  })
  const by =
    latest &&
    (await tx.user.findUnique({
      where: { id: latest.recordedById },
      select: { name: true },
    }))
  throw httpError(
    409,
    latest && by
      ? `${by.name} recorded ${RUN_CASE_STATUS_LABELS[latest.status]} on this case meanwhile. Check their result before recording yours.`
      : "This case changed meanwhile. Reload it before recording."
  )
}

async function touchRun(tx: Prisma.TransactionClient, runId: string) {
  await tx.testRun.update({
    where: { id: runId },
    data: { updatedAt: new Date() },
  })
}

/**
 * Records a result. Results are write-once; a new one supersedes the last.
 * If someone else recorded since the tester loaded the case, says who —
 * unless the tester chose to record anyway (`overwrite`).
 */
export async function recordResult(
  prisma: PrismaClient,
  access: ProjectAccess,
  ref: string,
  id: string,
  input: RecordResult
): Promise<RunCaseDetail> {
  await prisma.$transaction(async (tx) => {
    access = await lockForWrite(tx, access, "runs:execute")
    const run = await findRun(tx, access, ref)
    assertOpen(run, "recorded in")
    const rc = await findRunCase(tx, run, id)
    if (!input.overwrite) await assertUnchanged(tx, rc, input.expectedVersion)
    await tx.testResult.create({
      data: {
        runCaseId: rc.id,
        status: input.status,
        note: input.note,
        failedStep: input.failedStep,
        revision: rc.revision,
        recordedById: access.user.id,
      },
    })
    await tx.runCase.update({
      where: { id: rc.id },
      data: {
        status: input.status,
        // Undo back to untested clears it; reports pick the latest result by it.
        resultAt: input.status === "untested" ? null : new Date(),
        version: { increment: 1 },
      },
    })
    await touchRun(tx, run.id)
  })
  return loadDetail(prisma, access, id)
}

/** One status with a shared note on many cases; each gets its own result. */
export async function bulkResults(
  prisma: PrismaClient,
  access: ProjectAccess,
  ref: string,
  input: BulkResult
): Promise<{ recorded: number }> {
  return prisma.$transaction(async (tx) => {
    access = await lockForWrite(tx, access, "runs:execute")
    const run = await findRun(tx, access, ref)
    assertOpen(run, "recorded in")
    const rcs = await tx.runCase.findMany({
      where: { runId: run.id, id: { in: input.runCaseIds } },
      select: { id: true, revision: true },
    })
    if (rcs.length > 0) {
      await tx.testResult.createMany({
        data: rcs.map((rc) => ({
          runCaseId: rc.id,
          status: input.status,
          note: input.note,
          revision: rc.revision,
          recordedById: access.user.id,
        })),
      })
      await tx.runCase.updateMany({
        where: { id: { in: rcs.map((rc) => rc.id) } },
        data: {
          status: input.status,
          resultAt: new Date(),
          version: { increment: 1 },
        },
      })
      await touchRun(tx, run.id)
      await recordActivity(tx, {
        actorId: access.user.id,
        projectId: access.project.id,
        entityType: "run",
        entityId: run.id,
        action: "results_recorded",
        changes: {
          key: formatRunKey(access.project.key, run.number),
          status: input.status,
          count: rcs.length,
        },
      })
    }
    return { recorded: rcs.length }
  }, LONG_TX)
}

export async function assignCases(
  prisma: PrismaClient,
  access: ProjectAccess,
  ref: string,
  input: Assign
): Promise<{ assigned: number }> {
  return prisma.$transaction(async (tx) => {
    access = await lockForWrite(tx, access, "runs:execute")
    const run = await findRun(tx, access, ref)
    assertCanManage(access, run)
    assertOpen(run)
    if (input.assigneeId) {
      await checkAssignees(tx, access.project.id, [input.assigneeId])
    }
    const { count } = await tx.runCase.updateMany({
      where: { runId: run.id, id: { in: input.runCaseIds } },
      // Not a version change: assigning doesn't touch the result.
      data: { assigneeId: input.assigneeId },
    })
    if (count > 0) {
      const assignee = input.assigneeId
        ? await tx.user.findUnique({
            where: { id: input.assigneeId },
            select: { id: true, name: true },
          })
        : null
      await recordActivity(tx, {
        actorId: access.user.id,
        projectId: access.project.id,
        entityType: "run",
        entityId: run.id,
        action: "assigned",
        changes: {
          key: formatRunKey(access.project.key, run.number),
          assignee,
          count,
        },
      })
    }
    return { assigned: count }
  })
}

/** Adds the cases a selection picks that the run doesn't have yet, after the existing ones. */
export async function addCases(
  prisma: PrismaClient,
  access: ProjectAccess,
  ref: string,
  input: AddCases
): Promise<{ added: number }> {
  return prisma.$transaction(async (tx) => {
    access = await lockForWrite(tx, access, "runs:execute")
    const run = await findRun(tx, access, ref)
    assertCanManage(access, run)
    assertOpen(run)
    const existing = await tx.runCase.findMany({
      where: { runId: run.id },
      select: { caseId: true, position: true },
    })
    const have = new Set(existing.map((rc) => rc.caseId))
    const last = existing.reduce((max, rc) => Math.max(max, rc.position), 0)
    const fresh = (await selectCases(tx, access, input.selection)).filter(
      (c) => !have.has(c.id)
    )
    if (existing.length + fresh.length > MAX_RUN_CASES) {
      throw httpError(
        400,
        `A run can hold at most ${MAX_RUN_CASES.toLocaleString("en")} test cases; this one has ${existing.length.toLocaleString("en")}. Choose fewer.`
      )
    }
    if (fresh.length > 0) {
      await tx.runCase.createMany({
        data: fresh.map((c, i) => ({
          runId: run.id,
          caseId: c.id,
          position: last + i + 1,
          ...snapshotData(c),
        })),
      })
      await recordActivity(tx, {
        actorId: access.user.id,
        projectId: access.project.id,
        entityType: "run",
        entityId: run.id,
        action: "cases_added",
        changes: {
          key: formatRunKey(access.project.key, run.number),
          count: fresh.length,
        },
      })
    }
    return { added: fresh.length }
  }, LONG_TX)
}

/** Removes cases that have no results; cases with any result stay. */
export async function removeCases(
  prisma: PrismaClient,
  access: ProjectAccess,
  ref: string,
  runCaseIds: string[]
): Promise<{ removed: number; kept: number }> {
  return prisma.$transaction(async (tx) => {
    access = await lockForWrite(tx, access, "runs:execute")
    const run = await findRun(tx, access, ref)
    assertCanManage(access, run)
    assertOpen(run)
    const where = { runId: run.id, id: { in: runCaseIds } }
    const [found, empty] = [
      await tx.runCase.count({ where }),
      await tx.runCase.findMany({
        where: { ...where, results: { none: {} } },
        select: { id: true },
      }),
    ]
    const removable = empty.map((rc) => rc.id)
    if (removable.length > 0) {
      await tx.runCase.deleteMany({ where: { id: { in: removable } } })
      await recordActivity(tx, {
        actorId: access.user.id,
        projectId: access.project.id,
        entityType: "run",
        entityId: run.id,
        action: "cases_removed",
        changes: {
          key: formatRunKey(access.project.key, run.number),
          count: removable.length,
        },
      })
    }
    return { removed: removable.length, kept: found - removable.length }
  })
}

/**
 * Copies the case's current version into the run. If the case already had a
 * result, it goes back to untested (the old result stays in its history).
 */
export async function refreshCase(
  prisma: PrismaClient,
  access: ProjectAccess,
  ref: string,
  id: string,
  expectedVersion: number
): Promise<RunCaseDetail> {
  await prisma.$transaction(async (tx) => {
    access = await lockForWrite(tx, access, "runs:execute")
    const run = await findRun(tx, access, ref)
    assertOpen(run)
    const rc = await findRunCase(tx, run, id)
    await assertUnchanged(tx, rc, expectedVersion)
    const [latest] = await currentCases(tx, access.project.id, [rc.caseId])
    if (!latest) {
      throw httpError(
        409,
        "This test case has been archived, so there's no newer version to use"
      )
    }
    if (latest.revision === rc.revision) return
    await tx.runCase.update({
      where: { id: rc.id },
      data: {
        ...snapshotData(latest),
        status: "untested",
        resultAt: null,
        version: { increment: 1 },
      },
    })
    if (rc.status !== "untested") {
      await tx.testResult.create({
        data: {
          runCaseId: rc.id,
          status: "untested",
          note: `Reset to use version ${latest.revision}`,
          revision: latest.revision,
          recordedById: access.user.id,
        },
      })
    }
    await touchRun(tx, run.id)
  })
  return loadDetail(prisma, access, id)
}
