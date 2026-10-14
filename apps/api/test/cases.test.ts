import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { buildTestApp, createUser, nextIp, resetDb, signIn } from "./helpers.ts"

const ORIGIN = "http://localhost:5173"
const NIL = "00000000-0000-7000-8000-000000000000"
type Method = "GET" | "POST" | "PATCH" | "DELETE"

const STEPS = [
  { action: "Open checkout", expected: "Card is listed" },
  { action: "Pay", expected: "" },
]

describe("test cases API", () => {
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
      // A fresh client address per request keeps the global rate limit out of the way.
      remoteAddress: nextIp(),
      headers: { origin: ORIGIN, ...(who ? { cookie: cookie[who] } : {}) },
      ...(payload ? { payload } : {}),
    })
  }

  async function ok(
    who: string,
    method: Method,
    url: string,
    payload?: object,
    status = 200
  ) {
    const res = await call(who, method, url, payload)
    expect(res.statusCode, `${method} ${url}: ${res.body}`).toBe(status)
    return res.json()
  }

  const suite = (
    name: string,
    parentId: string | null = null,
    project = "PAY"
  ) =>
    ok(
      "tom",
      "POST",
      `/api/projects/${project}/suites`,
      { name, parentId },
      201
    )

  const newCase = (fields: object = {}, project = "PAY", who = "tom") =>
    ok(
      who,
      "POST",
      `/api/projects/${project}/cases`,
      {
        title: "Pay with card",
        suiteId: null,
        priority: "medium",
        type: "functional",
        status: "draft",
        steps: STEPS,
        ...fields,
      },
      201
    )

  const list = async (query = "", project = "PAY") =>
    (await ok("vera", "GET", `/api/projects/${project}/cases${query}`)) as {
      items: {
        key: string
        title: string
        labels: string[]
        archived: boolean
        priority: string
      }[]
      total: number
    }

  const keys = async (query = "") => (await list(query)).items.map((c) => c.key)

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
    ] as const) {
      await createUser(app, { username, role })
      id[username] = (
        await app.prisma.user.findUniqueOrThrow({ where: { username } })
      ).id
      cookie[username] = await signIn(app, username)
    }
    await ok(
      "alice",
      "POST",
      "/api/projects",
      { name: "Payments", key: "PAY", leadUserId: id.lena },
      201
    )
    await ok(
      "alice",
      "POST",
      "/api/projects",
      { name: "Mobile", key: "MOB", leadUserId: id.nora },
      201
    )
    for (const [user, role] of [
      ["tom", "tester"],
      ["vera", "viewer"],
    ]) {
      await ok("alice", "POST", "/api/projects/PAY/members", {
        userIds: [id[user!]],
        role,
      })
    }
  })
  afterAll(async () => {
    await app.close()
  })

  describe("authorization matrix", () => {
    const caseBody = {
      title: "T",
      suiteId: null,
      priority: "low",
      type: "other",
      status: "draft",
      steps: STEPS,
    }
    const importBody = {
      fileName: "a.csv",
      rows: [{ row: 2, title: "Imported", steps: "Do it" }],
    }
    // [method, url, body, allowed among lena (lead) / tom (tester) / vera (viewer)]
    const routes: [Method, string, object | undefined, string[]][] = [
      ["GET", "/api/projects/PAY/suites", undefined, ["lena", "tom", "vera"]],
      ["POST", "/api/projects/PAY/suites", { name: "S" }, ["lena", "tom"]],
      [
        "PATCH",
        `/api/projects/PAY/suites/${NIL}`,
        { name: "S", version: 1 },
        ["lena", "tom"],
      ],
      ["POST", `/api/projects/PAY/suites/${NIL}/archive`, undefined, ["lena"]],
      ["GET", "/api/projects/PAY/cases", undefined, ["lena", "tom", "vera"]],
      ["POST", "/api/projects/PAY/cases", caseBody, ["lena", "tom"]],
      [
        "GET",
        "/api/projects/PAY/cases/PAY-TC-1",
        undefined,
        ["lena", "tom", "vera"],
      ],
      [
        "PATCH",
        "/api/projects/PAY/cases/PAY-TC-1",
        { ...caseBody, version: 1 },
        ["lena", "tom"],
      ],
      [
        "POST",
        "/api/projects/PAY/cases/PAY-TC-1/duplicate",
        undefined,
        ["lena", "tom"],
      ],
      ["POST", "/api/projects/PAY/cases/PAY-TC-1/archive", {}, ["lena"]],
      ["POST", "/api/projects/PAY/cases/PAY-TC-1/restore", undefined, ["lena"]],
      [
        "GET",
        "/api/projects/PAY/cases/PAY-TC-1/history",
        undefined,
        ["lena", "tom", "vera"],
      ],
      [
        "POST",
        "/api/projects/PAY/cases/bulk",
        {
          selection: { ids: [NIL] },
          action: { kind: "setPriority", priority: "low" },
        },
        ["lena", "tom"],
      ],
      [
        "POST",
        "/api/projects/PAY/cases/bulk",
        { selection: { ids: [NIL] }, action: { kind: "archive" } },
        ["lena"],
      ],
      [
        "GET",
        "/api/projects/PAY/cases/export",
        undefined,
        ["lena", "tom", "vera"],
      ],
      [
        "GET",
        "/api/projects/PAY/case-labels",
        undefined,
        ["lena", "tom", "vera"],
      ],
      ["GET", "/api/projects/PAY/imports", undefined, ["lena", "tom", "vera"]],
      ["POST", "/api/projects/PAY/imports/check", importBody, ["lena", "tom"]],
      ["POST", "/api/projects/PAY/imports", importBody, ["lena", "tom"]],
      ["POST", "/api/projects/PAY/imports/1/archive", undefined, ["lena"]],
      ["POST", "/api/projects/PAY/imports/1/restore", undefined, ["lena"]],
    ]

    beforeEach(async () => {
      await newCase()
    })

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
        for (const who of ["vera", "tom", "lena", "alice"]) {
          const res = await call(who, method, url, body)
          if (who === "alice" || allowed.includes(who)) {
            expect(res.statusCode, `${who}: ${res.body}`).not.toBe(403)
            expect(res.statusCode, `${who}: ${res.body}`).toBeLessThan(500)
          } else {
            expect(res.statusCode, `${who}: ${res.body}`).toBe(403)
          }
        }
      }
    )

    it.each(routes)(
      "%s %s refuses a deactivated member (401)",
      async (method, url, body) => {
        await call("alice", "POST", `/api/users/${id.tom}/deactivate`)
        expect((await call("tom", method, url, body)).statusCode).toBe(401)
      }
    )

    it.each(routes.filter(([method]) => method !== "GET"))(
      "%s %s is refused (409) once the project is archived",
      async (method, url, body) => {
        await ok("alice", "POST", "/api/projects/PAY/archive")
        for (const who of ["lena", "alice"]) {
          expect((await call(who, method, url, body)).statusCode, who).toBe(409)
        }
      }
    )
  })

  describe("suites", () => {
    it("creates suites one level deep and lists them with case counts", async () => {
      const checkout = await suite("Checkout")
      const cart = await suite("Cart", checkout.id)
      await newCase({ suiteId: cart.id })
      await newCase({ suiteId: cart.id })
      await newCase({ suiteId: checkout.id })
      await newCase()
      const { items, noSuiteCount } = await ok(
        "vera",
        "GET",
        "/api/projects/PAY/suites"
      )
      expect(noSuiteCount).toBe(1)
      await ok("lena", "POST", "/api/projects/PAY/cases/4/archive", {})
      expect(
        (await ok("vera", "GET", "/api/projects/PAY/suites")).archivedCount
      ).toBe(1)
      expect(items).toEqual([
        {
          id: cart.id,
          name: "Cart",
          parentId: checkout.id,
          caseCount: 2,
          version: 1,
        },
        {
          id: checkout.id,
          name: "Checkout",
          parentId: null,
          caseCount: 1,
          version: 1,
        },
      ])
      const deep = await call("tom", "POST", "/api/projects/PAY/suites", {
        name: "Deep",
        parentId: cart.id,
      })
      expect(deep.statusCode).toBe(400)
      expect(deep.json().message).toMatch(/one level/)
    })

    it("keeps sibling names unique, ignoring case", async () => {
      const checkout = await suite("Checkout")
      expect(
        (
          await call("tom", "POST", "/api/projects/PAY/suites", {
            name: "checkout",
          })
        ).statusCode
      ).toBe(409)
      await suite("Checkout", checkout.id) // a child may share its parent's name
      await ok(
        "nora",
        "POST",
        "/api/projects/MOB/suites",
        { name: "Checkout" },
        201
      ) // other projects are separate
    })

    it("refuses another project's suite as a parent", async () => {
      const mob = await ok(
        "nora",
        "POST",
        "/api/projects/MOB/suites",
        { name: "Mob" },
        201
      )
      const res = await call("tom", "POST", "/api/projects/PAY/suites", {
        name: "X",
        parentId: mob.id,
      })
      expect(res.statusCode).toBe(400)
    })

    it("renames and moves with a version check", async () => {
      const a = await suite("A")
      const b = await suite("B")
      const moved = await ok(
        "tom",
        "PATCH",
        `/api/projects/PAY/suites/${b.id}`,
        { name: "B2", parentId: a.id, version: 1 }
      )
      expect(moved).toMatchObject({ name: "B2", parentId: a.id, version: 2 })
      const stale = await call(
        "tom",
        "PATCH",
        `/api/projects/PAY/suites/${b.id}`,
        { name: "B3", parentId: null, version: 1 }
      )
      expect(stale.statusCode).toBe(409)
      // A suite with sub-suites can't become a sub-suite itself.
      const c = await suite("C")
      const res = await call(
        "tom",
        "PATCH",
        `/api/projects/PAY/suites/${a.id}`,
        { name: "A", parentId: c.id, version: 1 }
      )
      expect(res.statusCode).toBe(400)
      const self = await call(
        "tom",
        "PATCH",
        `/api/projects/PAY/suites/${c.id}`,
        { name: "C", parentId: c.id, version: 1 }
      )
      expect(self.statusCode).toBe(400)
    })

    it("archiving a suite archives its sub-suites and cases; restoring a case brings its suites back", async () => {
      const checkout = await suite("Checkout")
      const refunds = await suite("Refunds", checkout.id)
      const kept = await newCase({ title: "Elsewhere" })
      const inRefunds = await newCase({ suiteId: refunds.id })
      await newCase({ suiteId: checkout.id })
      expect(
        await ok(
          "lena",
          "POST",
          `/api/projects/PAY/suites/${checkout.id}/archive`
        )
      ).toEqual({ archivedCases: 2 })
      expect(
        (await ok("vera", "GET", "/api/projects/PAY/suites")).items
      ).toEqual([])
      expect(await keys()).toEqual([kept.key])
      expect(
        (await list("?status=archived")).items.every((c) => c.archived)
      ).toBe(true)

      const restored = await ok(
        "lena",
        "POST",
        `/api/projects/PAY/cases/${inRefunds.key}/restore`
      )
      expect(restored).toMatchObject({ archived: false, suiteId: refunds.id })
      const { items } = await ok("vera", "GET", "/api/projects/PAY/suites")
      expect(items.map((s: { name: string }) => s.name).sort()).toEqual([
        "Checkout",
        "Refunds",
      ])
    })
  })

  describe("cases", () => {
    it("numbers cases per project and logs the creation", async () => {
      const first = await newCase()
      const second = await newCase({ title: "Second" })
      const mob = await newCase({}, "MOB", "nora")
      expect([first.key, second.key, mob.key]).toEqual([
        "PAY-TC-1",
        "PAY-TC-2",
        "MOB-TC-1",
      ])
      expect(first).toMatchObject({
        number: 1,
        title: "Pay with card",
        steps: STEPS,
        stepCount: 2,
        revision: 1,
        version: 1,
        archived: false,
        createdBy: { id: id.tom, name: "tom" },
        duplicatedFrom: null,
      })
      const log = await app.prisma.activityLog.findFirstOrThrow({
        where: { entityType: "case", entityId: first.id },
      })
      expect(log).toMatchObject({ action: "created", actorId: id.tom })
      expect(log.changes).toMatchObject({
        key: "PAY-TC-1",
        title: "Pay with card",
      })
    })

    it("hands out distinct numbers to concurrent creates", async () => {
      const made = await Promise.all(
        Array.from({ length: 5 }, (_, i) => newCase({ title: `C${i}` }))
      )
      expect(new Set(made.map((c) => c.number)).size).toBe(5)
    })

    it("refuses a suite from another project or an archived one", async () => {
      const mob = await ok(
        "nora",
        "POST",
        "/api/projects/MOB/suites",
        { name: "Mob" },
        201
      )
      expect(
        (
          await call("tom", "POST", "/api/projects/PAY/cases", {
            title: "x",
            suiteId: mob.id,
            priority: "low",
            type: "other",
            status: "draft",
            steps: STEPS,
          })
        ).statusCode
      ).toBe(400)
      const old = await suite("Old")
      await ok("lena", "POST", `/api/projects/PAY/suites/${old.id}/archive`)
      expect(
        (
          await call("tom", "POST", "/api/projects/PAY/cases", {
            title: "x",
            suiteId: old.id,
            priority: "low",
            type: "other",
            status: "draft",
            steps: STEPS,
          })
        ).statusCode
      ).toBe(400)
    })

    it("finds a case by key or number; other projects' keys are not found", async () => {
      const made = await newCase()
      expect(
        (await ok("vera", "GET", "/api/projects/PAY/cases/pay-tc-1")).id
      ).toBe(made.id)
      expect((await ok("vera", "GET", "/api/projects/PAY/cases/1")).id).toBe(
        made.id
      )
      await newCase({}, "MOB", "nora")
      for (const ref of ["MOB-TC-1", "PAY-TC-2", "x"]) {
        expect(
          (await call("vera", "GET", `/api/projects/PAY/cases/${ref}`))
            .statusCode,
          ref
        ).toBe(404)
      }
    })

    it("filters, searches and sorts the list", async () => {
      const checkout = await suite("Checkout")
      const cart = await suite("Cart", checkout.id)
      await newCase({
        title: "Coupon",
        suiteId: cart.id,
        priority: "low",
        labels: ["smoke"],
      })
      await newCase({
        title: "Declined card",
        suiteId: checkout.id,
        priority: "critical",
        status: "ready",
      })
      await newCase({ title: "Loose", priority: "high", type: "security" })
      expect(await keys(`?suite=${checkout.id}`)).toEqual([
        "PAY-TC-1",
        "PAY-TC-2",
      ])
      expect(await keys(`?suite=${cart.id}`)).toEqual(["PAY-TC-1"])
      expect(await keys("?suite=none")).toEqual(["PAY-TC-3"])
      expect(await keys("?q=declined")).toEqual(["PAY-TC-2"])
      expect(await keys("?q=PAY-TC-3")).toEqual(["PAY-TC-3"])
      expect(await keys("?status=ready")).toEqual(["PAY-TC-2"])
      expect(await keys("?label=Smoke")).toEqual(["PAY-TC-1"])
      expect(await keys("?type=security")).toEqual(["PAY-TC-3"])
      expect(await keys("?sort=priority")).toEqual([
        "PAY-TC-2",
        "PAY-TC-3",
        "PAY-TC-1",
      ])
      expect(await keys("?sort=title&order=desc")).toEqual([
        "PAY-TC-3",
        "PAY-TC-2",
        "PAY-TC-1",
      ])
      const page = await list("?pageSize=2&page=2")
      expect(page).toMatchObject({ total: 3, items: [{ key: "PAY-TC-3" }] })
    })

    it("updates with a version check; only content changes bump the revision", async () => {
      const made = await newCase()
      const body = {
        title: made.title,
        suiteId: null,
        priority: "high",
        type: "functional",
        status: "ready",
        steps: STEPS,
        labels: ["smoke"],
      }
      const meta = await ok(
        "tom",
        "PATCH",
        "/api/projects/PAY/cases/PAY-TC-1",
        { ...body, version: 1 }
      )
      expect(meta).toMatchObject({
        priority: "high",
        status: "ready",
        labels: ["smoke"],
        revision: 1,
        version: 2,
      })
      const steps = [
        STEPS[0],
        { action: "Pay", expected: "Order shows" },
        { action: "Check email", expected: "" },
      ]
      const content = await ok(
        "lena",
        "PATCH",
        "/api/projects/PAY/cases/PAY-TC-1",
        { ...body, steps, version: 2 }
      )
      expect(content).toMatchObject({ revision: 2, version: 3 })
      const stale = await call(
        "tom",
        "PATCH",
        "/api/projects/PAY/cases/PAY-TC-1",
        { ...body, version: 2 }
      )
      expect(stale.statusCode).toBe(409)
      expect(stale.json().message).toMatch(/saved a newer version/)

      const logs = await app.prisma.activityLog.findMany({
        where: { entityId: made.id, action: "updated" },
        orderBy: { createdAt: "asc" },
      })
      expect(logs[0]!.changes).toMatchObject({
        priority: { from: "medium", to: "high" },
        status: { from: "draft", to: "ready" },
        labels: { added: ["smoke"], removed: [] },
      })
      expect(logs[1]!.changes).toMatchObject({
        steps: ["step 2 expected result", "added step 3"],
      })
    })

    it("records when someone saved over a newer version", async () => {
      await newCase()
      const body = {
        title: "Mine",
        suiteId: null,
        priority: "medium",
        type: "functional",
        status: "draft",
        steps: STEPS,
      }
      await ok("tom", "PATCH", "/api/projects/PAY/cases/1", {
        ...body,
        overwrite: true,
        version: 1,
      })
      const log = await app.prisma.activityLog.findFirstOrThrow({
        where: { action: "updated" },
      })
      expect(log.changes).toMatchObject({
        overwrote: true,
        title: { from: "Pay with card", to: "Mine" },
      })
    })

    it("archives with a reason (lead), blocks edits, and restores", async () => {
      await newCase()
      const archived = await ok(
        "lena",
        "POST",
        "/api/projects/PAY/cases/1/archive",
        { reason: "Replaced" }
      )
      expect(archived).toMatchObject({
        archived: true,
        archiveReason: "Replaced",
      })
      const edit = await call("tom", "PATCH", "/api/projects/PAY/cases/1", {
        title: "x",
        suiteId: null,
        priority: "low",
        type: "other",
        status: "draft",
        steps: STEPS,
        version: archived.version,
      })
      expect(edit.statusCode).toBe(409)
      expect(await keys()).toEqual([])
      expect(await keys("?status=archived")).toEqual(["PAY-TC-1"])
      expect(
        await ok("lena", "POST", "/api/projects/PAY/cases/1/restore")
      ).toMatchObject({ archived: false, archiveReason: "" })
    })

    it("duplicates as a new draft and remembers the source", async () => {
      await newCase({ status: "ready", labels: ["smoke"] })
      const copy = await ok(
        "tom",
        "POST",
        "/api/projects/PAY/cases/PAY-TC-1/duplicate",
        undefined,
        201
      )
      expect(copy).toMatchObject({
        key: "PAY-TC-2",
        title: "Pay with card (copy)",
        status: "draft",
        labels: ["smoke"],
        steps: STEPS,
        duplicatedFrom: "PAY-TC-1",
      })
    })

    it("returns the case history, newest first", async () => {
      await newCase()
      await ok("lena", "POST", "/api/projects/PAY/cases/1/archive", {})
      const { items } = await ok(
        "vera",
        "GET",
        "/api/projects/PAY/cases/1/history"
      )
      expect(items.map((i: { action: string }) => i.action)).toEqual([
        "archived",
        "created",
      ])
    })

    it("lists labels used by active cases", async () => {
      await newCase({ labels: ["smoke", "regression"] })
      await newCase({ labels: ["smoke", "old"] })
      await ok("lena", "POST", "/api/projects/PAY/cases/2/archive", {})
      expect(await ok("vera", "GET", "/api/projects/PAY/case-labels")).toEqual({
        items: ["regression", "smoke"],
      })
    })
  })

  describe("bulk actions", () => {
    it("sets fields on the chosen cases and logs each one", async () => {
      const a = await newCase()
      const b = await newCase({ labels: ["smoke"] })
      await newCase({ title: "Untouched" })
      const target = await suite("Target")
      const ids = [a.id, b.id]
      const bulk = (action: object) =>
        ok("tom", "POST", "/api/projects/PAY/cases/bulk", {
          selection: { ids },
          action,
        })
      expect(await bulk({ kind: "setPriority", priority: "critical" })).toEqual(
        { updated: 2 }
      )
      await bulk({ kind: "addLabels", labels: ["Smoke", "regression"] })
      await bulk({ kind: "move", suiteId: target.id })
      const { items } = await list(`?suite=${target.id}`)
      expect(items.map((c) => [c.key, c.priority, c.labels])).toEqual([
        ["PAY-TC-1", "critical", ["smoke", "regression"]],
        ["PAY-TC-2", "critical", ["smoke", "regression"]],
      ])
      expect(
        await app.prisma.activityLog.count({
          where: { entityId: a.id, action: "updated" },
        })
      ).toBe(3)
    })

    it("never touches archived cases, even when the filter asks for them", async () => {
      const a = await newCase()
      await newCase({ title: "Active" })
      await ok("lena", "POST", `/api/projects/PAY/cases/${a.key}/archive`, {})
      const res = await ok("lena", "POST", "/api/projects/PAY/cases/bulk", {
        selection: { filter: { status: "archived" } },
        action: { kind: "setPriority", priority: "critical" },
      })
      expect(res).toEqual({ updated: 0 })
      expect((await list()).items[0]!.priority).toBe("medium")
    })

    it("leaves out cases unticked from an all-matching selection", async () => {
      const a = await newCase({ title: "Card one" })
      await newCase({ title: "Card two" })
      const res = await ok("tom", "POST", "/api/projects/PAY/cases/bulk", {
        selection: { filter: { q: "card" }, exclude: [a.id] },
        action: { kind: "setStatus", status: "ready" },
      })
      expect(res).toEqual({ updated: 1 })
      expect(await keys("?status=ready")).toEqual(["PAY-TC-2"])
    })

    it("works on everything matching a filter", async () => {
      await newCase({ title: "Card one" })
      await newCase({ title: "Card two" })
      await newCase({ title: "Other" })
      const res = await ok("tom", "POST", "/api/projects/PAY/cases/bulk", {
        selection: { filter: { q: "card" } },
        action: { kind: "setStatus", status: "ready" },
      })
      expect(res).toEqual({ updated: 2 })
      expect(await keys("?status=ready")).toEqual(["PAY-TC-1", "PAY-TC-2"])
    })

    it("ignores other projects' cases and refuses too many labels", async () => {
      const mob = await newCase({}, "MOB", "nora")
      const res = await ok("lena", "POST", "/api/projects/PAY/cases/bulk", {
        selection: { ids: [mob.id] },
        action: { kind: "setPriority", priority: "low" },
      })
      expect(res).toEqual({ updated: 0 })
      const full = await newCase({
        labels: Array.from({ length: 20 }, (_, i) => `l${i}`),
      })
      const tooMany = await call(
        "tom",
        "POST",
        "/api/projects/PAY/cases/bulk",
        {
          selection: { ids: [full.id] },
          action: { kind: "addLabels", labels: ["one-more"] },
        }
      )
      expect(tooMany.statusCode).toBe(400)
    })

    it("archives (lead only) with a reason", async () => {
      const a = await newCase()
      expect(
        await ok("lena", "POST", "/api/projects/PAY/cases/bulk", {
          selection: { ids: [a.id] },
          action: { kind: "archive", reason: "Old flow" },
        })
      ).toEqual({ updated: 1 })
      expect(
        (await ok("vera", "GET", "/api/projects/PAY/cases/1")).archiveReason
      ).toBe("Old flow")
    })
  })

  describe("import", () => {
    const rows = [
      {
        row: 2,
        title: "Apple Pay",
        suite: "checkout / Wallets",
        priority: "High",
        steps: "1. Choose\n2. Confirm",
        expected: "1. Sheet",
      },
      {
        row: 3,
        title: "Google Pay",
        suite: "Checkout › Wallets",
        steps: "Choose",
      },
      { row: 4, title: "Plain", steps: "Do it", labels: "smoke" },
    ]

    it("checks rows without writing anything", async () => {
      await suite("Checkout")
      await newCase({ title: "Plain" })
      const check = await ok("tom", "POST", "/api/projects/PAY/imports/check", {
        fileName: "x.csv",
        rows: [
          ...rows,
          { row: 5, title: "", steps: "x" },
          { row: 6, title: "Bad", priority: "Urgent", steps: "x" },
        ],
      })
      expect(check).toMatchObject({
        total: 5,
        errorRows: 2,
        newSuites: ["Checkout › Wallets"],
      })
      expect(check.problems).toEqual([
        { row: 2, severity: "note", message: "“checkout” matched Checkout" },
        {
          row: 4,
          severity: "warning",
          message:
            "PAY-TC-1 has the same title in the same suite. This row will still be added as a new case.",
        },
        { row: 5, severity: "error", message: "Title is empty" },
        {
          row: 6,
          severity: "error",
          message: "Priority “Urgent” isn’t one of Critical, High, Medium, Low",
        },
      ])
      expect(check.preview[0]).toEqual({
        row: 2,
        title: "Apple Pay",
        suite: "Checkout › Wallets",
        priority: "High",
        stepCount: 2,
      })
      expect(await app.prisma.testCase.count()).toBe(1)
    })

    it("shows known values by their label in the preview, even on rows with errors", async () => {
      const check = await ok("tom", "POST", "/api/projects/PAY/imports/check", {
        fileName: "x.csv",
        rows: [{ row: 2, title: "", priority: "medium", steps: "x" }],
      })
      expect(check.preview[0]).toMatchObject({ row: 2, priority: "Medium" })
    })

    it("imports all rows in one go, creating missing suites", async () => {
      const checkout = await suite("Checkout")
      const result = await ok(
        "tom",
        "POST",
        "/api/projects/PAY/imports",
        { fileName: "x.csv", rows },
        201
      )
      expect(result).toEqual({
        importNumber: 1,
        created: 3,
        firstKey: "PAY-TC-1",
        lastKey: "PAY-TC-3",
        newSuites: ["Checkout › Wallets"],
      })
      const wallets = (
        await ok("vera", "GET", "/api/projects/PAY/suites")
      ).items.find((s: { name: string }) => s.name === "Wallets")
      expect(wallets).toMatchObject({ parentId: checkout.id, caseCount: 2 })
      const apple = await ok("vera", "GET", "/api/projects/PAY/cases/1")
      expect(apple).toMatchObject({
        priority: "high",
        status: "draft",
        importNumber: 1,
        steps: [
          { action: "Choose", expected: "Sheet" },
          { action: "Confirm", expected: "" },
        ],
      })
      expect(
        (await ok("vera", "GET", "/api/projects/PAY/imports")).items
      ).toMatchObject([
        {
          number: 1,
          fileName: "x.csv",
          caseCount: 3,
          archived: false,
          createdBy: { name: "tom" },
        },
      ])
    })

    it("keeps per-case entries of big changes out of the project feed", async () => {
      await ok("alice", "POST", "/api/projects/PAY/archive")
      await ok("alice", "POST", "/api/projects/PAY/unarchive")
      await ok(
        "tom",
        "POST",
        "/api/projects/PAY/imports",
        { fileName: "x.csv", rows },
        201
      )
      const one = await newCase({ title: "Single" })
      await ok("lena", "POST", "/api/projects/PAY/cases/bulk", {
        selection: { ids: [one.id] },
        action: { kind: "setPriority", priority: "low" },
      })
      const { items } = await ok(
        "vera",
        "GET",
        "/api/projects/PAY/activity?limit=50"
      )
      const feed = items.map(
        (i: { entityType: string; action: string }) =>
          `${i.entityType}.${i.action}`
      )
      expect(feed.slice(0, 6)).toEqual([
        "bulk.updated",
        "case.created",
        "import.created",
        "suite.created",
        "suite.created",
        "project.unarchived",
      ])
      expect(feed).toContain("project.archived")
      // A bulk change shows once in the feed, as a summary.
      expect(items[0].changes).toMatchObject({
        kind: "setPriority",
        priority: "low",
        count: 1,
      })
      // The per-case entries still make up each case's own history.
      const history = await ok(
        "vera",
        "GET",
        "/api/projects/PAY/cases/1/history"
      )
      expect(history.items.map((i: { action: string }) => i.action)).toEqual([
        "created",
      ])
      const single = await ok(
        "vera",
        "GET",
        `/api/projects/PAY/cases/${one.key}/history`
      )
      expect(single.items.map((i: { action: string }) => i.action)).toEqual([
        "updated",
        "created",
      ])
    })

    it("puts rows without a suite in the chosen default suite", async () => {
      const inbox = await suite("Inbox")
      await ok(
        "tom",
        "POST",
        "/api/projects/PAY/imports",
        { fileName: "x.csv", defaultSuiteId: inbox.id, rows: [rows[2]] },
        201
      )
      expect(
        (await ok("vera", "GET", "/api/projects/PAY/cases/1")).suiteId
      ).toBe(inbox.id)
    })

    it("imports nothing when any row has an error", async () => {
      const res = await call("tom", "POST", "/api/projects/PAY/imports", {
        fileName: "x.csv",
        rows: [...rows, { row: 9, title: "" }],
      })
      expect(res.statusCode).toBe(400)
      expect(res.json().message).toMatch(/Fix 1 row/)
      expect(await app.prisma.testCase.count()).toBe(0)
      expect(await app.prisma.suite.count()).toBe(0)
    })

    it("restores an archived import: its cases and the suites they need, not cases archived for other reasons", async () => {
      await suite("Checkout")
      await ok(
        "tom",
        "POST",
        "/api/projects/PAY/imports",
        { fileName: "x.csv", rows },
        201
      )
      // Archived on its own before the import was archived: stays archived.
      await ok("lena", "POST", "/api/projects/PAY/cases/3/archive", {
        reason: "Not needed",
      })
      await ok("lena", "POST", "/api/projects/PAY/imports/1/archive")
      expect(await keys()).toEqual([])

      expect(
        await ok("lena", "POST", "/api/projects/PAY/imports/1/restore")
      ).toEqual({ restoredCases: 2 })
      expect(await keys()).toEqual(["PAY-TC-1", "PAY-TC-2"])
      expect(
        (await ok("vera", "GET", "/api/projects/PAY/cases/3")).archiveReason
      ).toBe("Not needed")
      const names = (
        await ok("vera", "GET", "/api/projects/PAY/suites")
      ).items.map((s: { name: string }) => s.name)
      expect(names.sort()).toEqual(["Checkout", "Wallets"])
      expect(
        (await ok("vera", "GET", "/api/projects/PAY/imports")).items[0]
      ).toMatchObject({ number: 1, archived: false })
      const history = await ok(
        "vera",
        "GET",
        "/api/projects/PAY/cases/1/history"
      )
      expect(history.items[0]).toMatchObject({ action: "restored" })
      const { items } = await ok(
        "vera",
        "GET",
        "/api/projects/PAY/activity?limit=5"
      )
      expect(items[0]).toMatchObject({
        entityType: "import",
        action: "restored",
        changes: { importNumber: 1, cases: 2 },
      })

      expect(
        (await call("lena", "POST", "/api/projects/PAY/imports/1/restore"))
          .statusCode
      ).toBe(409)
      expect(
        (await call("lena", "POST", "/api/projects/PAY/imports/9/restore"))
          .statusCode
      ).toBe(404)
    })

    it("won't restore an import's suite over a newer suite with the same name", async () => {
      await ok(
        "tom",
        "POST",
        "/api/projects/PAY/imports",
        {
          fileName: "x.csv",
          rows: [
            rows[2]!,
            { row: 5, title: "In new", suite: "Fresh", steps: "x" },
          ],
        },
        201
      )
      await ok("lena", "POST", "/api/projects/PAY/imports/1/archive")
      await suite("fresh")
      const res = await call(
        "lena",
        "POST",
        "/api/projects/PAY/imports/1/restore"
      )
      expect(res.statusCode).toBe(409)
      expect(res.json().message).toMatch(/Fresh/)
      expect(await keys()).toEqual([])
    })

    it("lets a lead archive an import and the suites it created once empty", async () => {
      await suite("Checkout")
      await ok(
        "tom",
        "POST",
        "/api/projects/PAY/imports",
        { fileName: "x.csv", rows },
        201
      )
      expect(
        await ok("lena", "POST", "/api/projects/PAY/imports/1/archive")
      ).toEqual({ archivedCases: 3 })
      expect(await keys()).toEqual([])
      const names = (
        await ok("vera", "GET", "/api/projects/PAY/suites")
      ).items.map((s: { name: string }) => s.name)
      expect(names).toEqual(["Checkout"])
      expect(
        (await ok("vera", "GET", "/api/projects/PAY/cases/1")).archiveReason
      ).toBe("Import #1 archived")
      expect(
        (await call("lena", "POST", "/api/projects/PAY/imports/1/archive"))
          .statusCode
      ).toBe(409)
      expect(
        (await call("lena", "POST", "/api/projects/PAY/imports/2/archive"))
          .statusCode
      ).toBe(404)
    })
  })

  describe("cross-project ids", () => {
    let mobSuite: { id: string }
    beforeEach(async () => {
      mobSuite = await ok(
        "nora",
        "POST",
        "/api/projects/MOB/suites",
        { name: "Mob" },
        201
      )
      await newCase({ suiteId: mobSuite.id, title: "Mob case" }, "MOB", "nora")
    })

    it("never reaches another project's suites", async () => {
      const own = await suite("Own")
      expect(
        (
          await call(
            "lena",
            "PATCH",
            `/api/projects/PAY/suites/${mobSuite.id}`,
            { name: "X", parentId: null, version: 1 }
          )
        ).statusCode
      ).toBe(404)
      expect(
        (
          await call(
            "lena",
            "POST",
            `/api/projects/PAY/suites/${mobSuite.id}/archive`
          )
        ).statusCode
      ).toBe(404)
      expect(
        (
          await call("lena", "PATCH", `/api/projects/PAY/suites/${own.id}`, {
            name: "Own",
            parentId: mobSuite.id,
            version: 1,
          })
        ).statusCode
      ).toBe(400)
      const made = await newCase()
      const edit = await call(
        "tom",
        "PATCH",
        `/api/projects/PAY/cases/${made.key}`,
        {
          title: "x",
          suiteId: mobSuite.id,
          priority: "low",
          type: "other",
          status: "draft",
          steps: STEPS,
          version: made.version,
        }
      )
      expect(edit.statusCode).toBe(400)
      const move = await call("tom", "POST", "/api/projects/PAY/cases/bulk", {
        selection: { ids: [made.id] },
        action: { kind: "move", suiteId: mobSuite.id },
      })
      expect(move.statusCode).toBe(400)
      const byFilter = await ok(
        "lena",
        "POST",
        "/api/projects/PAY/cases/bulk",
        {
          selection: { filter: { suite: mobSuite.id } },
          action: { kind: "setPriority", priority: "critical" },
        }
      )
      expect(byFilter).toEqual({ updated: 0 })
      expect(
        (await ok("nora", "GET", "/api/projects/MOB/cases/1")).priority
      ).toBe("medium")
      expect((await list(`?suite=${mobSuite.id}`)).total).toBe(0)
      expect(
        (
          await ok(
            "vera",
            "GET",
            `/api/projects/PAY/cases/export?suite=${mobSuite.id}`
          )
        ).items
      ).toEqual([])
      const check = await call(
        "tom",
        "POST",
        "/api/projects/PAY/imports/check",
        {
          fileName: "a.csv",
          defaultSuiteId: mobSuite.id,
          rows: [{ row: 2, title: "x", steps: "y" }],
        }
      )
      expect(check.statusCode).toBe(400)
    })

    it("never reaches another project's imports", async () => {
      await ok(
        "nora",
        "POST",
        "/api/projects/MOB/imports",
        { fileName: "m.csv", rows: [{ row: 2, title: "m", steps: "s" }] },
        201
      )
      expect(
        (await call("lena", "POST", "/api/projects/PAY/imports/1/archive"))
          .statusCode
      ).toBe(404)
      expect(
        (await ok("vera", "GET", "/api/projects/PAY/imports")).items
      ).toEqual([])
    })

    it("refuses a tester's bulk archive by filter", async () => {
      await newCase()
      const res = await call("tom", "POST", "/api/projects/PAY/cases/bulk", {
        selection: { filter: { suite: "all" } },
        action: { kind: "archive" },
      })
      expect(res.statusCode).toBe(403)
      expect(await keys()).toEqual(["PAY-TC-1"])
    })
  })

  describe("import limits", () => {
    it("refuses a viewer before reading a large body", async () => {
      const big = "x".repeat(3 * 1024 * 1024)
      const res = await app.inject({
        method: "POST",
        url: "/api/projects/PAY/imports/check",
        remoteAddress: nextIp(),
        headers: {
          origin: ORIGIN,
          cookie: cookie.vera,
          "content-type": "application/json",
        },
        payload: `{"fileName":"a.csv","rows":[{"row":2,"title":"${big}"}]}`,
      })
      expect(res.statusCode).toBe(403)
      // Refused before the body was validated: no validation details in the reply.
      expect(res.json().details).toBeUndefined()
      expect(
        (
          await call("nora", "POST", "/api/projects/PAY/imports/check", {
            fileName: "a",
            rows: [],
          })
        ).statusCode
      ).toBe(404)
    })
  })

  describe("suite nesting", () => {
    it("moving a suite detaches its archived sub-suites, so restoring can't nest two levels", async () => {
      const a = await suite("A")
      const child = await suite("Child", a.id)
      const kept = await newCase({ suiteId: child.id })
      await ok("lena", "POST", `/api/projects/PAY/suites/${child.id}/archive`)
      const b = await suite("B")
      await ok("tom", "PATCH", `/api/projects/PAY/suites/${a.id}`, {
        name: "A",
        parentId: b.id,
        version: 1,
      })
      await ok("lena", "POST", `/api/projects/PAY/cases/${kept.key}/restore`)
      const { items } = await ok("vera", "GET", "/api/projects/PAY/suites")
      expect(
        items.find((s: { name: string }) => s.name === "Child")
      ).toMatchObject({ parentId: null })
    })

    it("restoring a suite checks names the same way as creating one", async () => {
      const old = await suite("Login  Flow")
      const kept = await newCase({ suiteId: old.id })
      await ok("lena", "POST", `/api/projects/PAY/suites/${old.id}/archive`)
      await suite("login flow")
      const res = await call(
        "lena",
        "POST",
        `/api/projects/PAY/cases/${kept.key}/restore`
      )
      expect(res.statusCode).toBe(409)
    })
  })

  describe("export", () => {
    it("returns every matching case with its suite path", async () => {
      const checkout = await suite("Checkout")
      const refunds = await suite("Refunds", checkout.id)
      await newCase({ title: "Refund", suiteId: refunds.id, labels: ["smoke"] })
      await newCase({ title: "Other" })
      const { items } = await ok(
        "vera",
        "GET",
        `/api/projects/PAY/cases/export?suite=${checkout.id}`
      )
      expect(items).toEqual([
        {
          key: "PAY-TC-1",
          title: "Refund",
          suitePath: "Checkout › Refunds",
          priority: "medium",
          type: "functional",
          status: "draft",
          labels: ["smoke"],
          references: "",
          preconditions: "",
          steps: STEPS,
        },
      ])
    })
  })
})
