import { meSchema } from "@qa/shared"
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { requireAuth } from "../plugins/auth.ts"

const me: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/me",
    {
      preHandler: requireAuth,
      schema: {
        tags: ["auth"],
        summary: "The signed-in user",
        response: { 200: meSchema },
      },
    },
    async (request) => ({
      ...request.user!,
      projectsLed: await app.prisma.projectMember.count({
        where: {
          userId: request.user!.id,
          role: "lead",
          project: { archivedAt: null },
        },
      }),
    })
  )
}

export default me
