import { formatCaseKey, type Suite, suiteKey } from "@qa/shared"
import { diff, recordActivity, staleChange } from "../../lib/activity.ts"
import { httpError } from "../../lib/http-error.ts"
import type { Prisma, PrismaClient } from "../../lib/prisma.ts"
import { lockForWrite, type ProjectAccess } from "../projects/access.ts"

type Db = PrismaClient | Prisma.TransactionClient

const SUITE_SELECT = {
  id: true,
  name: true,
  parentId: true,
  version: true,
} as const satisfies Prisma.SuiteSelect

const sameName = (a: string, b: string) => suiteKey(a) === suiteKey(b)

/**
 * Active suites, by name, with their direct active case counts, plus how
 * many active cases have no suite and how many cases are archived.
 */
export async function listSuites(
  prisma: PrismaClient,
  access: ProjectAccess
): Promise<{ items: Suite[]; noSuiteCount: number; archivedCount: number }> {
  const projectId = access.project.id
  const [suites, counts, archivedCount] = await Promise.all([
    prisma.suite.findMany({
      where: { projectId, archivedAt: null },
      select: SUITE_SELECT,
    }),
    prisma.testCase.groupBy({
      by: ["suiteId"],
      where: { projectId, archivedAt: null },
      _count: { _all: true },
    }),
    prisma.testCase.count({ where: { projectId, archivedAt: { not: null } } }),
  ])
  const countBy = new Map(counts.map((c) => [c.suiteId, c._count._all]))
  const items = suites
    .map((s) => ({ ...s, caseCount: countBy.get(s.id) ?? 0 }))
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) ||
        a.id.localeCompare(b.id)
    )
  return { items, noSuiteCount: countBy.get(null) ?? 0, archivedCount }
}

/** An active suite of this project, or a 400 naming what was wrong. */
export async function activeSuite(
  db: Db,
  projectId: string,
  id: string,
  what = "suite"
) {
  const suite = await db.suite.findFirst({
    where: { id, projectId, archivedAt: null },
    select: { id: true, name: true, parentId: true },
  })
  if (!suite) throw httpError(400, `Choose an active ${what} in this project`)
  return suite
}

