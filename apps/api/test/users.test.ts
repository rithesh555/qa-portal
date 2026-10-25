import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import {
  buildTestApp,
  choosePassword,
  createUser,
  nextIp,
  PASSWORD,
  resetDb,
  signIn,
} from "./helpers.ts"

const ORIGIN = "http://localhost:5173"
const NEW_PASSWORD = "brand-new-password-1"

describe("users API", () => {
  let app: FastifyInstance
  let admin: string
  let member: string

  async function call(
    cookie: string | undefined,
    method: "GET" | "POST" | "PATCH",
    url: string,
    payload?: object
  ) {
    return app.inject({
      method,
      url,
      headers: { origin: ORIGIN, ...(cookie ? { cookie } : {}) },
      ...(payload ? { payload } : {}),
    })
  }

  async function idOf(username: string) {
    const user = await app.prisma.user.findUniqueOrThrow({
      where: { username },
    })
    return user.id
  }

  async function getUser(username: string) {
    const res = await call(admin, "GET", `/api/users/${await idOf(username)}`)
    expect(res.statusCode).toBe(200)
    return res.json()
  }

  beforeAll(async () => {
    app = await buildTestApp()
  })
  beforeEach(async () => {
    await resetDb(app.prisma)
    await createUser(app, { username: "alice", role: "admin" })
    await createUser(app, { username: "bob", role: "user" })
    await createUser(app, { username: "carol", role: "user" })
    admin = await signIn(app, "alice")
    member = await signIn(app, "bob")
  })
  afterAll(async () => {
    await app.close()
  })

  describe("authorization", () => {
    const routes = [
      ["GET", "/api/users"],
      ["POST", "/api/users"],
      ["GET", "/api/users/some-id"],
      ["PATCH", "/api/users/some-id"],
      ["POST", "/api/users/some-id/reset-password"],
      ["POST", "/api/users/some-id/deactivate"],
      ["POST", "/api/users/some-id/reactivate"],
    ] as const

    it.each(routes)("%s %s needs a session (401)", async (method, url) => {
      const res = await call(undefined, method, url, {})
      expect(res.statusCode).toBe(401)
    })

    it.each(routes)("%s %s is admin only (403)", async (method, url) => {
      const res = await call(member, method, url, {})
      expect(res.statusCode).toBe(403)
    })

    it.each([
      "/api/auth/admin/list-users",
      "/api/auth//admin/list-users",
      "/api/auth/%61dmin/list-users",
      "/api/auth/ADMIN/list-users",
    ])(
      "blocks Better Auth's own admin endpoints from outside: %s",
      async (url) => {
        const res = await call(admin, "GET", url)
        expect(res.statusCode).toBe(404)
      }
    )
  })

  describe("list", () => {
    it("pages, sorts and searches users", async () => {
      const res = await call(admin, "GET", "/api/users?pageSize=2&sort=name")
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.total).toBe(3)
      expect(body.items.map((u: { username: string }) => u.username)).toEqual([
        "alice",
        "bob",
      ])
      expect(body.items[0]).not.toHaveProperty("password")

      const search = await call(admin, "GET", "/api/users?q=CAR")
      expect(search.json().items).toHaveLength(1)
      expect(search.json().items[0].username).toBe("carol")
    })

    it("filters by status", async () => {
      await call(admin, "POST", `/api/users/${await idOf("carol")}/deactivate`)
      const active = await call(admin, "GET", "/api/users")
      expect(active.json().total).toBe(2)
      const off = await call(admin, "GET", "/api/users?status=deactivated")
      expect(
        off.json().items.map((u: { username: string }) => u.username)
      ).toEqual(["carol"])
      const all = await call(admin, "GET", "/api/users?status=all")
      expect(all.json().total).toBe(3)
    })

    it("rejects unknown sort fields", async () => {
      const res = await call(admin, "GET", "/api/users?sort=password")
      expect(res.statusCode).toBe(400)
    })
  })

  describe("create", () => {
    const input = {
      name: "Dave Doe",
      username: "Dave.D",
      email: "Dave@Example.com",
      password: PASSWORD,
      role: "user",
    }

    it("creates a user who can then sign in", async () => {
      const res = await call(admin, "POST", "/api/users", input)
      expect(res.statusCode).toBe(201)
      expect(res.json()).toMatchObject({
        username: "dave.d",
        email: "dave@example.com",
        role: "user",
        active: true,
      })
      await expect(signIn(app, "dave.d")).resolves.toContain("session_token")
    })

    it("records who created the user", async () => {
      const res = await call(admin, "POST", "/api/users", input)
      const log = await app.prisma.activityLog.findMany({
        where: { entityId: res.json().id },
      })
      expect(log).toHaveLength(1)
      expect(log[0]).toMatchObject({
        actorId: await idOf("alice"),
        entityType: "user",
        action: "created",
      })
      expect(JSON.stringify(log[0]!.changes)).not.toContain(PASSWORD)
    })

    it("rejects a taken username or email with 409, saying which", async () => {
      const dupName = await call(admin, "POST", "/api/users", {
        ...input,
        username: "BOB",
      })
      expect(dupName.statusCode).toBe(409)
      expect(dupName.json()).toMatchObject({ reason: "username-taken" })
      const dupEmail = await call(admin, "POST", "/api/users", {
        ...input,
        email: "bob@test.local",
      })
      expect(dupEmail.statusCode).toBe(409)
      expect(dupEmail.json()).toMatchObject({ reason: "email-taken" })
    })

    it("validates input", async () => {
      const res = await call(admin, "POST", "/api/users", {
        ...input,
        password: "short",
      })
      expect(res.statusCode).toBe(400)
    })
  })

  describe("update", () => {
    it("updates name, email and role and logs the changes", async () => {
      const bob = await getUser("bob")
      const res = await call(admin, "PATCH", `/api/users/${bob.id}`, {
        name: "Bob Builder",
        email: "bob@example.com",
        role: "admin",
        updatedAt: bob.updatedAt,
      })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({ name: "Bob Builder", role: "admin" })
      const log = await app.prisma.activityLog.findFirstOrThrow({
        where: { entityId: bob.id, action: "updated" },
      })
      expect(log.changes).toEqual({
        name: { from: "bob", to: "Bob Builder" },
        email: { from: "bob@test.local", to: "bob@example.com" },
        role: { from: "user", to: "admin" },
      })
    })

    it("rejects a stale edit with 409", async () => {
      const bob = await getUser("bob")
      const first = await call(admin, "PATCH", `/api/users/${bob.id}`, {
        name: "First",
        email: bob.email,
        role: "user",
        updatedAt: bob.updatedAt,
      })
      expect(first.statusCode).toBe(200)
      const second = await call(admin, "PATCH", `/api/users/${bob.id}`, {
        name: "Second",
        email: bob.email,
        role: "user",
        updatedAt: bob.updatedAt,
      })
      expect(second.statusCode).toBe(409)
    })

    it("rejects an email that belongs to someone else", async () => {
      const bob = await getUser("bob")
      const res = await call(admin, "PATCH", `/api/users/${bob.id}`, {
        name: bob.name,
        email: "carol@test.local",
        role: "user",
        updatedAt: bob.updatedAt,
      })
      expect(res.statusCode).toBe(409)
    })

    it("doesn't let an admin remove their own admin role", async () => {
      const alice = await getUser("alice")
      const res = await call(admin, "PATCH", `/api/users/${alice.id}`, {
        name: alice.name,
        email: alice.email,
        role: "user",
        updatedAt: alice.updatedAt,
      })
      expect(res.statusCode).toBe(409)
    })

    it("returns 404 for an unknown user", async () => {
      const res = await call(admin, "PATCH", "/api/users/missing", {
        name: "x",
        email: "x@example.com",
        role: "user",
        updatedAt: new Date().toISOString(),
      })
      expect(res.statusCode).toBe(404)
    })
  })

  describe("reset password", () => {
    it("sets a new password and signs the user out everywhere", async () => {
      const id = await idOf("bob")
      const res = await call(admin, "POST", `/api/users/${id}/reset-password`, {
        password: NEW_PASSWORD,
      })
      expect(res.statusCode).toBe(204)

      const me = await call(member, "GET", "/api/me")
      expect(me.statusCode).toBe(401)
      await expect(signIn(app, "bob")).rejects.toThrow()
      await expect(signIn(app, "bob", NEW_PASSWORD)).resolves.toContain(
        "session_token"
      )
      const log = await app.prisma.activityLog.findFirstOrThrow({
        where: { entityId: id, action: "password_reset" },
      })
      expect(JSON.stringify(log)).not.toContain(NEW_PASSWORD)
    })
  })

  describe("password set by an admin", () => {
    const changePassword = (cookie: string, current: string) =>
      call(cookie, "POST", "/api/auth/change-password", {
        currentPassword: current,
        newPassword: "my-own-secret-pass",
        revokeOtherSessions: true,
      })

    it("must be changed before the user can do anything else", async () => {
      await call(admin, "POST", "/api/users", {
        name: "Dave Doe",
        username: "dave",
        email: "dave@example.com",
        password: PASSWORD,
        role: "user",
      })
      const dave = await signIn(app, "dave")
      const me = await call(dave, "GET", "/api/me")
      expect(me.statusCode).toBe(200)
      expect(me.json().mustChangePassword).toBe(true)
      const blocked = await call(dave, "GET", "/api/projects")
      expect(blocked.statusCode).toBe(403)
      expect(blocked.json().message).toMatch(/change your password/i)

      const changed = await changePassword(dave, PASSWORD)
      expect(changed.statusCode).toBe(200)
      const fresh = changed.cookies
        .map((c) => `${c.name}=${c.value}`)
        .join("; ")
      expect(
        (await call(fresh, "GET", "/api/me")).json().mustChangePassword
      ).toBe(false)
      expect((await call(fresh, "GET", "/api/projects")).statusCode).toBe(200)
    })

    it("is set again by a password reset", async () => {
      const id = await idOf("bob")
      await call(admin, "POST", `/api/users/${id}/reset-password`, {
        password: NEW_PASSWORD,
      })
      const bob = await signIn(app, "bob", NEW_PASSWORD)
      expect(
        (await call(bob, "GET", "/api/me")).json().mustChangePassword
      ).toBe(true)
      expect((await call(bob, "GET", "/api/users/directory")).statusCode).toBe(
        403
      )
    })

    it("is on for any new account, even one made without our follow-up step (fails safe)", async () => {
      await app.auth.api.createUser({
        body: {
          email: "erin@test.local",
          name: "erin",
          password: PASSWORD,
          role: "user",
          data: { username: "erin" },
        },
      })
      expect(
        (
          await app.prisma.user.findUniqueOrThrow({
            where: { username: "erin" },
          })
        ).mustChangePassword
      ).toBe(true)
    })

    it("can't be cleared by the user through the API", async () => {
      await call(
        admin,
        "POST",
        `/api/users/${await idOf("bob")}/reset-password`,
        {
          password: NEW_PASSWORD,
        }
      )
      const bob = await signIn(app, "bob", NEW_PASSWORD)
      // A failed change leaves it set.
      expect(
        (await changePassword(bob, "not-my-password!")).statusCode
      ).not.toBe(200)
      expect(
        (await call(bob, "GET", "/api/me")).json().mustChangePassword
      ).toBe(true)
    })
  })

  describe("deactivate / reactivate", () => {
    it("deactivation ends sessions and blocks sign-in; reactivation restores it", async () => {
      const id = await idOf("bob")
      const off = await call(admin, "POST", `/api/users/${id}/deactivate`)
      expect(off.statusCode).toBe(200)
      expect(off.json().active).toBe(false)

      expect((await call(member, "GET", "/api/me")).statusCode).toBe(401)
      const blocked = await app.inject({
        method: "POST",
        url: "/api/auth/sign-in/username",
        remoteAddress: nextIp(),
        headers: { origin: ORIGIN },
        payload: { username: "bob", password: PASSWORD },
      })
      expect(blocked.statusCode).toBe(403)

      const on = await call(admin, "POST", `/api/users/${id}/reactivate`)
      expect(on.statusCode).toBe(200)
      expect(on.json().active).toBe(true)
      await expect(signIn(app, "bob")).resolves.toContain("session_token")

      const actions = await app.prisma.activityLog.findMany({
        where: { entityId: id },
        orderBy: { createdAt: "asc" },
      })
      expect(actions.map((a) => a.action)).toEqual([
        "deactivated",
        "reactivated",
      ])
    })

    it("doesn't let an admin deactivate themselves", async () => {
      const res = await call(
        admin,
        "POST",
        `/api/users/${await idOf("alice")}/deactivate`
      )
      expect(res.statusCode).toBe(409)
    })
  })

  describe("active flag", () => {
    it("is never unknown: the database refuses NULL, so 'not deactivated' filters can't drop people", async () => {
      await expect(
        app.prisma
          .$executeRaw`UPDATE users SET banned = NULL WHERE username = 'bob'`
      ).rejects.toThrow()
      // Users made by Better Auth start out active.
      expect(
        (
          await app.prisma.user.findUniqueOrThrow({
            where: { username: "bob" },
          })
        ).banned
      ).toBe(false)
    })
  })

  describe("directory", () => {
    it("returns active non-admin users with minimal fields", async () => {
      await call(admin, "POST", `/api/users/${await idOf("carol")}/deactivate`)
      const res = await call(admin, "GET", "/api/users/directory?q=o")
      expect(res.statusCode).toBe(200)
      const items = res.json().items
      // carol is deactivated and alice is an admin, so only bob.
      expect(items.map((u: { username: string }) => u.username)).toEqual([
        "bob",
      ])
      // Members who lead no project don't need it (see projects tests).
      const plain = await call(member, "GET", "/api/users/directory?q=a")
      expect(plain.statusCode).toBe(403)
      expect(Object.keys(items[0]).sort()).toEqual(["id", "name", "username"])
    })

    it("needs a session", async () => {
      const res = await call(undefined, "GET", "/api/users/directory?q=a")
      expect(res.statusCode).toBe(401)
    })
  })

  describe("races and edge cases", () => {
    async function makeAdmin(username: string, role: string | string[]) {
      await app.auth.api.createUser({
        body: {
          email: `${username}@test.local`,
          name: username,
          password: PASSWORD,
          role: role as "admin",
          data: { username },
        },
      })
      await choosePassword(app, username)
      return signIn(app, username)
    }

    function activeAdmins() {
      return app.prisma.user.count({
        where: { role: "admin", NOT: { banned: true } },
      })
    }

    it("never lets two admins demote each other at the same time", async () => {
      const erin = await makeAdmin("erin", "admin")
      const [a, b] = await Promise.all([
        call(admin, "PATCH", `/api/users/${await idOf("erin")}`, {
          ...(await getUser("erin")),
          role: "user",
        }),
        call(erin, "PATCH", `/api/users/${await idOf("alice")}`, {
          ...(await getUser("alice")),
          role: "user",
        }),
      ])
      // The loser is refused either at the lock (409) or, if the winner
      // already committed, at the permission check because it's no longer an
      // admin (403). Exactly one active admin remains either way.
      const codes = [a.statusCode, b.statusCode].sort()
      expect(codes[0], `${a.body} | ${b.body}`).toBe(200)
      expect([403, 409]).toContain(codes[1])
      expect(await activeAdmins()).toBe(1)
    })

    it("never lets two admins deactivate each other at the same time", async () => {
      const erin = await makeAdmin("erin", "admin")
      const [a, b] = await Promise.all([
        call(admin, "POST", `/api/users/${await idOf("erin")}/deactivate`),
        call(erin, "POST", `/api/users/${await idOf("alice")}/deactivate`),
      ])
      // As above; a deactivated loser has no session left, so it gets 401.
      const codes = [a.statusCode, b.statusCode].sort()
      expect(codes[0], `${a.body} | ${b.body}`).toBe(200)
      expect([401, 409]).toContain(codes[1])
      const left = await app.prisma.user.count({
        where: { role: "admin", NOT: { banned: true } },
      })
      expect(left).toBe(1)
    })

    it("rejects one of two simultaneous edits made from the same version", async () => {
      const bob = await getUser("bob")
      const [a, b] = await Promise.all(
        ["One", "Two"].map((name) =>
          call(admin, "PATCH", `/api/users/${bob.id}`, {
            name,
            email: bob.email,
            role: "user",
            updatedAt: bob.updatedAt,
          })
        )
      )
      expect([a!.statusCode, b!.statusCode].sort()).toEqual([200, 409])
    })

    it("returns 409, not 500, when two users are given the same email at once", async () => {
      const [bob, carol] = [await getUser("bob"), await getUser("carol")]
      const results = await Promise.all(
        [bob, carol].map((u) =>
          call(admin, "PATCH", `/api/users/${u.id}`, {
            name: u.name,
            email: "same@example.com",
            role: "user",
            updatedAt: u.updatedAt,
          })
        )
      )
      expect(results.map((r) => r.statusCode).sort()).toEqual([200, 409])
    })

    it("counts an admin stored with several roles as an admin", async () => {
      const dora = await makeAdmin("dora", ["user", "admin"])
      const res = await call(
        dora,
        "POST",
        `/api/users/${await idOf("alice")}/deactivate`
      )
      expect(res.statusCode).toBe(200)
    })

    it("doesn't let an admin reset their own password here", async () => {
      const res = await call(
        admin,
        "POST",
        `/api/users/${await idOf("alice")}/reset-password`,
        { password: NEW_PASSWORD }
      )
      expect(res.statusCode).toBe(409)
      expect((await call(admin, "GET", "/api/me")).statusCode).toBe(200)
    })
  })
})
