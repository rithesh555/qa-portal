// `pnpm db:seed` — creates the initial admin from SEED_ADMIN_* in .env.
import { config } from "dotenv"
import { z } from "zod"
import { createAuth } from "../src/auth/auth.ts"
import { ensureAdmin } from "../src/auth/seed-admin.ts"
import { loadEnv } from "../src/env.ts"
import { createPrisma } from "../src/lib/prisma.ts"

config({ path: new URL("../../../.env", import.meta.url), quiet: true })

const seed = z
  .object({
    SEED_ADMIN_USERNAME: z.string().min(3),
    SEED_ADMIN_NAME: z.string().min(1),
    SEED_ADMIN_EMAIL: z.email(),
    SEED_ADMIN_PASSWORD: z.string().min(12),
  })
  .parse(process.env)

const env = loadEnv()
const prisma = createPrisma(env.DATABASE_URL)
const auth = createAuth({
  prisma,
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  webOrigin: env.WEB_ORIGIN,
})

try {
  const result = await ensureAdmin(auth, prisma, {
    username: seed.SEED_ADMIN_USERNAME,
    name: seed.SEED_ADMIN_NAME,
    email: seed.SEED_ADMIN_EMAIL,
    password: seed.SEED_ADMIN_PASSWORD,
  })
  console.log(`Admin "${seed.SEED_ADMIN_USERNAME}": ${result}`)
} finally {
  await prisma.$disconnect()
}
