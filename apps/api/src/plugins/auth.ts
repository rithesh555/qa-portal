import { effectiveRole, hasRole, type Role, type SessionUser } from "@qa/shared"
import { fromNodeHeaders } from "better-auth/node"
import type {
  FastifyReply,
  FastifyRequest,
  preHandlerAsyncHookHandler,
} from "fastify"
import fp from "fastify-plugin"
import { type Auth, CLIENT_IP_HEADER, createAuth } from "../auth/auth.ts"

declare module "fastify" {
  interface FastifyInstance {
    auth: Auth
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

function httpError(statusCode: number, message: string) {
  return Object.assign(new Error(message), { statusCode })
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
  request.user = {
    id: session.user.id,
    username: session.user.username ?? "",
    name: session.user.name,
    email: session.user.email,
    role: effectiveRole(session.user.role),
  }
  return request.user
}

/** preHandler: 401 without a session. */
export const requireAuth: preHandlerAsyncHookHandler = async (
  request,
  reply
) => {
  if (!(await loadUser(request, reply))) {
    throw httpError(401, "Authentication required")
  }
}

/** preHandler: 401 without a session, 403 below `minimum`. */
export function requireRole(minimum: Role): preHandlerAsyncHookHandler {
  return async (request, reply) => {
    const user = await loadUser(request, reply)
    if (!user) throw httpError(401, "Authentication required")
    if (!hasRole(user.role, minimum)) throw httpError(403, "Insufficient role")
  }
}

async function forwardToBetterAuth(
  request: FastifyRequest,
  reply: FastifyReply
) {
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
    if (key !== "set-cookie") reply.header(key, value)
  })
  forwardCookies(response.headers, reply)
  return reply.send(response.body ? await response.text() : null)
}

export default fp<AuthPluginOptions>(
  async (app, options) => {
    app.decorate("auth", createAuth({ prisma: app.prisma, ...options }))
    app.decorateRequest("user", null)

    app.route({
      method: ["GET", "POST"],
      url: "/api/auth/*",
      schema: { hide: true },
      handler: forwardToBetterAuth,
    })
  },
  { name: "auth", dependencies: ["prisma"] }
)
