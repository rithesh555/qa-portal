import {
  type Action,
  can,
  effectivePortalRole,
  type SessionUser,
} from "@qa/shared"
import { fromNodeHeaders } from "better-auth/node"
import type {
  FastifyReply,
  FastifyRequest,
  preHandlerAsyncHookHandler,
} from "fastify"
import fp from "fastify-plugin"
import { type Auth, CLIENT_IP_HEADER, createAuth } from "../auth/auth.ts"
import { recordActivity } from "../lib/activity.ts"
import { httpError } from "../lib/http-error.ts"

declare module "fastify" {
  interface FastifyInstance {
    auth: Auth
    signInGuard: SignInGuard
  }
  interface FastifyRequest {
    user: SessionUser | null
  }
}

interface AuthPluginOptions {
  baseURL: string
  secret: string
  webOrigin: string
}

/** Copies Set-Cookie headers from a Better Auth response onto the reply. */
function forwardCookies(headers: Headers, reply: FastifyReply) {
  const cookies = headers.getSetCookie()
  if (cookies.length > 0) reply.header("set-cookie", cookies)
}

/**
 * Loads the session user (or null) onto `request.user`. When Better Auth
 * extends the session it re-issues the cookie; that is forwarded so active
 * users aren't signed out when the original cookie expires.
 */
async function loadUser(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<SessionUser | null> {
  if (request.user) return request.user
  const { headers, response: session } =
    await request.server.auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
      returnHeaders: true,
    })
  forwardCookies(headers, reply)
  if (!session) return null
  // Deactivation bans the user and deletes their sessions together, but a
  // sign-in racing it could leave one behind: a banned user never counts.
  if (session.user.banned === true) return null
  // Sessions slide while in use; this caps how long one can live at all.
  if (
    Date.now() - new Date(session.session.createdAt).getTime() >
    MAX_SESSION_AGE_MS
  )
    return null
  request.user = {
    id: session.user.id,
    username: session.user.username ?? "",
    name: session.user.name,
    email: session.user.email,
    role: effectivePortalRole(session.user.role),
    mustChangePassword: session.user.mustChangePassword === true,
  }
  return request.user
}

/**
 * While an admin-chosen password is unchanged, the user may only read who
 * they are (GET /api/me), change the password and sign out (both Better Auth
 * routes, which don't come through here).
 */
function assertPasswordChosen(request: FastifyRequest, user: SessionUser) {
  if (user.mustChangePassword && request.routeOptions.url !== "/api/me")
    throw httpError(403, "Change your password first")
}

/** However active, a session ends this long after sign-in. */
export const MAX_SESSION_AGE_MS = 7 * 24 * 60 * 60 * 1000

/** preHandler: 401 without a session. */
export const requireAuth: preHandlerAsyncHookHandler = async (
  request,
  reply
) => {
  const user = await loadUser(request, reply)
  if (!user) throw httpError(401, "Authentication required")
  assertPasswordChosen(request, user)
}

/**
 * preHandler for portal-wide actions (no project involved): 401 without a
 * session, 403 when the shared permission matrix denies the action.
 */
export function requirePermission(action: Action): preHandlerAsyncHookHandler {
  return async (request, reply) => {
    const user = await loadUser(request, reply)
    if (!user) throw httpError(401, "Authentication required")
    assertPasswordChosen(request, user)
    if (!can(action, { portalRole: user.role })) {
      throw httpError(403, "You don't have permission to do that")
    }
  }
}

/**
 * The only Better Auth endpoints reachable from outside. Everything else it
 * offers (admin/*, update-user, list-sessions, ...) stays server-side, so
 * user changes go through /api/users, which checks the permission matrix and
 * writes the activity log. New Better Auth endpoints are closed by default.
 */
const PUBLIC_AUTH_ROUTES = [
  { method: "POST", url: "/api/auth/sign-in/username" },
  { method: "POST", url: "/api/auth/sign-out" },
  { method: "POST", url: "/api/auth/change-password" },
] as const

const SIGN_IN = "/api/auth/sign-in/username"
const CHANGE_PASSWORD = "/api/auth/change-password"

/**
 * Sign-in attempts per username, from any IP. After 10 failures in 15
 * minutes each further attempt waits a few seconds first: that slows
 * guessing one account to a crawl without locking its owner out (a hard
 * lockout would let anyone keep, say, the admin out). Only one attempt per
 * username runs at a time, so parallel guesses can't race the count. A
 * success resets it. Better Auth's own limit is per IP (loose, as an office
 * shares one address). In memory: one API process (Phase 9 notes this for
 * several).
 */
const SIGN_IN_SLOWDOWN = { after: 10, windowMs: 15 * 60 * 1000, delayMs: 3000 }

class SignInGuard {
  private failures = new Map<string, { count: number; since: number }>()
  private inFlight = new Set<string>()

  private key(body: unknown) {
    const name = (body as { username?: unknown } | undefined)?.username
    return typeof name === "string" ? name.trim().toLowerCase() : null
  }