/** Whether an active sibling already has this name (ignoring case and spacing). */
export async function siblingNameTaken(
  tx: Prisma.TransactionClient,
  projectId: string,
  parentId: string | null,
  name: string,
  exceptId?: string
): Promise<boolean> {
  const siblings = await tx.suite.findMany({
    where: {
      projectId,
      parentId,
      archivedAt: null,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { name: true },
  })
  return siblings.some((s) => sameName(s.name, name))
}

async function assertNameFree(
  tx: Prisma.TransactionClient,
  projectId: string,
  parentId: string | null,
  name: string,
  exceptId?: string
) {
  if (await siblingNameTaken(tx, projectId, parentId, name, exceptId)) {
    throw httpError(409, `There's already a suite called “${name}” here`)
  }
}

/** A parent must be an active top-level suite (one level of nesting). */
async function checkParent(
  tx: Prisma.TransactionClient,
  projectId: string,
  parentId: string
) {
  const parent = await activeSuite(tx, projectId, parentId, "parent suite")
  if (parent.parentId) {
    throw httpError(400, "Suites can only be nested one level deep")
  }
  return parent
}

export async function createSuite(
  prisma: PrismaClient,
  access: ProjectAccess,
  input: { name: string; parentId: string | null }
): Promise<Suite> {
  return prisma.$transaction(async (tx) => {
    access = await lockForWrite(tx, access, "cases:edit", {
      scope: { cases: "write" },
    })
    const projectId = access.project.id
    if (input.parentId) await checkParent(tx, projectId, input.parentId)
    await assertNameFree(tx, projectId, input.parentId, input.name)
    const suite = await tx.suite.create({
      data: {
        projectId,
        name: input.name,
        parentId: input.parentId,
        createdById: access.user.id,
      },
      select: SUITE_SELECT,
    })
    await recordActivity(tx, {
      actorId: access.user.id,
      projectId,
      entityType: "suite",
      entityId: suite.id,
      action: "created",
      changes: { name: suite.name },
    })
    return { ...suite, caseCount: 0 }
  })
}

export async function updateSuite(
  prisma: PrismaClient,
  access: ProjectAccess,
  id: string,
  input: { name: string; parentId: string | null; version: number }
): Promise<Suite> {
  return prisma.$transaction(async (tx) => {
    access = await lockForWrite(tx, access, "cases:edit", {
      scope: { cases: "write" },
    })
    const projectId = access.project.id
    const before = await tx.suite.findFirst({
      where: { id, projectId, archivedAt: null },
      select: {
        ...SUITE_SELECT,
        children: { select: { id: true, archivedAt: true } },
      },
    })
    if (!before) throw httpError(404, "Suite not found")
    if (input.parentId && input.parentId !== before.parentId) {
      if (input.parentId === id)
        throw httpError(400, "A suite can't be inside itself")
      await checkParent(tx, projectId, input.parentId)
      if (before.children.some((c) => !c.archivedAt)) {
        throw httpError(
          400,
          "Move or archive its sub-suites first — suites can only be nested one level deep"
        )
      }
      // Archived sub-suites stay behind at the top level, so restoring one
      // later can't nest it two levels deep.
      if (before.children.length > 0) {
        await tx.suite.updateMany({
          where: { parentId: id },
          data: { parentId: null, version: { increment: 1 } },
        })
      }
    }
    await assertNameFree(tx, projectId, input.parentId, input.name, id)
    const { count } = await tx.suite.updateMany({
      where: { id, version: input.version },
      data: {
        name: input.name,
        parentId: input.parentId,
        version: { increment: 1 },
      },
    })
    if (count === 0) throw await staleChange(tx, "suite", id, "suite")
    const changes = diff(before, input, ["name", "parentId"])
    if (Object.keys(changes).length > 0) {
      await recordActivity(tx, {
        actorId: access.user.id,
        projectId,
        entityType: "suite",
        entityId: id,
        action: "updated",
        changes: { name: input.name, ...changes },
      })
    }
    const suite = await tx.suite.findUniqueOrThrow({
      where: { id },
      select: SUITE_SELECT,
    })
    const caseCount = await tx.testCase.count({
      where: { suiteId: id, archivedAt: null },
    })
    return { ...suite, caseCount }
  })
}

/** Archives a suite, its sub-suites and every active case in them. */
export async function archiveSuite(
  prisma: PrismaClient,
  access: ProjectAccess,
  id: string
): Promise<{ archivedCases: number }> {
  return prisma.$transaction(async (tx) => {
    access = await lockForWrite(tx, access, "cases:archive", {
      scope: { cases: "write" },
    })
    const projectId = access.project.id
    const suite = await tx.suite.findFirst({
      where: { id, projectId, archivedAt: null },
      select: {
        id: true,
        name: true,
        children: { where: { archivedAt: null }, select: { id: true } },
      },
    })
    if (!suite) throw httpError(404, "Suite not found")
    const suiteIds = [suite.id, ...suite.children.map((c) => c.id)]
    const now = new Date()
    const cases = await tx.testCase.findMany({
      where: { suiteId: { in: suiteIds }, archivedAt: null },
      select: { id: true, number: true },
    })
    await tx.testCase.updateMany({
      where: { id: { in: cases.map((c) => c.id) } },
      data: {
        archivedAt: now,
        archiveReason: `Suite “${suite.name}” archived`,
        archivedSuiteId: suite.id,
        updatedById: access.user.id,
        version: { increment: 1 },
      },
    })
    await tx.suite.updateMany({
      where: { id: { in: suiteIds } },
      data: { archivedAt: now, version: { increment: 1 } },
    })
    await recordActivity(tx, {
      actorId: access.user.id,
      projectId,
      entityType: "suite",
      entityId: suite.id,
      action: "archived",
      changes: { name: suite.name, cases: cases.length },
    })
    if (cases.length > 0) {
      await tx.activityLog.createMany({
        data: cases.map((c) => ({
          actorId: access.user.id,
          projectId,
          entityType: "case",
          inFeed: false,
          entityId: c.id,
          action: "archived",
          changes: {
            key: formatCaseKey(access.project.key, c.number),
            reason: `Suite “${suite.name}” archived`,
            bulk: true,
          },
        })),
      })
    }
    return { archivedCases: cases.length }
  })
}
