import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { requirePermission } from "../src/plugins/auth.ts"
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
          "/api/test/admin-only",
          { preHandler: requirePermission("users:manage") },
          async () => ({ ok: true })
        )
      },
    })
  })
  beforeEach(async () => {
    await resetDb(app.prisma)
    await createUser(app, { username: "alice", role: "admin" })
    await createUser(app, { username: "victor", role: "user" })
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

    // One office behind one address shares the per-IP budget, so it is
    // loose (30 a minute); guessing one account is held back per username.
    const attempt = (username: string, ip: string, extra = {}) =>
      app.inject({
        method: "POST",
        url: "/api/auth/sign-in/username",
        remoteAddress: ip,
        headers: { ...ORIGIN, ...extra },
        payload: { username, password: "wrong-password-123" },
      })

    it("rate-limits sign-in attempts from one IP after 30 a minute", async () => {
      const ip = nextIp()
      const statuses: number[] = []
      // Different usernames, so only the per-IP limit applies.
      for (let i = 0; i < 31; i++)
        statuses.push((await attempt(`nobody${i}`, ip)).statusCode)
      expect(new Set(statuses.slice(0, 30))).toEqual(new Set([401]))
      expect(statuses[30]).toBe(429)
    }, 30_000)

    it("ignores a client-supplied IP header when rate-limiting", async () => {
      const ip = nextIp()
      let last = 0
      for (let i = 0; i < 31; i++)
        last = (
          await attempt(`nobody${i}`, ip, {
            "x-qa-client-ip": `203.0.113.${i}`,
          })
        ).statusCode
      expect(last).toBe(429)
    }, 30_000)

    const signInAs = (username: string, password: string, query = "") =>
      app.inject({
        method: "POST",
        url: `/api/auth/sign-in/username${query}`,
        remoteAddress: nextIp(),
        headers: ORIGIN,
        payload: { username, password },
      })
    const timed = async <T>(p: Promise<T>) => {
      const t = Date.now()
      const value = await p
      return { value, ms: Date.now() - t }
    }

    it("slows guessing at one username after 10 failures, from any IP, without locking the owner out", async () => {
      for (let i = 0; i < 10; i++)
        expect((await attempt("alice", nextIp())).statusCode).toBe(401)
      const slow = await timed(attempt("alice", nextIp()))
      expect(slow.value.statusCode).toBe(401)
      expect(slow.ms).toBeGreaterThanOrEqual(2900)
      // The real password still works (just as slowly), and resets the count.
      const owner = await timed(signInAs("alice", PASSWORD))
      expect(owner.value.statusCode).toBe(200)
      expect(owner.ms).toBeGreaterThanOrEqual(2900)
      expect((await timed(attempt("alice", nextIp()))).ms).toBeLessThan(2000)
      // Other accounts are unaffected.
      expect((await timed(attempt("victor", nextIp()))).ms).toBeLessThan(2000)
    }, 30_000)

    it("takes one sign-in at a time per username from an address, so parallel guesses can't race the count", async () => {
      const ip = nextIp()
      const results = await Promise.all(
        Array.from({ length: 5 }, () => attempt("ghost", ip))
      )
      const codes = results.map((r) => r.statusCode).sort()
      expect(codes).toContain(429)
      expect(codes.filter((c) => c === 401).length).toBeGreaterThanOrEqual(1)
    })

    it("lets the owner in from elsewhere while someone keeps guessing their password", async () => {
      const attacker = nextIp()
      for (let i = 0; i < 10; i++)
        expect((await attempt("alice", attacker)).statusCode).toBe(401)
      // A slowed-down guess in flight from the attacker's address...
      // (inject only sends once awaited: start it, let it take its slot.)
      const guessing = attempt("alice", attacker).then((r) => r)
      await new Promise((r) => setTimeout(r, 300))
      // ...doesn't stop the real person, elsewhere, from signing in.
      const owner = await signInAs("alice", PASSWORD)
      expect(owner.statusCode).toBe(200)
      await guessing
    }, 30_000)

    it("guards sign-in and strips the token even with a query string", async () => {
      for (let i = 0; i < 10; i++)
        await signInAs("victor", "wrong-password-123", "?x=1")
      const slow = await timed(signInAs("victor", "wrong-password-123", "?x=2"))
      expect(slow.ms).toBeGreaterThanOrEqual(2900)
      const ok = await signInAs("alice", PASSWORD, "?x=3")
      expect(ok.statusCode).toBe(200)
      expect(ok.json()).not.toHaveProperty("token")
    }, 30_000)

    it("doesn't return the session token in the sign-in reply", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/sign-in/username",
        remoteAddress: nextIp(),
        headers: ORIGIN,
        payload: { username: "alice", password: PASSWORD },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json()).not.toHaveProperty("token")
      expect(res.json().user).toMatchObject({ username: "alice" })
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
        mustChangePassword: false,
        projectsLed: 0,
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

    it("treats admin among several stored roles as admin", async () => {
      await app.auth.api.createUser({
        body: {
          email: "multi@test.local",
          name: "multi",
          password: PASSWORD,
          role: ["user", "admin"],
          data: { username: "multi" },
        },
      })
      const cookie = await signIn(app, "multi")
      const res = await app.inject({
        method: "GET",
        url: "/api/me",
        headers: { cookie },
      })
      expect(res.json().role).toBe("admin")
    })

    it("gives new users the user role by default", async () => {
      await app.auth.api.createUser({
        body: {
          email: "plain@test.local",
          name: "plain",
          password: PASSWORD,
          data: { username: "plain" },
        },
      })
      const cookie = await signIn(app, "plain")
      const res = await app.inject({
        method: "GET",
        url: "/api/me",
        headers: { cookie },
      })
      expect(res.json().role).toBe("user")
    })

    it("lets a user change their own password and keeps them signed in", async () => {
      const cookie = await signIn(app, "victor")
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/change-password",
        headers: { ...ORIGIN, cookie },
        payload: {
          currentPassword: PASSWORD,
          newPassword: "victors-new-password",
          revokeOtherSessions: true,
        },
      })
      expect(res.statusCode).toBe(200)
      const fresh = res.cookies.map((c) => `${c.name}=${c.value}`).join("; ")
      const me = await app.inject({
        method: "GET",
        url: "/api/me",
        headers: { cookie: fresh || cookie },
      })
      expect(me.statusCode).toBe(200)
      await expect(signIn(app, "victor")).rejects.toThrow()
      await expect(
        signIn(app, "victor", "victors-new-password")
      ).resolves.toContain("session_token")
    }, 30_000)

    it.each([
      ["POST", "/api/auth/update-user"],
      ["POST", "/api/auth/admin/set-role"],
      ["GET", "/api/auth/admin/list-users"],
      ["GET", "/api/auth/%61dmin/list-users"],
      ["POST", "/api/auth/sign-up/email"],
      ["POST", "/api/auth/delete-user"],
      ["GET", "/api/auth/list-sessions"],
    ] as const)(
      "only forwards the auth endpoints the app uses: %s %s is 404",
      async (method, url) => {
        const cookie = await signIn(app, "victor")
        const res = await app.inject({
          method,
          url,
          headers: { ...ORIGIN, cookie },
          ...(method === "POST" ? { payload: { name: "Mallory" } } : {}),
        })
        expect(res.statusCode).toBe(404)
      }
    )

    it("refuses a deactivated user whose session survived (401)", async () => {
      const cookie = await signIn(app, "victor")
      // As if a sign-in raced the deactivation: banned, session still there.
      await app.prisma.user.update({
        where: { username: "victor" },
        data: { banned: true },
      })
      const res = await app.inject({
        method: "GET",
        url: "/api/me",
        headers: { cookie },
      })
      expect(res.statusCode).toBe(401)
    })

    it("won't change a password to the same one (an admin's would stay known)", async () => {
      const cookie = await signIn(app, "victor")
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/change-password",
        headers: { ...ORIGIN, cookie },
        payload: {
          currentPassword: PASSWORD,
          newPassword: PASSWORD,
          revokeOtherSessions: true,
        },
      })
      expect(res.statusCode).toBe(400)
      expect(res.json().message).toMatch(/different/i)
    })

    it("refuses a password change from a session past its 7 days", async () => {
      const cookie = await signIn(app, "victor")
      await app.prisma.session.updateMany({
        data: { createdAt: new Date(Date.now() - 7 * 24 * 3600_000 - 60_000) },
      })
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/change-password",
        headers: { ...ORIGIN, cookie },
        payload: {
          currentPassword: PASSWORD,
          newPassword: "victors-new-password",
          revokeOtherSessions: true,
        },
      })
      expect(res.statusCode).toBe(401)
    })

    it("ends a session 7 days after sign-in, however active", async () => {
      const cookie = await signIn(app, "victor")
      await app.prisma.session.updateMany({
        data: { createdAt: new Date(Date.now() - 7 * 24 * 3600_000 - 60_000) },
      })
      const res = await app.inject({
        method: "GET",
        url: "/api/me",
        headers: { cookie },
      })
      expect(res.statusCode).toBe(401)
    })

    it("doesn't expose get-session (the web uses /api/me)", async () => {
      const cookie = await signIn(app, "victor")
      const res = await app.inject({
        method: "GET",
        url: "/api/auth/get-session",
        headers: { cookie },
      })
      expect(res.statusCode).toBe(404)
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

  describe("rate limits", () => {
    it("count per IP: made-up session cookies don't buy a fresh budget", async () => {
      const ip = nextIp()
      let last = 0
      for (let i = 0; i <= 1000; i++)
        last = (
          await app.inject({
            method: "GET",
            url: "/api/me",
            remoteAddress: ip,
            headers: { cookie: `qa-portal.session_token=fake-${i}` },
          })
        ).statusCode
      expect(last).toBe(429)
    }, 60_000)
  })

  describe("cross-site requests", () => {
    it.each([
      ["a foreign origin", { origin: "https://evil.example" }],
      ["no origin", {}],
    ])("refuses a state-changing request with %s (403)", async (_, headers) => {
      const cookie = await signIn(app, "alice")
      const victor = await app.prisma.user.findUniqueOrThrow({
        where: { username: "victor" },
      })
      for (const url of [
        `/api/users/${victor.id}/deactivate`,
        // Percent-encoded: the router decodes it to the same route.
        `/%61pi/users/${victor.id}/deactivate`,
        "/api/auth/sign-out",
      ]) {
        const res = await app.inject({
          method: "POST",
          url,
          headers: { ...headers, cookie },
        })
        expect(res.statusCode, url).toBe(403)
      }
      // Nothing happened.
      expect(
        (await app.prisma.user.findUniqueOrThrow({ where: { id: victor.id } }))
          .banned
      ).not.toBe(true)
    })

    it("lets reads through without an origin", async () => {
      const cookie = await signIn(app, "alice")
      const res = await app.inject({
        method: "GET",
        url: "/api/me",
        headers: { cookie },
      })
      expect(res.statusCode).toBe(200)
    })
  })

  describe("roles", () => {
    it("requirePermission rejects anonymous requests with 401", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/test/admin-only",
      })
      expect(res.statusCode).toBe(401)
    })

    it("requirePermission rejects a non-admin with 403 for an admin-only action", async () => {
      const cookie = await signIn(app, "victor")
      const res = await app.inject({
        method: "GET",
        url: "/api/test/admin-only",
        headers: { cookie },
      })
      expect(res.statusCode).toBe(403)
    })

    it("requirePermission admits an admin", async () => {
      const cookie = await signIn(app, "alice")
      const res = await app.inject({
        method: "GET",
        url: "/api/test/admin-only",
        headers: { cookie },
      })
      expect(res.statusCode).toBe(200)
    })
  })
})
