import {
  CASE_PRIORITY_LABELS,
  type CasePriority,
  matchEnumValue,
  findFileDuplicates,
  formatCaseKey,
  type ImportBatch,
  type ImportCheck,
  type ImportProblem,
  type importRequestSchema,
  type ImportResult,
  type ParsedImportCase,
  parseImportRow,
  suiteKey,
} from "@qa/shared"
import type { z } from "zod"
import { recordActivity } from "../../lib/activity.ts"
import { nextNumbers } from "../../lib/counters.ts"
import { httpError } from "../../lib/http-error.ts"
import type { Prisma, PrismaClient } from "../../lib/prisma.ts"
import { lockForWrite, type ProjectAccess } from "../projects/access.ts"
import { LONG_TX } from "./bulk.ts"
import { activeSuite, siblingNameTaken } from "./suites.ts"

type Db = PrismaClient | Prisma.TransactionClient
type ImportRequest = z.output<typeof importRequestSchema>

/** Where a row's case goes: an existing suite, a suite this import creates, or none. */
type Target = { suiteId: string | null } | { newSuite: string }

interface NewSuite {
  key: string
  name: string
  /** Display path, "Parent › Child". */
  path: string
  parent: { suiteId: string } | { newSuite: string } | null
}

interface Plan {
  check: ImportCheck
  cases: (ParsedImportCase & { target: Target })[]
  newSuites: NewSuite[]
}

/** A row's priority for the preview: the label when it's a known value, else as typed. */
function priorityText(raw: string): string {
  const known = matchEnumValue("priority", raw)
  return known ? CASE_PRIORITY_LABELS[known as CasePriority] : raw.trim()
}

const SEVERITY_ORDER = { error: 0, warning: 1, note: 2 } as const
const PREVIEW_ROWS = 10
const MAX_PREVIEW = 200

/**
 * Works out what an import would do: which rows fail and why, which suites it
 * creates, and which rows look like duplicates. The same plan drives the
 * check and, inside the write lock, the import itself.
 */
