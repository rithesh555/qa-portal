import {
  type ActivityItem,
  type CaseFields,
  type CaseFilter,
  type CaseListQuery,
  type CaseStep,
  type CaseSummary,
  type ExportableCase,
  formatCaseKey,
  MAX_EXPORT,
  type Page,
  parseCaseRef,
  type TestCase,
} from "@qa/shared"
import { recordActivity } from "../../lib/activity.ts"
import { nextNumbers } from "../../lib/counters.ts"
import { httpError } from "../../lib/http-error.ts"
import type { Prisma, PrismaClient } from "../../lib/prisma.ts"
import { lockForWrite, type ProjectAccess } from "../projects/access.ts"
import { activeSuite, siblingNameTaken } from "./suites.ts"

type Db = PrismaClient | Prisma.TransactionClient

export const SUMMARY_SELECT = {
  id: true,
  number: true,
  title: true,
  suiteId: true,
  priority: true,
  type: true,
  status: true,
  labels: true,
  archivedAt: true,
  steps: true,
  updatedAt: true,
} as const satisfies Prisma.TestCaseSelect

const CASE_SELECT = {
  ...SUMMARY_SELECT,
  references: true,
  preconditions: true,
  revision: true,
  version: true,
  archiveReason: true,
  archivedSuiteId: true,
  createdAt: true,
  createdBy: { select: { id: true, name: true } },
  updatedBy: { select: { id: true, name: true } },
  duplicatedFrom: { select: { number: true } },
  importBatch: { select: { number: true } },
} as const satisfies Prisma.TestCaseSelect

type SummaryRow = Prisma.TestCaseGetPayload<{ select: typeof SUMMARY_SELECT }>
type CaseRow = Prisma.TestCaseGetPayload<{ select: typeof CASE_SELECT }>

export const stepsOf = (row: { steps: Prisma.JsonValue }) =>
  row.steps as unknown as CaseStep[]

function toSummary(row: SummaryRow, projectKey: string): CaseSummary {
  return {
    id: row.id,
    number: row.number,
    key: formatCaseKey(projectKey, row.number),
    title: row.title,
    suiteId: row.suiteId,
    priority: row.priority,
    type: row.type,
    status: row.status,
    labels: row.labels,
    archived: row.archivedAt !== null,
    stepCount: stepsOf(row).length,
    updatedAt: row.updatedAt.toISOString(),
  }
}

function toCase(row: CaseRow, projectKey: string): TestCase {
  return {
    ...toSummary(row, projectKey),
    references: row.references,
    preconditions: row.preconditions,
    steps: stepsOf(row),
    revision: row.revision,
    version: row.version,
    archiveReason: row.archiveReason,
    duplicatedFrom: row.duplicatedFrom
      ? formatCaseKey(projectKey, row.duplicatedFrom.number)
      : null,
    importNumber: row.importBatch?.number ?? null,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt.toISOString(),
  }
}

/** The Prisma filter for the case list, "select all matching" and export. */
export async function caseWhere(
  db: Db,
  access: ProjectAccess,
  filter: CaseFilter
): Promise<Prisma.TestCaseWhereInput> {
  const projectId = access.project.id
  const where: Prisma.TestCaseWhereInput = { projectId }
  if (filter.status === "archived") where.archivedAt = { not: null }
  else {
    where.archivedAt = null
    if (filter.status) where.status = filter.status
  }
  if (filter.suite === "none") where.suiteId = null
  else if (filter.suite !== "all") {
    // A top-level suite includes its sub-suites' cases.
    const children = await db.suite.findMany({
      where: { projectId, parentId: filter.suite },
      select: { id: true },
    })
    where.suiteId = { in: [filter.suite, ...children.map((c) => c.id)] }
  }
  if (filter.q) {
    const number = parseCaseRef(access.project.key, filter.q)
    where.OR = [
      { title: { contains: filter.q, mode: "insensitive" } },
      ...(number ? [{ number }] : []),
    ]
  }
  if (filter.priority) where.priority = filter.priority
  if (filter.type) where.type = filter.type
  if (filter.label) where.labels = { has: filter.label }
  return where
}

