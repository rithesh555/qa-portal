import { randomUUID } from "node:crypto"
import {
  type bulkCaseActionSchema,
  formatCaseKey,
  MAX_BULK,
  MAX_LABELS,
} from "@qa/shared"
import type { z } from "zod"
import { recordActivity } from "../../lib/activity.ts"
import { httpError } from "../../lib/http-error.ts"
import type { Prisma, PrismaClient } from "../../lib/prisma.ts"
import { lockForWrite, type ProjectAccess } from "../projects/access.ts"
import { caseWhere } from "./service.ts"
import { activeSuite } from "./suites.ts"

type BulkInput = z.output<typeof bulkCaseActionSchema>

/** Big selections touch up to 2,000 rows; give them longer than Prisma's 5 s default. */
export const LONG_TX = { timeout: 60_000, maxWait: 10_000 }

/**
 * Applies one change to many active cases, logging each case separately so
 * its history is complete. Archived cases in the selection are skipped.
 */
export async function bulkCases(
  prisma: PrismaClient,
  access: ProjectAccess,
  input: BulkInput
): Promise<{ updated: number }> {
  const { action } = input
  return prisma.$transaction(async (tx) => {
    access = await lockForWrite(
      tx,
      access,
      action.kind === "archive" ? "cases:archive" : "cases:edit"
    )
    const projectId = access.project.id
    const { selection } = input
    const chosen: Prisma.TestCaseWhereInput =
      "ids" in selection
        ? { projectId, id: { in: selection.ids } }
        : {
            AND: [
              await caseWhere(tx, access, selection.filter),
              { id: { notIn: selection.exclude } },
            ],
          }
    // Only active cases change. ANDed, so a filter for archived cases
    // selects nothing rather than having its status overridden.
    const where: Prisma.TestCaseWhereInput = {
      AND: [chosen, { archivedAt: null }],
    }
    const rows = await tx.testCase.findMany({
      where,
      select: {
        id: true,
        number: true,
        suiteId: true,
        priority: true,
        type: true,
        status: true,
        labels: true,
      },
      take: MAX_BULK + 1,
    })
    if (rows.length > MAX_BULK) {
      throw httpError(
        400,
        `Select at most ${MAX_BULK.toLocaleString("en")} test cases at a time`
      )
    }

    const base = { updatedById: access.user.id, version: { increment: 1 } }
    let changed: { id: string; changes: Record<string, unknown> }[] = []
    let summarySuite: string | null = null
    switch (action.kind) {
      case "move": {
        const target = action.suiteId
          ? await activeSuite(tx, projectId, action.suiteId)
          : null
        summarySuite = target?.name ?? null
        const names = new Map(
          (
            await tx.suite.findMany({
              where: {
                id: { in: rows.flatMap((r) => (r.suiteId ? [r.suiteId] : [])) },
              },
              select: { id: true, name: true },
            })
          ).map((s) => [s.id, s.name])
        )
        changed = rows
          .filter((r) => r.suiteId !== action.suiteId)
          .map((r) => ({
            id: r.id,
            changes: {
              suite: {
                from: r.suiteId ? names.get(r.suiteId) : null,
                to: target?.name ?? null,
              },
            },
          }))
        await tx.testCase.updateMany({
          where: { id: { in: changed.map((c) => c.id) } },
          data: { ...base, suiteId: action.suiteId },
        })
        break
      }
      case "setPriority":
      case "setType":
      case "setStatus": {
        const field = (
          {
            setPriority: "priority",
            setType: "type",
            setStatus: "status",
          } as const
        )[action.kind]
        const value =
          action.kind === "setPriority"
            ? action.priority
            : action.kind === "setType"
              ? action.type
              : action.status
        changed = rows
          .filter((r) => r[field] !== value)
          .map((r) => ({
            id: r.id,
            changes: { [field]: { from: r[field], to: value } },
          }))
        await tx.testCase.updateMany({
          where: { id: { in: changed.map((c) => c.id) } },
          data: { ...base, [field]: value },
        })
        break
      }
      case "addLabels": {
        const updates = rows
          .map((r) => {
            const added = action.labels.filter((l) => !r.labels.includes(l))
            return { id: r.id, added, labels: [...r.labels, ...added] }
          })
          .filter((u) => u.added.length > 0)
        const tooMany = updates.filter(
          (u) => u.labels.length > MAX_LABELS
        ).length
        if (tooMany > 0) {
          throw httpError(
            400,
            `${tooMany} ${tooMany === 1 ? "case" : "cases"} would have more than ${MAX_LABELS} labels. Remove some labels first.`
          )
        }
        // One statement: append the labels each case lacks, in the given order.
        if (updates.length > 0) {
          await tx.$executeRaw`
            UPDATE test_cases SET
              labels = labels || ARRAY(
                SELECT l FROM unnest(${action.labels}::text[]) WITH ORDINALITY AS u(l, o)
                WHERE NOT (l = ANY(test_cases.labels))
                ORDER BY o
              ),
              version = version + 1,
              updated_by_id = ${access.user.id},
              updated_at = now()
            WHERE id = ANY(${updates.map((u) => u.id)}::uuid[])`
        }
        changed = updates.map((u) => ({
          id: u.id,
          changes: { labels: { added: u.added, removed: [] } },
        }))
        break
      }
      case "archive": {
        changed = rows.map((r) => ({
          id: r.id,
          changes: action.reason ? { reason: action.reason } : {},
        }))
        await tx.testCase.updateMany({
          where: { id: { in: changed.map((c) => c.id) } },
          data: {
            ...base,
            archivedAt: new Date(),
            archiveReason: action.reason,
            archivedSuiteId: null,
          },
        })
        break
      }
    }

    const keyOf = new Map(
      rows.map((r) => [r.id, formatCaseKey(access.project.key, r.number)])
    )
    if (changed.length > 0) {
      await tx.activityLog.createMany({
        data: changed.map((c) => ({
          actorId: access.user.id,
          projectId,
          entityType: "case",
          inFeed: false,
          entityId: c.id,
          action: action.kind === "archive" ? "archived" : "updated",
          changes: {
            key: keyOf.get(c.id),
            ...c.changes,
            bulk: true,
          } as Prisma.InputJsonObject,
        })),
      })
      // One summary for the project feed, which hides the per-case entries.
      const { kind, ...details } = action
      await recordActivity(tx, {
        actorId: access.user.id,
        projectId,
        entityType: "bulk",
        entityId: randomUUID(),
        action: kind === "archive" ? "archived" : "updated",
        changes: {
          kind,
          ...details,
          ...(kind === "move" ? { suite: summarySuite } : {}),
          count: changed.length,
        },
      })
    }
    return { updated: changed.length }
  }, LONG_TX)
}