async function plan(
  db: Db,
  access: ProjectAccess,
  request: ImportRequest
): Promise<Plan> {
  const projectId = access.project.id
  const fallback = request.defaultSuiteId
    ? await activeSuite(db, projectId, request.defaultSuiteId)
    : null
  // Sequential: `db` may be a transaction, whose single connection can't run queries in parallel.
  const suites = await db.suite.findMany({
    where: { projectId, archivedAt: null },
    select: { id: true, name: true, parentId: true },
  })
  const existingCases = await db.testCase.findMany({
    where: { projectId, archivedAt: null },
    select: { number: true, title: true, suiteId: true },
  })
  const existing = new Map(
    suites.map((s) => [`${s.parentId ?? ""}/${suiteKey(s.name)}`, s])
  )
  const newSuites = new Map<string, NewSuite>()
  const problems: ImportProblem[] = []
  const cases: Plan["cases"] = []
  const display = new Map<number, string>()

  const resolve = (row: number, path: string[]): Target => {
    if (path.length === 0) return { suiteId: fallback?.id ?? null }
    let parent: NewSuite["parent"] = null
    let parentPath = ""
    for (const segment of path) {
      const key = suiteKey(segment)
      if (parent === null || "suiteId" in parent) {
        const found = existing.get(`${parent?.suiteId ?? ""}/${key}`)
        if (found) {
          if (found.name !== segment) {
            problems.push({
              row,
              severity: "note",
              message: `“${segment}” matched ${found.name}`,
            })
          }
          parent = { suiteId: found.id }
          parentPath = parentPath ? `${parentPath} › ${found.name}` : found.name
          continue
        }
      }
      const current: NewSuite["parent"] = parent
      const parentKey = current
        ? "suiteId" in current
          ? current.suiteId
          : current.newSuite
        : ""
      const newKey: string = `${parentKey}/${key}`
      const made = newSuites.get(newKey) ?? {
        key: newKey,
        name: segment,
        path: parentPath ? `${parentPath} › ${segment}` : segment,
        parent: current,
      }
      newSuites.set(newKey, made)
      parent = { newSuite: newKey }
      parentPath = made.path
    }
    display.set(row, parentPath)
    return parent!
  }

  const titlesBySuite = new Map<string, number>()
  for (const c of existingCases)
    titlesBySuite.set(`${c.suiteId ?? ""}/${suiteKey(c.title)}`, c.number)

  const parsed = request.rows.map((row) => ({
    input: row,
    ...parseImportRow(row),
  }))
  for (const { value, problems: rowProblems } of parsed) {
    problems.push(...rowProblems)
    if (!value) continue
    const target = resolve(value.row, value.suitePath)
    if ("suiteId" in target) {
      const twin = titlesBySuite.get(
        `${target.suiteId ?? ""}/${suiteKey(value.title)}`
      )
      if (twin) {
        problems.push({
          row: value.row,
          severity: "warning",
          message: `${formatCaseKey(access.project.key, twin)} has the same title in the same suite. This row will still be added as a new case.`,
        })
      }
    }
    cases.push({ ...value, target })
  }
  problems.push(...findFileDuplicates(cases))
  problems.sort(
    (a, b) =>
      a.row - b.row || SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  )

  const withProblems = new Set(problems.map((p) => p.row))
  const errorRows = new Set(
    problems.filter((p) => p.severity === "error").map((p) => p.row)
  )
  const byRow = new Map(cases.map((c) => [c.row, c]))
  const preview = parsed
    .filter(({ input }, i) => i < PREVIEW_ROWS || withProblems.has(input.row))
    .slice(0, MAX_PREVIEW)
    .map(({ input }) => {
      const c = byRow.get(input.row)
      return {
        row: input.row,
        title: c?.title ?? input.title.trim(),
        suite: c
          ? (display.get(c.row) ?? fallback?.name ?? "")
          : input.suite.trim(),
        priority: c
          ? CASE_PRIORITY_LABELS[c.priority]
          : priorityText(input.priority),
        stepCount: c?.steps.length ?? 0,
      }
    })

  return {
    check: {
      total: request.rows.length,
      errorRows: errorRows.size,
      problems,
      newSuites: [...newSuites.values()].map((s) => s.path),
      preview,
    },
    cases,
    newSuites: [...newSuites.values()],
  }
}

export async function checkImport(
  prisma: PrismaClient,
  access: ProjectAccess,
  request: ImportRequest
): Promise<ImportCheck> {
  return (await plan(prisma, access, request)).check
}

