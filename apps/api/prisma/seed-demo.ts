// `pnpm db:seed:demo` — fills the DEV database with realistic demo data for
// walkthroughs and performance checks. Refuses to run outside development.
// Safe to re-run: existing demo users are left as they are.
import { config } from "dotenv"
import { z } from "zod"
import { createAuth } from "../src/auth/auth.ts"
import { demoUsers } from "../src/demo/users.ts"
import { loadEnv } from "../src/env.ts"
import { createPrisma } from "../src/lib/prisma.ts"

config({ path: new URL("../../../.env", import.meta.url), quiet: true })

const env = loadEnv()
if (env.NODE_ENV !== "development") {
  console.error(
    `db:seed:demo only runs with NODE_ENV=development (got ${env.NODE_ENV}).`
  )
  process.exit(1)
}

const { DEMO_USER_PASSWORD } = z
  .object({ DEMO_USER_PASSWORD: z.string().min(12) })
  .parse(process.env)

const prisma = createPrisma(env.DATABASE_URL)
const auth = createAuth({
  prisma,
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  webOrigin: env.WEB_ORIGIN,
})

try {
  let created = 0
  for (const user of demoUsers(DEMO_USER_PASSWORD)) {
    const exists = await prisma.user.findUnique({
      where: { username: user.username },
    })
    if (exists) continue
    const { user: row } = await auth.api.createUser({
      body: {
        name: user.name,
        email: user.email,
        password: user.password,
        role: user.role,
        data: { username: user.username, displayUsername: user.username },
      },
    })
    if (user.deactivated) {
      await prisma.user.update({
        where: { id: row.id },
        data: { banned: true, banReason: "Deactivated by an admin" },
      })
    }
    created += 1
  }
  console.log(`Demo users: ${created} created.`)
} finally {
  await prisma.$disconnect()
}
