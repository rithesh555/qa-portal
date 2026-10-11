import { sessionUserSchema } from "@qa/shared"
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
        response: { 200: sessionUserSchema },
      },
    },
    async (request) => request.user!
  )
}

export default me
