import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { ensureAdmin } from "../src/auth/seed-admin.ts"
import { buildTestApp, resetDb, signIn } from "./helpers.ts"

const admin = {
  username: "root",
  name: "Root Admin",
  email: "root@test.local",
  password: "a-long-seed-password",
}

describe("ensureAdmin", () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildTestApp()
  })
  beforeEach(async () => {
    await resetDb(app.prisma)
  })
  afterAll(async () => {
    await app.close()
  })

  it("creates an admin who can sign in", async () => {
    expect(await ensureAdmin(app.auth, app.prisma, admin)).toBe("created")
    const user = await app.prisma.user.findUniqueOrThrow({
      where: { username: "root" },
    })
    expect(user.role).toBe("admin")
    await expect(signIn(app, "root", admin.password)).resolves.toContain(
      "session_token"
    )
  })

  it("is idempotent", async () => {
    await ensureAdmin(app.auth, app.prisma, admin)
    expect(await ensureAdmin(app.auth, app.prisma, admin)).toBe("exists")
    expect(await app.prisma.user.count()).toBe(1)
  })
})
