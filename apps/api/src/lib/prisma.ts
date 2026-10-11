import { PrismaPg } from "@prisma/adapter-pg"
import { type Prisma, PrismaClient } from "../generated/prisma/client.ts"

export function createPrisma(databaseUrl: string): PrismaClient {
  const adapter = new PrismaPg({ connectionString: databaseUrl })
  return new PrismaClient({ adapter })
}

export type { Prisma, PrismaClient }
