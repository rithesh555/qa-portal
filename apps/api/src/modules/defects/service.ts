import {
  can,
  type commentSchema,
  type createDefectSchema,
  DEFECT_STATUS_LABELS,
  DEFECT_STATUSES,
  isActiveDefect,
  type Defect,
  type DefectActivity,
  type DefectListQuery,
  type DefectRef,
  type DefectStatus,
  type DefectSummary,
  findTransition,
  formatCaseKey,
  formatDefectKey,
  formatRunKey,
  type logDefectSchema,
  type Page,
  parseDefectRef,
  type transitionSchema,
  type updateDefectSchema,
} from "@qa/shared"
import type { z } from "zod"
import { recordActivity } from "../../lib/activity.ts"
import { nextNumbers } from "../../lib/counters.ts"
import { httpError } from "../../lib/http-error.ts"
import type { Prisma, PrismaClient } from "../../lib/prisma.ts"
import { lockForWrite, type ProjectAccess } from "../projects/access.ts"
import { checkAssignees, checkRelease } from "../runs/service.ts"

type Db = PrismaClient | Prisma.TransactionClient
type Tx = Prisma.TransactionClient
type CreateDefect = z.output<typeof createDefectSchema>
type LogDefect = z.output<typeof logDefectSchema>
type UpdateDefect = z.output<typeof updateDefectSchema>
type Transition = z.output<typeof transitionSchema>
type Comment = z.output<typeof commentSchema>

const ACTIVE = DEFECT_STATUSES.filter(isActiveDefect)
const DONE = DEFECT_STATUSES.filter((s) => !isActiveDefect(s))

const ASSIGNEE_RULE =
  "Assign defects only to active QA Leads and Testers of this project"
const checkDefectAssignee = (tx: Tx, projectId: string, userId: string) =>
  checkAssignees(tx, projectId, [userId], ASSIGNEE_RULE)

/** Lists sort by last update: links and comments count as updates. */
const touch = (tx: Tx, id: string) =>
  tx.defect.update({ where: { id }, data: { updatedAt: new Date() } })

const person = { select: { id: true, name: true } } as const
const releaseRef = { select: { id: true, name: true } } as const

const SUMMARY_SELECT = {
  id: true,
  number: true,
  title: true,
  status: true,
  severity: true,
  priority: true,
  environment: true,
  detectedIn: true,
  createdAt: true,
  updatedAt: true,
  assignee: person,
  reporter: person,
  foundInRelease: releaseRef,
  foundInRun: { select: { number: true } },
  _count: { select: { links: true } },
} as const satisfies Prisma.DefectSelect

type SummaryRow = Prisma.DefectGetPayload<{ select: typeof SUMMARY_SELECT }>

const DEFECT_SELECT = {
  ...SUMMARY_SELECT,
  description: true,
  steps: true,
  expected: true,
  actual: true,
  reproducibility: true,
  developer: true,
  trackerUrl: true,
  source: true,
  resolution: true,
  fixedInBuild: true,
  reopenCount: true,
  openedAt: true,
  fixedAt: true,
  closedAt: true,
  version: true,
  case: { select: { id: true, number: true, title: true } },
  duplicateOf: { select: { id: true, number: true, title: true } },
  fixedInRelease: releaseRef,
  statusChanges: { select: { toStatus: true }, orderBy: { at: "asc" } },
  links: {
    orderBy: { linkedAt: "asc" },
    select: {
      id: true,
      kind: true,
      linkedAt: true,
      linkedBy: person,
      run: { select: { number: true } },
      runCase: {
        select: { id: true, title: true, case: { select: { number: true } } },
      },
      result: {
        select: {
          id: true,
          note: true,
          failedStep: true,
          recordedAt: true,
          recordedBy: person,
        },
      },
    },
  },
} as const satisfies Prisma.DefectSelect

type DefectRow = Prisma.DefectGetPayload<{ select: typeof DEFECT_SELECT }>

