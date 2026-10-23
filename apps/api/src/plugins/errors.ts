import type { FastifyError, FastifyInstance } from "fastify"
import fp from "fastify-plugin"
import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod"
import { STATUS_CODES } from "node:http"
import { logSafeError, logSafeUrl } from "../lib/log-safety.ts"

/** Every error response has this shape. */
export interface ErrorBody {
  statusCode: number
  error: string
  message: string
  details?: unknown
  /** Machine-readable cause, when the client can act on it (e.g. "stale"). */
  reason?: string
}

function body(
  statusCode: number,
  message: string,
  details?: unknown
): ErrorBody {
  return {
    statusCode,
    error: STATUS_CODES[statusCode] ?? "Error",
    message,
    ...(details === undefined ? {} : { details }),
  }
}

export default fp(
  async (app: FastifyInstance) => {
    app.setNotFoundHandler((request, reply) => {
      reply
        .code(404)
        .send(
          body(
            404,
            `Route ${request.method} ${logSafeUrl(request.url)} not found`
          )
        )
    })

    app.setErrorHandler((error: FastifyError, request, reply) => {
      if (hasZodFastifySchemaValidationErrors(error)) {
        return reply
          .code(400)
          .send(body(400, "Request validation failed", error.validation))
      }

      // A unique constraint lost a race with another request (Prisma P2002).
      if ((error as { code?: unknown }).code === "P2002") {
        return reply.code(409).send(body(409, "That value is already in use"))
      }

      const statusCode =
        error.statusCode && error.statusCode >= 400 ? error.statusCode : 500
      if (statusCode >= 500) {
        request.log.error({ err: logSafeError(error) }, "request failed")
        // Never leak internals for server errors.
        return reply
          .code(statusCode)
          .send(body(statusCode, "Internal server error"))
      }
      const reason = (error as { reason?: unknown }).reason
      return reply.code(statusCode).send({
        ...body(statusCode, error.message),
        ...(typeof reason === "string" ? { reason } : {}),
      })
    })
  },
  { name: "errors" }
)