/** All or nothing: one transaction creates the suites, the cases and the batch. */
export async function runImport(
  prisma: PrismaClient,
  access: ProjectAccess,
  request: ImportRequest
): Promise<ImportResult> {
  return prisma.$transaction(async (tx) => {
    access = await lockForWrite(tx, access, "cases:edit", {
      scope: { cases: "write" },
    })
    const projectId = access.project.id
    const { check, cases, newSuites } = await plan(tx, access, request)
    if (check.errorRows > 0) {
      const n = check.errorRows
      throw httpError(
        400,
        `Fix ${n} ${n === 1 ? "row" : "rows"} before importing — nothing was imported.`
      )
    }
    const importNumber = await nextNumbers(tx, projectId, "import")
    const batch = await tx.importBatch.create({
      data: {
        projectId,
        number: importNumber,
        fileName: request.fileName,
        caseCount: cases.length,
        createdById: access.user.id,
      },
      select: { id: true },
    })

    // Parents come before their children in insertion order.
    const suiteIds = new Map<string, string>()
    for (const s of newSuites) {
      const parentId = s.parent
        ? "suiteId" in s.parent
          ? s.parent.suiteId
          : suiteIds.get(s.parent.newSuite)!
        : null
      const created = await tx.suite.create({
        data: {
          projectId,
          parentId,
          name: s.name,
          importBatchId: batch.id,
          createdById: access.user.id,
        },
        select: { id: true },
      })
      suiteIds.set(s.key, created.id)
      await recordActivity(tx, {
        actorId: access.user.id,
        projectId,
        entityType: "suite",
        entityId: created.id,
        action: "created",
        changes: { name: s.name, importNumber },
      })
    }

    const first = await nextNumbers(tx, projectId, "case", cases.length)
    await tx.testCase.createMany({
      data: cases.map((c, i) => ({
        projectId,
        number: first + i,
        suiteId:
          "suiteId" in c.target
            ? c.target.suiteId
            : suiteIds.get(c.target.newSuite)!,
        title: c.title,
        priority: c.priority,
        type: c.type,
        status: c.status,
        labels: c.labels,
        references: c.references,
        preconditions: c.preconditions,
        steps: c.steps as unknown as Prisma.InputJsonValue,
        importBatchId: batch.id,
        createdById: access.user.id,
        updatedById: access.user.id,
      })),
    })
    const created = await tx.testCase.findMany({
      where: { importBatchId: batch.id },
      select: { id: true, number: true, title: true },
    })
    const key = (n: number) => formatCaseKey(access.project.key, n)
    await tx.activityLog.createMany({
      data: created.map((c) => ({
        actorId: access.user.id,
        projectId,
        entityType: "case",
        inFeed: false,
        entityId: c.id,
        action: "created",
        changes: {
          key: key(c.number),
          title: c.title,
          importNumber,
          bulk: true,
        },
      })),
    })
    const result = {
      importNumber,
      created: cases.length,
      firstKey: key(first),
      lastKey: key(first + cases.length - 1),
      newSuites: check.newSuites,
    }
    await recordActivity(tx, {
      actorId: access.user.id,
      projectId,
      entityType: "import",
      entityId: batch.id,
      action: "created",
      changes: { ...result, fileName: request.fileName },
    })
    return result
  }, LONG_TX)
}

export async function listImports(
  prisma: PrismaClient,
  access: ProjectAccess
): Promise<ImportBatch[]> {
  const rows = await prisma.importBatch.findMany({
    where: { projectId: access.project.id },
    orderBy: { number: "desc" },
    take: 20,
    select: {
      number: true,
      fileName: true,
      caseCount: true,
      archivedAt: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true } },
    },
  })
  return rows.map(({ archivedAt, createdAt, ...row }) => ({
    ...row,
    archived: archivedAt !== null,
    createdAt: createdAt.toISOString(),
  }))
}

/** Archives every still-active case from an import, then its suites that are left empty. */
export async function archiveImport(
  prisma: PrismaClient,
  access: ProjectAccess,
  number: number
): Promise<{ archivedCases: number }> {
  return prisma.$transaction(async (tx) => {
    access = await lockForWrite(tx, access, "cases:archive", {
      scope: { cases: "write" },
    })
    const projectId = access.project.id
    const batch = await tx.importBatch.findUnique({
      where: { projectId_number: { projectId, number } },
      select: { id: true, archivedAt: true },
    })
    if (!batch) throw httpError(404, "Import not found")
    if (batch.archivedAt)
      throw httpError(409, `Import #${number} is already archived`)
    const now = new Date()
    const reason = `Import #${number} archived`
    const cases = await tx.testCase.findMany({
      where: { importBatchId: batch.id, archivedAt: null },
      select: { id: true, number: true },
    })
    await tx.testCase.updateMany({
      where: { id: { in: cases.map((c) => c.id) } },
      data: {
        archivedAt: now,
        archiveReason: reason,
        archivedSuiteId: null,
        updatedById: access.user.id,
        version: { increment: 1 },
      },
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
            reason,
            bulk: true,
          },
        })),
      })
    }
    // Sub-suites first, so a parent emptied by its children goes too.
    const suites = await tx.suite.findMany({
      where: { importBatchId: batch.id, archivedAt: null },
      select: { id: true, parentId: true },
      orderBy: { parentId: { sort: "asc", nulls: "last" } },
    })
    for (const suite of suites) {
      const activeCases = await tx.testCase.count({
        where: { suiteId: suite.id, archivedAt: null },
      })
      const activeChildren = await tx.suite.count({
        where: { parentId: suite.id, archivedAt: null },
      })
      if (activeCases === 0 && activeChildren === 0) {
        await tx.suite.update({
          where: { id: suite.id },
          data: { archivedAt: now, version: { increment: 1 } },
        })
      }
    }
    await tx.importBatch.update({
      where: { id: batch.id },
      data: { archivedAt: now },
    })
    await recordActivity(tx, {
      actorId: access.user.id,
      projectId,
      entityType: "import",
      entityId: batch.id,
      action: "archived",
      changes: { importNumber: number, cases: cases.length },
    })
    return { archivedCases: cases.length }
  }, LONG_TX)
}

