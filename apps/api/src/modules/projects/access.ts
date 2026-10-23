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

const projectKey = (projectId: string) => `qa-portal:project:${projectId}`

/**
 * Serialises every change to one project (members, releases, details,
 * archiving), so rules like "at least one active QA Lead" and "archived is
 * read-only" can't be beaten by two requests at once. Excludes every other
 * write in the project, content writes included. Held until the transaction
 * ends.
 */
export async function lockProject(
  tx: Prisma.TransactionClient,
  projectId: string
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${projectKey(projectId)}))`
}

/**
 * What a write locks.
 * - "project": a project-level change (members, releases, details,
 *   archiving): excludes every other write in the project.
 * - otherwise, content locks: a shared hold on the project (so they still
 *   wait for project-level changes, and the role and archived checks hold),
 *   plus any of these, taken in this order so two writes can't deadlock:
 *   - cases: "write" for changing cases, suites and imports (archiving a
 *     suite vs moving a case into it); "read" for snapshotting them into a
 *     run (no snapshot of cases being archived).
 *   - run: one run, "write" for its results and details, "read" for
 *     linking a defect to one of its results (not one being replaced).
 *   - defects: "write" for changing defects (no duplicate chains).
 * - "content": the shared project hold only.
 */
export type WriteScope =
  | "project"
  | "content"
  | {
      cases?: "read" | "write"
      run?: { number: number | null; mode: "read" | "write" }
      defects?: "write"
    }

async function lockScope(
  tx: Prisma.TransactionClient,
  projectId: string,
  scope: WriteScope
) {
  if (scope === "project") return lockProject(tx, projectId)
  await tx.$executeRaw`SELECT pg_advisory_xact_lock_shared(hashtext(${projectKey(projectId)}))`
  if (scope === "content") return
  const take = async (part: string, mode: "read" | "write") => {
    const key = `${projectKey(projectId)}:${part}`
    if (mode === "read")
      await tx.$executeRaw`SELECT pg_advisory_xact_lock_shared(hashtext(${key}))`
    else await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`
  }
  // Always cases, then the run, then defects.
  if (scope.cases) await take("cases", scope.cases)
  if (scope.run) await take(`run:${scope.run.number ?? 0}`, scope.run.mode)
  if (scope.defects) await take("defects", scope.defects)
}

/**
 * Takes the write's lock (the whole project unless a narrower scope is
 * given), then re-checks the caller against the state as it is now: the role
 * they had when the request arrived may have been changed or removed, or the
 * project archived, while they waited.
 */
export async function lockForWrite(
  tx: Prisma.TransactionClient,
  access: ProjectAccess,
  action: Action,
  {
    writable = true,
    scope = "project",
  }: { writable?: boolean; scope?: WriteScope } = {}
): Promise<ProjectAccess> {
  await lockScope(tx, access.project.id, scope)
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
