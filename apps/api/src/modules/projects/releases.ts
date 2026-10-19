import type { Release, ReleaseStatus } from "@qa/shared"
import { diff, recordActivity } from "../../lib/activity.ts"
import { isUniqueViolation } from "../../lib/db-errors.ts"
import { httpError } from "../../lib/http-error.ts"
import type { Prisma, PrismaClient } from "../../lib/prisma.ts"
import { snapshotRelease } from "../reports/service.ts"
import { lockForWrite, type ProjectAccess } from "./access.ts"

export interface ReleaseFields {
  name: string
  description: string
  status: ReleaseStatus
  startDate: string | null
  targetDate: string | null
}

const RELEASE_SELECT = {
  id: true,
  name: true,
  description: true,
  status: true,
  startDate: true,
  targetDate: true,
  version: true,
  createdAt: true,
} as const satisfies Prisma.ReleaseSelect

type ReleaseRow = Prisma.ReleaseGetPayload<{ select: typeof RELEASE_SELECT }>

// Dates are calendar days: stored as DATE, sent as "YYYY-MM-DD".
const toDay = (date: Date | null) => date?.toISOString().slice(0, 10) ?? null
const fromDay = (day: string | null) =>
  day ? new Date(`${day}T00:00:00Z`) : null

function toRelease(row: ReleaseRow): Release {
  return {
    ...row,
    startDate: toDay(row.startDate),
    targetDate: toDay(row.targetDate),
    createdAt: row.createdAt.toISOString(),
  }
}

function data(input: ReleaseFields) {
  return {
    name: input.name,
    description: input.description,
    status: input.status,
    startDate: fromDay(input.startDate),
    targetDate: fromDay(input.targetDate),
  }
}

/** Taking a sign-off snapshot computes a whole report inside the transaction. */
const SNAPSHOT_TX = { timeout: 30_000 }

const DUPLICATE = () =>
  httpError(409, "This project already has a release with that name")

export async function listReleases(
  prisma: PrismaClient,
  access: ProjectAccess
): Promise<Release[]> {
  const rows = await prisma.release.findMany({
    where: { projectId: access.project.id },
    select: RELEASE_SELECT,
    orderBy: [
      { startDate: { sort: "desc", nulls: "first" } },
      { createdAt: "desc" },
    ],
  })
  return rows.map(toRelease)
}

export async function createRelease(
  prisma: PrismaClient,
  access: ProjectAccess,
  input: ReleaseFields
): Promise<Release> {
  try {
    const row = await prisma.$transaction(async (tx) => {
      access = await lockForWrite(tx, access, "releases:manage")
      const created = await tx.release.create({
        data: {
          ...data(input),
          projectId: access.project.id,
          createdById: access.user.id,
        },
        select: RELEASE_SELECT,
      })
      await recordActivity(tx, {
        actorId: access.user.id,
        projectId: access.project.id,
        entityType: "release",
        entityId: created.id,
        action: "created",
        changes: { name: created.name, status: created.status },
      })
      // Created as Released: it gets its sign-off snapshot straight away.
      if (created.status === "released")
        await snapshotRelease(tx, access, created.id)
      return created
    }, SNAPSHOT_TX)
    return toRelease(row)
  } catch (err) {
    if (isUniqueViolation(err)) throw DUPLICATE()
    throw err
  }
}

export async function updateRelease(
  prisma: PrismaClient,
  access: ProjectAccess,
  id: string,
  input: ReleaseFields & { version: number }
): Promise<Release> {
  try {
    const row = await prisma.$transaction(async (tx) => {
      access = await lockForWrite(tx, access, "releases:manage")
      // Scoped to this project: another project's release id is "not found".
      const before = await tx.release.findFirst({
        where: { id, projectId: access.project.id },
        select: RELEASE_SELECT,
      })
      if (!before) throw httpError(404, "Release not found")
      const { count } = await tx.release.updateMany({
        where: { id, version: input.version },
        data: { ...data(input), version: { increment: 1 } },
      })
      if (count === 0) {
        throw httpError(
          409,
          "Someone else changed this release. Reload to see their changes."
        )
      }
      const changes = diff(toRelease(before), input, [
        "name",
        "description",
        "status",
        "startDate",
        "targetDate",
      ])
      if (Object.keys(changes).length > 0) {
        await recordActivity(tx, {
          actorId: access.user.id,
          projectId: access.project.id,
          entityType: "release",
          entityId: id,
          action: "updated",
          changes: { name: input.name, ...changes },
        })
      }
      const after = await tx.release.findUniqueOrThrow({
        where: { id },
        select: RELEASE_SELECT,
      })
      // Marked Released: freeze its report as it stands now, in this
      // transaction and under the project lock, so no result recorded later
      // can slip in (live numbers stay a click away).
      if (before.status !== "released" && after.status === "released")
        await snapshotRelease(tx, access, id)
      return after
    }, SNAPSHOT_TX)
    return toRelease(row)
  } catch (err) {
    if (isUniqueViolation(err)) throw DUPLICATE()
    throw err
  }
}
