import {
  type ActivityItem,
  effectivePortalRole,
  type CreateProjectInput,
  type Page,
  type Project,
  type ProjectListQuery,
  type ProjectRole,
  type ProjectSummary,
  type SessionUser,
  type UpdateProjectInput,
} from "@qa/shared"
import { diff, recordActivity } from "../../lib/activity.ts"
import { isUniqueViolation } from "../../lib/db-errors.ts"
import { httpError } from "../../lib/http-error.ts"
import type { Prisma, PrismaClient } from "../../lib/prisma.ts"
import { lockForWrite, type ProjectAccess } from "./access.ts"

type Db = PrismaClient | Prisma.TransactionClient

const ACTIVE_USER: Prisma.UserWhereInput = { NOT: { banned: true } }

const SUMMARY_SELECT = {
  id: true,
  key: true,
  name: true,
  description: true,
  archivedAt: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { members: { where: { user: ACTIVE_USER } } } },
  releases: {
    where: { status: "in_progress" },
    orderBy: [
      { startDate: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    take: 1,
    select: { id: true, name: true },
  },
} as const satisfies Prisma.ProjectSelect

type SummaryRow = Prisma.ProjectGetPayload<{ select: typeof SUMMARY_SELECT }>

/** Active leads and the caller's role for a set of projects, in two queries. */
async function membershipInfo(db: Db, projectIds: string[], userId: string) {
  const [leads, mine] = await Promise.all([
    db.projectMember.findMany({
      where: { projectId: { in: projectIds }, role: "lead", user: ACTIVE_USER },
      select: { projectId: true, user: { select: { id: true, name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    db.projectMember.findMany({
      where: { projectId: { in: projectIds }, userId },
      select: { projectId: true, role: true },
    }),
  ])
  const leadsBy = new Map<string, { id: string; name: string }[]>()
  for (const lead of leads) {
    const list = leadsBy.get(lead.projectId) ?? []
    list.push(lead.user)
    leadsBy.set(lead.projectId, list)
  }
  const roleBy = new Map<string, ProjectRole>(
    mine.map((m) => [m.projectId, m.role])
  )
  return {
    leads: (id: string) => leadsBy.get(id) ?? [],
    role: (id: string) => roleBy.get(id) ?? null,
  }
}

function toSummary(
  row: SummaryRow,
  info: Awaited<ReturnType<typeof membershipInfo>>
): ProjectSummary {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    archived: row.archivedAt !== null,
    myRole: info.role(row.id),
    memberCount: row._count.members,
    leads: info.leads(row.id),
    currentRelease: row.releases[0] ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

export async function listProjects(
  prisma: PrismaClient,
  user: SessionUser,
  query: ProjectListQuery
): Promise<Page<ProjectSummary>> {
  const where: Prisma.ProjectWhereInput = {
    archivedAt: query.status === "archived" ? { not: null } : null,
    // Admins see every project; everyone else only their own.
    ...(user.role === "admin"
      ? {}
      : { members: { some: { userId: user.id } } }),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: "insensitive" } },
            { key: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
  }
  const [total, rows] = await prisma.$transaction([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      select: SUMMARY_SELECT,
      orderBy: [{ [query.sort]: query.order }, { id: "asc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ])
  const info = await membershipInfo(
    prisma,
    rows.map((r) => r.id),
    user.id
  )
  return {
    items: rows.map((row) => toSummary(row, info)),
    total,
    page: query.page,
    pageSize: query.pageSize,
  }
}

export async function getProject(
  db: Db,
  access: ProjectAccess
): Promise<Project> {
  const id = access.project.id
  const [row, counts, info] = await Promise.all([
    db.project.findUniqueOrThrow({ where: { id }, select: SUMMARY_SELECT }),
    db.projectMember.groupBy({
      by: ["role"],
      where: { projectId: id, user: ACTIVE_USER },
      _count: { _all: true },
    }),
    membershipInfo(db, [id], access.user.id),
  ])
  const roleCounts = { lead: 0, tester: 0, viewer: 0 }
  for (const c of counts) roleCounts[c.role] = c._count._all
  return {
    ...toSummary(row, info),
    version: row.version,
    roleCounts,
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function createProject(
  prisma: PrismaClient,
  user: SessionUser,
  input: CreateProjectInput & { description: string }
): Promise<Project> {
  const found = await prisma.user.findFirst({
    where: { id: input.leadUserId, ...ACTIVE_USER },
    select: { id: true, name: true, role: true },
  })
  if (!found) throw httpError(400, "Choose an active user as the first QA Lead")
  // Admins can already open every project, so they aren't members.
  if (effectivePortalRole(found.role) === "admin") {
    throw httpError(400, "Choose someone who isn't an admin as the QA Lead")
  }
  const lead = { id: found.id, name: found.name }
  try {
    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          key: input.key,
          name: input.name,
          description: input.description,
          createdById: user.id,
          members: {
            create: { userId: lead.id, role: "lead", addedById: user.id },
          },
        },
        select: { id: true, key: true, name: true, archivedAt: true },
      })
      await recordActivity(tx, {
        actorId: user.id,
        projectId: created.id,
        entityType: "project",
        entityId: created.id,
        action: "created",
        changes: { key: created.key, name: created.name, lead },
      })
      return created
    })
    return getProject(prisma, { project, user, role: null })
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw httpError(409, "That key is already used by another project")
    }
    throw err
  }
}

const STALE = () =>
  httpError(
    409,
    "Someone else changed this project. Reload to see their changes."
  )

export async function updateProject(
  prisma: PrismaClient,
  access: ProjectAccess,
  input: UpdateProjectInput & { description: string }
): Promise<Project> {
  const id = access.project.id
  await prisma.$transaction(async (tx) => {
    await lockForWrite(tx, access, "projects:manage")
    const before = await tx.project.findUniqueOrThrow({
      where: { id },
      select: { name: true, description: true },
    })
    const { count } = await tx.project.updateMany({
      where: { id, version: input.version },
      data: {
        name: input.name,
        description: input.description,
        version: { increment: 1 },
      },
    })
    if (count === 0) throw STALE()
    const changes = diff(before, input, ["name", "description"])
    if (Object.keys(changes).length > 0) {
      await recordActivity(tx, {
        actorId: access.user.id,
        projectId: id,
        entityType: "project",
        entityId: id,
        action: "updated",
        changes,
      })
    }
  })
  return getProject(prisma, access)
}

export async function setArchived(
  prisma: PrismaClient,
  access: ProjectAccess,
  archived: boolean
): Promise<Project> {
  const id = access.project.id
  await prisma.$transaction(async (tx) => {
    // Waits for in-flight changes to finish, so none lands after archiving.
    const fresh = await lockForWrite(tx, access, "projects:manage", {
      writable: false,
    })
    if ((fresh.project.archivedAt !== null) === archived) return
    await tx.project.update({
      where: { id },
      data: {
        archivedAt: archived ? new Date() : null,
        version: { increment: 1 },
      },
    })
    await recordActivity(tx, {
      actorId: access.user.id,
      projectId: id,
      entityType: "project",
      entityId: id,
      action: archived ? "archived" : "unarchived",
    })
  })
  return getProject(prisma, access)
}

export async function listActivity(
  prisma: PrismaClient,
  access: ProjectAccess,
  limit: number
): Promise<ActivityItem[]> {
  const rows = await prisma.activityLog.findMany({
    where: { projectId: access.project.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
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
  return rows.map((row) => ({
    ...row,
    changes: (row.changes as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt.toISOString(),
  }))
}
