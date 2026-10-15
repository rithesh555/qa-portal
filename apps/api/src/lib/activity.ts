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
