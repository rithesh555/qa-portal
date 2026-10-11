// Entry point for the Better Auth CLI (`pnpm auth:generate`) only.
// The app builds its auth instance in app.ts.
import { loadEnv } from "../env.ts"
import { createPrisma } from "../lib/prisma.ts"
import { createAuth } from "./auth.ts"

const env = loadEnv()

export const auth = createAuth({
  prisma: createPrisma(env.DATABASE_URL),
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  webOrigin: env.WEB_ORIGIN,
})
