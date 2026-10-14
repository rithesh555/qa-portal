import type { Prisma } from "./prisma.ts"

export type CounterScope = "case" | "import"

/**
 * Reserves `count` consecutive numbers in a project's sequence and returns the
 * first. Runs inside the caller's transaction: the row lock it takes holds
 * until commit, and a rollback gives the numbers back.
 */
export async function nextNumbers(
  tx: Prisma.TransactionClient,
  projectId: string,
  scope: CounterScope,
  count = 1
): Promise<number> {
  const [row] = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO project_counters (project_id, scope, value)
    VALUES (${projectId}::uuid, ${scope}, ${count})
    ON CONFLICT (project_id, scope)
    DO UPDATE SET value = project_counters.value + EXCLUDED.value
    RETURNING value`
  return row!.value - count + 1
}
