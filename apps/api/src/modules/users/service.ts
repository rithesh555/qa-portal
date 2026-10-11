import {
  type CreateUserInput,
  type DirectoryUser,
  effectivePortalRole,
  type Page,
  type UpdateUserInput,
  type User,
  type UserListQuery,
} from "@qa/shared"
import type { Auth } from "../../auth/auth.ts"
import { diff, recordActivity } from "../../lib/activity.ts"
import { httpError } from "../../lib/http-error.ts"
import { hashPassword } from "better-auth/crypto"
import type { Prisma, PrismaClient } from "../../lib/prisma.ts"

export interface UsersDeps {
  prisma: PrismaClient
  auth: Auth
}

/** The acting admin: their id for the activity log, their request headers for Better Auth. */
export interface ActingAdmin {
  id: string
  headers: Headers
}

const USER_FIELDS = {
  id: true,
  name: true,
  username: true,
  email: true,
  role: true,
  banned: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.UserSelect

type UserRow = Prisma.UserGetPayload<{ select: typeof USER_FIELDS }>

const ACTIVE: Prisma.UserWhereInput = { NOT: { banned: true } }

function toUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    username: row.username ?? "",
    email: row.email,
    role: effectivePortalRole(row.role),
    active: row.banned !== true,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

const notFound = () => httpError(404, "User not found")

async function findRow(
  db: PrismaClient | Prisma.TransactionClient,
  id: string
) {
  const row = await db.user.findUnique({ where: { id }, select: USER_FIELDS })
  if (!row) throw notFound()
  return row
}

type Tx = Prisma.TransactionClient

/**
 * Serialises every change that can lower the number of active admins, so two
 * admins can't demote or deactivate each other at the same moment. Held until
 * the surrounding transaction ends.
 */
async function lockAdminChanges(tx: Tx) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('qa-portal:admins'))`
}

/**
 * Active admins other than `exceptId`. Matches `effectivePortalRole`: any
 * comma-separated entry equal to "admin" counts.
 */
async function otherActiveAdmins(tx: Tx, exceptId: string): Promise<number> {
  const [row] = await tx.$queryRaw<[{ count: number }]>`
    SELECT count(*)::int AS count FROM users
    WHERE id <> ${exceptId}
      AND banned IS NOT TRUE
      AND 'admin' = ANY (string_to_array(replace(coalesce(role, ''), ' ', ''), ','))`
  return row.count
}

async function assertNotLastAdmin(tx: Tx, target: UserRow) {
  if (target.banned === true) return
  if (effectivePortalRole(target.role) !== "admin") return
  if ((await otherActiveAdmins(tx, target.id)) === 0) {
    throw httpError(409, "The portal needs at least one active admin")
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: unknown }).code === "P2002"
  )
}

export async function listUsers(
  { prisma }: UsersDeps,
  query: UserListQuery
): Promise<Page<User>> {
  const where: Prisma.UserWhereInput = {
    ...(query.status === "active" ? ACTIVE : {}),
    ...(query.status === "deactivated" ? { banned: true } : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: "insensitive" } },
            { username: { contains: query.q, mode: "insensitive" } },
            { email: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
  }
  const [total, rows] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: USER_FIELDS,
      orderBy: [{ [query.sort]: query.order }, { id: "asc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ])
  return {
    items: rows.map(toUser),
    total,
    page: query.page,
    pageSize: query.pageSize,
  }
}

export async function getUser({ prisma }: UsersDeps, id: string) {
  return toUser(await findRow(prisma, id))
}

async function assertAvailable(
  prisma: PrismaClient,
  { username, email }: { username?: string; email: string },
  exceptId?: string
) {
  const clash = await prisma.user.findFirst({
    where: {
      OR: [
        ...(username ? [{ username }] : []),
        { email: { equals: email, mode: "insensitive" } },
      ],
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { username: true, email: true },
  })
  if (!clash) return
  if (username && clash.username === username) {
    throw httpError(409, "That username is already taken")
  }
  throw httpError(409, "That email address is already in use")
}

export async function createUser(
  { prisma, auth }: UsersDeps,
  actor: ActingAdmin,
  input: CreateUserInput
): Promise<User> {
  await assertAvailable(prisma, input)
  let user: { id: string }
  try {
    ;({ user } = await auth.api.createUser({
      headers: actor.headers,
      body: {
        name: input.name,
        email: input.email,
        password: input.password,
        role: input.role,
        data: { username: input.username, displayUsername: input.username },
      },
    }))
  } catch (err) {
    // Lost a race with another create: report the clash, not a server error.
    await assertAvailable(prisma, input)
    throw err
  }
  // Better Auth writes the user and their credentials in its own transaction,
  // so the log entry follows it. If this insert fails the request fails
  // loudly (500, logged) even though the account exists.
  await recordActivity(prisma, {
    actorId: actor.id,
    entityType: "user",
    entityId: user.id,
    action: "created",
    changes: { username: input.username, role: input.role },
  })
  return getUser({ prisma, auth }, user.id)
}

const STALE = () =>
  httpError(409, "Someone else changed this user. Reload to see their changes.")

export async function updateUser(
  { prisma }: UsersDeps,
  actor: ActingAdmin,
  id: string,
  input: UpdateUserInput
): Promise<User> {
  await assertAvailable(prisma, { email: input.email }, id)
  try {
    const row = await prisma.$transaction(async (tx) => {
      const before = await findRow(tx, id)
      const current = toUser(before)
      if (current.role === "admin" && input.role !== "admin") {
        if (id === actor.id) {
          throw httpError(409, "You can't remove your own admin role")
        }
        await lockAdminChanges(tx)
        await assertNotLastAdmin(tx, await findRow(tx, id))
      }
      // Only write if nobody saved since the client loaded this user.
      const { count } = await tx.user.updateMany({
        where: { id, updatedAt: new Date(input.updatedAt) },
        data: { name: input.name, email: input.email, role: input.role },
      })
      if (count === 0) throw STALE()
      const changes = diff(current, input, ["name", "email", "role"])
      if (Object.keys(changes).length > 0) {
        await recordActivity(tx, {
          actorId: actor.id,
          entityType: "user",
          entityId: id,
          action: "updated",
          changes,
        })
      }
      return findRow(tx, id)
    })
    return toUser(row)
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw httpError(409, "That email address is already in use")
    }
    throw err
  }
}

export async function resetPassword(
  { prisma }: UsersDeps,
  actor: ActingAdmin,
  id: string,
  password: string
): Promise<void> {
  if (id === actor.id) {
    throw httpError(409, "Use Change password in your account menu instead")
  }
  // Same scrypt hash Better Auth uses, so the password, the session
  // revocation and the log entry land together or not at all.
  const hash = await hashPassword(password)
  await prisma.$transaction(async (tx) => {
    await findRow(tx, id)
    const { count } = await tx.account.updateMany({
      where: { userId: id, providerId: "credential" },
      data: { password: hash },
    })
    if (count === 0) {
      await tx.account.create({
        data: {
          id: crypto.randomUUID(),
          userId: id,
          accountId: id,
          providerId: "credential",
          password: hash,
        },
      })
    }
    await tx.session.deleteMany({ where: { userId: id } })
    await recordActivity(tx, {
      actorId: actor.id,
      entityType: "user",
      entityId: id,
      action: "password_reset",
    })
  })
}

export async function deactivateUser(
  { prisma }: UsersDeps,
  actor: ActingAdmin,
  id: string
): Promise<User> {
  if (id === actor.id) throw httpError(409, "You can't deactivate yourself")
  const row = await prisma.$transaction(async (tx) => {
    await lockAdminChanges(tx)
    const target = await findRow(tx, id)
    if (target.banned === true) return target
    await assertNotLastAdmin(tx, target)
    // What Better Auth's banUser does: mark banned, end every session.
    await tx.user.update({
      where: { id },
      data: {
        banned: true,
        banReason: "Deactivated by an admin",
        banExpires: null,
      },
    })
    await tx.session.deleteMany({ where: { userId: id } })
    await recordActivity(tx, {
      actorId: actor.id,
      entityType: "user",
      entityId: id,
      action: "deactivated",
    })
    return findRow(tx, id)
  })
  return toUser(row)
}

export async function reactivateUser(
  { prisma }: UsersDeps,
  actor: ActingAdmin,
  id: string
): Promise<User> {
  const row = await prisma.$transaction(async (tx) => {
    const target = await findRow(tx, id)
    if (target.banned !== true) return target
    await tx.user.update({
      where: { id },
      data: { banned: false, banReason: null, banExpires: null },
    })
    await recordActivity(tx, {
      actorId: actor.id,
      entityType: "user",
      entityId: id,
      action: "reactivated",
    })
    return findRow(tx, id)
  })
  return toUser(row)
}

/** Active users matching `q`, for member pickers. At most 20, minimal fields. */
export async function searchDirectory(
  { prisma }: UsersDeps,
  q: string
): Promise<DirectoryUser[]> {
  const rows = await prisma.user.findMany({
    where: {
      ...ACTIVE,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { username: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, username: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: 20,
  })
  return rows.map((row) => ({ ...row, username: row.username ?? "" }))
}