/**
 * Undoes archiving an import: restores the cases that archiving it archived
 * (not ones archived separately, for another reason) and the suites they sit
 * in. Refuses, changing nothing, if a suite would clash with a newer one.
 */
export async function restoreImport(
  prisma: PrismaClient,
  access: ProjectAccess,
  number: number
): Promise<{ restoredCases: number }> {
  return prisma.$transaction(async (tx) => {
    access = await lockForWrite(tx, access, "cases:archive", {
      scope: { cases: "write" },
    })
    const projectId = access.project.id
    const batch = await tx.importBatch.findUnique({
      where: { projectId_number: { projectId, number } },
      select: { id: true, archivedAt: true },
    })
    if (!batch) throw httpError(404, "Import not found")
    if (!batch.archivedAt) {
      throw httpError(409, `Import #${number} isn't archived`)
    }
    const cases = await tx.testCase.findMany({
      where: {
        importBatchId: batch.id,
        archivedAt: { not: null },
        archiveReason: `Import #${number} archived`,
      },
      select: { id: true, number: true, suiteId: true },
    })

    // The suites those cases are in, and their parents, top-level first.
    const suiteIds = new Set<string>()
    let pending = [
      ...new Set(cases.flatMap((c) => (c.suiteId ? [c.suiteId] : []))),
    ]
    while (pending.length > 0) {
      const found = await tx.suite.findMany({
        where: { id: { in: pending }, projectId },
        select: { id: true, parentId: true },
      })
      found.forEach((s) => suiteIds.add(s.id))
      pending = found.flatMap((s) =>
        s.parentId && !suiteIds.has(s.parentId) ? [s.parentId] : []
      )
    }
    const archivedSuites = (
      await tx.suite.findMany({
        where: { id: { in: [...suiteIds] }, archivedAt: { not: null } },
        select: { id: true, name: true, parentId: true },
      })
    ).sort((a, b) => Number(a.parentId !== null) - Number(b.parentId !== null))
    for (const suite of archivedSuites) {
      if (await siblingNameTaken(tx, projectId, suite.parentId, suite.name)) {
        throw httpError(
          409,
          `Its suite “${suite.name}” was archived and another suite now has that name. Rename one of them first.`
        )
      }
      await tx.suite.update({
        where: { id: suite.id },
        data: { archivedAt: null, version: { increment: 1 } },
      })
    }

    await tx.testCase.updateMany({
      where: { id: { in: cases.map((c) => c.id) } },
      data: {
        archivedAt: null,
        archiveReason: "",
        archivedSuiteId: null,
        updatedById: access.user.id,
        version: { increment: 1 },
      },
    })
    if (cases.length > 0) {
      await tx.activityLog.createMany({
        data: cases.map((c) => ({
          actorId: access.user.id,
          projectId,
          entityType: "case",
          inFeed: false,
          entityId: c.id,
          action: "restored",
          changes: {
            key: formatCaseKey(access.project.key, c.number),
            importNumber: number,
            bulk: true,
          },
        })),
      })
    }
    await tx.importBatch.update({
      where: { id: batch.id },
      data: { archivedAt: null },
    })
    await recordActivity(tx, {
      actorId: access.user.id,
      projectId,
      entityType: "import",
      entityId: batch.id,
      action: "restored",
      changes: { importNumber: number, cases: cases.length },
    })
    return { restoredCases: cases.length }
  }, LONG_TX)
}
