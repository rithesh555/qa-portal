/** An Error carrying an HTTP status; the error handler turns it into the standard body. */
/**
 * An error answered with this status and message. `reason` is a
 * machine-readable cause for clients that act on it (e.g. "stale": saved
 * from an out-of-date version, so reloading and saving again can work).
 */
export function httpError(
  statusCode: number,
  message: string,
  { reason }: { reason?: "stale" | "username-taken" | "email-taken" } = {}
) {
  return Object.assign(new Error(message), {
    statusCode,
    ...(reason ? { reason } : {}),
  })
}
