import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { buildTestApp, createUser, nextIp, resetDb, signIn } from "./helpers.ts"

const ORIGIN = "http://localhost:5173"
type Method = "GET" | "POST" | "PATCH"

const STEPS = [{ action: "Pay", expected: "Paid" }]

/**
 * One fixture for the whole file (reports only read); the tests that change
 * data come last and say what they change.
 *
 * Payments (lead lena, testers tom and tim, viewer vera), Mobile (lead nora).
 * Releases 4.1 then 4.2. Ready cases TC-1..3 High, TC-4 Low; TC-5 a draft.
 * PAY-R-1 (4.2, all for tom): TC-1 failed, TC-2 blocked, TC-3 passed, TC-4 untested.
 * PAY-R-2 (4.2): TC-1 passed later, so its latest result is a pass.
 * PAY-R-3 (no release): TC-4 passed.
 * PAY-D-1: Critical, logged on TC-2's blocked result (found in 4.2).
 * PAY-D-2: Major, found in 4.1 in production (carried over into 4.2).
 */
describe("reports API", () => {
  let app: FastifyInstance
  const cookie: Record<string, string> = {}
  const id: Record<string, string> = {}
  const rel: Record<string, string> = {}

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
  const report = (who: string, release: string, extra = "") =>
    ok(who, "GET", `${P}/reports?release=${release}${extra}`)

  const record = async (run: string, index: number, body: object) => {
    const rc = (await ok("tom", "GET", `${P}/runs/${run}/cases`)).items[index]
    return ok("tom", "POST", `${P}/runs/${run}/cases/${rc.id}/results`, {
      expectedVersion: rc.version,
      ...body,
    })
  }

  beforeAll(async () => {
    app = await buildTestApp()
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
    // 4.1 shipped; 4.2 is the one being tested.
    for (const [name, status] of [
      ["4.1", "released"],
      ["4.2", "in_progress"],
    ]) {
      rel[name!] = (
        await ok("lena", "POST", `${P}/releases`, { name, status }, 201)
      ).id
    }
    rel.mob = (
      await ok(
        "nora",
        "POST",
        "/api/projects/MOB/releases",
        { name: "3.0", status: "planned" },
        201
      )
    ).id
    for (const [title, priority, status] of [
      ["Checkout loads", "high", "ready"],
      ["Pay by card", "high", "ready"],
      ["Refund", "high", "ready"],
      ["Receipt email", "low", "ready"],
      ["Gift cards", "high", "draft"],
    ]) {
      await ok(
        "lena",
        "POST",
        `${P}/cases`,
        {
          title,
          suiteId: null,
          priority,
          type: "functional",
          status,
          steps: STEPS,
        },
        201
      )
    }
    const run = (name: string, releaseId: string | null) =>
      ok(
        "tom",
        "POST",
        `${P}/runs`,
        { name, releaseId, assigneeIds: [id.tom], selection: { mode: "all" } },
        201
      )
    await run("Regression", rel["4.2"]!)
    await record("PAY-R-1", 0, {
      status: "failed",
      note: "Card refused",
      failedStep: 1,
    })
    await record("PAY-R-1", 1, { status: "blocked", note: "Sandbox down" })
    await record("PAY-R-1", 2, { status: "passed" })
    await run("Retest", rel["4.2"]!)
    await record("PAY-R-2", 0, { status: "passed" })
    await run("No-release smoke", null)
    await record("PAY-R-3", 3, { status: "passed" })

    const blocked = (await ok("tom", "GET", `${P}/runs/PAY-R-1/cases`)).items[1]
    await ok(
      "tom",
      "POST",
      `${P}/defects/log`,
      {
        runCaseId: blocked.id,
        defect: {
          mode: "new",
          title: "Sandbox 500",
          severity: "critical",
          steps: "1",
          actual: "500",
        },
      },
      201
    )
    await ok(
      "tom",
      "POST",
      `${P}/defects`,
      {
        title: "Refund rounding",
        severity: "major",
        steps: "1",
        actual: "Off by a cent",
        detectedIn: "production",
        foundInReleaseId: rel["4.1"],
      },
      201
    )
  })
  afterAll(async () => {
    await app.close()
  })

  describe("authorization", () => {
    const urls = () => [
      `${P}/reports?release=${rel["4.2"]}`,
      `${P}/reports?release=none`,
      `${P}/reports/export?release=${rel["4.2"]}&kind=cases`,
      `${P}/reports/export?release=${rel["4.2"]}&kind=defects`,
      `${P}/reports/export?release=none&kind=runs`,
    ]
    it.each(["alice", "lena", "tom", "vera"])(
      "%s, who can see Payments, gets its reports",
      async (who) => {
        for (const url of urls()) await ok(who, "GET", url)
      }
    )
    it("hides another team's project (404)", async () => {
      for (const url of urls())
        expect((await call("nora", "GET", url)).statusCode).toBe(404)
    })
    it("needs a session (401)", async () => {
      for (const url of [...urls(), "/api/home", "/api/releases/overview"])
        expect((await call(undefined, "GET", url)).statusCode).toBe(401)
    })
    it("treats another project's release as not found", async () => {
      const res = await call("alice", "GET", `${P}/reports?release=${rel.mob}`)
      expect(res.statusCode).toBe(404)
      const exp = await call(
        "alice",
        "GET",
        `${P}/reports/export?release=${rel.mob}&kind=runs`
      )
      expect(exp.statusCode).toBe(404)
    })
    it("rejects a malformed release or kind (400)", async () => {
      expect(
        (await call("lena", "GET", `${P}/reports?release=4.2`)).statusCode
      ).toBe(400)
      expect(
        (
          await call(
            "lena",
            "GET",
            `${P}/reports/export?release=none&kind=everything`
          )
        ).statusCode
      ).toBe(400)
    })
    it("shows the per-person workload to QA Leads and admins only", async () => {
      expect((await report("lena", rel["4.2"]!)).workload).toEqual([
        // R-1 has 1 untested, R-2 has 3.
        { person: { id: id.tom, name: expect.any(String) }, untested: 4 },
      ])
      expect((await report("alice", rel["4.2"]!)).workload).not.toBeNull()
      expect((await report("tom", rel["4.2"]!)).workload).toBeNull()
      expect((await report("vera", rel["4.2"]!)).workload).toBeNull()
    })
  })

  describe("release report", () => {
    it("counts each Ready case's latest result once", async () => {
      const r = await report("vera", rel["4.2"]!)
      expect(r.release).toMatchObject({ name: "4.2", status: "in_progress" })
      expect(r.snapshot).toBe(false)
      expect(r.hasRuns).toBe(true)
      expect(r.previousRelease).toBe("4.1")
      // TC-1 latest passed (R-2), TC-2 blocked, TC-3 passed; TC-4 untested.
      expect(r.kpis).toMatchObject({
        readyCases: 4,
        testedReady: 3,
        openDefects: 1,
        openCritical: 1,
        openMajor: 0,
        productionEscapes: 0,
        productionEscapesPrevious: 1,
        foundThisWeek: 1,
      })
      expect(r.kpis.passRate).toBeCloseTo(2 / 3)
      expect(r.untestedByPriority).toEqual([
        { priority: "critical", count: 0 },
        { priority: "high", count: 0 },
        { priority: "medium", count: 0 },
        { priority: "low", count: 1 },
      ])
    })

    it("judges the exit checks", async () => {
      const r = await report("vera", rel["4.2"]!)
      const byId = Object.fromEntries(
        r.checks.map((c: { id: string }) => [c.id, c])
      )
      expect(byId.critical).toMatchObject({ ok: false, detail: "1 open" })
      expect(byId.major).toMatchObject({ ok: true })
      expect(byId.coverage).toMatchObject({
        ok: false,
        detail: "3 of 4 tested; 1 untested",
      })
      expect(byId.passRate).toMatchObject({ ok: false, detail: "67%" })
      expect(byId.blocked).toMatchObject({ ok: false, detail: "1 blocked" })
      expect(byId.retest).toMatchObject({ ok: true })
    })

    it("lists blocking defects, failing cases with their defect, and carry-over", async () => {
      const r = await report("vera", rel["4.2"]!)
      expect(r.blocking.map((d: { key: string }) => d.key)).toEqual(["PAY-D-1"])
      expect(r.failing).toEqual([
        expect.objectContaining({
          caseKey: "PAY-TC-2",
          status: "blocked",
          runKey: "PAY-R-1",
          defect: { key: "PAY-D-1", status: "new" },
        }),
      ])
      expect(r.carriedOver).toEqual([
        expect.objectContaining({
          key: "PAY-D-2",
          severity: "major",
          foundIn: "4.1",
        }),
      ])
      expect(r.runs.map((x: { key: string }) => x.key)).toEqual([
        "PAY-R-1",
        "PAY-R-2",
      ])
      expect(r.runs[0].counts).toMatchObject({
        passed: 1,
        failed: 1,
        blocked: 1,
        untested: 1,
      })
      expect(r.coverage).toEqual([
        expect.objectContaining({
          suite: "No suite",
          ready: 4,
          tested: 3,
          openDefects: 1,
        }),
      ])
      expect(r.aging.map((a: { count: number }) => a.count)).toEqual([
        1, 0, 0, 0, 0,
      ])
      expect(r.weekly).toHaveLength(6)
    })

    it("reports runs with no release separately", async () => {
      const r = await report("lena", "none")
      expect(r.release).toBeNull()
      expect(r.kpis).toMatchObject({
        readyCases: 4,
        testedReady: 1,
        passRate: 1,
      })
      expect(r.runs.map((x: { key: string }) => x.key)).toEqual(["PAY-R-3"])
      expect(r.carriedOver).toEqual([])
    })
  })

  describe("CSV export", () => {
    it("exports each case's latest result, Ready cases and any other with a result", async () => {
      const e = await ok(
        "vera",
        "GET",
        `${P}/reports/export?release=${rel["4.2"]}&kind=cases`
      )
      expect(e.scope).toBe("Payments · Release 4.2")
      expect(e.columns[0]).toBe("Case")
      expect(e.rows.map((r: unknown[]) => [r[0], r[5], r[6]])).toEqual([
        ["PAY-TC-1", "passed", "PAY-R-2"],
        ["PAY-TC-2", "blocked", "PAY-R-1"],
        ["PAY-TC-3", "passed", "PAY-R-1"],
        ["PAY-TC-4", "untested", null],
      ])
    })
    it("exports the release's defects and runs", async () => {
      const d = await ok(
        "vera",
        "GET",
        `${P}/reports/export?release=${rel["4.1"]}&kind=defects`
      )
      expect(d.rows.map((r: unknown[]) => r[0])).toEqual(["PAY-D-2"])
      const r = await ok(
        "vera",
        "GET",
        `${P}/reports/export?release=none&kind=runs`
      )
      expect(r.scope).toBe("Payments · No release")
      expect(r.rows).toHaveLength(1)
      expect(r.rows[0][0]).toBe("PAY-R-3")
    })
  })

  describe("home", () => {
    it("shows a tester their runs, defects to retest, and no triage", async () => {
      const h = await ok("tom", "GET", "/api/home")
      expect(h.hasProjects).toBe(true)
      // Most of mine left first.
      expect(
        h.runs.map((r: { key: string; mineLeft: number }) => [
          r.key,
          r.mineLeft,
        ])
      ).toEqual([
        ["PAY-R-2", 3],
        ["PAY-R-3", 3],
        ["PAY-R-1", 1],
      ])
      expect(h.toTriage).toBeNull()
      expect(h.triageProjects).toEqual([])
      expect(h.readyToRetest).toEqual([])
      expect(
        h.releases.map((r: { release: { name: string } }) => r.release.name)
      ).toEqual(["4.2"])
      expect(h.activity.length).toBeGreaterThan(0)
      expect(
        h.activity.every((a: { projectKey: string }) => a.projectKey === "PAY")
      ).toBe(true)
    })
    it("shows a lead what to triage in the projects they lead", async () => {
      const h = await ok("lena", "GET", "/api/home")
      expect(h.toTriage.map((d: { key: string }) => d.key)).toEqual([
        "PAY-D-1",
        "PAY-D-2",
      ])
      expect(h.triageProjects).toEqual(["Payments"])
    })
    it("shows an admin every project's releases and activity", async () => {
      const h = await ok("alice", "GET", "/api/home")
      expect(
        h.releases
          .map((r: { project: { key: string } }) => r.project.key)
          .sort()
      ).toEqual(["MOB", "PAY"])
      expect(h.toTriage).toBeNull()
    })
    it("keeps other teams' work out", async () => {
      const h = await ok("nora", "GET", "/api/home")
      expect(h.runs).toEqual([])
      expect(h.toTriage).toEqual([])
      expect(
        h.releases.map((r: { project: { key: string } }) => r.project.key)
      ).toEqual(["MOB"])
      expect(
        h.activity.every((a: { projectKey: string }) => a.projectKey === "MOB")
      ).toBe(true)
    })
    it("tells someone in no project so", async () => {
      await createUser(app, { username: "newbie", role: "user" })
      cookie.newbie = await signIn(app, "newbie")
      const h = await ok("newbie", "GET", "/api/home")
      expect(h).toMatchObject({
        hasProjects: false,
        runs: [],
        releases: [],
        activity: [],
        toTriage: null,
      })
    })
  })

  describe("all releases", () => {
    it("shows admins every active release, leads their projects', others none", async () => {
      const keys = async (who: string) =>
        (await ok(who, "GET", "/api/releases/overview")).items.map(
          (r: { project: { key: string }; release: { name: string } }) =>
            `${r.project.key} ${r.release.name}`
        )
      expect((await keys("alice")).sort()).toEqual(["MOB 3.0", "PAY 4.2"])
      expect((await keys("lena")).sort()).toEqual(["PAY 4.2"])
      expect(await keys("tom")).toEqual([])
      expect(await keys("vera")).toEqual([])
      expect(await keys("nora")).toEqual(["MOB 3.0"])
      const pay42 = (
        await ok("lena", "GET", "/api/releases/overview")
      ).items.find(
        (r: { release: { name: string } }) => r.release.name === "4.2"
      )
      expect(pay42).toMatchObject({
        hasRuns: true,
        failingChecks: 4,
        totalChecks: 6,
        openCritical: 1,
      })
    })
  })

  // --- From here on, tests change the fixture -------------------------------

  describe("a defect fixed and retested", () => {
    it("shows on its reporter's home as ready to retest, then counts time to fix", async () => {
      const d = await ok("lena", "GET", `${P}/defects/PAY-D-1`)
      const opened = await ok(
        "lena",
        "POST",
        `${P}/defects/PAY-D-1/transition`,
        { to: "open", version: d.version }
      )
      const started = await ok(
        "lena",
        "POST",
        `${P}/defects/PAY-D-1/transition`,
        {
          to: "in_progress",
          version: opened.version,
        }
      )
      await ok("lena", "POST", `${P}/defects/PAY-D-1/transition`, {
        to: "fixed",
        version: started.version,
        fixedInBuild: "812",
      })
      const h = await ok("tom", "GET", "/api/home")
      expect(h.readyToRetest.map((x: { key: string }) => x.key)).toEqual([
        "PAY-D-1",
      ])
      const r = await report("vera", rel["4.2"]!)
      expect(r.kpis.timeToFix.count).toBe(1)
      expect(
        r.checks.find((c: { id: string }) => c.id === "retest")
      ).toMatchObject({
        ok: false,
        detail: "1 waiting for a retest",
      })
    })
  })

  describe("released snapshot", () => {
    it("freezes the report when the release is marked Released; live numbers stay available", async () => {
      const r42 = (await ok("lena", "GET", `${P}/releases`)).items.find(
        (r: { name: string }) => r.name === "4.2"
      )
      await ok("lena", "PATCH", `${P}/releases/${r42.id}`, {
        name: "4.2",
        description: "",
        status: "released",
        startDate: null,
        targetDate: null,
        version: r42.version,
      })
      const snap = await report("vera", rel["4.2"]!)
      expect(snap.snapshot).toBe(true)
      expect(snap.release.status).toBe("released")
      expect(snap.workload).toBeNull()
      expect((await report("lena", rel["4.2"]!)).workload).not.toBeNull()

      // A result recorded afterwards doesn't touch the snapshot.
      await record("PAY-R-1", 3, { status: "passed" })
      expect((await report("vera", rel["4.2"]!)).kpis.testedReady).toBe(3)
      const live = await report("vera", rel["4.2"]!, "&live=true")
      expect(live.snapshot).toBe(false)
      expect(live.kpis.testedReady).toBe(4)

      // Moved back from Released, it's live again.
      const again = (await ok("lena", "GET", `${P}/releases`)).items.find(
        (r: { name: string }) => r.name === "4.2"
      )
      await ok("lena", "PATCH", `${P}/releases/${again.id}`, {
        name: "4.2",
        description: "",
        status: "in_progress",
        startDate: null,
        targetDate: null,
        version: again.version,
      })
      expect((await report("vera", rel["4.2"]!)).snapshot).toBe(false)
    })
  })

  describe("changes found by the code review", () => {
    it("compares with the last release that shipped, not just the one created before", async () => {
      // Created after 4.2 but never shipped: 4.2 still compares with 4.1.
      await ok(
        "lena",
        "POST",
        `${P}/releases`,
        { name: "5.0", status: "planned" },
        201
      )
      const hotfix = await ok(
        "lena",
        "POST",
        `${P}/releases`,
        { name: "4.2.1", status: "in_progress" },
        201
      )
      expect((await report("vera", hotfix.id)).previousRelease).toBe("4.1")
    })

    it("shows a released release's current name on its snapshot", async () => {
      const r = (await ok("lena", "GET", `${P}/releases`)).items.find(
        (x: { name: string }) => x.name === "4.1"
      )
      await ok("lena", "PATCH", `${P}/releases/${r.id}`, {
        name: "4.1.0",
        description: "",
        status: "released",
        startDate: null,
        targetDate: "2026-10-01",
        version: r.version,
      })
      const snap = await report("vera", rel["4.1"]!)
      expect(snap.snapshot).toBe(true)
      expect(snap.release).toMatchObject({
        name: "4.1.0",
        targetDate: "2026-10-01",
      })
    })

    it("falls back to live numbers when a stored snapshot no longer fits the report", async () => {
      await app.prisma.releaseReportSnapshot.update({
        where: { releaseId: rel["4.1"]! },
        data: { report: { kpis: "an older shape" } },
      })
      const r = await report("vera", rel["4.1"]!)
      expect(r.snapshot).toBe(false)
      expect(r.release.name).toBe("4.1.0")
    })
  })

  describe("changes found by the authz audit", () => {
    it("counts runs ready to close only where the person may close them", async () => {
      // PAY-R-1 has every result by now (the snapshot test recorded the last).
      expect((await ok("tom", "GET", "/api/home")).runsReadyToClose).toBe(1)
      await ok("lena", "PATCH", `${P}/members/${id.tom}`, { role: "viewer" })
      expect((await ok("tom", "GET", "/api/home")).runsReadyToClose).toBe(0)
      await ok("lena", "PATCH", `${P}/members/${id.tom}`, { role: "tester" })
    })

    it("snapshots a release created as Released", async () => {
      const r = await ok(
        "lena",
        "POST",
        `${P}/releases`,
        { name: "4.0", status: "released" },
        201
      )
      expect((await report("vera", r.id)).snapshot).toBe(true)
    })

    it("hides another project's released snapshot (404)", async () => {
      const mob = (await ok("nora", "GET", "/api/projects/MOB/releases"))
        .items[0]
      await ok("nora", "PATCH", `/api/projects/MOB/releases/${mob.id}`, {
        name: mob.name,
        description: "",
        status: "released",
        startDate: null,
        targetDate: null,
        version: mob.version,
      })
      expect(
        (await ok("nora", "GET", `/api/projects/MOB/reports?release=${mob.id}`))
          .snapshot
      ).toBe(true)
      for (const who of ["alice", "lena"])
        expect(
          (await call(who, "GET", `${P}/reports?release=${mob.id}`)).statusCode
        ).toBe(404)
    })

    it("drops an archived project from home and the release overview", async () => {
      await ok("alice", "POST", "/api/projects/PAY/archive")
      const h = await ok("lena", "GET", "/api/home")
      expect(h).toMatchObject({ hasProjects: false, runs: [], releases: [] })
      expect((await ok("lena", "GET", "/api/releases/overview")).items).toEqual(
        []
      )
      // Its reports stay readable (archived is read-only, not hidden).
      await ok("vera", "GET", `${P}/reports?release=none`)
      await ok("alice", "POST", "/api/projects/PAY/unarchive")
    })
  })

  describe("rate limits on expensive routes", () => {
    it("holds one person to 30 home loads and 20 exports a minute", async () => {
      await createUser(app, { username: "rita", role: "user" })
      cookie.rita = await signIn(app, "rita")
      const statuses = async (url: string, n: number) => {
        const out: number[] = []
        for (let i = 0; i < n; i++)
          out.push((await call("rita", "GET", url)).statusCode)
        return out
      }
      const home = await statuses("/api/home", 31)
      expect(new Set(home.slice(0, 30))).toEqual(new Set([200]))
      expect(home[30]).toBe(429)
      // Counted before the project check, so probing costs the same.
      const exp = await statuses(
        `${P}/reports/export?release=none&kind=runs`,
        21
      )
      expect(new Set(exp.slice(0, 20))).toEqual(new Set([404]))
      expect(exp[20]).toBe(429)
      // Someone else isn't held back.
      expect((await call("vera", "GET", "/api/home")).statusCode).toBe(200)
      // Imports count before their (large) body is even read, valid or not.
      const imports: number[] = []
      for (let i = 0; i < 11; i++)
        imports.push(
          (await call("rita", "POST", `${P}/imports/check`, { junk: true }))
            .statusCode
        )
      expect(new Set(imports.slice(0, 10))).toEqual(new Set([404]))
      expect(imports[10]).toBe(429)
    })
  })

  describe("deactivated member", () => {
    it("is refused (401)", async () => {
      await ok("alice", "POST", `/api/users/${id.tim}/deactivate`)
      for (const url of [
        `${P}/reports?release=none`,
        "/api/home",
        "/api/releases/overview",
      ])
        expect((await call("tim", "GET", url)).statusCode).toBe(401)
    })
  })
})
