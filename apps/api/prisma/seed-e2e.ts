// `pnpm db:seed:e2e` — wipes the E2E database and creates the Playwright
// accounts. Run by the E2E suite's global setup with DATABASE_URL pointed at
// E2E_DATABASE_URL; refuses any database without "e2e" in its name.
import { config } from "dotenv"
import { z } from "zod"
import { createAuth } from "../src/auth/auth.ts"
import { loadEnv } from "../src/env.ts"
import { createPrisma } from "../src/lib/prisma.ts"
import { assertLocalDevDatabase } from "./dev-guard.ts"

config({ path: new URL("../../../.env", import.meta.url), quiet: true })

const env = loadEnv()
assertLocalDevDatabase(env, "db:seed:e2e")
const dbName = new URL(env.DATABASE_URL).pathname.slice(1)
if (!/e2e/i.test(dbName)) {
  console.error(
    `db:seed:e2e only runs against an E2E database (got ${dbName}).`
  )
  process.exit(1)
}

const { E2E_ADMIN_PASSWORD, E2E_USER_PASSWORD, E2E_SLOTS } = z
  .object({
    E2E_ADMIN_PASSWORD: z.string().min(12),
    E2E_USER_PASSWORD: z.string().min(12),
    E2E_SLOTS: z.coerce.number().int().min(1).max(16).default(4),
  })
  .parse(process.env)

/** One set of accounts per Playwright worker, so per-user limits never collide. */
const ROLES = [
  { kind: "admin", role: "admin" },
  { kind: "lead", role: "user" },
  { kind: "tester", role: "user" },
  { kind: "viewer", role: "user" },
  { kind: "outsider", role: "user" },
  { kind: "deactivated", role: "user" },
] as const

const prisma = createPrisma(env.DATABASE_URL)
const auth = createAuth({
  prisma,
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  webOrigin: env.WEB_ORIGIN,
})

try {
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`
  if (rows.length > 0)
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ${rows.map((r) => `"public"."${r.tablename}"`).join(", ")} CASCADE`
    )

  for (let slot = 0; slot < E2E_SLOTS; slot++) {
    for (const { kind, role } of ROLES) {
      const username = `e2e.${kind}.${slot}`
      const { user } = await auth.api.createUser({
        body: {
          name: `E2E ${kind[0]!.toUpperCase()}${kind.slice(1)} ${slot}`,
          email: `${username}@e2e.qa-portal.local`,
          password: kind === "admin" ? E2E_ADMIN_PASSWORD : E2E_USER_PASSWORD,
          role,
          data: { username, displayUsername: username },
        },
      })
      await prisma.user.update({
        where: { id: user.id },
        data: {
          mustChangePassword: false,
          ...(kind === "deactivated"
            ? { banned: true, banReason: "Deactivated by an admin" }
            : {}),
        },
      })
    }
  }
  console.log(`E2E database reset: ${E2E_SLOTS * ROLES.length} accounts.`)
} finally {
  await prisma.$disconnect()
}
