import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { buildTestApp, createUser, nextIp, resetDb, signIn } from "./helpers.ts"

const ORIGIN = "http://localhost:5173"
const NIL = "00000000-0000-7000-8000-000000000000"
type Method = "GET" | "POST" | "PATCH"

const STEPS = [{ action: "Do it", expected: "It works" }]

describe("test runs API", () => {
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

  const suite = (name: string, parentId: string | null = null) =>
    ok("lena", "POST", "/api/projects/PAY/suites", { name, parentId }, 201)

  const newCase = (fields: object = {}) =>
    ok(
      "lena",
      "POST",
      "/api/projects/PAY/cases",
      {
        title: "Case",
        suiteId: null,
        priority: "medium",
        type: "functional",
        status: "ready",
        steps: STEPS,
        ...fields,
      },
      201
    )

  const createRun = (who: string, body: object = {}) =>
    ok(
      who,
      "POST",
      "/api/projects/PAY/runs",
      {
        name: "Regression",
        releaseId: null,
        selection: { mode: "all" },
        ...body,
      },
      201
    )

  const runCases = async (run = "PAY-R-1") =>
    (await ok("vera", "GET", `/api/projects/PAY/runs/${run}/cases`)).items as {
      id: string
      caseKey: string
      title: string
      suitePath: string
      status: string
      version: number
      assignee: { id: string; name: string } | null
    }[]

  const record = (
    who: string,
    rc: { id: string; version: number },
    body: object,
    run = "PAY-R-1"
  ) =>
    call(who, "POST", `/api/projects/PAY/runs/${run}/cases/${rc.id}/results`, {
      expectedVersion: rc.version,
      ...body,
    })

  let checkout: { id: string }
  let cart: { id: string }

  beforeAll(async () => {
    app = await buildTestApp()
  })
  beforeEach(async () => {
    await resetDb(app.prisma)
    for (const [username, role] of [
      ["alice", "admin"],
      ["lena", "user"],
      ["tom", "user"],
      ["tim", "user"],
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
      ["tim", "tester"],
      ["vera", "viewer"],
    ]) {
      await ok("alice", "POST", "/api/projects/PAY/members", {
        userIds: [id[user!]],
        role,
      })
    }
    checkout = await suite("Checkout")
    cart = await suite("Cart", checkout.id)
    // PAY-TC-1..4: two in Cart, one in Checkout, one without a suite; PAY-TC-5 is a draft.
    await newCase({
      title: "Coupon",
      suiteId: cart.id,
      labels: ["smoke"],
      priority: "high",
    })
    await newCase({ title: "Quantity", suiteId: cart.id })
    await newCase({
      title: "Checkout loads",
      suiteId: checkout.id,
      labels: ["smoke"],
    })
    await newCase({ title: "Loose", type: "security" })
    await newCase({ title: "Draft one", suiteId: cart.id, status: "draft" })
  })
  afterAll(async () => {
    await app.close()
  })

  describe("authorization matrix", () => {
    // Run PAY-R-1 is created by tom (a tester) with every case assigned to him.
    let rc = ""
    beforeEach(async () => {
      await createRun("tom", { assigneeIds: [id.tom] })
      rc = (await runCases())[0]!.id
    })
    const result = { status: "passed", expectedVersion: 1 }
    // [method, url, body, allowed among lena (lead) / tom (tester, creator) / tim (tester) / vera (viewer)]
    const routes: [Method, string, object | undefined, string[]][] = [
      [
        "GET",
        "/api/projects/PAY/runs",
        undefined,
        ["lena", "tom", "tim", "vera"],
      ],
      [
        "POST",
        "/api/projects/PAY/runs",
        { name: "R", releaseId: null, selection: { mode: "all" } },
        ["lena", "tom", "tim"],
      ],
      [
        "POST",
        "/api/projects/PAY/runs/preview",
        { selection: { mode: "all" } },
        ["lena", "tom", "tim"],
      ],
      [
        "GET",
        "/api/projects/PAY/runs/PAY-R-1",
        undefined,
        ["lena", "tom", "tim", "vera"],
      ],
      [
        "PATCH",
        "/api/projects/PAY/runs/PAY-R-1",
        { name: "R", releaseId: null, version: 1 },
        ["lena", "tom"],
      ],
      [
        "GET",
        "/api/projects/PAY/runs/PAY-R-1/cases",
        undefined,
        ["lena", "tom", "tim", "vera"],
      ],
      [
        "GET",
        "/api/projects/PAY/runs/PAY-R-1/cases/{rc}",
        undefined,
        ["lena", "tom", "tim", "vera"],
      ],
      [
        "POST",
        "/api/projects/PAY/runs/PAY-R-1/cases/{rc}/results",
        result,
        ["lena", "tom", "tim"],
      ],
      [
        "POST",
        "/api/projects/PAY/runs/PAY-R-1/cases/{rc}/refresh",
        { expectedVersion: 1 },
        ["lena", "tom", "tim"],
      ],
      [
        "POST",
        "/api/projects/PAY/runs/PAY-R-1/results/bulk",
        { runCaseIds: [NIL], status: "passed" },
        ["lena", "tom", "tim"],
      ],
      [
        "POST",
        "/api/projects/PAY/runs/PAY-R-1/assign",
        { runCaseIds: [NIL], assigneeId: null },
        ["lena", "tom"],
      ],
      [
        "POST",
        "/api/projects/PAY/runs/PAY-R-1/cases",
        { selection: { mode: "all" } },
        ["lena", "tom"],
      ],
      [
        "POST",
        "/api/projects/PAY/runs/PAY-R-1/cases/remove",
        { runCaseIds: [NIL] },
        ["lena", "tom"],
      ],
      ["POST", "/api/projects/PAY/runs/PAY-R-1/close", undefined, ["lena"]],
      ["POST", "/api/projects/PAY/runs/PAY-R-1/reopen", undefined, ["lena"]],
      [
        "POST",
        "/api/projects/PAY/runs/PAY-R-1/copy",
        { name: "Copy", releaseId: null },
        ["lena", "tom", "tim"],
      ],
    ]
    const url = (u: string) => u.replace("{rc}", rc)

    it.each(routes)("%s %s needs a session", async (method, u, body) => {
      expect((await call(undefined, method, url(u), body)).statusCode).toBe(401)
    })

    it.each(routes)(
      "%s %s is hidden from non-members (404)",
      async (method, u, body) => {
        expect((await call("nora", method, url(u), body)).statusCode).toBe(404)
      }
    )

    it.each(routes)(
      "%s %s follows the permission rules",
      async (method, u, body, allowed) => {
        for (const who of ["vera", "tim", "tom", "lena", "alice"]) {
          const res = await call(who, method, url(u), body)
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
      async (method, u, body) => {
        await call("alice", "POST", `/api/users/${id.tim}/deactivate`)
        expect((await call("tim", method, url(u), body)).statusCode).toBe(401)
      }
    )

    it.each(routes.filter(([method]) => method !== "GET"))(
      "%s %s is refused (409) once the project is archived",
      async (method, u, body) => {
        await ok("alice", "POST", "/api/projects/PAY/archive")
        expect((await call("alice", method, url(u), body)).statusCode).toBe(409)
      }
    )
  })

  describe("creating runs", () => {
    it("previews a selection: total, cases per top suite and drafts left out", async () => {
      const preview = (selection: object) =>
        ok("tim", "POST", "/api/projects/PAY/runs/preview", { selection })
      expect(await preview({ mode: "all" })).toEqual({
        total: 4,
        groups: [
          { suite: "Checkout", count: 3 },
          { suite: null, count: 1 },
        ],
        draftsLeftOut: 1,
      })
      expect(await preview({ mode: "all", includeDrafts: true })).toEqual({
        total: 5,
        groups: [
          { suite: "Checkout", count: 4 },
          { suite: null, count: 1 },
        ],
        draftsLeftOut: 0,
      })
      expect(await preview({ mode: "filter", label: "smoke" })).toEqual({
        total: 2,
        groups: [{ suite: "Checkout", count: 2 }],
        draftsLeftOut: 0,
      })
      // A draft picked by hand is taken; the rest of Cart's drafts aren't.
      const draft = await app.prisma.testCase.findFirstOrThrow({
        where: { status: "draft" },
      })
      expect(
        await preview({
          mode: "suites",
          suiteIds: [cart.id],
          caseIds: [draft.id],
        })
      ).toEqual({
        total: 3,
        groups: [{ suite: "Checkout", count: 3 }],
        draftsLeftOut: 0,
      })
    })

    it("copies every Ready case in suite order and numbers the run", async () => {
      const run = await createRun("tom", { environment: "Chrome 128" })
      expect(run).toMatchObject({
        key: "PAY-R-1",
        name: "Regression",
        environment: "Chrome 128",
        state: "open",
        counts: { passed: 0, failed: 0, blocked: 0, skipped: 0, untested: 4 },
        createdBy: { id: id.tom },
      })
      const items = await runCases()
      expect(items.map((c) => [c.caseKey, c.suitePath])).toEqual([
        ["PAY-TC-3", "Checkout"],
        ["PAY-TC-1", "Checkout › Cart"],
        ["PAY-TC-2", "Checkout › Cart"],
        ["PAY-TC-4", ""],
      ])
      const log = await app.prisma.activityLog.findFirstOrThrow({
        where: { entityType: "run", action: "created" },
      })
      expect(log.changes).toMatchObject({ key: "PAY-R-1", cases: 4 })
      expect((await createRun("lena")).key).toBe("PAY-R-2")
    })

    it("chooses by label/priority/type, or by suites and single cases, Drafts only when asked", async () => {
      await createRun("tom", { selection: { mode: "filter", label: "smoke" } })
      expect((await runCases("PAY-R-1")).map((c) => c.caseKey)).toEqual([
        "PAY-TC-3",
        "PAY-TC-1",
      ])
      await createRun("tom", {
        selection: { mode: "filter", type: "security" },
      })
      expect((await runCases("PAY-R-2")).map((c) => c.caseKey)).toEqual([
        "PAY-TC-4",
      ])
      // A top-level suite brings its sub-suites; Drafts come in when asked.
      await createRun("tom", {
        selection: {
          mode: "suites",
          suiteIds: [checkout.id],
          includeDrafts: true,
        },
      })
      expect((await runCases("PAY-R-3")).map((c) => c.caseKey)).toEqual([
        "PAY-TC-3",
        "PAY-TC-1",
        "PAY-TC-2",
        "PAY-TC-5",
      ])
      // Single picks and "no suite".
      const loose = (await ok("vera", "GET", "/api/projects/PAY/cases/4")).id
      await createRun("tom", {
        selection: { mode: "suites", suiteIds: [cart.id], caseIds: [loose] },
      })
      expect((await runCases("PAY-R-4")).map((c) => c.caseKey)).toEqual([
        "PAY-TC-1",
        "PAY-TC-2",
        "PAY-TC-4",
      ])
    })

    it("refuses an empty selection, foreign releases and assignees who can't run tests", async () => {
      const none = await call("tom", "POST", "/api/projects/PAY/runs", {
        name: "R",
        releaseId: null,
        selection: { mode: "filter", label: "nothing-has-this" },
      })
      expect(none.statusCode).toBe(400)
      expect(none.json().message).toMatch(/No test cases match/)
      const mobRelease = await ok(
        "nora",
        "POST",
        "/api/projects/MOB/releases",
        { name: "1.0", status: "planned" },
        201
      )
      expect(
        (
          await call("tom", "POST", "/api/projects/PAY/runs", {
            name: "R",
            releaseId: mobRelease.id,
            selection: { mode: "all" },
          })
        ).statusCode
      ).toBe(400)
      for (const who of ["vera", "nora"]) {
        const res = await call("tom", "POST", "/api/projects/PAY/runs", {
          name: "R",
          releaseId: null,
          assigneeIds: [id[who]],
          selection: { mode: "all" },
        })
        expect(res.statusCode, who).toBe(400)
      }
    })

    it("shares cases out by suite between assignees", async () => {
      await createRun("lena", { assigneeIds: [id.tom, id.tim] })
      const items = await runCases()
      const bySuite = new Map<string, Set<string>>()
      for (const c of items) {
        const top = c.suitePath.split(" › ")[0]!
        bySuite.set(top, (bySuite.get(top) ?? new Set()).add(c.assignee!.id))
      }
      // Every case is assigned, and a suite is never split between people.
      expect(items.every((c) => c.assignee)).toBe(true)
      for (const people of bySuite.values()) expect(people.size).toBe(1)
      expect(new Set(items.map((c) => c.assignee!.id))).toEqual(
        new Set([id.tom, id.tim])
      )
    })
  })

  describe("recording results", () => {
    beforeEach(async () => {
      await createRun("tom", { assigneeIds: [id.tom] })
    })

    it("records results, keeps history and updates the counts", async () => {
      const [first] = await runCases()
      const passed = await record("tim", first!, { status: "passed" })
      expect(passed.statusCode, passed.body).toBe(200)
      const failed = await record(
        "tom",
        { id: first!.id, version: 2 },
        { status: "failed", note: "Broke", failedStep: 1 }
      )
      expect(failed.json()).toMatchObject({
        status: "failed",
        version: 3,
        results: [
          {
            status: "failed",
            note: "Broke",
            failedStep: 1,
            revision: 1,
            recordedBy: { id: id.tom },
          },
          { status: "passed", recordedBy: { id: id.tim } },
        ],
      })
      expect(
        (await ok("vera", "GET", "/api/projects/PAY/runs/PAY-R-1")).counts
      ).toEqual({
        passed: 0,
        failed: 1,
        blocked: 0,
        skipped: 0,
        untested: 3,
      })
    })

    it("needs a note for Failed and Blocked", async () => {
      const [first] = await runCases()
      expect(
        (await record("tom", first!, { status: "blocked" })).statusCode
      ).toBe(400)
    })

    it("tells you who recorded meanwhile, and records anyway when asked", async () => {
      const [first] = await runCases()
      await record("tim", first!, { status: "failed", note: "Nope" })
      const stale = await record("tom", first!, { status: "passed" })
      expect(stale.statusCode).toBe(409)
      expect(stale.json().message).toMatch(/tim recorded Failed/)
      expect(
        (await record("tom", first!, { status: "passed", overwrite: true }))
          .statusCode
      ).toBe(200)
    })

    it("undoes with an untested result", async () => {
      const [first] = await runCases()
      await record("tom", first!, { status: "passed" })
      const undone = await record(
        "tom",
        { id: first!.id, version: 2 },
        { status: "untested" }
      )
      expect(undone.json()).toMatchObject({
        status: "untested",
        results: [{ status: "untested" }, { status: "passed" }],
      })
    })

    it("keeps the copy when the case changes, and refreshes it on request", async () => {
      const [first] = await runCases()
      const source = await ok(
        "vera",
        "GET",
        `/api/projects/PAY/cases/${first!.caseKey}`
      )
      await ok("lena", "PATCH", `/api/projects/PAY/cases/${first!.caseKey}`, {
        title: "Checkout loads fast",
        suiteId: source.suiteId,
        priority: "high",
        type: "functional",
        status: "ready",
        steps: [...STEPS, { action: "Time it", expected: "Under 2 s" }],
        version: source.version,
      })
      const before = await ok(
        "vera",
        "GET",
        `/api/projects/PAY/runs/PAY-R-1/cases/${first!.id}`
      )
      expect(before).toMatchObject({
        title: "Checkout loads",
        revision: 1,
        latestRevision: 2,
        steps: STEPS,
      })

      await record("tom", first!, { status: "passed" })
      const refreshed = await ok(
        "tom",
        "POST",
        `/api/projects/PAY/runs/PAY-R-1/cases/${first!.id}/refresh`,
        { expectedVersion: first!.version + 1 }
      )
      expect(refreshed).toMatchObject({
        title: "Checkout loads fast",
        revision: 2,
        priority: "high",
        status: "untested",
        results: [
          { status: "untested", revision: 2 },
          { status: "passed", revision: 1 },
        ],
      })
    })

    it("sets one result on many cases with a shared note", async () => {
      const items = await runCases()
      const res = await ok(
        "tim",
        "POST",
        "/api/projects/PAY/runs/PAY-R-1/results/bulk",
        {
          runCaseIds: [items[0]!.id, items[1]!.id, NIL],
          status: "blocked",
          note: "Sandbox down",
        }
      )
      expect(res).toEqual({ recorded: 2 })
      expect(
        (await runCases()).filter((c) => c.status === "blocked")
      ).toHaveLength(2)
    })

    it("refuses results on a closed run", async () => {
      const [first] = await runCases()
      await ok("lena", "POST", "/api/projects/PAY/runs/PAY-R-1/close")
      const res = await record("tom", first!, { status: "passed" })
      expect(res.statusCode).toBe(409)
      expect(res.json().message).toMatch(/closed/)
    })
  })

  describe("changing a run", () => {
    beforeEach(async () => {
      await createRun("tom", { selection: { mode: "filter", label: "smoke" } })
    })

    it("assigns cases to testers and leads, never viewers", async () => {
      const items = await runCases()
      await ok("tom", "POST", "/api/projects/PAY/runs/PAY-R-1/assign", {
        runCaseIds: [items[0]!.id],
        assigneeId: id.tim,
      })
      expect((await runCases())[0]!.assignee).toMatchObject({ id: id.tim })
      const viewer = await call(
        "tom",
        "POST",
        "/api/projects/PAY/runs/PAY-R-1/assign",
        { runCaseIds: [items[0]!.id], assigneeId: id.vera }
      )
      expect(viewer.statusCode).toBe(400)
      const mine = await ok("tim", "GET", "/api/projects/PAY/runs?mine=true")
      expect(mine.items.map((r: { key: string }) => r.key)).toEqual(["PAY-R-1"])
    })

    it("adds new cases and removes only cases without results", async () => {
      const added = await ok(
        "tom",
        "POST",
        "/api/projects/PAY/runs/PAY-R-1/cases",
        { selection: { mode: "all" } }
      )
      expect(added).toEqual({ added: 2 })
      const items = await runCases()
      expect(items).toHaveLength(4)
      await record("tom", items[0]!, { status: "passed" })
      const removed = await ok(
        "tom",
        "POST",
        "/api/projects/PAY/runs/PAY-R-1/cases/remove",
        {
          runCaseIds: items.map((c) => c.id),
        }
      )
      expect(removed).toEqual({ removed: 3, kept: 1 })
      expect(await runCases()).toHaveLength(1)
    })

    it("edits the details with a version check", async () => {
      const updated = await ok(
        "tom",
        "PATCH",
        "/api/projects/PAY/runs/PAY-R-1",
        {
          name: "Smoke",
          environment: "Safari 18",
          releaseId: null,
          version: 1,
        }
      )
      expect(updated).toMatchObject({
        name: "Smoke",
        environment: "Safari 18",
        version: 2,
      })
      expect(
        (
          await call("tom", "PATCH", "/api/projects/PAY/runs/PAY-R-1", {
            name: "X",
            releaseId: null,
            version: 1,
          })
        ).statusCode
      ).toBe(409)
    })
  })

  describe("closing and reopening", () => {
    beforeEach(async () => {
      await createRun("tom", { selection: { mode: "filter", label: "smoke" } })
    })

    const finish = async () => {
      for (const c of await runCases())
        await record("tom", c, { status: "passed" })
    }

    it("lets the creator close only once nothing is untested", async () => {
      const early = await call(
        "tom",
        "POST",
        "/api/projects/PAY/runs/PAY-R-1/close"
      )
      expect(early.statusCode).toBe(403)
      expect(early.json().message).toMatch(/2 cases have no result/)
      await finish()
      const closed = await ok(
        "tom",
        "POST",
        "/api/projects/PAY/runs/PAY-R-1/close"
      )
      expect(closed).toMatchObject({
        state: "closed",
        closedBy: { id: id.tom },
      })
      expect(closed.closedAt).toBeTruthy()
    })

    it("lets an assigned tester close, but not one with no part in the run", async () => {
      await finish()
      expect(
        (await call("tim", "POST", "/api/projects/PAY/runs/PAY-R-1/close"))
          .statusCode
      ).toBe(403)
      const [first] = await runCases()
      await ok("lena", "POST", "/api/projects/PAY/runs/PAY-R-1/assign", {
        runCaseIds: [first!.id],
        assigneeId: id.tim,
      })
      expect(
        (await call("tim", "POST", "/api/projects/PAY/runs/PAY-R-1/close"))
          .statusCode
      ).toBe(200)
    })

    it("lets a QA Lead close any time and reopen; both are logged", async () => {
      expect(
        (await ok("lena", "POST", "/api/projects/PAY/runs/PAY-R-1/close")).state
      ).toBe("closed")
      expect(
        (await call("lena", "POST", "/api/projects/PAY/runs/PAY-R-1/close"))
          .statusCode
      ).toBe(409)
      expect(
        (await call("tom", "POST", "/api/projects/PAY/runs/PAY-R-1/reopen"))
          .statusCode
      ).toBe(403)
      expect(
        await ok("lena", "POST", "/api/projects/PAY/runs/PAY-R-1/reopen")
      ).toMatchObject({ state: "open", closedAt: null })
      const actions = (
        await app.prisma.activityLog.findMany({
          where: { entityType: "run" },
          orderBy: { createdAt: "asc" },
        })
      ).map((a) => a.action)
      expect(actions).toEqual(["created", "closed", "reopened"])
      const closedTab = await ok(
        "vera",
        "GET",
        "/api/projects/PAY/runs?state=closed"
      )
      expect(closedTab.total).toBe(0)
    })
  })

  describe("copying runs", () => {
    it("duplicates with the latest versions and the same assignees, skipping archived cases", async () => {
      await createRun("tom", { assigneeIds: [id.tom] })
      await ok("lena", "POST", "/api/projects/PAY/cases/4/archive", {})
      const copy = await ok(
        "tim",
        "POST",
        "/api/projects/PAY/runs/PAY-R-1/copy",
        { name: "Safari", environment: "Safari 18", releaseId: null },
        201
      )
      expect(copy).toMatchObject({
        key: "PAY-R-2",
        name: "Safari",
        environment: "Safari 18",
        createdBy: { id: id.tim },
      })
      const items = await runCases("PAY-R-2")
      expect(items.map((c) => c.caseKey)).toEqual([
        "PAY-TC-3",
        "PAY-TC-1",
        "PAY-TC-2",
      ])
      expect(items.every((c) => c.assignee?.id === id.tom)).toBe(true)
    })

    it("starts a run from the failed and blocked cases", async () => {
      await createRun("tom")
      const items = await runCases()
      await record("tom", items[0]!, { status: "failed", note: "x" })
      await record("tom", items[1]!, { status: "blocked", note: "y" })
      await record("tom", items[2]!, { status: "passed" })
      await ok(
        "tom",
        "POST",
        "/api/projects/PAY/runs/PAY-R-1/copy",
        { name: "Re-test", releaseId: null, only: "failedOrBlocked" },
        201
      )
      expect((await runCases("PAY-R-2")).map((c) => c.caseKey)).toEqual([
        items[0]!.caseKey,
        items[1]!.caseKey,
      ])
    })
  })

  describe("listing", () => {
    it("lists open runs with counts, newest first, and finds runs by key", async () => {
      await createRun("tom", { name: "First" })
      await createRun("lena", { name: "Second" })
      const list = await ok("vera", "GET", "/api/projects/PAY/runs")
      expect(list.items.map((r: { key: string }) => r.key)).toEqual([
        "PAY-R-2",
        "PAY-R-1",
      ])
      expect(list.items[0].counts.untested).toBe(4)
      expect(
        (await ok("vera", "GET", "/api/projects/PAY/runs?q=first")).items
      ).toHaveLength(1)
      expect(
        (await call("vera", "GET", "/api/projects/PAY/runs/MOB-R-1")).statusCode
      ).toBe(404)
    })
  })

  describe("project and run isolation", () => {
    // PAY-R-1 by tom; MOB-R-1 by nora (MOB's lead) with one case.
    let mobRc: { id: string; version: number }
    let mobCase: { id: string }
    let mobSuite: { id: string }
    beforeEach(async () => {
      await createRun("tom", { assigneeIds: [id.tom] })
      mobSuite = await ok(
        "nora",
        "POST",
        "/api/projects/MOB/suites",
        { name: "Mobile", parentId: null },
        201
      )
      mobCase = await ok(
        "nora",
        "POST",
        "/api/projects/MOB/cases",
        {
          title: "Mobile case",
          suiteId: mobSuite.id,
          priority: "medium",
          type: "functional",
          status: "ready",
          steps: STEPS,
        },
        201
      )
      await ok(
        "nora",
        "POST",
        "/api/projects/MOB/runs",
        { name: "Mobile run", releaseId: null, selection: { mode: "all" } },
        201
      )
      mobRc = (await ok("nora", "GET", "/api/projects/MOB/runs/MOB-R-1/cases"))
        .items[0]
    })

    it("can't reach another project's run through this project's URL", async () => {
      // MOB-R-1 exists, but under PAY it means PAY's run 1 or nothing.
      const res = await call("alice", "GET", "/api/projects/PAY/runs/MOB-R-1")
      expect(res.statusCode).toBe(404)
      const copy = await call(
        "alice",
        "POST",
        "/api/projects/PAY/runs/MOB-R-1/copy",
        {
          name: "Copy",
          releaseId: null,
        }
      )
      expect(copy.statusCode).toBe(404)
    })

    it("treats another run's case ids as not found", async () => {
      const base = `/api/projects/PAY/runs/PAY-R-1/cases/${mobRc.id}`
      expect((await call("alice", "GET", base)).statusCode).toBe(404)
      expect(
        (await record("alice", mobRc, { status: "passed" })).statusCode
      ).toBe(404)
      expect(
        (
          await call("alice", "POST", `${base}/refresh`, {
            expectedVersion: 1,
          })
        ).statusCode
      ).toBe(404)
      const path = "/api/projects/PAY/runs/PAY-R-1"
      expect(
        await ok("alice", "POST", `${path}/results/bulk`, {
          runCaseIds: [mobRc.id],
          status: "passed",
        })
      ).toEqual({ recorded: 0 })
      expect(
        await ok("alice", "POST", `${path}/assign`, {
          runCaseIds: [mobRc.id],
          assigneeId: null,
        })
      ).toEqual({ assigned: 0 })
      expect(
        await ok("alice", "POST", `${path}/cases/remove`, {
          runCaseIds: [mobRc.id],
        })
      ).toEqual({ removed: 0, kept: 0 })
      // The MOB case is untouched.
      const after = await ok(
        "nora",
        "GET",
        `/api/projects/MOB/runs/MOB-R-1/cases/${mobRc.id}`
      )
      expect(after).toMatchObject({ status: "untested", version: 1 })
    })

    it("only takes this project's suites and cases from a selection", async () => {
      const preview = await ok(
        "tom",
        "POST",
        "/api/projects/PAY/runs/preview",
        {
          selection: {
            mode: "suites",
            suiteIds: [mobSuite.id, cart.id],
            caseIds: [mobCase.id],
          },
        }
      )
      expect(preview.total).toBe(2)
      const onlyForeign = await call("tom", "POST", "/api/projects/PAY/runs", {
        name: "R",
        releaseId: null,
        selection: {
          mode: "suites",
          suiteIds: [mobSuite.id],
          caseIds: [mobCase.id],
        },
      })
      expect(onlyForeign.statusCode).toBe(400)
      const added = await ok(
        "tom",
        "POST",
        "/api/projects/PAY/runs/PAY-R-1/cases",
        {
          selection: { mode: "suites", caseIds: [mobCase.id] },
        }
      )
      expect(added).toEqual({ added: 0 })
    })

    it("refuses another project's release and people", async () => {
      const mobRelease = await ok(
        "nora",
        "POST",
        "/api/projects/MOB/releases",
        { name: "1.0", status: "planned" },
        201
      )
      const run = await ok("tom", "GET", "/api/projects/PAY/runs/PAY-R-1")
      expect(
        (
          await call("tom", "PATCH", "/api/projects/PAY/runs/PAY-R-1", {
            name: "R",
            releaseId: mobRelease.id,
            version: run.version,
          })
        ).statusCode
      ).toBe(400)
      expect(
        (
          await call("tom", "POST", "/api/projects/PAY/runs/PAY-R-1/copy", {
            name: "Copy",
            releaseId: mobRelease.id,
          })
        ).statusCode
      ).toBe(400)
      const rc = (await runCases())[0]!
      for (const who of [id.nora, id.alice]) {
        expect(
          (
            await call("tom", "POST", "/api/projects/PAY/runs/PAY-R-1/assign", {
              runCaseIds: [rc.id],
              assigneeId: who,
            })
          ).statusCode
        ).toBe(400)
      }
      await call("alice", "POST", `/api/users/${id.tim}/deactivate`)
      expect(
        (
          await call("tom", "POST", "/api/projects/PAY/runs/PAY-R-1/assign", {
            runCaseIds: [rc.id],
            assigneeId: id.tim,
          })
        ).statusCode
      ).toBe(400)
    })
  })

  describe("closed runs and the admin", () => {
    it("lets an admin close with untested cases and reopen; closed runs refuse changes", async () => {
      await createRun("tom", { assigneeIds: [id.tom] })
      const rc = (await runCases())[0]!
      const closed = await ok(
        "alice",
        "POST",
        "/api/projects/PAY/runs/PAY-R-1/close"
      )
      expect(closed).toMatchObject({
        state: "closed",
        closedBy: { id: id.alice },
      })
      const path = "/api/projects/PAY/runs/PAY-R-1"
      const writes: [Method, string, object | undefined][] = [
        [
          "PATCH",
          path,
          { name: "R", releaseId: null, version: closed.version },
        ],
        ["POST", `${path}/assign`, { runCaseIds: [rc.id], assigneeId: null }],
        [
          "POST",
          `${path}/cases`,
          { selection: { mode: "all", includeDrafts: true } },
        ],
        ["POST", `${path}/cases/remove`, { runCaseIds: [rc.id] }],
        ["POST", `${path}/cases/${rc.id}/refresh`, { expectedVersion: 1 }],
        [
          "POST",
          `${path}/results/bulk`,
          { runCaseIds: [rc.id], status: "passed" },
        ],
      ]
      for (const [method, url, body] of writes) {
        const res = await call("lena", method, url, body)
        expect(res.statusCode, `${method} ${url}: ${res.body}`).toBe(409)
      }
      const reopened = await ok("alice", "POST", `${path}/reopen`)
      expect(reopened).toMatchObject({ state: "open", closedAt: null })
      expect((await record("tom", rc, { status: "passed" })).statusCode).toBe(
        200
      )
    })
  })

  describe("conflicts", () => {
    it("doesn't call a reassignment a conflicting result", async () => {
      await createRun("lena", { assigneeIds: [id.tom] })
      const rc = (await runCases())[0]!
      await ok("lena", "POST", "/api/projects/PAY/runs/PAY-R-1/assign", {
        runCaseIds: [rc.id],
        assigneeId: id.tim,
      })
      // tim still holds the version from before the reassignment.
      expect((await record("tim", rc, { status: "passed" })).statusCode).toBe(
        200
      )
    })

    it("refuses to reset a case to its latest version from a stale view", async () => {
      await createRun("tom", { assigneeIds: [id.tom] })
      const rc = (await runCases())[0]!
      const caseRow = await app.prisma.testCase.findFirstOrThrow({
        where: { title: "Checkout loads" },
      })
      await ok(
        "lena",
        "PATCH",
        `/api/projects/PAY/cases/PAY-TC-${caseRow.number}`,
        {
          title: "Checkout loads fast",
          suiteId: caseRow.suiteId,
          priority: "medium",
          type: "functional",
          status: "ready",
          steps: STEPS,
          version: caseRow.version,
        }
      )
      // tim records meanwhile; tom's view is now stale.
      await record("tim", rc, { status: "failed", note: "Broken" })
      const stale = await call(
        "tom",
        "POST",
        `/api/projects/PAY/runs/PAY-R-1/cases/${rc.id}/refresh`,
        { expectedVersion: rc.version }
      )
      expect(stale.statusCode).toBe(409)
      expect(stale.json().message).toMatch(
        /^tim recorded Failed on this case meanwhile/
      )
    })
  })
})
