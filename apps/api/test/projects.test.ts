import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { lockProject } from "../src/modules/projects/access.ts"
import { buildTestApp, createUser, resetDb, signIn } from "./helpers.ts"

const ORIGIN = "http://localhost:5173"
type Method = "GET" | "POST" | "PATCH" | "DELETE"

describe("projects API", () => {
  let app: FastifyInstance
  const cookie: Record<string, string> = {}
  const id: Record<string, string> = {}

  async function call(
    who: string | undefined,
    method: Method,
    url: string,
    payload?: object
  ) {
    return app.inject({
      method,
      url,
      headers: { origin: ORIGIN, ...(who ? { cookie: cookie[who] } : {}) },
      ...(payload ? { payload } : {}),
    })
  }

  async function createProject(key: string, lead: string, name = key) {
    const res = await call("alice", "POST", "/api/projects", {
      name,
      key,
      leadUserId: id[lead],
    })
    expect(res.statusCode, res.body).toBe(201)
    return res.json()
  }

  async function addMember(project: string, user: string, role: string) {
    const res = await call(
      "alice",
      "POST",
      `/api/projects/${project}/members`,
      {
        userIds: [id[user]],
        role,
      }
    )
    expect(res.statusCode, res.body).toBe(200)
  }

  async function project(key: string, who = "alice") {
    return (await call(who, "GET", `/api/projects/${key}`)).json()
  }

  beforeAll(async () => {
    app = await buildTestApp()
  })
  beforeEach(async () => {
    await resetDb(app.prisma)
    for (const [username, role] of [
      ["alice", "admin"],
      ["lena", "user"],
      ["tom", "user"],
      ["vera", "user"],
      ["nora", "user"],
      ["dan", "user"],
    ] as const) {
      await createUser(app, { username, role })
      const user = await app.prisma.user.findUniqueOrThrow({
        where: { username },
      })
      id[username] = user.id
      cookie[username] = await signIn(app, username)
    }
    await createProject("PAY", "lena", "Payments")
    await addMember("PAY", "tom", "tester")
    await addMember("PAY", "vera", "viewer")
  })
  afterAll(async () => {
    await app.close()
  })

  describe("authorization matrix", () => {
    // [method, url, body, allowed roles among lena(lead)/tom(tester)/vera(viewer)]
    const routes: [Method, string, object | undefined, string[]][] = [
      ["GET", "/api/projects/PAY", undefined, ["lena", "tom", "vera"]],
      ["GET", "/api/projects/PAY/activity", undefined, ["lena", "tom", "vera"]],
      ["GET", "/api/projects/PAY/members", undefined, ["lena", "tom", "vera"]],
      ["GET", "/api/projects/PAY/releases", undefined, ["lena", "tom", "vera"]],
      ["PATCH", "/api/projects/PAY", { name: "X", version: 1 }, []],
      ["POST", "/api/projects/PAY/archive", undefined, []],
      ["POST", "/api/projects/PAY/unarchive", undefined, []],
      [
        "POST",
        "/api/projects/PAY/members",
        { userIds: ["x"], role: "tester" },
        ["lena"],
      ],
      [
        "PATCH",
        "/api/projects/PAY/members/someone",
        { role: "tester" },
        ["lena"],
      ],
      ["DELETE", "/api/projects/PAY/members/someone", undefined, ["lena"]],
      [
        "POST",
        "/api/projects/PAY/releases",
        { name: "1.0", status: "planned" },
        ["lena"],
      ],
      [
        "PATCH",
        "/api/projects/PAY/releases/00000000-0000-7000-8000-000000000000",
        { name: "1.0", status: "planned", version: 1 },
        ["lena"],
      ],
    ]

    it.each(routes)("%s %s needs a session", async (method, url, body) => {
      expect((await call(undefined, method, url, body)).statusCode).toBe(401)
    })

    it.each(routes)(
      "%s %s is hidden from non-members (404)",
      async (method, url, body) => {
        expect((await call("nora", method, url, body)).statusCode).toBe(404)
      }
    )

    it.each(routes)(
      "%s %s follows the permission matrix",
      async (method, url, body, allowed) => {
        for (const who of ["lena", "tom", "vera"]) {
          const res = await call(who, method, url, body)
          if (allowed.includes(who)) {
            expect(res.statusCode, `${who}: ${res.body}`).not.toBe(403)
            expect(res.statusCode, `${who}: ${res.body}`).toBeLessThan(500)
          } else {
            expect(res.statusCode, `${who}: ${res.body}`).toBe(403)
          }
        }
        // Admins pass the permission check everywhere.
        const admin = await call("alice", method, url, body)
        expect(admin.statusCode, admin.body).not.toBe(403)
        expect(admin.statusCode, admin.body).toBeLessThan(500)
      }
    )

    it.each([
      ["GET", "/api/projects"],
      ["POST", "/api/projects"],
    ] as const)("%s %s needs a session", async (method, url) => {
      const res = await call(undefined, method, url, {
        name: "X",
        key: "XX",
        leadUserId: "x",
      })
      expect(res.statusCode).toBe(401)
    })

    it.each(routes)(
      "%s %s refuses a deactivated member (401)",
      async (method, url, body) => {
        await call("alice", "POST", `/api/users/${id.vera}/deactivate`)
        expect((await call("vera", method, url, body)).statusCode).toBe(401)
      }
    )

    it("hides an unknown project the same way as someone else's", async () => {
      const unknown = await call("nora", "GET", "/api/projects/NOPE")
      const hidden = await call("nora", "GET", "/api/projects/PAY")
      expect(unknown.statusCode).toBe(404)
      expect(hidden.json().message).toBe(unknown.json().message)
    })
  })

  describe("projects", () => {
    it("lets an admin create a project with its first QA Lead", async () => {
      const created = await createProject("mob", "tom", "Mobile App")
      expect(created).toMatchObject({
        key: "MOB",
        name: "Mobile App",
        myRole: null,
        leads: [{ id: id.tom, name: "tom" }],
        memberCount: 1,
      })
      const log = await app.prisma.activityLog.findFirstOrThrow({
        where: { projectId: created.id, action: "created" },
      })
      expect(log.changes).toMatchObject({ key: "MOB", lead: { id: id.tom } })
    })

    it("only admins create projects", async () => {
      const res = await call("lena", "POST", "/api/projects", {
        name: "X",
        key: "XX",
        leadUserId: id.lena,
      })
      expect(res.statusCode).toBe(403)
    })

    it("doesn't make an admin a project's QA Lead", async () => {
      const res = await call("alice", "POST", "/api/projects", {
        name: "New",
        key: "NEW",
        leadUserId: id.alice,
      })
      expect(res.statusCode).toBe(400)
    })

    it("rejects a taken key and an inactive first lead", async () => {
      const taken = await call("alice", "POST", "/api/projects", {
        name: "Other",
        key: "pay",
        leadUserId: id.tom,
      })
      expect(taken.statusCode).toBe(409)
      await call("alice", "POST", `/api/users/${id.dan}/deactivate`)
      const inactive = await call("alice", "POST", "/api/projects", {
        name: "New",
        key: "NEW",
        leadUserId: id.dan,
      })
      expect(inactive.statusCode).toBe(400)
    })

    it("lists only your projects with your role; admins see all", async () => {
      await createProject("MOB", "nora")
      const mine = await call("tom", "GET", "/api/projects")
      expect(
        mine
          .json()
          .items.map((p: { key: string; myRole: string }) => [p.key, p.myRole])
      ).toEqual([["PAY", "tester"]])
      const all = await call("alice", "GET", "/api/projects?sort=key")
      expect(all.json().total).toBe(2)
      expect(all.json().items[0]).toMatchObject({ key: "MOB", myRole: null })
      const none = await call("dan", "GET", "/api/projects")
      expect(none.json()).toMatchObject({ items: [], total: 0 })
    })

    it("returns details with role counts that skip deactivated people", async () => {
      await call("alice", "POST", `/api/users/${id.vera}/deactivate`)
      const res = await call("tom", "GET", "/api/projects/pay")
      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({
        key: "PAY",
        myRole: "tester",
        memberCount: 2,
        roleCounts: { lead: 1, tester: 1, viewer: 0 },
      })
    })

    it("updates name and description with a version check", async () => {
      const { version } = await project("PAY")
      const ok = await call("alice", "PATCH", "/api/projects/PAY", {
        name: "Payments v2",
        description: "Cards",
        version,
      })
      expect(ok.statusCode).toBe(200)
      expect(ok.json()).toMatchObject({ name: "Payments v2", version: 2 })
      const stale = await call("alice", "PATCH", "/api/projects/PAY", {
        name: "Again",
        version,
      })
      expect(stale.statusCode).toBe(409)
      // Says who, so the person knows whose change they'd overwrite.
      expect(stale.json().message).toMatch(
        /^alice changed this project meanwhile/
      )
      // Machine-readable, so the web offers "load theirs / save mine" only for this.
      expect(stale.json().reason).toBe("stale")
    })

    it("names who changed a release when an edit is stale", async () => {
      const rel = (
        await call("lena", "POST", "/api/projects/PAY/releases", {
          name: "4.2",
          status: "planned",
        })
      ).json()
      const fields = {
        name: "4.2",
        description: "",
        status: "planned",
        startDate: null,
        targetDate: null,
      }
      expect(
        (
          await call("lena", "PATCH", `/api/projects/PAY/releases/${rel.id}`, {
            ...fields,
            description: "Cards",
            version: rel.version,
          })
        ).statusCode
      ).toBe(200)
      const stale = await call(
        "alice",
        "PATCH",
        `/api/projects/PAY/releases/${rel.id}`,
        { ...fields, version: rel.version }
      )
      expect(stale.statusCode).toBe(409)
      expect(stale.json().message).toMatch(
        /^lena changed this release meanwhile/
      )
      expect(stale.json().reason).toBe("stale")
      // Other 409s carry no such reason.
      await call("alice", "POST", "/api/projects/PAY/archive")
      const archived = await call(
        "lena",
        "PATCH",
        `/api/projects/PAY/releases/${rel.id}`,
        { ...fields, version: rel.version + 1 }
      )
      expect(archived.statusCode).toBe(409)
      expect(archived.json()).not.toHaveProperty("reason")
    })

    it("archives a project: read-only and listed under archived", async () => {
      expect(
        (await call("alice", "POST", "/api/projects/PAY/archive")).statusCode
      ).toBe(200)
      expect((await project("PAY", "tom")).archived).toBe(true)
      const add = await call("lena", "POST", "/api/projects/PAY/members", {
        userIds: [id.nora],
        role: "tester",
      })
      expect(add.statusCode).toBe(409)
      expect(
        (await call("tom", "GET", "/api/projects")).json().items
      ).toHaveLength(0)
      expect(
        (await call("tom", "GET", "/api/projects?status=archived")).json().items
      ).toHaveLength(1)
      expect(
        (await call("alice", "POST", "/api/projects/PAY/unarchive")).statusCode
      ).toBe(200)
      expect((await project("PAY")).archived).toBe(false)
    })
  })

  describe("archived projects are read-only", () => {
    it("refuses every change, for leads and admins alike", async () => {
      const release = (
        await call("lena", "POST", "/api/projects/PAY/releases", {
          name: "1.0",
          status: "planned",
        })
      ).json()
      await call("alice", "POST", "/api/projects/PAY/archive")
      const attempts: [string, Method, string, object | undefined][] = [
        ["alice", "PATCH", "/api/projects/PAY", { name: "X", version: 2 }],
        [
          "lena",
          "POST",
          "/api/projects/PAY/releases",
          { name: "2.0", status: "planned" },
        ],
        [
          "lena",
          "PATCH",
          `/api/projects/PAY/releases/${release.id}`,
          { name: "1.0", status: "released", version: 1 },
        ],
        [
          "lena",
          "PATCH",
          `/api/projects/PAY/members/${id.tom}`,
          { role: "viewer" },
        ],
        ["lena", "DELETE", `/api/projects/PAY/members/${id.tom}`, undefined],
        ["alice", "DELETE", `/api/projects/PAY/members/${id.tom}`, undefined],
        [
          "alice",
          "POST",
          "/api/projects/PAY/members",
          { userIds: [id.nora], role: "tester" },
        ],
      ]
      for (const [who, method, url, body] of attempts) {
        const res = await call(who, method, url, body)
        expect(res.statusCode, `${who} ${method} ${url}: ${res.body}`).toBe(409)
      }
    })
  })

  describe("changes racing with other changes", () => {
    /**
     * Holds the project's write lock, makes `change` inside it, starts
     * `request` (which gets past its first checks and then waits on the
     * lock), and commits. The request must re-check against the new state.
     */
    async function race(
      change: (
        tx: Parameters<
          Parameters<FastifyInstance["prisma"]["$transaction"]>[0]
        >[0]
      ) => Promise<unknown>,
      request: () => ReturnType<typeof call>
    ) {
      const pay = await app.prisma.project.findUniqueOrThrow({
        where: { key: "PAY" },
      })
      let pending!: ReturnType<typeof call>
      await app.prisma.$transaction(async (tx) => {
        await lockProject(tx, pay.id)
        await change(tx)
        pending = request()
        await new Promise((resolve) => setTimeout(resolve, 300))
      })
      return pending
    }

    it("a lead demoted mid-request can't still add people", async () => {
      await call("lena", "PATCH", `/api/projects/PAY/members/${id.tom}`, {
        role: "lead",
      })
      const res = await race(
        (tx) =>
          tx.projectMember.updateMany({
            where: { userId: id.tom },
            data: { role: "viewer" },
          }),
        () =>
          call("tom", "POST", "/api/projects/PAY/members", {
            userIds: [id.nora],
            role: "lead",
          })
      )
      expect(res.statusCode, res.body).toBe(403)
      const nora = await app.prisma.projectMember.findFirst({
        where: { userId: id.nora },
      })
      expect(nora).toBeNull()
    })

    it("an admin demoted mid-request loses admin rights for that request", async () => {
      const res = await race(
        (tx) =>
          tx.user.update({ where: { id: id.alice }, data: { role: "user" } }),
        () =>
          call("alice", "PATCH", "/api/projects/PAY", {
            name: "Hijacked",
            version: 1,
          })
      )
      // Not a member and no longer an admin: the project is invisible.
      expect(res.statusCode, res.body).toBe(404)
      expect(
        (await app.prisma.project.findUniqueOrThrow({ where: { key: "PAY" } }))
          .name
      ).toBe("Payments")
    })

    it("a change that waited behind archiving is refused", async () => {
      const res = await race(
        (tx) =>
          tx.project.update({
            where: { key: "PAY" },
            data: { archivedAt: new Date() },
          }),
        () =>
          call("lena", "POST", "/api/projects/PAY/releases", {
            name: "9.9",
            status: "planned",
          })
      )
      expect(res.statusCode, res.body).toBe(409)
      expect(await app.prisma.release.count()).toBe(0)
    })
  })

  describe("projects led, on /api/me", () => {
    it("counts the active projects a person is QA Lead of", async () => {
      const led = async (who: string) =>
        (await call(who, "GET", "/api/me")).json().projectsLed
      expect(await led("lena")).toBe(1)
      expect(await led("tom")).toBe(0)
      await createProject("MOB", "lena", "Mobile")
      expect(await led("lena")).toBe(2)
      // Archived projects don't count.
      await call("alice", "POST", "/api/projects/MOB/archive")
      expect(await led("lena")).toBe(1)
    })
  })

  describe("people directory", () => {
    it("marks each person's role in a project and leaves admins out", async () => {
      const res = await call(
        "lena",
        "GET",
        "/api/users/directory?q=o&project=PAY"
      )
      expect(res.statusCode, res.body).toBe(200)
      const byName = Object.fromEntries(
        res
          .json()
          .items.map((u: { username: string; memberRole: string | null }) => [
            u.username,
            u.memberRole,
          ])
      )
      expect(byName).toEqual({ nora: null, tom: "tester" })
    })

    it("only lets people who manage a project's members ask about it", async () => {
      await createProject("MOB", "nora")
      // lena leads PAY but isn't on MOB; tom is on PAY but only tests.
      expect(
        (await call("lena", "GET", "/api/users/directory?q=o&project=MOB"))
          .statusCode
      ).toBe(404)
      expect(
        (await call("alice", "GET", "/api/users/directory?q=o&project=MOB"))
          .statusCode
      ).toBe(200)
    })

    it("refuses to add an admin as a member", async () => {
      const res = await call("lena", "POST", "/api/projects/PAY/members", {
        userIds: [id.alice],
        role: "tester",
      })
      expect(res.statusCode).toBe(400)
    })

    it("is for admins, and for leads within a project they lead", async () => {
      for (const [who, url, status] of [
        ["alice", "/api/users/directory?q=a", 200],
        ["lena", "/api/users/directory?q=a&project=PAY", 200],
        // Leads always search within a project.
        ["lena", "/api/users/directory?q=a", 403],
        ["tom", "/api/users/directory?q=a&project=PAY", 403],
        ["vera", "/api/users/directory?q=a&project=PAY", 403],
        ["nora", "/api/users/directory?q=a&project=PAY", 404],
      ] as const) {
        const res = await call(who, "GET", url)
        expect(res.statusCode, `${who} ${url}`).toBe(status)
      }
    })

    it("never lists admins, who can open every project anyway", async () => {
      const res = await call("alice", "GET", "/api/users/directory?q=alice")
      expect(res.json().items).toEqual([])
    })

    it("stops working for a lead once their project is archived", async () => {
      await call("alice", "POST", "/api/projects/PAY/archive")
      const res = await call(
        "lena",
        "GET",
        "/api/users/directory?q=a&project=PAY"
      )
      // Like every other change to an archived project.
      expect(res.statusCode).toBe(409)
    })
  })

  describe("members", () => {
    it("lists members with their project roles", async () => {
      const res = await call("vera", "GET", "/api/projects/PAY/members")
      expect(res.statusCode).toBe(200)
      expect(
        res
          .json()
          .items.map((m: { username: string; role: string }) => [
            m.username,
            m.role,
          ])
      ).toEqual([
        ["lena", "lead"],
        ["tom", "tester"],
        ["vera", "viewer"],
      ])
      const leads = await call(
        "vera",
        "GET",
        "/api/projects/PAY/members?role=lead"
      )
      expect(leads.json().total).toBe(1)
    })

    it("adds several people, skips existing members, and logs each", async () => {
      await createUser(app, { username: "zed", role: "user" })
      const zed = await app.prisma.user.findUniqueOrThrow({
        where: { username: "zed" },
      })
      const res = await call("lena", "POST", "/api/projects/PAY/members", {
        userIds: [id.nora, zed.id, id.tom],
        role: "tester",
      })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toEqual({ added: 2, alreadyMembers: 1 })
      const logs = await app.prisma.activityLog.count({
        where: {
          entityType: "member",
          action: "added",
          entityId: { in: [id.nora!, zed.id] },
        },
      })
      expect(logs).toBe(2)
    })

    it("refuses deactivated or unknown people", async () => {
      await call("alice", "POST", `/api/users/${id.dan}/deactivate`)
      for (const userId of [id.dan, "missing"]) {
        const res = await call("lena", "POST", "/api/projects/PAY/members", {
          userIds: [userId],
          role: "tester",
        })
        expect(res.statusCode).toBe(400)
      }
    })

    it("changes a role and logs from/to", async () => {
      const res = await call(
        "lena",
        "PATCH",
        `/api/projects/PAY/members/${id.tom}`,
        { role: "lead" }
      )
      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({ username: "tom", role: "lead" })
      const log = await app.prisma.activityLog.findFirstOrThrow({
        where: { entityId: id.tom, action: "role_changed" },
      })
      expect(log.changes).toMatchObject({
        role: { from: "tester", to: "lead" },
      })
    })

    it("keeps at least one active QA Lead for leads; admins may override", async () => {
      const demote = await call(
        "lena",
        "PATCH",
        `/api/projects/PAY/members/${id.lena}`,
        { role: "tester" }
      )
      expect(demote.statusCode).toBe(409)
      const remove = await call(
        "lena",
        "DELETE",
        `/api/projects/PAY/members/${id.lena}`
      )
      expect(remove.statusCode).toBe(409)
      const admin = await call(
        "alice",
        "PATCH",
        `/api/projects/PAY/members/${id.lena}`,
        { role: "tester" }
      )
      expect(admin.statusCode).toBe(200)
      expect((await project("PAY")).leads).toEqual([])
    })

    it("doesn't count a deactivated lead as active", async () => {
      await call("lena", "PATCH", `/api/projects/PAY/members/${id.tom}`, {
        role: "lead",
      })
      await call("alice", "POST", `/api/users/${id.tom}/deactivate`)
      const res = await call(
        "lena",
        "PATCH",
        `/api/projects/PAY/members/${id.lena}`,
        { role: "viewer" }
      )
      expect(res.statusCode).toBe(409)
    })

    it("never lets two leads demote each other into no lead at once", async () => {
      await call("lena", "PATCH", `/api/projects/PAY/members/${id.tom}`, {
        role: "lead",
      })
      cookie.tom = await signIn(app, "tom")
      const results = await Promise.all([
        call("lena", "PATCH", `/api/projects/PAY/members/${id.tom}`, {
          role: "tester",
        }),
        call("tom", "PATCH", `/api/projects/PAY/members/${id.lena}`, {
          role: "tester",
        }),
      ])
      const codes = results.map((r) => r.statusCode).sort()
      expect(codes[0]).toBe(200)
      expect([403, 409]).toContain(codes[1])
      expect((await project("PAY")).roleCounts.lead).toBe(1)
    })

    it("removes a member, who then can't see the project", async () => {
      const res = await call(
        "lena",
        "DELETE",
        `/api/projects/PAY/members/${id.tom}`
      )
      expect(res.statusCode).toBe(204)
      expect((await call("tom", "GET", "/api/projects/PAY")).statusCode).toBe(
        404
      )
      const missing = await call(
        "lena",
        "DELETE",
        `/api/projects/PAY/members/${id.nora}`
      )
      expect(missing.statusCode).toBe(404)
    })
  })

  describe("releases", () => {
    const release = {
      name: "4.2",
      status: "in_progress",
      startDate: "2026-10-01",
      targetDate: "2026-10-24",
    }

    it("creates releases and shows the current one on the project", async () => {
      const res = await call(
        "lena",
        "POST",
        "/api/projects/PAY/releases",
        release
      )
      expect(res.statusCode).toBe(201)
      expect(res.json()).toMatchObject({ ...release, version: 1 })
      expect((await project("PAY", "vera")).currentRelease).toMatchObject({
        name: "4.2",
      })
      const list = await call("vera", "GET", "/api/projects/PAY/releases")
      expect(list.json().items).toHaveLength(1)
    })

    it("rejects duplicate names and dates out of order", async () => {
      await call("lena", "POST", "/api/projects/PAY/releases", release)
      const dup = await call(
        "lena",
        "POST",
        "/api/projects/PAY/releases",
        release
      )
      expect(dup.statusCode).toBe(409)
      const order = await call("lena", "POST", "/api/projects/PAY/releases", {
        ...release,
        name: "4.3",
        targetDate: "2026-09-01",
      })
      expect(order.statusCode).toBe(400)
    })

    it("updates with a version check", async () => {
      const created = (
        await call("lena", "POST", "/api/projects/PAY/releases", release)
      ).json()
      const url = `/api/projects/PAY/releases/${created.id}`
      const ok = await call("lena", "PATCH", url, {
        ...release,
        status: "released",
        version: 1,
      })
      expect(ok.statusCode).toBe(200)
      expect(ok.json()).toMatchObject({ status: "released", version: 2 })
      const stale = await call("lena", "PATCH", url, { ...release, version: 1 })
      expect(stale.statusCode).toBe(409)
    })

    it("can't reach another project's release through this project", async () => {
      await createProject("MOB", "lena")
      const other = (
        await call("lena", "POST", "/api/projects/MOB/releases", release)
      ).json()
      const res = await call(
        "lena",
        "PATCH",
        `/api/projects/PAY/releases/${other.id}`,
        { ...release, version: 1 }
      )
      expect(res.statusCode).toBe(404)
    })
  })

  describe("activity", () => {
    it("shows the project's recent activity, newest first", async () => {
      const res = await call("vera", "GET", "/api/projects/PAY/activity")
      expect(res.statusCode).toBe(200)
      const actions = res
        .json()
        .items.map(
          (a: { entityType: string; action: string }) =>
            `${a.entityType}.${a.action}`
        )
      expect(actions).toEqual([
        "member.added",
        "member.added",
        "project.created",
      ])
      expect(res.json().items[0].actor).toEqual({ id: id.alice, name: "alice" })
    })
  })
})