  /**
   * Claims this username's slot for this address (429 if an attempt from
   * here is already running), slowing down if the username has been guessed
   * at. The slot is per address, so someone guessing can't hold the real
   * person's sign-in up from elsewhere; the failure count is per username.
   */
  async admit(body: unknown, ip: string, now = Date.now()) {
    const key = this.key(body)
    if (!key) return
    const slot = `${key} ${ip}`
    if (this.inFlight.has(slot))
      throw httpError(
        429,
        "A sign-in for this username is already in progress."
      )
    this.inFlight.add(slot)
    const entry = this.failures.get(key)
    if (entry && now - entry.since > SIGN_IN_SLOWDOWN.windowMs)
      this.failures.delete(key)
    else if (entry && entry.count >= SIGN_IN_SLOWDOWN.after)
      await new Promise((r) => setTimeout(r, SIGN_IN_SLOWDOWN.delayMs))
  }

  /** Releases the slot and counts the outcome (rate-limited answers don't count). */
  done(
    body: unknown,
    ip: string,
    outcome: "ok" | "failed" | "skipped",
    now = Date.now()
  ) {
    const key = this.key(body)
    if (!key) return
    this.inFlight.delete(`${key} ${ip}`)
    if (outcome === "skipped") return
    if (outcome === "ok") return void this.failures.delete(key)
    const entry = this.failures.get(key)
    if (!entry || now - entry.since > SIGN_IN_SLOWDOWN.windowMs)
      this.failures.set(key, { count: 1, since: now })
    else entry.count++
    // Old entries can't pile up without bound.
    if (this.failures.size > 10_000)
      for (const [k, e] of this.failures)
        if (now - e.since > SIGN_IN_SLOWDOWN.windowMs) this.failures.delete(k)
  }
}

async function forwardToBetterAuth(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const guard = request.server.signInGuard
  // The matched route, not request.url: a query string mustn't skip anything.
  const route = request.routeOptions.url
  const signingIn = route === SIGN_IN
  const changing = route === CHANGE_PASSWORD
  if (changing) {
    // Better Auth checks the session itself, without our rules: a
    // deactivated user's, or one past its 7 days, can't change the password.
    if (!(await loadUser(request, reply)))
      throw httpError(401, "Authentication required")
    const body = request.body as
      { currentPassword?: unknown; newPassword?: unknown } | undefined
    // The same password again would keep one an admin knows.
    if (body?.newPassword === body?.currentPassword)
      throw httpError(400, "Choose a different password from the current one")
  }
  if (!signingIn) return forward(request, reply, { changing, onSignIn() {} })
  await guard.admit(request.body, request.ip)
  // Released exactly once, whatever happens below.
  let outcome: "ok" | "failed" | "skipped" = "skipped"
  try {
    return await forward(request, reply, {
      changing,
      onSignIn: (o) => (outcome = o),
    })
  } finally {
    guard.done(request.body, request.ip, outcome)
  }
}

async function forward(
  request: FastifyRequest,
  reply: FastifyReply,
  {
    changing,
    onSignIn,
  }: {
    changing: boolean
    /** Called with a sign-in's outcome, for the guard. */
    onSignIn: (outcome: "ok" | "failed" | "skipped") => void
  }
) {
  const signingIn = request.routeOptions.url === SIGN_IN
  const headers = fromNodeHeaders(request.headers)
  // Better Auth rate-limits by this header; always overwrite it with the
  // address Fastify resolved (honouring trustProxy) so clients can't spoof it.
  headers.set(CLIENT_IP_HEADER, request.ip)

  const url = new URL(request.url, `${request.protocol}://${request.host}`)
  const response = await request.server.auth.handler(
    new Request(url, {
      method: request.method,
      headers,
      ...(request.body ? { body: JSON.stringify(request.body) } : {}),
    })
  )

  reply.status(response.status)
  response.headers.forEach((value, key) => {
    if (key !== "set-cookie" && key !== "content-length")
      reply.header(key, value)
  })
  forwardCookies(response.headers, reply)
  if (signingIn)
    onSignIn(
      response.ok ? "ok" : response.status === 429 ? "skipped" : "failed"
    )
  const text = response.body ? await response.text() : null
  if (text && response.ok && (signingIn || changing)) {
    const { token: _token, ...rest } = JSON.parse(text) as {
      token?: unknown
      user?: { id?: unknown }
    }
    // They picked their own password: the admin-chosen one is gone. Logged,
    // so an admin editing this user meanwhile is told who changed it.
    const userId = rest.user?.id
    if (changing && typeof userId === "string") {
      const { prisma } = request.server
      const { count } = await prisma.user.updateMany({
        // Only while they still have a session: an admin's reset landing in
        // between deletes every session and sets the flag; it must stay set.
        where: { id: userId, mustChangePassword: true, sessions: { some: {} } },
        data: { mustChangePassword: false },
      })
      if (count)
        await recordActivity(prisma, {
          actorId: userId,
          entityType: "user",
          entityId: userId,
          action: "password_chosen",
        })
    }
    // The session lives in an httpOnly cookie; its token never goes to page script.
    return reply.send(rest)
  }
  return reply.send(text)
}

export default fp<AuthPluginOptions>(
  async (app, options) => {
    app.decorate("auth", createAuth({ prisma: app.prisma, ...options }))
    app.decorateRequest("user", null)
    app.decorate("signInGuard", new SignInGuard())

    for (const route of PUBLIC_AUTH_ROUTES) {
      app.route({
        ...route,
        schema: { hide: true },
        handler: forwardToBetterAuth,
      })
    }
  },
  { name: "auth", dependencies: ["prisma"] }
)
