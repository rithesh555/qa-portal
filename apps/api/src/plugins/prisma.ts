import fp from "fastify-plugin"
import { createPrisma, type PrismaClient } from "../lib/prisma.ts"

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

export default fp<{ databaseUrl: string }>(
  async (app, { databaseUrl }) => {
    const prisma = createPrisma(databaseUrl)
    app.decorate("prisma", prisma)
    app.addHook("onClose", async () => {
      await prisma.$disconnect()
    })
  },
  { name: "prisma" }
)
