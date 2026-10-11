/** True for Prisma's unique-constraint error (P2002): another row already has that value. */
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: unknown }).code === "P2002"
  )
}
