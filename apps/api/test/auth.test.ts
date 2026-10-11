import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { requireRole } from "../src/plugins/auth.ts"
import {
  buildTestApp,
  createUser,
  nextIp,
  PASSWORD,
  resetDb,
  signIn,
} from "./helpers.ts"

const ORIGIN = { origin: "http://localhost:5173" }

describe("auth", () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildTestApp({
      beforeReady: (instance) => {
        instance.get(
          "/api/test/lead-only",
          { preHandler: requireRole("qa_lead") },
          async () => ({ ok: true })
        )
      },
    })
  })
  beforeEach(async () => {
    await resetDb(app.prisma)
    await createUser(app, { username: "alice", role: "admin" })
    await createUser(app, { username: "victor", role: "viewer" })
  })
  afterAll(async () => {
    await app.close()
  })

  describe("sign-in", () => {
    it("signs in with username and password and sets an httpOnly session cookie", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/sign-in/username",
        remoteAddress: nextIp(),
        headers: ORIGIN,
        payload: { username: "alice", password: PASSWORD },
      })
      expect(res.statusCode).toBe(200)
      const session = res.cookies.find((c) =>
        c.name.endsWith("qa-portal.session_token")
      )
      expect(session).toBeDefined()
      expect(session?.httpOnly).toBe(true)
      expect(session?.sameSite).toMatch(/lax/i)
    })

    it("treats usernames case-insensitively", async () => {
      await expect(signIn(app, "ALICE")).resolves.toContain("session_token")
    })

    it("rejects a wrong password without setting a cookie", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/sign-in/username",
        remoteAddress: nextIp(),
        headers: ORIGIN,
        payload: { username: "alice", password: "wrong-password-123" },
      })
      expect(res.statusCode).toBe(401)
      expect(res.cookies).toHaveLength(0)
    })

    it("rate-limits repeated sign-in attempts from one IP", async () => {
      const ip = nextIp()
      const statuses: number[] = []
      for (let i = 0; i < 6; i++) {
        const res = await app.inject({
          method: "POST",
          url: "/api/auth/sign-in/username",
          remoteAddress: ip,
          headers: ORIGIN,
          payload: { username: "alice", password: "wrong-password-123" },
        })
        statuses.push(res.statusCode)
      }
      expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401])
      expect(statuses[5]).toBe(429)
    })

    it("ignores a client-supplied IP header when rate-limiting", async () => {
      const ip = nextIp()
      let last = 0
      for (let i = 0; i < 6; i++) {
        const res = await app.inject({
          method: "POST",
          url: "/api/auth/sign-in/username",
          remoteAddress: ip,
          headers: { ...ORIGIN, "x-qa-client-ip": `203.0.113.${i}` },
          payload: { username: "alice", password: "wrong-password-123" },
        })
        last = res.statusCode
      }
      expect(last).toBe(429)
    })

    it("has no public sign-up", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/sign-up/email",
        remoteAddress: nextIp(),
        headers: ORIGIN,
        payload: {
          email: "mallory@test.local",
          password: PASSWORD,
          name: "Mallory",
        },
      })
      expect(res.statusCode).toBe(404)
      expect(
        await app.prisma.user.count({ where: { email: "mallory@test.local" } })
      ).toBe(0)
    })

    it("does not allow sign-in by email", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/sign-in/email",
        remoteAddress: nextIp(),
        headers: ORIGIN,
        payload: { email: "alice@test.local", password: PASSWORD },
      })
      expect(res.statusCode).toBe(404)
    })
  })

  describe("GET /api/me", () => {
    it("returns 401 without a session", async () => {
      const res = await app.inject({ method: "GET", url: "/api/me" })
      expect(res.statusCode).toBe(401)
      expect(res.json()).toMatchObject({ statusCode: 401 })
    })

    it("returns the signed-in user", async () => {
      const cookie = await signIn(app, "alice")
      const res = await app.inject({
        method: "GET",
        url: "/api/me",
        headers: { cookie },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toEqual({
        id: expect.any(String),
        username: "alice",
        name: "alice",
        email: "alice@test.local",
        role: "admin",
      })
    })

    it("re-sends the session cookie when it extends an active session", async () => {
      const cookie = await signIn(app, "alice")
      // Make the session due for extension (updateAge is 1h of a 24h life).
      await app.prisma.session.updateMany({
        data: { expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000) },
      })
      const res = await app.inject({
        method: "GET",
        url: "/api/me",
        headers: { cookie },
      })
      expect(res.statusCode).toBe(200)
      const refreshed = res.cookies.find((c) =>
        c.name.endsWith("qa-portal.session_token")
      )
      expect(refreshed).toBeDefined()
      expect(refreshed?.maxAge).toBe(24 * 60 * 60)
    })

    it("acts with the highest of several stored roles", async () => {
      await app.auth.api.createUser({
        body: {
          email: "multi@test.local",
          name: "multi",
          password: PASSWORD,
          role: ["tester", "qa_lead"],
          data: { username: "multi" },
        },
      })
      const cookie = await signIn(app, "multi")
      const res = await app.inject({
        method: "GET",
        url: "/api/me",
        headers: { cookie },
      })
      expect(res.json().role).toBe("qa_lead")
    })

    it("returns 401 after sign-out", async () => {
      const cookie = await signIn(app, "alice")
      const out = await app.inject({
        method: "POST",
        url: "/api/auth/sign-out",
        headers: { ...ORIGIN, cookie },
      })
      expect(out.statusCode).toBe(200)
      const res = await app.inject({
        method: "GET",
        url: "/api/me",
        headers: { cookie },
      })
      expect(res.statusCode).toBe(401)
    })
  })

  describe("roles", () => {
    it("lets an admin list users through the admin API", async () => {
      const cookie = await signIn(app, "alice")
      const res = await app.inject({
        method: "GET",
        url: "/api/auth/admin/list-users",
        headers: { cookie },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().users).toHaveLength(2)
    })

    it("forbids a viewer from the admin API", async () => {
      const cookie = await signIn(app, "victor")
      const res = await app.inject({
        method: "GET",
        url: "/api/auth/admin/list-users",
        headers: { cookie },
      })
      expect(res.statusCode).toBe(403)
    })

    it("requireRole rejects anonymous requests with 401", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/test/lead-only",
      })
      expect(res.statusCode).toBe(401)
    })

    it("requireRole rejects a lower role with 403", async () => {
      const cookie = await signIn(app, "victor")
      const res = await app.inject({
        method: "GET",
        url: "/api/test/lead-only",
        headers: { cookie },
      })
      expect(res.statusCode).toBe(403)
    })

    it("requireRole admits a higher role", async () => {
      const cookie = await signIn(app, "alice")
      const res = await app.inject({
        method: "GET",
        url: "/api/test/lead-only",
        headers: { cookie },
      })
      expect(res.statusCode).toBe(200)
    })
  })
})
