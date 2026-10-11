import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"

const health: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/health",
    {
      config: { rateLimit: false },
      schema: {
        tags: ["system"],
        summary: "Liveness: the process is up",
        response: { 200: z.object({ status: z.literal("ok") }) },
      },
    },
    async () => ({ status: "ok" as const })
  )

  app.get(
    "/ready",
    {
      config: { rateLimit: false },
      schema: {
        tags: ["system"],
        summary: "Readiness: the database is reachable",
        response: {
          200: z.object({ status: z.literal("ok"), database: z.literal("up") }),
          503: z.object({
            status: z.literal("unavailable"),
            database: z.literal("down"),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        await app.prisma.$queryRaw`SELECT 1`
        return { status: "ok" as const, database: "up" as const }
      } catch (err) {
        request.log.error({ err }, "readiness check failed")
        return reply
          .code(503)
          .send({ status: "unavailable" as const, database: "down" as const })
      }
    }
  )
}

export default health
