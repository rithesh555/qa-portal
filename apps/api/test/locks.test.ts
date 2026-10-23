import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
  loadProjectAccess,
  lockForWrite,
  type WriteScope,
} from "../src/modules/projects/access.ts"
import { buildTestApp, createUser, nextIp, resetDb, signIn } from "./helpers.ts"

const ORIGIN = "http://localhost:5173"
const STEPS = [{ action: "Pay", expected: "Paid" }]

/**
 * Which writes wait for which. Project-level changes (members, releases,
 * archiving) exclude everything in the project; content writes only wait
 * for others in the same area (one run, the cases, the defects).
 */
describe("write locks", () => {
  let app: FastifyInstance
  const cookie: Record<string, string> = {}

  const call = (
    who: string,
    method: "GET" | "POST",
    url: string,
    payload?: object
  ) =>
    app.inject({
      method,
      url,
      remoteAddress: nextIp(),
      headers: { origin: ORIGIN, cookie: cookie[who]! },
      ...(payload ? { payload } : {}),
    })

  /** Holds a lock in its own transaction until release() is called. */
  async function hold(
    scope: WriteScope,
    action: Parameters<typeof lockForWrite>[2]
  ) {
    const lena = await app.prisma.user.findUniqueOrThrow({
      where: { username: "lena" },
    })
    const access = await loadProjectAccess(
      app.prisma,
      {
        id: lena.id,
        username: "lena",
        name: "lena",
        email: lena.email,
        role: "user",
        mustChangePassword: false,
      },
      "PAY"
    )
    let release!: () => void
    const released = new Promise<void>((r) => (release = r))
    let locked!: () => void
    const isLocked = new Promise<void>((r) => (locked = r))
    const done = app.prisma.$transaction(
      async (tx) => {
        await lockForWrite(tx, access, action, { scope })
        locked()
        await released
      },
      { timeout: 20_000 }
    )
    await isLocked
    return async () => {
      release()
      await done
    }
  }

  /** Records a pass on a run's first untested case; resolves to the status code. */
  async function record(run: string) {
    const rc = (await call("tom", "GET", `/api/projects/PAY/runs/${run}/cases`))
      .json()
      .items.find((c: { status: string }) => c.status === "untested")
    const res = await call(
      "tom",
      "POST",
      `/api/projects/PAY/runs/${run}/cases/${rc.id}/results`,
      {
        expectedVersion: rc.version,
        status: "passed",
      }
    )
    return res.statusCode
  }

  /** Whether the promise settles within ms. */
  const within = (p: Promise<unknown>, ms: number) =>
    Promise.race([
      p.then(() => true),
      new Promise<boolean>((r) => setTimeout(() => r(false), ms)),
    ])

  beforeAll(async () => {
    app = await buildTestApp()
    await resetDb(app.prisma)
    for (const [username, role] of [
      ["alice", "admin"],
      ["lena", "user"],
      ["tom", "user"],
    ] as const) {
      await createUser(app, { username, role })
      cookie[username] = await signIn(app, username)
    }
    const lena = await app.prisma.user.findUniqueOrThrow({
      where: { username: "lena" },
    })
    const tom = await app.prisma.user.findUniqueOrThrow({
      where: { username: "tom" },
    })
    await call("alice", "POST", "/api/projects", {
      name: "Payments",
      key: "PAY",
      leadUserId: lena.id,
    })
    await call("alice", "POST", "/api/projects/PAY/members", {
      userIds: [tom.id],
      role: "tester",
    })
    for (let i = 0; i < 6; i++)
      await call("lena", "POST", "/api/projects/PAY/cases", {
        title: `Case ${i}`,
        suiteId: null,
        priority: "high",
        type: "functional",
        status: "ready",
        steps: STEPS,
      })
    for (const name of ["One", "Two"])
      expect(
        (
          await call("tom", "POST", "/api/projects/PAY/runs", {
            name,
            releaseId: null,
            selection: { mode: "all" },
          })
        ).statusCode
      ).toBe(201)
  })
  afterAll(async () => {
    await app.close()
  })

  it("records results while someone else's case or defect change holds its lock", async () => {
    for (const area of ["cases", "defects"] as const) {
      const release = await hold(
        { [area]: "write" },
        area === "cases" ? "cases:edit" : "defects:edit"
      )
      try {
        expect(await within(record("PAY-R-1"), 5000), area).toBe(true)
      } finally {
        await release()
      }
    }
  })

  it("records on one run while another run's change holds its lock", async () => {
    const release = await hold(
      { run: { number: 2, mode: "write" } },
      "runs:execute"
    )
    try {
      expect(await within(record("PAY-R-1"), 5000)).toBe(true)
      // The same run waits.
      const same = record("PAY-R-2")
      expect(await within(same, 700)).toBe(false)
      await release()
      expect(await same).toBe(200)
    } finally {
      await release()
    }
  })

  it("makes adding cases to a run wait for a change to the cases (say, archiving a suite)", async () => {
    const release = await hold({ cases: "write" }, "cases:archive")
    const pending = call(
      "tom",
      "POST",
      "/api/projects/PAY/runs/PAY-R-1/cases",
      {
        selection: { mode: "all" },
      }
    )
    try {
      // Otherwise it could snapshot cases that are being archived.
      expect(await within(pending, 700)).toBe(false)
    } finally {
      await release()
    }
    expect((await pending).statusCode).toBe(200)
  })

  it("makes logging a defect wait for a result being recorded on that run", async () => {
    const rc = (
      await call("tom", "GET", "/api/projects/PAY/runs/PAY-R-1/cases")
    )
      .json()
      .items.find((c: { status: string }) => c.status === "untested")
    await call(
      "tom",
      "POST",
      `/api/projects/PAY/runs/PAY-R-1/cases/${rc.id}/results`,
      {
        expectedVersion: rc.version,
        status: "failed",
        note: "Card refused",
      }
    )
    const release = await hold(
      { run: { number: 1, mode: "write" } },
      "runs:execute"
    )
    const pending = call("tom", "POST", "/api/projects/PAY/defects/log", {
      runCaseId: rc.id,
      defect: {
        mode: "new",
        title: "Refused",
        severity: "major",
        steps: "1",
        actual: "No",
      },
    })
    try {
      // Otherwise it could link a result that's being replaced right now.
      expect(await within(pending, 700)).toBe(false)
    } finally {
      await release()
    }
    expect((await pending).statusCode).toBe(201)
  })

  it("makes every write wait for a project-level change (members, releases, archiving)", async () => {
    const release = await hold("project", "members:manage")
    const pending = record("PAY-R-1")
    try {
      expect(await within(pending, 700)).toBe(false)
    } finally {
      await release()
    }
    expect(await pending).toBe(200)
  })
})
