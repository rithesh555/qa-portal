import {
  type Action,
  can,
  effectivePortalRole,
  type ProjectRole,
  type SessionUser,
} from "@qa/shared"
import { httpError } from "../../lib/http-error.ts"
import type { Prisma, PrismaClient } from "../../lib/prisma.ts"

type Db = PrismaClient | Prisma.TransactionClient

export interface ProjectAccess {
  project: {
    id: string
    key: string
    name: string
    archivedAt: Date | null
  }
  user: SessionUser
  /** The caller's role here; null for an admin who isn't a member. */
  role: ProjectRole | null
}

/**
 * Loads a project by key for the signed-in user. Unknown projects and
 * projects the user isn't a member of look the same (404), so ids and keys
 * of other teams' projects leak nothing. Admins can open every project.
 */
export async function loadProjectAccess(
  db: Db,
  user: SessionUser,
  key: string
): Promise<ProjectAccess> {
  const project = await db.project.findUnique({
    where: { key: key.toUpperCase() },
    select: {
      id: true,
      key: true,
      name: true,
      archivedAt: true,
      members: { where: { userId: user.id }, select: { role: true } },
    },
  })
  const role = project?.members[0]?.role ?? null
  if (!project || (user.role !== "admin" && !role)) {
    throw httpError(404, "Project not found")
  }
  const { members: _members, ...rest } = project
  return { project: rest, user, role }
}

/** 403 unless the shared permission matrix allows `action` here. */
export function assertCan(access: ProjectAccess, action: Action) {
  if (
    !can(action, { portalRole: access.user.role, projectRole: access.role })
  ) {
    throw httpError(403, "You don't have permission to do that")
  }
}

/** Archived projects are read-only. */
export function assertWritable(access: ProjectAccess) {
  if (access.project.archivedAt) {
    throw httpError(409, "This project is archived, so it can't be changed")
  }
}

/**
 * Serialises every change to one project (members, releases, details,
 * archiving), so rules like "at least one active QA Lead" and "archived is
 * read-only" can't be beaten by two requests at once. Held until the
 * transaction ends.
 */
export async function lockProject(
  tx: Prisma.TransactionClient,
  projectId: string
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"qa-portal:project:" + projectId}))`
}

/**
 * Takes the project lock, then re-checks the caller against the state as it
 * is now: the role they had when the request arrived may have been changed
 * or removed, or the project archived, while they waited for the lock.
 */
export async function lockForWrite(
  tx: Prisma.TransactionClient,
  access: ProjectAccess,
  action: Action,
  { writable = true }: { writable?: boolean } = {}
): Promise<ProjectAccess> {
  await lockProject(tx, access.project.id)
  // The caller's portal role and status as they are now, not as they were
  // when the request arrived.
  const current = await tx.user.findUnique({
    where: { id: access.user.id },
    select: { role: true, banned: true },
  })
  if (!current || current.banned === true) {
    throw httpError(401, "Authentication required")
  }
  const user = { ...access.user, role: effectivePortalRole(current.role) }
  const fresh = await loadProjectAccess(tx, user, access.project.key)
  assertCan(fresh, action)
  if (writable) assertWritable(fresh)
  return fresh
}
