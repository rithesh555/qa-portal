import type { preHandlerAsyncHookHandler } from "fastify"
import { httpError } from "./http-error.ts"

const MINUTE = 60_000

/**
 * A per-person limit for routes that cost much more than a normal request
 * (reports, exports, imports). Runs as a preHandler, after the session is
 * verified, so it counts real users: a made-up cookie can't buy a fresh
 * budget (the global limit is per IP for the same reason). In memory, so per
 * API process (Phase 9 notes this for several).
 */
function perUserPerMinute(
  name: string,
  max: number
): preHandlerAsyncHookHandler {
  const windows = new Map<string, { count: number; resetAt: number }>()
  return async (request, reply) => {
    const who = request.user?.id ?? `ip:${request.ip}`
    const now = Date.now()
    let w = windows.get(who)
    if (!w || now >= w.resetAt) {
      w = { count: 0, resetAt: now + MINUTE }
      windows.set(who, w)
    }
    w.count++
    if (w.count > max) {
      reply.header("retry-after", Math.ceil((w.resetAt - now) / 1000))
      throw httpError(
        429,
        `Too many ${name} requests. Wait a minute and try again.`
      )
    }
    // Old windows can't pile up without bound.
    if (windows.size > 10_000)
      for (const [k, v] of windows) if (now >= v.resetAt) windows.delete(k)
  }
}

/** Summaries that compute reports (home, all releases, a release report). */
export const REPORT_LIMIT = perUserPerMinute("report", 30)
/** Whole-list exports (cases, report rows). */
export const EXPORT_LIMIT = perUserPerMinute("export", 20)
/** Spreadsheet imports (check and run). */
export const IMPORT_LIMIT = perUserPerMinute("import", 10)
/** Readiness probes hit the database each time (per IP; no session). */
export const PROBE_LIMIT = { rateLimit: { max: 60, timeWindow: "1 minute" } }
