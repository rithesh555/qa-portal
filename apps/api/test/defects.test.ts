import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { buildTestApp, createUser, nextIp, resetDb, signIn } from "./helpers.ts"

const ORIGIN = "http://localhost:5173"
const NIL = "00000000-0000-7000-8000-000000000000"
type Method = "GET" | "POST" | "PATCH" | "DELETE"

const STEPS = [
  { action: "Open checkout", expected: "It opens" },
  { action: "Pay", expected: "Paid" },
]

const FIELDS = {
  title: "Spinner never stops",
  severity: "critical",
  steps: "1. Pay",
  actual: "It spins",
}

describe("defects API", () => {
  let app: FastifyInstance
  const cookie: Record<string, string> = {}
  const id: Record<string, string> = {}
  /** Run cases of PAY-R-1: [0] failed, [1] blocked, [2] passed. */
  let rcs: { id: string; version: number }[] = []
  let release: { id: string }

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

  const P = "/api/projects/PAY"

  /** The latest result's id on a run case. */
  const resultOf = async (runCaseId: string) =>
    (
      await app.prisma.testResult.findFirstOrThrow({
        where: { runCaseId },
        orderBy: { recordedAt: "desc" },
      })
    ).id

  const logNew = (who: string, rc = rcs[0]!, fields: object = {}) =>
    ok(
      who,
      "POST",
      `${P}/defects/log`,
      { runCaseId: rc.id, defect: { mode: "new", ...FIELDS, ...fields } },
      201
    )

  const move = (
    who: string,
    ref: string,
    body: Record<string, unknown>,
    status = 200
  ) =>
    (async () => {
      const d = await ok("vera", "GET", `${P}/defects/${ref}`)
      return ok(
        who,
        "POST",
        `${P}/defects/${ref}/transition`,
        { version: d.version, ...body },
        status
      )
    })()

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
    for (const [name, key, lead] of [
      ["Payments", "PAY", id.lena],
      ["Mobile", "MOB", id.nora],
    ]) {
      await ok(
        "alice",
        "POST",
        "/api/projects",
        { name, key, leadUserId: lead },
        201
      )
    }
    for (const [user, role] of [
      ["tom", "tester"],
      ["tim", "tester"],
      ["vera", "viewer"],
    ]) {
      await ok("alice", "POST", `${P}/members`, { userIds: [id[user!]], role })
    }
    release = await ok(
      "lena",
      "POST",
      `${P}/releases`,
      { name: "4.2", status: "in_progress" },
      201
    )
    for (const title of ["Checkout loads", "Pay by card", "Refund"]) {
      await ok(
        "lena",
        "POST",
        `${P}/cases`,
        {
          title,
          suiteId: null,
          priority: "high",
          type: "functional",
          status: "ready",
          steps: STEPS,
        },
        201
      )
    }
    await ok(
      "tom",
      "POST",
      `${P}/runs`,
      {
        name: "Regression",
        environment: "Safari 18",
        releaseId: release.id,
        selection: { mode: "all" },
      },
      201
    )
    const items = (await ok("tom", "GET", `${P}/runs/PAY-R-1/cases`)).items
    const record = (rc: { id: string; version: number }, body: object) =>
      ok("tom", "POST", `${P}/runs/PAY-R-1/cases/${rc.id}/results`, {
        expectedVersion: rc.version,
        ...body,
      })
    await record(items[0], { status: "failed", note: "Spins", failedStep: 2 })
    await record(items[1], { status: "blocked", note: "Sandbox down" })
    await record(items[2], { status: "passed" })
    rcs = (await ok("tom", "GET", `${P}/runs/PAY-R-1/cases`)).items
  })
  afterAll(async () => {
    await app.close()
  })

  describe("authorization matrix", () => {
    let link = ""
    let rcId = ""
    beforeEach(async () => {
      await logNew("tom")
      link = (await ok("vera", "GET", `${P}/defects/PAY-D-1`)).links[0].id
      rcId = rcs[0]!.id
    })
    // [method, url, body, allowed among lena (lead) / tom / tim (testers) / vera (viewer)]
    const routes: [Method, string, object | undefined, string[]][] = [
      ["GET", `${P}/defects`, undefined, ["lena", "tom", "tim", "vera"]],
      ["POST", `${P}/defects`, FIELDS, ["lena", "tom", "tim"]],
      [
        "POST",
        `${P}/defects/log`,
        { runCaseId: "{rc}", defect: { mode: "new", ...FIELDS } },
        ["lena", "tom", "tim"],
      ],
      [
        "GET",
        `${P}/defects/known?runCaseId={rc}`,
        undefined,
        ["lena", "tom", "tim", "vera"],
      ],
      [
        "GET",
        `${P}/defects/PAY-D-1`,
        undefined,
        ["lena", "tom", "tim", "vera"],
      ],
      [
        "PATCH",
        `${P}/defects/PAY-D-1`,
        { severity: "major", version: 1 },
        ["lena", "tom", "tim"],
      ],
      [
        "POST",
        `${P}/defects/PAY-D-1/transition`,
        { to: "open", version: 1 },
        ["lena"],
      ],
      [
        "GET",
        `${P}/defects/PAY-D-1/activity`,
        undefined,
        ["lena", "tom", "tim", "vera"],
      ],
      [
        "POST",
        `${P}/defects/PAY-D-1/comments`,
        { body: "Seen on iOS too" },
        ["lena", "tom", "tim"],
      ],
      [
        "POST",
        `${P}/defects/PAY-D-1/links`,
        { resultId: NIL },
        ["lena", "tom", "tim"],
      ],
      [
        "DELETE",
        `${P}/defects/PAY-D-1/links/{link}`,
        undefined,
        ["lena", "tom", "tim"],
      ],
    ]
    const fill = (u: string) => u.replace("{rc}", rcId).replace("{link}", link)
    const fillBody = (b?: object) =>
      b ? JSON.parse(JSON.stringify(b).replace("{rc}", rcId)) : undefined

    it.each(routes)("%s %s needs a session", async (method, u, body) => {
      expect(
        (await call(undefined, method, fill(u), fillBody(body))).statusCode
      ).toBe(401)
    })

    it.each(routes)(
      "%s %s is hidden from non-members (404)",
      async (method, u, body) => {
        expect(
          (await call("nora", method, fill(u), fillBody(body))).statusCode
        ).toBe(404)
      }
    )

    it.each(routes)(
      "%s %s follows the permission rules",
      async (method, u, body, allowed) => {
        for (const who of ["vera", "tim", "tom", "lena", "alice"]) {
          const res = await call(who, method, fill(u), fillBody(body))
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
        expect(
          (await call("tim", method, fill(u), fillBody(body))).statusCode
        ).toBe(401)
      }
    )

    it.each(routes.filter(([method]) => method !== "GET"))(
      "%s %s is refused (409) once the project is archived",
      async (method, u, body) => {
        await ok("alice", "POST", `${P}/archive`)
        expect(
          (await call("alice", method, fill(u), fillBody(body))).statusCode
        ).toBe(409)
      }
    )
  })

  describe("logging from a result", () => {
    it("creates a New defect tied to the run, release, case and failed result", async () => {
      const d = await logNew("tom", rcs[0], { environment: "Safari 18" })
      expect(d).toMatchObject({
        key: "PAY-D-1",
        status: "new",
        severity: "critical",
        priority: null,
        source: "result",
        reporter: { id: id.tom },
        foundInRelease: { id: release.id, name: "4.2" },
        foundInRun: { key: "PAY-R-1" },
        case: { key: "PAY-TC-1", title: "Checkout loads" },
        environment: "Safari 18",
        path: ["new"],
        links: [
          {
            kind: "failed",
            runKey: "PAY-R-1",
            caseKey: "PAY-TC-1",
            failedStep: 2,
            note: "Spins",
            recordedBy: { id: id.tom },
          },
        ],
      })
      const feed = await ok("vera", "GET", `${P}/activity`)
      expect(feed.items[0]).toMatchObject({
        entityType: "defect",
        action: "created",
        changes: { key: "PAY-D-1" },
      })
    })

    it("links a blocked result to an existing defect", async () => {
      await logNew("tom")
      const d = await ok(
        "tim",
        "POST",
        `${P}/defects/log`,
        {
          runCaseId: rcs[1]!.id,
          defect: {
            mode: "link",
            defectId: (await ok("vera", "GET", `${P}/defects/PAY-D-1`)).id,
            note: "Blocked by this",
          },
        },
        201
      )
      expect(d.links.map((l: { kind: string }) => l.kind)).toEqual([
        "failed",
        "blocked",
      ])
      // The same result can't be linked twice.
      const again = await call("tim", "POST", `${P}/defects/log`, {
        runCaseId: rcs[1]!.id,
        defect: { mode: "link", defectId: d.id },
      })
      expect(again.statusCode).toBe(409)
    })

    it("only logs from a failed or blocked result of this project", async () => {
      const passed = await call("tom", "POST", `${P}/defects/log`, {
        runCaseId: rcs[2]!.id,
        defect: { mode: "new", ...FIELDS },
      })
      expect(passed.statusCode).toBe(400)
      expect(passed.json().message).toMatch(/failed or blocked/)
      const foreign = await call(
        "nora",
        "POST",
        "/api/projects/MOB/defects/log",
        {
          runCaseId: rcs[0]!.id,
          defect: { mode: "new", ...FIELDS },
        }
      )
      expect(foreign.statusCode).toBe(404)
    })

    it("reopens a fixed defect that fails again, with a note", async () => {
      await logNew("tom")
      await move("lena", "PAY-D-1", { to: "open" })
      await move("tom", "PAY-D-1", { to: "in_progress" })
      await move("tom", "PAY-D-1", { to: "fixed", fixedInBuild: "rc2" })
      const { id: defectId, version } = await ok(
        "vera",
        "GET",
        `${P}/defects/PAY-D-1`
      )
      const noNote = await call("tim", "POST", `${P}/defects/log`, {
        runCaseId: rcs[1]!.id,
        defect: { mode: "link", defectId, reopen: true, version },
      })
      expect(noNote.statusCode).toBe(400)
      const reopened = await ok(
        "tim",
        "POST",
        `${P}/defects/log`,
        {
          runCaseId: rcs[1]!.id,
          defect: {
            mode: "link",
            defectId,
            reopen: true,
            note: "Still fails",
            version,
          },
        },
        201
      )
      expect(reopened).toMatchObject({ status: "reopened", reopenCount: 1 })
    })
  })

  describe("workflow", () => {
    it("runs New → Open → In progress → Fixed → Closed and records the times", async () => {
      await logNew("tom")
      expect(
        (
          await call("tom", "POST", `${P}/defects/PAY-D-1/transition`, {
            to: "open",
            version: 1,
          })
        ).statusCode
      ).toBe(403)
      const open = await move("lena", "PAY-D-1", { to: "open" })
      expect(open.openedAt).not.toBeNull()
      await move("tom", "PAY-D-1", { to: "in_progress" })
      const fixed = await move("tom", "PAY-D-1", {
        to: "fixed",
        fixedInReleaseId: release.id,
        fixedInBuild: "4.2.0-rc2",
      })
      expect(fixed).toMatchObject({
        status: "fixed",
        fixedInRelease: { id: release.id },
        fixedInBuild: "4.2.0-rc2",
      })
      expect(fixed.fixedAt).not.toBeNull()
      const evidence = await resultOf(rcs[2]!.id)
      const closed = await move("tim", "PAY-D-1", {
        to: "closed",
        evidenceResultId: evidence,
      })
      expect(closed.closedAt).not.toBeNull()
      expect(closed.path).toEqual([
        "new",
        "open",
        "in_progress",
        "fixed",
        "closed",
      ])
      expect(closed.links.map((l: { kind: string }) => l.kind)).toEqual([
        "failed",
        "passed",
      ])
      const changes = await app.prisma.defectStatusChange.findMany({
        orderBy: { at: "asc" },
      })
      expect(changes.map((c) => [c.fromStatus, c.toStatus])).toEqual([
        [null, "new"],
        ["new", "open"],
        ["open", "in_progress"],
        ["in_progress", "fixed"],
        ["fixed", "closed"],
      ])
    })

    it("refuses moves the workflow doesn't have, and stale versions", async () => {
      await logNew("tom")
      const skip = await call(
        "lena",
        "POST",
        `${P}/defects/PAY-D-1/transition`,
        {
          to: "closed",
          version: 1,
        }
      )
      expect(skip.statusCode).toBe(400)
      await move("lena", "PAY-D-1", { to: "open" })
      const stale = await call(
        "lena",
        "POST",
        `${P}/defects/PAY-D-1/transition`,
        {
          to: "in_progress",
          version: 1,
        }
      )
      expect(stale.statusCode).toBe(409)
      expect(stale.json().message).toMatch(/lena moved it to Open/)
    })

    it("rejects with a reason, links a duplicate, and clears it on reopen", async () => {
      await logNew("tom")
      await logNew("tom", rcs[1], { title: "Other" })
      const firstId = (await ok("vera", "GET", `${P}/defects/PAY-D-1`)).id
      const rejected = await move("lena", "PAY-D-2", {
        to: "rejected",
        resolution: "duplicate",
        duplicateOfId: firstId,
      })
      expect(rejected).toMatchObject({
        status: "rejected",
        resolution: "duplicate",
        duplicateOf: { key: "PAY-D-1" },
      })
      // A tester can't reopen a rejected defect.
      const d2 = await ok("vera", "GET", `${P}/defects/PAY-D-2`)
      expect(
        (
          await call("tom", "POST", `${P}/defects/PAY-D-2/transition`, {
            to: "reopened",
            note: "Different bug",
            version: d2.version,
          })
        ).statusCode
      ).toBe(403)
      const reopened = await move("lena", "PAY-D-2", {
        to: "reopened",
        note: "Different bug",
      })
      expect(reopened).toMatchObject({
        status: "reopened",
        resolution: null,
        duplicateOf: null,
        reopenCount: 1,
      })
    })

    it("won't mark a defect a duplicate of itself or of another project's", async () => {
      await logNew("tom")
      const self = (await ok("vera", "GET", `${P}/defects/PAY-D-1`)).id
      const res = await call(
        "lena",
        "POST",
        `${P}/defects/PAY-D-1/transition`,
        {
          to: "rejected",
          resolution: "duplicate",
          duplicateOfId: self,
          version: 1,
        }
      )
      expect(res.statusCode).toBe(400)
      const mob = await ok(
        "nora",
        "POST",
        "/api/projects/MOB/defects",
        FIELDS,
        201
      )
      const foreign = await call(
        "lena",
        "POST",
        `${P}/defects/PAY-D-1/transition`,
        {
          to: "rejected",
          resolution: "duplicate",
          duplicateOfId: mob.id,
          version: 1,
        }
      )
      expect(foreign.statusCode).toBe(400)
    })
  })

  describe("duplicates and known defects", () => {
    it("names an original only for duplicates, and never a duplicate as the original", async () => {
      await logNew("tom")
      await logNew("tom", rcs[1], { title: "Second" })
      await ok(
        "tom",
        "POST",
        `${P}/defects`,
        { ...FIELDS, title: "Third" },
        201
      )
      const first = (await ok("vera", "GET", `${P}/defects/PAY-D-1`)).id
      const second = (await ok("vera", "GET", `${P}/defects/PAY-D-2`)).id
      // A non-duplicate reason can't point at another defect (400, not a 500).
      const mixed = await call(
        "lena",
        "POST",
        `${P}/defects/PAY-D-2/transition`,
        {
          to: "rejected",
          resolution: "cannot_reproduce",
          duplicateOfId: first,
          version: 1,
        }
      )
      expect(mixed.statusCode).toBe(400)
      await move("lena", "PAY-D-2", {
        to: "rejected",
        resolution: "duplicate",
        duplicateOfId: first,
      })
      // PAY-D-2 is itself a duplicate, so it can't be anyone's original.
      const chain = await call(
        "lena",
        "POST",
        `${P}/defects/PAY-D-3/transition`,
        {
          to: "rejected",
          resolution: "duplicate",
          duplicateOfId: second,
          version: 1,
        }
      )
      expect(chain.statusCode).toBe(400)
    })

    it("lists a closed defect on the case, so failing again can reopen it", async () => {
      await logNew("tom")
      await move("lena", "PAY-D-1", { to: "open" })
      await move("tom", "PAY-D-1", { to: "in_progress" })
      await move("tom", "PAY-D-1", { to: "fixed" })
      await move("tom", "PAY-D-1", { to: "closed" })
      const known = await ok(
        "tim",
        "GET",
        `${P}/defects/known?runCaseId=${rcs[0]!.id}`
      )
      expect(known.items).toMatchObject([
        { key: "PAY-D-1", status: "closed", onCase: true },
      ])
      expect(known.items[0].version).toBeGreaterThan(1)
    })
  })

  describe("audit follow-ups", () => {
    it("won't reject an original as a duplicate (no chains)", async () => {
      await logNew("tom")
      await logNew("tom", rcs[1], { title: "Second" })
      await ok(
        "tom",
        "POST",
        `${P}/defects`,
        { ...FIELDS, title: "Third" },
        201
      )
      const id2 = (await ok("vera", "GET", `${P}/defects/PAY-D-2`)).id
      const id3 = (await ok("vera", "GET", `${P}/defects/PAY-D-3`)).id
      // PAY-D-1 duplicates PAY-D-2, so PAY-D-2 is an original.
      await move("lena", "PAY-D-1", {
        to: "rejected",
        resolution: "duplicate",
        duplicateOfId: id2,
      })
      const d2 = await ok("vera", "GET", `${P}/defects/PAY-D-2`)
      const chain = await call(
        "lena",
        "POST",
        `${P}/defects/PAY-D-2/transition`,
        {
          to: "rejected",
          resolution: "duplicate",
          duplicateOfId: id3,
          version: d2.version,
        }
      )
      expect(chain.statusCode).toBe(400)
      expect(chain.json().message).toMatch(/PAY-D-1/)
    })

    it("refuses a reopen from a stale view when logging", async () => {
      await logNew("tom")
      await move("lena", "PAY-D-1", { to: "open" })
      await move("tom", "PAY-D-1", { to: "in_progress" })
      const fixed = await move("tom", "PAY-D-1", { to: "fixed" })
      await ok("lena", "PATCH", `${P}/defects/PAY-D-1`, {
        priority: "high",
        version: fixed.version,
      })
      const stale = await call("tim", "POST", `${P}/defects/log`, {
        runCaseId: rcs[1]!.id,
        defect: {
          mode: "link",
          defectId: fixed.id,
          reopen: true,
          note: "Still fails",
          version: fixed.version,
        },
      })
      expect(stale.statusCode).toBe(409)
      expect(stale.json().message).toMatch(/lena changed/)
    })

    it("lets only a lead reopen a closed defect when logging", async () => {
      await logNew("tom")
      await move("lena", "PAY-D-1", { to: "open" })
      await move("tom", "PAY-D-1", { to: "in_progress" })
      await move("tom", "PAY-D-1", { to: "fixed" })
      const closed = await move("tom", "PAY-D-1", { to: "closed" })
      const body = {
        runCaseId: rcs[1]!.id,
        defect: {
          mode: "link",
          defectId: closed.id,
          reopen: true,
          note: "Back again",
          version: closed.version,
        },
      }
      expect(
        (await call("tim", "POST", `${P}/defects/log`, body)).statusCode
      ).toBe(403)
      expect(
        await ok("lena", "POST", `${P}/defects/log`, body, 201)
      ).toMatchObject({
        status: "reopened",
      })
    })

    it("keeps triage with the lead: rejecting open work and clearing priority", async () => {
      await logNew("tom")
      const open = await move("lena", "PAY-D-1", { to: "open" })
      expect(
        (
          await call("tom", "POST", `${P}/defects/PAY-D-1/transition`, {
            to: "rejected",
            resolution: "not_a_defect",
            version: open.version,
          })
        ).statusCode
      ).toBe(403)
      expect(
        (
          await call("tom", "PATCH", `${P}/defects/PAY-D-1`, {
            priority: null,
            version: open.version,
          })
        ).statusCode
      ).toBe(403)
    })

    it("treats other projects' ids as unknown everywhere", async () => {
      await logNew("tom")
      const mobRelease = await ok(
        "nora",
        "POST",
        "/api/projects/MOB/releases",
        { name: "1.0", status: "planned" },
        201
      )
      const mobCase = await ok(
        "nora",
        "POST",
        "/api/projects/MOB/cases",
        {
          title: "M",
          suiteId: null,
          priority: "high",
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
        { name: "R", releaseId: null, selection: { mode: "all" } },
        201
      )
      const mobRc = (
        await ok("nora", "GET", "/api/projects/MOB/runs/MOB-R-1/cases")
      ).items[0]
      await ok(
        "nora",
        "POST",
        `/api/projects/MOB/runs/MOB-R-1/cases/${mobRc.id}/results`,
        {
          status: "failed",
          note: "x",
          expectedVersion: mobRc.version,
        }
      )
      const mobResult = await resultOf(mobRc.id)
      const mobDefect = await ok(
        "nora",
        "POST",
        "/api/projects/MOB/defects/log",
        { runCaseId: mobRc.id, defect: { mode: "new", ...FIELDS } },
        201
      )
      const status = async (
        who: string,
        method: Method,
        url: string,
        body?: object
      ) => (await call(who, method, url, body)).statusCode
      expect(
        await status("alice", "POST", `${P}/defects`, {
          ...FIELDS,
          foundInReleaseId: mobRelease.id,
        })
      ).toBe(400)
      expect(
        await status("alice", "POST", `${P}/defects`, {
          ...FIELDS,
          caseId: mobCase.id,
        })
      ).toBe(400)
      expect(
        await status("alice", "POST", `${P}/defects/log`, {
          runCaseId: rcs[1]!.id,
          defect: { mode: "link", defectId: mobDefect.id },
        })
      ).toBe(404)
      expect(
        await status("alice", "POST", `${P}/defects/PAY-D-1/links`, {
          resultId: mobResult,
        })
      ).toBe(404)
      expect(
        await status(
          "alice",
          "DELETE",
          `${P}/defects/PAY-D-1/links/${mobDefect.links[0].id}`
        )
      ).toBe(404)
      expect(
        await status("alice", "GET", `${P}/defects/known?runCaseId=${mobRc.id}`)
      ).toBe(404)
      expect(await status("alice", "GET", `${P}/defects/MOB-D-1`)).toBe(404)
      // A tester deactivated meanwhile can't be assigned.
      await call("alice", "POST", `/api/users/${id.tim}/deactivate`)
      expect(
        await status("tom", "PATCH", `${P}/defects/PAY-D-1`, {
          assigneeId: id.tim,
          version: 1,
        })
      ).toBe(400)
    })
  })

  describe("editing", () => {
    it("saves fields with a version check; only a lead sets priority", async () => {
      await logNew("tom")
      expect(
        (
          await call("tom", "PATCH", `${P}/defects/PAY-D-1`, {
            priority: "high",
            version: 1,
          })
        ).statusCode
      ).toBe(403)
      const edited = await ok("tom", "PATCH", `${P}/defects/PAY-D-1`, {
        severity: "major",
        assigneeId: id.tim,
        developer: "Marco",
        trackerUrl: "https://jira.example.com/browse/PAY-1",
        version: 1,
      })
      expect(edited).toMatchObject({
        severity: "major",
        assignee: { id: id.tim },
        developer: "Marco",
        version: 2,
      })
      const stale = await call("lena", "PATCH", `${P}/defects/PAY-D-1`, {
        priority: "high",
        version: 1,
      })
      expect(stale.statusCode).toBe(409)
      expect(stale.json().message).toMatch(/tom changed/)
      expect(
        await ok("lena", "PATCH", `${P}/defects/PAY-D-1`, {
          priority: "high",
          version: 2,
        })
      ).toMatchObject({ priority: "high" })
    })

    it("leaves fields it wasn't sent alone", async () => {
      await logNew("tom", rcs[0], {
        expected: "It works",
        environment: "Safari 18",
        description: "Shown on the payment step",
      })
      await ok("tom", "PATCH", `${P}/defects/PAY-D-1`, {
        developer: "Marco",
        trackerUrl: "https://jira.example.com/browse/PAY-9",
        version: 1,
      })
      const after = await ok("tom", "PATCH", `${P}/defects/PAY-D-1`, {
        severity: "minor",
        version: 2,
      })
      expect(after).toMatchObject({
        severity: "minor",
        expected: "It works",
        environment: "Safari 18",
        description: "Shown on the payment step",
        developer: "Marco",
        trackerUrl: "https://jira.example.com/browse/PAY-9",
      })
    })

    it("only assigns active QA Leads and Testers of the project", async () => {
      await logNew("tom")
      for (const who of [id.vera, id.nora]) {
        const res = await call("tom", "PATCH", `${P}/defects/PAY-D-1`, {
          assigneeId: who,
          version: 1,
        })
        expect(res.statusCode).toBe(400)
        expect(res.json().message).toMatch(/Assign defects only/)
      }
    })
  })

  describe("comments, links and activity", () => {
    it("shows comments and changes together, newest first", async () => {
      await logNew("tom")
      await ok(
        "tim",
        "POST",
        `${P}/defects/PAY-D-1/comments`,
        { body: "Same on iOS" },
        201
      )
      await move("lena", "PAY-D-1", { to: "open" })
      const items = (await ok("vera", "GET", `${P}/defects/PAY-D-1/activity`))
        .items
      expect(
        items.map((i: { kind: string; action: string }) => [i.kind, i.action])
      ).toEqual([
        ["change", "status_changed"],
        ["comment", "commented"],
        ["change", "created"],
      ])
      expect(items[1]).toMatchObject({
        body: "Same on iOS",
        actor: { id: id.tim },
      })
    })

    it("links and unlinks results of this project only", async () => {
      await logNew("tom")
      const blocked = await resultOf(rcs[1]!.id)
      const linked = await ok(
        "tim",
        "POST",
        `${P}/defects/PAY-D-1/links`,
        {
          resultId: blocked,
        },
        201
      )
      expect(linked.links).toHaveLength(2)
      expect(
        (
          await call("tim", "POST", `${P}/defects/PAY-D-1/links`, {
            resultId: blocked,
          })
        ).statusCode
      ).toBe(409)
      expect(
        (
          await call("tim", "POST", `${P}/defects/PAY-D-1/links`, {
            resultId: NIL,
          })
        ).statusCode
      ).toBe(404)
      const after = await ok(
        "tim",
        "DELETE",
        `${P}/defects/PAY-D-1/links/${linked.links[1].id}`
      )
      expect(after.links).toHaveLength(1)
    })

    it("lists the known defects on a run case's test case", async () => {
      await logNew("tom")
      const known = await ok(
        "tim",
        "GET",
        `${P}/defects/known?runCaseId=${rcs[0]!.id}`
      )
      expect(known.items).toMatchObject([{ key: "PAY-D-1", onCase: true }])
      // Closed defects aren't "known open".
      await move("lena", "PAY-D-1", {
        to: "rejected",
        resolution: "not_a_defect",
      })
      expect(
        (await ok("tim", "GET", `${P}/defects/known?runCaseId=${rcs[0]!.id}`))
          .items
      ).toEqual([])
    })
  })

  describe("listing", () => {
    it("filters by state, status, severity, priority and search", async () => {
      await logNew("tom")
      await logNew("tim", rcs[1], {
        title: "Refund email missing",
        severity: "minor",
      })
      await ok(
        "tom",
        "POST",
        `${P}/defects`,
        { ...FIELDS, title: "Typo", severity: "trivial" },
        201
      )
      await move("lena", "PAY-D-3", { to: "rejected", resolution: "wont_fix" })
      const keys = async (q: string) =>
        (await ok("vera", "GET", `${P}/defects?${q}`)).items.map(
          (d: { key: string }) => d.key
        )
      expect(await keys("")).toEqual(["PAY-D-2", "PAY-D-1"])
      expect(await keys("state=done")).toEqual(["PAY-D-3"])
      expect(await keys("severity=minor")).toEqual(["PAY-D-2"])
      expect(await keys("priority=none")).toEqual(["PAY-D-2", "PAY-D-1"])
      expect(await keys("q=refund")).toEqual(["PAY-D-2"])
      expect(await keys("q=PAY-D-1")).toEqual(["PAY-D-1"])
      expect(await keys("sort=severity&order=asc")).toEqual([
        "PAY-D-1",
        "PAY-D-2",
      ])
      const list = await ok("vera", "GET", `${P}/defects`)
      expect(list.items[1]).toMatchObject({
        linkCount: 1,
        foundInRun: { key: "PAY-R-1" },
      })
    })
  })
})
