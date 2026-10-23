/** The path without its query string: searches (`?q=`) carry names and emails. */
export function logSafeUrl(url: string): string {
  const i = url.indexOf("?")
  return i === -1 ? url : url.slice(0, i)
}

/**
 * What to log for a server error. Prisma's messages can echo the query's
 * arguments (a password hash, a user's email), so for those only the type,
 * code and first line are kept; anything else is logged in full.
 */
export function logSafeError(err: unknown): unknown {
  if (!(err instanceof Error) || !err.name.startsWith("PrismaClient"))
    return err
  const firstLine =
    err.message
      .split("\n")
      .map((l) => l.trim())
      .find(Boolean) ?? ""
  return {
    type: err.name,
    code: (err as { code?: unknown }).code,
    message: firstLine,
  }
}