function toSummary(row: SummaryRow, key: string): DefectSummary {
  return {
    id: row.id,
    number: row.number,
    key: formatDefectKey(key, row.number),
    title: row.title,
    status: row.status,
    severity: row.severity,
    priority: row.priority,
    assignee: row.assignee,
    reporter: row.reporter,
    foundInRelease: row.foundInRelease,
    foundInRun: row.foundInRun
      ? { key: formatRunKey(key, row.foundInRun.number) }
      : null,
    environment: row.environment,
    detectedIn: row.detectedIn,
    linkCount: row._count.links,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

const iso = (d: Date | null) => (d ? d.toISOString() : null)

function toDefect(row: DefectRow, key: string): Defect {
  return {
    ...toSummary(row, key),
    description: row.description,
    steps: row.steps,
    expected: row.expected,
    actual: row.actual,
    reproducibility: row.reproducibility,
    developer: row.developer,
    trackerUrl: row.trackerUrl,
    source: row.source,
    case: row.case
      ? {
          id: row.case.id,
          key: formatCaseKey(key, row.case.number),
          title: row.case.title,
        }
      : null,
    resolution: row.resolution,
    duplicateOf: row.duplicateOf
      ? {
          id: row.duplicateOf.id,
          key: formatDefectKey(key, row.duplicateOf.number),
          title: row.duplicateOf.title,
        }
      : null,
    fixedInRelease: row.fixedInRelease,
    fixedInBuild: row.fixedInBuild,
    reopenCount: row.reopenCount,
    openedAt: iso(row.openedAt),
    fixedAt: iso(row.fixedAt),
    closedAt: iso(row.closedAt),
    links: row.links.map((l) => ({
      id: l.id,
      resultId: l.result.id,
      kind: l.kind,
      runKey: formatRunKey(key, l.run.number),
      runCaseId: l.runCase.id,
      caseKey: formatCaseKey(key, l.runCase.case.number),
      caseTitle: l.runCase.title,
      failedStep: l.result.failedStep,
      note: l.result.note,
      recordedBy: l.result.recordedBy,
      recordedAt: l.result.recordedAt.toISOString(),
      linkedBy: l.linkedBy,
      linkedAt: l.linkedAt.toISOString(),
    })),
    path: row.statusChanges.map((c) => c.toStatus),
    version: row.version,
  }
}

async function load(prisma: PrismaClient, access: ProjectAccess, id: string) {
  const row = await prisma.defect.findUniqueOrThrow({
    where: { id },
    select: DEFECT_SELECT,
  })
  return toDefect(row, access.project.key)
}

/** A defect of this project by key or number, relation-free (safe inside a transaction); 404 otherwise. */
async function findDefect(db: Db, access: ProjectAccess, ref: string) {
  const number = parseDefectRef(access.project.key, ref)
  const row = number
    ? await db.defect.findUnique({
        where: { projectId_number: { projectId: access.project.id, number } },
        select: {
          id: true,
          number: true,
          status: true,
          version: true,
          reopenCount: true,
        },
      })
    : null
  if (!row) throw httpError(404, "Defect not found")
  return row
}

const isLead = (access: ProjectAccess) =>
  can("defects:triage", {
    portalRole: access.user.role,
    projectRole: access.role,
  })

function assertTriage(access: ProjectAccess, what: string) {
  if (!isLead(access)) throw httpError(403, `Only a QA Lead can ${what}`)
}

/** 409 saying who changed the defect since the person loaded it. */
async function stale(tx: Tx, defectId: string) {
  const last = await tx.activityLog.findFirst({
    where: { entityType: "defect", entityId: defectId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { action: true, changes: true, actorId: true },
  })
  const who = last
    ? (
        await tx.user.findUnique({
          where: { id: last.actorId },
          select: { name: true },
        })
      )?.name
    : null
  const to = (last?.changes as { to?: DefectStatus } | null)?.to
  return httpError(
    409,
    who && last?.action === "status_changed" && to
      ? `${who} moved it to ${DEFECT_STATUS_LABELS[to]} meanwhile. Check their change before making yours.`
      : who
        ? `${who} changed this defect meanwhile. Reload to see their change, then try again.`
        : "This defect changed meanwhile. Reload it and try again.",
    { reason: "stale" }
  )
}

/** A test case of this project (archived ones too: old defects keep pointing at them). */
async function checkCase(tx: Tx, projectId: string, caseId: string | null) {
  if (!caseId) return
  const row = await tx.testCase.findFirst({
    where: { id: caseId, projectId },
    select: { id: true },
  })
  if (!row) throw httpError(400, "Choose a test case of this project")
}

async function insertDefect(
  tx: Tx,
  access: ProjectAccess,
  data: Omit<
    Prisma.DefectUncheckedCreateInput,
    "projectId" | "number" | "reporterId"
  >
) {
  const projectId = access.project.id
  const number = await nextNumbers(tx, projectId, "defect")
  const defect = await tx.defect.create({
    data: { ...data, projectId, number, reporterId: access.user.id },
    select: { id: true },
  })
  await tx.defectStatusChange.create({
    data: { defectId: defect.id, toStatus: "new", actorId: access.user.id },
  })
  await recordActivity(tx, {
    actorId: access.user.id,
    projectId,
    entityType: "defect",
    entityId: defect.id,
    action: "created",
    changes: {
      key: formatDefectKey(access.project.key, number),
      title: data.title,
      severity: data.severity,
    },
  })
  return defect.id
}

export async function createDefect(
  prisma: PrismaClient,
  access: ProjectAccess,
  input: CreateDefect
): Promise<Defect> {
  const id = await prisma.$transaction(async (tx) => {
    access = await lockForWrite(tx, access, "defects:edit", {
      scope: { defects: "write" },
    })
    const projectId = access.project.id
    await checkRelease(tx, projectId, input.foundInReleaseId)
    await checkCase(tx, projectId, input.caseId)
    if (input.assigneeId)
      await checkDefectAssignee(tx, projectId, input.assigneeId)
    return insertDefect(tx, access, { ...input, source: "manual" })
  })
  return load(prisma, access, id)
}

/** A run case of this project with its latest result. */
async function findRunCaseWithResult(
  tx: Tx,
  access: ProjectAccess,
  runCaseId: string
) {
  const rc = await tx.runCase.findFirst({
    where: { id: runCaseId, run: { projectId: access.project.id } },
    select: { id: true, caseId: true, runId: true },
  })
  if (!rc) throw httpError(404, "Case not found in this project's runs")
  const run = await tx.testRun.findUniqueOrThrow({
    where: { id: rc.runId },
    select: { releaseId: true, environment: true },
  })
  const result = await tx.testResult.findFirst({
    where: { runCaseId: rc.id },
    orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
    select: { id: true, status: true },
  })
  return { rc, run, result }
}

async function linkResult(
  tx: Tx,
  access: ProjectAccess,
  defectId: string,
  result: { id: string; status: string },
  rc: { id: string; runId: string; caseId: string }
) {
  const kind =
    result.status === "failed" ||
    result.status === "blocked" ||
    result.status === "passed"
      ? result.status
      : null
  if (!kind) throw httpError(400, "Link a failed, blocked or passed result")
  const existing = await tx.defectResultLink.findFirst({
    where: { defectId, resultId: result.id },
    select: { id: true },
  })
  if (existing)
    throw httpError(409, "This result is already linked to this defect")
  await tx.defectResultLink.create({
    data: {
      defectId,
      resultId: result.id,
      runCaseId: rc.id,
      runId: rc.runId,
      caseId: rc.caseId,
      kind,
      linkedById: access.user.id,
    },
  })
}

/**
 * The number of the run a run case (or result) belongs to, for its lock. Read
 * before locking: a run case never moves to another run. Unknown ids give
 * null and are reported as not found once locked.
 */
async function runNumberOf(
  db: PrismaClient,
  projectId: string,
  of: { runCaseId: string } | { resultId: string }
) {
  const rc = await db.runCase.findFirst({
    where: {
      run: { projectId },
      ...("runCaseId" in of
        ? { id: of.runCaseId }
        : { results: { some: { id: of.resultId } } }),
    },
    select: { run: { select: { number: true } } },
  })
  return rc?.run.number ?? null
}

/** "Log defect" on a failed or blocked result: a new defect, or a link (and maybe a reopen) of an existing one. */
export async function logDefect(
  prisma: PrismaClient,
  access: ProjectAccess,
  input: LogDefect
): Promise<Defect> {
  const runNumber = await runNumberOf(prisma, access.project.id, {
    runCaseId: input.runCaseId,
  })
  const id = await prisma.$transaction(async (tx) => {
    // Its run too (shared): not while that result is being replaced.
    access = await lockForWrite(tx, access, "defects:edit", {
      scope: { run: { number: runNumber, mode: "read" }, defects: "write" },
    })
    const { rc, run, result } = await findRunCaseWithResult(
      tx,
      access,
      input.runCaseId
    )
    if (
      !result ||
      (result.status !== "failed" && result.status !== "blocked")
    ) {
      throw httpError(400, "Log defects from a failed or blocked result")
    }
    const d = input.defect
    if (d.mode === "new") {
      if (d.assigneeId)
        await checkDefectAssignee(tx, access.project.id, d.assigneeId)
      const { mode: _mode, ...fields } = d
      const id = await insertDefect(tx, access, {
        ...fields,
        environment: fields.environment || run.environment,
        source: "result",
        caseId: rc.caseId,
        foundInRunId: rc.runId,
        foundInReleaseId: run.releaseId,
      })
      await linkResult(tx, access, id, result, rc)
      return id
    }
    const target = await tx.defect.findFirst({
      where: { id: d.defectId, projectId: access.project.id },
      select: {
        id: true,
        number: true,
        status: true,
        version: true,
        reopenCount: true,
      },
    })
    if (!target) throw httpError(404, "Defect not found")
    await linkResult(tx, access, target.id, result, rc)
    if (d.reopen && target.status !== "reopened") {
      if (!d.note) throw httpError(400, "Say what still fails before reopening")
      if (d.version === undefined) {
        throw httpError(400, "Reload the defect, then reopen it")
      }
      await applyTransition(tx, access, target, {
        to: "reopened",
        note: d.note,
        fixedInBuild: "",
        version: d.version,
      })
    } else if (d.note) {
      await tx.defectComment.create({
        data: { defectId: target.id, authorId: access.user.id, body: d.note },
      })
    }
    await touch(tx, target.id)
    await recordActivity(tx, {
      actorId: access.user.id,
      projectId: access.project.id,
      entityType: "defect",
      entityId: target.id,
      action: "linked",
      changes: {
        key: formatDefectKey(access.project.key, target.number),
        result: result.status,
      },
      inFeed: false,
    })
    return target.id
  })
  return load(prisma, access, id)
}

/** Moves a defect along the workflow, inside the caller's transaction. */
async function applyTransition(
  tx: Tx,
  access: ProjectAccess,
  defect: {
    id: string
    number: number
    status: DefectStatus
    version: number
    reopenCount: number
  },
  input: Transition
) {
  if (defect.version !== input.version) throw await stale(tx, defect.id)
  const step = findTransition(defect.status, input.to)
  if (!step) {
    throw httpError(
      400,
      `A defect can't go from ${DEFECT_STATUS_LABELS[defect.status]} to ${DEFECT_STATUS_LABELS[input.to]}`
    )
  }
  if (step.leadOnly) {
    assertTriage(
      access,
      input.to === "reopened"
        ? "reopen a closed or rejected defect"
        : "triage new defects"
    )
  }
  const projectId = access.project.id
  if (input.to === "rejected" && input.resolution === "duplicate") {
    // A defect others duplicate stays the original: no chains.
    const follower = await tx.defect.findFirst({
      where: { duplicateOfId: defect.id },
      select: { number: true },
    })
    if (follower) {
      throw httpError(
        400,
        `${formatDefectKey(access.project.key, follower.number)} is a duplicate of this defect, so this one can't be a duplicate itself`
      )
    }
  }
  if (input.duplicateOfId) {
    const dup = await tx.defect.findFirst({
      // The original can't itself be a rejected duplicate: no chains or loops.
      where: {
        id: input.duplicateOfId,
        projectId,
        NOT: { id: defect.id },
        // A null resolution fails NOT (= 'duplicate') in SQL, so say it.
        OR: [{ resolution: null }, { resolution: { not: "duplicate" } }],
      },
      select: { id: true },
    })
    if (!dup)
      throw httpError(
        400,
        "Choose another defect of this project as the original"
      )
  }
  if (input.fixedInReleaseId)
    await checkRelease(tx, projectId, input.fixedInReleaseId)
  if (input.evidenceResultId) {
    if (input.to !== "closed")
      throw httpError(400, "Only closing takes a passed result as evidence")
    const result = await tx.testResult.findFirst({
      where: { id: input.evidenceResultId, runCase: { run: { projectId } } },
      select: {
        id: true,
        status: true,
        runCase: { select: { id: true, runId: true, caseId: true } },
      },
    })
    if (!result || result.status !== "passed") {
      throw httpError(400, "Choose a passed result of this project as evidence")
    }
    await linkResult(tx, access, defect.id, result, result.runCase)
  }
  const now = new Date()
  const { count } = await tx.defect.updateMany({
    where: { id: defect.id, version: input.version },
    data: {
      status: input.to,
      version: { increment: 1 },
      resolution: input.to === "rejected" ? input.resolution : null,
      duplicateOfId:
        input.to === "rejected" && input.resolution === "duplicate"
          ? (input.duplicateOfId ?? null)
          : null,
      ...(input.to === "open" ? { openedAt: now } : {}),
      ...(input.to === "fixed"
        ? {
            fixedAt: now,
            fixedInReleaseId: input.fixedInReleaseId ?? null,
            fixedInBuild: input.fixedInBuild,
          }
        : {}),
      ...(input.to === "closed" ? { closedAt: now } : {}),
      ...(input.to === "reopened" ? { reopenCount: { increment: 1 } } : {}),
    },
  })
  if (count === 0) throw await stale(tx, defect.id)
  await tx.defectStatusChange.create({
    data: {
      defectId: defect.id,
      fromStatus: defect.status,
      toStatus: input.to,
      resolution: input.to === "rejected" ? input.resolution : null,
      note: input.note,
      actorId: access.user.id,
      at: now,
    },
  })
  await recordActivity(tx, {
    actorId: access.user.id,
    projectId,
    entityType: "defect",
    entityId: defect.id,
    action: "status_changed",
    changes: {
      key: formatDefectKey(access.project.key, defect.number),
      from: defect.status,
      to: input.to,
      ...(input.note ? { note: input.note } : {}),
      ...(input.resolution ? { resolution: input.resolution } : {}),
    },
  })
}

export async function transitionDefect(
  prisma: PrismaClient,
  access: ProjectAccess,
  ref: string,
  input: Transition
): Promise<Defect> {
  const id = await prisma.$transaction(async (tx) => {
    access = await lockForWrite(tx, access, "defects:edit", {
      scope: { defects: "write" },
    })
    const defect = await findDefect(tx, access, ref)
    await applyTransition(tx, access, defect, input)
    return defect.id
  })
  return load(prisma, access, id)
}

const EDITABLE = [
  "title",
  "description",
  "steps",
  "expected",
  "actual",
  "severity",
  "priority",
  "reproducibility",
  "detectedIn",
  "environment",
  "assigneeId",
  "developer",
  "trackerUrl",
] as const

export async function updateDefect(
  prisma: PrismaClient,
  access: ProjectAccess,
  ref: string,
  input: UpdateDefect
): Promise<Defect> {
  const id = await prisma.$transaction(async (tx) => {
    access = await lockForWrite(tx, access, "defects:edit", {
      scope: { defects: "write" },
    })
    if (input.priority !== undefined)
      assertTriage(access, "set a defect's priority")
    const found = await findDefect(tx, access, ref)
    if (found.version !== input.version) throw await stale(tx, found.id)
    if (input.assigneeId)
      await checkDefectAssignee(tx, access.project.id, input.assigneeId)
    const before = await tx.defect.findUniqueOrThrow({
      where: { id: found.id },
      select: Object.fromEntries(EDITABLE.map((f) => [f, true])) as Record<
        (typeof EDITABLE)[number],
        true
      >,
    })
    const data: Record<string, unknown> = {}
    const changes: Record<string, unknown> = {}
    for (const field of EDITABLE) {
      const value = input[field]
      if (value === undefined || Object.is(value, before[field])) continue
      data[field] = value
      // Long text is noted as changed without copying it into the log.
      changes[field] = ["description", "steps", "expected", "actual"].includes(
        field
      )
        ? true
        : { from: before[field], to: value }
    }
    if (Object.keys(data).length === 0) return found.id
    const { count } = await tx.defect.updateMany({
      where: { id: found.id, version: input.version },
      data: { ...data, version: { increment: 1 } },
    })
    if (count === 0) throw await stale(tx, found.id)
    await recordActivity(tx, {
      actorId: access.user.id,
      projectId: access.project.id,
      entityType: "defect",
      entityId: found.id,
      action: "updated",
      changes: {
        key: formatDefectKey(access.project.key, found.number),
        ...changes,
      },
      inFeed: false,
    })
    return found.id
  })
  return load(prisma, access, id)
}

export async function getDefect(
  prisma: PrismaClient,
  access: ProjectAccess,
  ref: string
): Promise<Defect> {
  const found = await findDefect(prisma, access, ref)
  return load(prisma, access, found.id)
}

export async function addComment(
  prisma: PrismaClient,
  access: ProjectAccess,
  ref: string,
  input: Comment
): Promise<DefectActivity> {
  return prisma.$transaction(async (tx) => {
    access = await lockForWrite(tx, access, "defects:edit", {
      scope: { defects: "write" },
    })
    const found = await findDefect(tx, access, ref)
    const row = await tx.defectComment.create({
      data: { defectId: found.id, authorId: access.user.id, body: input.body },
      select: { id: true, body: true, createdAt: true },
    })
    await touch(tx, found.id)
    return {
      id: row.id,
      kind: "comment" as const,
      actor: { id: access.user.id, name: access.user.name },
      action: "commented",
      changes: null,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
    }
  })
}

/** Comments and recorded changes, newest first. */
export async function defectActivity(
  prisma: PrismaClient,
  access: ProjectAccess,
  ref: string
): Promise<DefectActivity[]> {
  const found = await findDefect(prisma, access, ref)
  const [entries, comments] = await Promise.all([
    prisma.activityLog.findMany({
      where: {
        projectId: access.project.id,
        entityType: "defect",
        entityId: found.id,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 200,
      select: {
        id: true,
        action: true,
        changes: true,
        createdAt: true,
        actor: person,
      },
    }),
    prisma.defectComment.findMany({
      where: { defectId: found.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 200,
      select: { id: true, body: true, createdAt: true, author: person },
    }),
  ])
  const items: DefectActivity[] = [
    ...entries.map((e) => ({
      id: e.id,
      kind: "change" as const,
      actor: e.actor,
      action: e.action,
      changes: (e.changes as Record<string, unknown> | null) ?? null,
      body: "",
      createdAt: e.createdAt.toISOString(),
    })),
    ...comments.map((c) => ({
      id: c.id,
      kind: "comment" as const,
      actor: c.author,
      action: "commented",
      changes: null,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
    })),
  ]
  // uuid v7 ids follow creation order, which breaks ties within a millisecond.
  return items.sort((a, b) =>
    a.createdAt === b.createdAt
      ? a.id < b.id
        ? 1
        : -1
      : a.createdAt < b.createdAt
        ? 1
        : -1
  )
}

export async function addLink(
  prisma: PrismaClient,
  access: ProjectAccess,
  ref: string,
  resultId: string
): Promise<Defect> {
  const runNumber = await runNumberOf(prisma, access.project.id, { resultId })
  const id = await prisma.$transaction(async (tx) => {
    access = await lockForWrite(tx, access, "defects:edit", {
      scope: { run: { number: runNumber, mode: "read" }, defects: "write" },
    })
    const found = await findDefect(tx, access, ref)
    const result = await tx.testResult.findFirst({
      where: {
        id: resultId,
        runCase: { run: { projectId: access.project.id } },
      },
      select: {
        id: true,
        status: true,
        runCase: { select: { id: true, runId: true, caseId: true } },
      },
    })
    if (!result) throw httpError(404, "Result not found in this project")
    await linkResult(tx, access, found.id, result, result.runCase)
    await touch(tx, found.id)
    await recordActivity(tx, {
      actorId: access.user.id,
      projectId: access.project.id,
      entityType: "defect",
      entityId: found.id,
      action: "linked",
      changes: {
        key: formatDefectKey(access.project.key, found.number),
        result: result.status,
      },
      inFeed: false,
    })
    return found.id
  })
  return load(prisma, access, id)
}

export async function removeLink(
  prisma: PrismaClient,
  access: ProjectAccess,
  ref: string,
  linkId: string
): Promise<Defect> {
  const id = await prisma.$transaction(async (tx) => {
    access = await lockForWrite(tx, access, "defects:edit", {
      scope: { defects: "write" },
    })
    const found = await findDefect(tx, access, ref)
    const link = await tx.defectResultLink.findFirst({
      where: { id: linkId, defectId: found.id },
      select: { id: true, kind: true },
    })
    if (!link) throw httpError(404, "Link not found")
    await tx.defectResultLink.delete({ where: { id: link.id } })
    await touch(tx, found.id)
    await recordActivity(tx, {
      actorId: access.user.id,
      projectId: access.project.id,
      entityType: "defect",
      entityId: found.id,
      action: "unlinked",
      changes: {
        key: formatDefectKey(access.project.key, found.number),
        result: link.kind,
      },
      inFeed: false,
    })
    return found.id
  })
  return load(prisma, access, id)
}

export async function listDefects(
  prisma: PrismaClient,
  access: ProjectAccess,
  query: DefectListQuery
): Promise<Page<DefectSummary>> {
  const number = query.q ? parseDefectRef(access.project.key, query.q) : null
  const where: Prisma.DefectWhereInput = {
    projectId: access.project.id,
    status: query.status ?? { in: query.state === "active" ? ACTIVE : DONE },
    ...(query.severity ? { severity: query.severity } : {}),
    ...(query.priority
      ? { priority: query.priority === "none" ? null : query.priority }
      : {}),
    ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
    ...(query.reporterId ? { reporterId: query.reporterId } : {}),
    ...(query.releaseId ? { foundInReleaseId: query.releaseId } : {}),
    ...(query.mine ? { assigneeId: access.user.id } : {}),
    ...(query.q
      ? {
          OR: [
            { title: { contains: query.q, mode: "insensitive" } },
            ...(number ? [{ number }] : []),
          ],
        }
      : {}),
  }
  const [total, rows] = await Promise.all([
    prisma.defect.count({ where }),
    prisma.defect.findMany({
      where,
      select: SUMMARY_SELECT,
      orderBy: [{ [query.sort]: query.order }, { number: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ])
  return {
    items: rows.map((r) => toSummary(r, access.project.key)),
    total,
    page: query.page,
    pageSize: query.pageSize,
  }
}

/**
 * Active defects on a run case's test case (logged from it or linked to it),
 * then a few active ones whose titles share a distinctive word with the case.
 */
export async function knownDefects(
  prisma: PrismaClient,
  access: ProjectAccess,
  runCaseId: string
): Promise<DefectRef[]> {
  const rc = await prisma.runCase.findFirst({
    where: { id: runCaseId, run: { projectId: access.project.id } },
    select: { caseId: true, title: true },
  })
  if (!rc) throw httpError(404, "Case not found in this project's runs")
  const select = {
    id: true,
    number: true,
    title: true,
    status: true,
    severity: true,
    version: true,
    assignee: person,
  } as const
  const base = { projectId: access.project.id, status: { in: ACTIVE } }
  // Closed ones on the case too: failing again, a lead may reopen them.
  const onCase = await prisma.defect.findMany({
    where: {
      projectId: access.project.id,
      status: { in: [...ACTIVE, "closed"] },
      OR: [{ caseId: rc.caseId }, { links: { some: { caseId: rc.caseId } } }],
    },
    select,
    orderBy: { number: "desc" },
    take: 10,
  })
  const words = [
    ...new Set(rc.title.toLocaleLowerCase().match(/[\p{L}\p{N}]{5,}/gu) ?? []),
  ].slice(0, 5)
  const similar = words.length
    ? await prisma.defect.findMany({
        where: {
          ...base,
          id: { notIn: onCase.map((d) => d.id) },
          OR: words.map((w) => ({
            title: { contains: w, mode: "insensitive" as const },
          })),
        },
        select,
        orderBy: { number: "desc" },
        take: 3,
      })
    : []
  const key = access.project.key
  const ref = (d: (typeof onCase)[number], on: boolean): DefectRef => ({
    id: d.id,
    key: formatDefectKey(key, d.number),
    title: d.title,
    status: d.status,
    severity: d.severity,
    assignee: d.assignee,
    onCase: on,
    version: d.version,
  })
  return [
    ...onCase.map((d) => ref(d, true)),
    ...similar.map((d) => ref(d, false)),
  ]
}
