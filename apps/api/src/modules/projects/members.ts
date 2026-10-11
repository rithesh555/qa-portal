import {
  type AddMembersInput,
  effectivePortalRole,
  type Member,
  type MemberListQuery,
  type Page,
  type ProjectRole,
} from "@qa/shared"
import { recordActivity } from "../../lib/activity.ts"
import { httpError } from "../../lib/http-error.ts"
import type { Prisma, PrismaClient } from "../../lib/prisma.ts"
import { lockForWrite, type ProjectAccess } from "./access.ts"

const MEMBER_SELECT = {
  userId: true,
  role: true,
  createdAt: true,
  user: { select: { name: true, username: true, banned: true } },
} as const satisfies Prisma.ProjectMemberSelect

type MemberRow = Prisma.ProjectMemberGetPayload<{
  select: typeof MEMBER_SELECT
}>

function toMember(row: MemberRow): Member {
  return {
    userId: row.userId,
    name: row.user.name,
    username: row.user.username ?? "",
    role: row.role,
    active: row.user.banned !== true,
    addedAt: row.createdAt.toISOString(),
  }
}

export async function listMembers(
  prisma: PrismaClient,
  access: ProjectAccess,
  query: MemberListQuery
): Promise<Page<Member>> {
  const where: Prisma.ProjectMemberWhereInput = {
    projectId: access.project.id,
    ...(query.role ? { role: query.role } : {}),
    ...(query.q
      ? {
          user: {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { username: { contains: query.q, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  }
  const orderBy: Prisma.ProjectMemberOrderByWithRelationInput[] =
    query.sort === "name"
      ? [{ user: { name: query.order } }, { id: "asc" }]
      : [{ createdAt: query.order }, { id: "asc" }]
  const [total, rows] = await prisma.$transaction([
    prisma.projectMember.count({ where }),
    prisma.projectMember.findMany({
      where,
      select: MEMBER_SELECT,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ])
  return {
    items: rows.map(toMember),
    total,
    page: query.page,
    pageSize: query.pageSize,
  }
}

export async function addMembers(
  prisma: PrismaClient,
  access: ProjectAccess,
  input: AddMembersInput
): Promise<{ added: number; alreadyMembers: number }> {
  const projectId = access.project.id
  return prisma.$transaction(async (tx) => {
    access = await lockForWrite(tx, access, "members:manage")
    const found = await tx.user.findMany({
      where: { id: { in: input.userIds }, NOT: { banned: true } },
      select: { id: true, name: true, role: true },
    })
    if (found.length !== input.userIds.length) {
      throw httpError(
        400,
        "Some of these people don't exist or have been deactivated"
      )
    }
    if (found.some((u) => effectivePortalRole(u.role) === "admin")) {
      throw httpError(400, "Admins already have access to every project")
    }
    const users = found.map(({ id, name }) => ({ id, name }))
    const existing = new Set(
      (
        await tx.projectMember.findMany({
          where: { projectId, userId: { in: input.userIds } },
          select: { userId: true },
        })
      ).map((m) => m.userId)
    )
    const toAdd = users.filter((u) => !existing.has(u.id))
    await tx.projectMember.createMany({
      data: toAdd.map((u) => ({
        projectId,
        userId: u.id,
        role: input.role,
        addedById: access.user.id,
      })),
    })
    for (const user of toAdd) {
      await recordActivity(tx, {
        actorId: access.user.id,
        projectId,
        entityType: "member",
        entityId: user.id,
        action: "added",
        changes: { user, role: input.role },
      })
    }
    return { added: toAdd.length, alreadyMembers: existing.size }
  })
}

async function findMember(
  tx: Prisma.TransactionClient,
  projectId: string,
  userId: string
) {
  const member = await tx.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { id: true, ...MEMBER_SELECT },
  })
  if (!member) throw httpError(404, "Member not found")
  return member
}

/**
 * Leads (not admins) can't remove the last active QA Lead, so a project is
 * never left without someone to manage it by accident.
 */
async function assertKeepsALead(
  tx: Prisma.TransactionClient,
  access: ProjectAccess,
  member: MemberRow
) {
  if (access.user.role === "admin") return
  if (member.role !== "lead" || member.user.banned === true) return
  const others = await tx.projectMember.count({
    where: {
      projectId: access.project.id,
      role: "lead",
      userId: { not: member.userId },
      user: { NOT: { banned: true } },
    },
  })
  if (others === 0) {
    throw httpError(409, "Every project needs at least one active QA Lead")
  }
}

export async function changeRole(
  prisma: PrismaClient,
  access: ProjectAccess,
  userId: string,
  role: ProjectRole
): Promise<Member> {
  const projectId = access.project.id
  return prisma.$transaction(async (tx) => {
    access = await lockForWrite(tx, access, "members:manage")
    const member = await findMember(tx, projectId, userId)
    if (member.role === role) return toMember(member)
    if (role !== "lead") await assertKeepsALead(tx, access, member)
    const updated = await tx.projectMember.update({
      where: { id: member.id },
      data: { role },
      select: MEMBER_SELECT,
    })
    await recordActivity(tx, {
      actorId: access.user.id,
      projectId,
      entityType: "member",
      entityId: userId,
      action: "role_changed",
      changes: {
        user: { id: userId, name: member.user.name },
        role: { from: member.role, to: role },
      },
    })
    return toMember(updated)
  })
}

export async function removeMember(
  prisma: PrismaClient,
  access: ProjectAccess,
  userId: string
): Promise<void> {
  const projectId = access.project.id
  await prisma.$transaction(async (tx) => {
    access = await lockForWrite(tx, access, "members:manage")
    const member = await findMember(tx, projectId, userId)
    await assertKeepsALead(tx, access, member)
    await tx.projectMember.delete({ where: { id: member.id } })
    await recordActivity(tx, {
      actorId: access.user.id,
      projectId,
      entityType: "member",
      entityId: userId,
      action: "removed",
      changes: {
        user: { id: userId, name: member.user.name },
        role: member.role,
      },
    })
  })
}