export async function listCases(
  prisma: PrismaClient,
  access: ProjectAccess,
  query: CaseListQuery & { q?: string }
): Promise<Page<CaseSummary>> {
  const where = await caseWhere(prisma, access, query)
  const [total, rows] = await prisma.$transaction([
    prisma.testCase.count({ where }),
    prisma.testCase.findMany({
      where,
      select: SUMMARY_SELECT,
      orderBy: [{ [query.sort]: query.order }, { number: "asc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ])
  return {
    items: rows.map((row) => toSummary(row, access.project.key)),
    total,
    page: query.page,
    pageSize: query.pageSize,
  }
}

function caseNumber(access: ProjectAccess, ref: string): number {
  const number = parseCaseRef(access.project.key, ref)
  if (!number) throw httpError(404, "Test case not found")
  return number
}

async function findCase(
  prisma: PrismaClient,
  access: ProjectAccess,
  ref: string
): Promise<CaseRow> {
  const row = await prisma.testCase.findUnique({
    where: {
      projectId_number: {
        projectId: access.project.id,
        number: caseNumber(access, ref),
      },
    },
    select: CASE_SELECT,
  })
  if (!row) throw httpError(404, "Test case not found")
  return row
}

/**
 * The columns writes need, without relations: inside a transaction Prisma
 * fetches relations in parallel on its single connection, which pg deprecates.
 */
const WRITE_SELECT = {
  ...SUMMARY_SELECT,
  references: true,
  preconditions: true,
  revision: true,
  version: true,
} as const satisfies Prisma.TestCaseSelect

async function findCaseForWrite(
  tx: Prisma.TransactionClient,
  access: ProjectAccess,
  ref: string
) {
  const row = await tx.testCase.findUnique({
    where: {
      projectId_number: {
        projectId: access.project.id,
        number: caseNumber(access, ref),
      },
    },
    select: WRITE_SELECT,
  })
  if (!row) throw httpError(404, "Test case not found")
  return row
}

export async function getCase(
  prisma: PrismaClient,
  access: ProjectAccess,
  ref: string
): Promise<TestCase> {
  return toCase(await findCase(prisma, access, ref), access.project.key)
}

async function refetch(
  prisma: PrismaClient,
  access: ProjectAccess,
  id: string
): Promise<TestCase> {
  const row = await prisma.testCase.findUniqueOrThrow({
    where: { id },
    select: CASE_SELECT,
  })
  return toCase(row, access.project.key)
}

function caseData(input: CaseFields) {
  return {
    title: input.title,
    suiteId: input.suiteId,
    priority: input.priority,
    type: input.type,
    status: input.status,
    labels: input.labels,
    references: input.references,
    preconditions: input.preconditions,
    steps: input.steps as unknown as Prisma.InputJsonValue,
  }
}

async function insertCase(
  tx: Prisma.TransactionClient,
  access: ProjectAccess,
  input: CaseFields,
  extra: { duplicatedFrom?: { id: string; number: number } } = {}
): Promise<string> {
  const projectId = access.project.id
  if (input.suiteId) await activeSuite(tx, projectId, input.suiteId)
  const number = await nextNumbers(tx, projectId, "case")
  const created = await tx.testCase.create({
    data: {
      ...caseData(input),
      projectId,
      number,
      createdById: access.user.id,
      updatedById: access.user.id,
      duplicatedFromId: extra.duplicatedFrom?.id ?? null,
    },
    select: { id: true },
  })
  const key = formatCaseKey(access.project.key, number)
  await recordActivity(tx, {
    actorId: access.user.id,
    projectId,
    entityType: "case",
    entityId: created.id,
    action: "created",
    changes: {
      key,
      title: input.title,
      ...(extra.duplicatedFrom
        ? {
            duplicatedFrom: formatCaseKey(
              access.project.key,
              extra.duplicatedFrom.number
            ),
          }
        : {}),
    },
  })
  return created.id
}

export async function createCase(
  prisma: PrismaClient,
  access: ProjectAccess,
  input: CaseFields
): Promise<TestCase> {
  const id = await prisma.$transaction(async (tx) => {
    access = await lockForWrite(tx, access, "cases:edit", {
      scope: { cases: "write" },
    })
    return insertCase(tx, access, input)
  })
  return refetch(prisma, access, id)
}

export async function duplicateCase(
  prisma: PrismaClient,
  access: ProjectAccess,
  ref: string
): Promise<TestCase> {
  const id = await prisma.$transaction(async (tx) => {
    access = await lockForWrite(tx, access, "cases:edit", {
      scope: { cases: "write" },
    })
    const source = await findCaseForWrite(tx, access, ref)
    if (source.archivedAt)
      throw httpError(409, "Restore this test case before duplicating it")
    const suffix = " (copy)"
    return insertCase(
      tx,
      access,
      {
        title: source.title.slice(0, 200 - suffix.length) + suffix,
        suiteId: source.suiteId,
        priority: source.priority,
        type: source.type,
        status: "draft",
        labels: source.labels,
        references: source.references,
        preconditions: source.preconditions,
        steps: stepsOf(source),
      },
      { duplicatedFrom: source }
    )
  })
  return refetch(prisma, access, id)
}

/** "step 2", "step 3 expected result", "added step 4", "removed step 5", or "reordered the steps". */
export function describeStepChanges(
  before: CaseStep[],
  after: CaseStep[]
): string[] {
  const key = (step: CaseStep) => JSON.stringify([step.action, step.expected])
  const sameSteps =
    before.length === after.length &&
    JSON.stringify(before.map(key).sort()) ===
      JSON.stringify(after.map(key).sort())
  if (sameSteps && before.some((step, i) => key(step) !== key(after[i]!))) {
    return ["reordered the steps"]
  }
  const out: string[] = []
  for (let i = 0; i < Math.max(before.length, after.length); i++) {
    const a = before[i]
    const b = after[i]
    if (!a) out.push(`added step ${i + 1}`)
    else if (!b) out.push(`removed step ${i + 1}`)
    else if (a.action !== b.action) out.push(`step ${i + 1}`)
    else if (a.expected !== b.expected)
      out.push(`step ${i + 1} expected result`)
  }
  return out
}

const STALE = () =>
  httpError(
    409,
    "Someone saved a newer version of this test case. Compare their changes before saving yours."
  )

const ARCHIVED = () =>
  httpError(409, "This test case is archived. Restore it to change it.")

async function suiteName(db: Db, id: string | null) {
  if (!id) return null
  return (
    (await db.suite.findUnique({ where: { id }, select: { name: true } }))
      ?.name ?? null
  )
}

export async function updateCase(
  prisma: PrismaClient,
  access: ProjectAccess,
  ref: string,
  input: CaseFields & { version: number; overwrite: boolean }
): Promise<TestCase> {
  const id = await prisma.$transaction(async (tx) => {
    access = await lockForWrite(tx, access, "cases:edit", {
      scope: { cases: "write" },
    })
    const before = await findCaseForWrite(tx, access, ref)
    if (before.archivedAt) throw ARCHIVED()
    if (before.version !== input.version) throw STALE()
    if (input.suiteId && input.suiteId !== before.suiteId) {
      await activeSuite(tx, access.project.id, input.suiteId)
    }
    const beforeSteps = stepsOf(before)
    const stepChanges = describeStepChanges(beforeSteps, input.steps)
    const contentChanged =
      before.title !== input.title ||
      before.preconditions !== input.preconditions ||
      stepChanges.length > 0
    const { count } = await tx.testCase.updateMany({
      where: { id: before.id, version: input.version },
      data: {
        ...caseData(input),
        updatedById: access.user.id,
        version: { increment: 1 },
        ...(contentChanged ? { revision: { increment: 1 } } : {}),
      },
    })
    if (count === 0) throw STALE()

    const changes: Record<string, unknown> = {}
    for (const field of [
      "title",
      "priority",
      "type",
      "status",
      "references",
      "preconditions",
    ] as const) {
      if (before[field] !== input[field])
        changes[field] = { from: before[field], to: input[field] }
    }
    if (before.suiteId !== input.suiteId) {
      changes.suite = {
        from: await suiteName(tx, before.suiteId),
        to: await suiteName(tx, input.suiteId),
      }
    }
    const added = input.labels.filter((l) => !before.labels.includes(l))
    const removed = before.labels.filter((l) => !input.labels.includes(l))
    if (added.length + removed.length > 0) changes.labels = { added, removed }
    if (stepChanges.length > 0) changes.steps = stepChanges
    if (Object.keys(changes).length > 0) {
      if (contentChanged) changes.revision = before.revision + 1
      if (input.overwrite) changes.overwrote = true
      await recordActivity(tx, {
        actorId: access.user.id,
        projectId: access.project.id,
        entityType: "case",
        entityId: before.id,
        action: "updated",
        changes: {
          key: formatCaseKey(access.project.key, before.number),
          ...changes,
        },
      })
    }
    return before.id
  })
  return refetch(prisma, access, id)
}

export async function archiveCase(
  prisma: PrismaClient,
  access: ProjectAccess,
  ref: string,
  reason: string
): Promise<TestCase> {
  const id = await prisma.$transaction(async (tx) => {
    access = await lockForWrite(tx, access, "cases:archive", {
      scope: { cases: "write" },
    })
    const row = await findCaseForWrite(tx, access, ref)
    if (row.archivedAt) return row.id
    await tx.testCase.update({
      where: { id: row.id },
      data: {
        archivedAt: new Date(),
        archiveReason: reason,
        archivedSuiteId: null,
        updatedById: access.user.id,
        version: { increment: 1 },
      },
    })
    await recordActivity(tx, {
      actorId: access.user.id,
      projectId: access.project.id,
      entityType: "case",
      entityId: row.id,
      action: "archived",
      changes: {
        key: formatCaseKey(access.project.key, row.number),
        ...(reason ? { reason } : {}),
      },
    })
    return row.id
  })
  return refetch(prisma, access, id)
}

/** Restores a case; if its suite (or that suite's parent) was archived, that comes back too. */
export async function restoreCase(
  prisma: PrismaClient,
  access: ProjectAccess,
  ref: string
): Promise<TestCase> {
  const id = await prisma.$transaction(async (tx) => {
    access = await lockForWrite(tx, access, "cases:archive", {
      scope: { cases: "write" },
    })
    const row = await findCaseForWrite(tx, access, ref)
    if (!row.archivedAt) return row.id
    let suiteId = row.suiteId
    const restoredSuites: string[] = []
    while (suiteId) {
      const suite = await tx.suite.findUniqueOrThrow({
        where: { id: suiteId },
        select: { id: true, name: true, parentId: true, archivedAt: true },
      })
      if (suite.archivedAt) {
        const clash = await siblingNameTaken(
          tx,
          access.project.id,
          suite.parentId,
          suite.name
        )
        if (clash) {
          throw httpError(
            409,
            `Its suite “${suite.name}” was archived and another suite now has that name. Rename one of them first.`
          )
        }
        await tx.suite.update({
          where: { id: suite.id },
          data: { archivedAt: null, version: { increment: 1 } },
        })
        restoredSuites.push(suite.name)
      }
      suiteId = suite.parentId
    }
    await tx.testCase.update({
      where: { id: row.id },
      data: {
        archivedAt: null,
        archiveReason: "",
        archivedSuiteId: null,
        updatedById: access.user.id,
        version: { increment: 1 },
      },
    })
    await recordActivity(tx, {
      actorId: access.user.id,
      projectId: access.project.id,
      entityType: "case",
      entityId: row.id,
      action: "restored",
      changes: {
        key: formatCaseKey(access.project.key, row.number),
        ...(restoredSuites.length > 0 ? { restoredSuites } : {}),
      },
    })
    return row.id
  })
  return refetch(prisma, access, id)
}

export async function caseHistory(
  prisma: PrismaClient,
  access: ProjectAccess,
  ref: string
): Promise<ActivityItem[]> {
  const row = await findCase(prisma, access, ref)
  const entries = await prisma.activityLog.findMany({
    where: {
      projectId: access.project.id,
      entityType: "case",
      entityId: row.id,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      changes: true,
      createdAt: true,
      actor: { select: { id: true, name: true } },
    },
  })
  return entries.map((entry) => ({
    ...entry,
    changes: (entry.changes as Record<string, unknown> | null) ?? null,
    createdAt: entry.createdAt.toISOString(),
  }))
}

/** Labels on active cases, alphabetically: suggestions for the editor and the filter. */
export async function listLabels(
  prisma: PrismaClient,
  access: ProjectAccess
): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ label: string }[]>`
    SELECT DISTINCT unnest(labels) AS label FROM test_cases
    WHERE project_id = ${access.project.id}::uuid AND archived_at IS NULL
    ORDER BY label
    LIMIT 500`
  return rows.map((r) => r.label)
}

/** Every case matching the list filters, for the browser to turn into CSV/Excel. */
export async function exportCases(
  prisma: PrismaClient,
  access: ProjectAccess,
  filter: CaseFilter
): Promise<ExportableCase[]> {
  const where = await caseWhere(prisma, access, filter)
  const total = await prisma.testCase.count({ where })
  if (total > MAX_EXPORT) {
    throw httpError(
      400,
      `That's ${total.toLocaleString("en")} test cases. Export at most ${MAX_EXPORT.toLocaleString("en")} at a time — pick a suite or filter.`
    )
  }
  const rows = await prisma.testCase.findMany({
    where,
    orderBy: { number: "asc" },
    select: {
      number: true,
      title: true,
      priority: true,
      type: true,
      status: true,
      labels: true,
      references: true,
      preconditions: true,
      steps: true,
      suite: { select: { name: true, parent: { select: { name: true } } } },
    },
  })
  return rows.map((row) => ({
    key: formatCaseKey(access.project.key, row.number),
    title: row.title,
    suitePath: row.suite
      ? [row.suite.parent?.name, row.suite.name].filter(Boolean).join(" › ")
      : "",
    priority: row.priority,
    type: row.type,
    status: row.status,
    labels: row.labels,
    references: row.references,
    preconditions: row.preconditions,
    steps: stepsOf(row),
  }))
}
