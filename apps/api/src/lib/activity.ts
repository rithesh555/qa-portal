import { httpError } from "./http-error.ts"
import type { Prisma, PrismaClient } from "./prisma.ts"

type Db = PrismaClient | Prisma.TransactionClient

export type Changes = Record<string, { from: unknown; to: unknown }>

export interface ActivityEntry {
  actorId: string
  projectId?: string | null
  entityType: string
  entityId: string
  action: string
  changes?: Changes | Record<string, unknown> | null
  /** False keeps it out of the project's activity feed (still in the entity's history). */
  inFeed?: boolean
}

/** Appends one entry to the activity log. Pass the transaction client when inside one. */
export async function recordActivity(db: Db, entry: ActivityEntry) {
  await db.activityLog.create({
    data: {
      actorId: entry.actorId,
      projectId: entry.projectId ?? null,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      ...(entry.inFeed === false ? { inFeed: false } : {}),
      // Values come from validated input and DB rows, so they are JSON-safe.
      ...(entry.changes
        ? { changes: entry.changes as Prisma.InputJsonObject }
        : {}),
    },
  })
}

/** The fields whose value differs between `before` and `after`, as { field: { from, to } }. */
export function diff<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
  fields: readonly (keyof T & string)[]
): Changes {
  const changes: Changes = {}
  for (const field of fields) {
    if (!(field in after)) continue
    if (!Object.is(before[field], after[field])) {
      changes[field] = { from: before[field], to: after[field] }
    }
  }
  return changes
}

/**
 * The 409 for an edit made from an out-of-date version: names whoever
 * changed it last (from the activity log), so the person knows whose change
 * they'd be replacing.
 */
export async function staleChange(
  db: Db,
  entityType: string,
  entityId: string,
  noun: string
) {
  const last = await db.activityLog.findFirst({
    where: { entityType, entityId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { actor: { select: { name: true } } },
  })
  return httpError(
    409,
    `${last?.actor.name ?? "Someone else"} changed this ${noun} meanwhile. Load their version to continue.`,
    { reason: "stale" }
  )
}
