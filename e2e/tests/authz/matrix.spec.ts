import { request, type APIRequestContext } from "@playwright/test"
import {
  apiContext,
  expect,
  test,
  type TestProject,
} from "../../fixtures/index.ts"
import { e2eEnv } from "../../fixtures/env.ts"
import { clientIp, statePath, type Role } from "../../fixtures/roles.ts"
import { freshUser } from "../../fixtures/users.ts"

type Who = Role | "anonymous"
/** "ok" = any 2xx. */
type Expect = Partial<Record<Who, "ok" | 401 | 403 | 404>>

interface Call {
  method: "get" | "post" | "patch"
  path: string
  data?: unknown
}

/** Members without the right get 403; people outside the project get 404. */
const members = (allowed: Role[]): Expect => {
  const out: Expect = { outsider: 404 }
  for (const r of ["admin", "lead", "tester", "viewer"] as const)
    out[r] = allowed.includes(r) ? "ok" : 403
  return out
}
const adminOnly: Expect = {
  admin: "ok",
  lead: 403,
  tester: 403,
  viewer: 403,
  outsider: 403,
}

async function check(
  slot: number,
  expected: Expect,
  /** Fresh request per role: state-changing calls get their own target. */
  call: (who: Who) => Promise<Call>
) {
  for (const [who, want] of Object.entries(expected) as [Who, Expect[Who]][]) {
    const api: APIRequestContext = await apiContext(slot, who)
    const c = await call(who)
    const res = await api[c.method](
      `/api${c.path}`,
      c.data === undefined ? {} : { data: c.data }
    )
    const got = res.status()
    if (want === "ok")
      expect(
        got,
        `${who} ${c.method.toUpperCase()} ${c.path}: ${await res.text()}`
      ).toBeLessThan(300)
    else expect(got, `${who} ${c.method.toUpperCase()} ${c.path}`).toBe(want)
    await api.dispose()
  }
}

const caseIn = (p: TestProject) =>
  p.lead.createCase(p.key, {
    title: `Authz case ${Math.random().toString(36).slice(2, 7)}`,
  })

test("E2E-AUTHZ-001 view a project", async ({ slot, project }) => {
  await check(
    slot,
    { ...members(["admin", "lead", "tester", "viewer"]), anonymous: 401 },
    async () => ({
      method: "get",
      path: `/projects/${project.key}`,
    })
  )
})

test("E2E-AUTHZ-002 create a project", async ({ slot, project }) => {
  await check(slot, adminOnly, async () => ({
    method: "post",
    path: "/projects",
    data: {
      key: `Y${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      name: `Authz ${Math.random().toString(36).slice(2, 7)}`,
      description: "",
      leadUserId: project.ids.lead,
    },
  }))
})

test("E2E-AUTHZ-003 rename a project", async ({ slot, project }) => {
  await check(slot, members(["admin"]), async () => {
    const current = await project.admin.get<{ version: number }>(
      `/projects/${project.key}`
    )
    return {
      method: "patch",
      path: `/projects/${project.key}`,
      data: {
        name: `${project.name} renamed`,
        description: "",
        version: current.version,
      },
    }
  })
})

test("E2E-AUTHZ-004 add members", async ({ slot, project }) => {
  await check(slot, members(["admin", "lead"]), async () => ({
    method: "post",
    path: `/projects/${project.key}/members`,
    data: { userIds: [(await freshUser(project.admin)).id], role: "viewer" },
  }))
})

test("E2E-AUTHZ-005 create a release", async ({ slot, project }) => {
  let n = 0
  await check(slot, members(["admin", "lead"]), async () => ({
    method: "post",
    path: `/projects/${project.key}/releases`,
    data: { name: `R${++n}`, status: "planned" },
  }))
})

test("E2E-AUTHZ-006 create a test case", async ({ slot, project }) => {
  await check(slot, members(["admin", "lead", "tester"]), async () => ({
    method: "post",
    path: `/projects/${project.key}/cases`,
    data: {
      title: "Authz case",
      suiteId: null,
      priority: "low",
      type: "functional",
      status: "ready",
      steps: [{ action: "Do", expected: "Done" }],
    },
  }))
})

test("E2E-AUTHZ-007 archive a test case", async ({ slot, project }) => {
  await check(slot, members(["admin", "lead"]), async () => ({
    method: "post",
    path: `/projects/${project.key}/cases/${(await caseIn(project)).key}/archive`,
    data: { reason: "" },
  }))
})

test("E2E-AUTHZ-008 create a test run", async ({ slot, project }) => {
  await caseIn(project)
  await check(slot, members(["admin", "lead", "tester"]), async () => ({
    method: "post",
    path: `/projects/${project.key}/runs`,
    data: { name: "Authz run", releaseId: null, selection: { mode: "all" } },
  }))
})

test("E2E-AUTHZ-009 record a result", async ({ slot, project }) => {
  for (let i = 0; i < 6; i++) await caseIn(project)
  const run = await project.lead.createRun(project.key, {
    name: "Authz results",
  })
  const untested = await project.lead.runCases(project.key, run.key)
  let next = 0
  await check(slot, members(["admin", "lead", "tester"]), async () => {
    const rc = untested[next++]!
    return {
      method: "post",
      path: `/projects/${project.key}/runs/${run.key}/cases/${rc.id}/results`,
      data: {
        status: "passed",
        note: "",
        failedStep: null,
        expectedVersion: rc.version,
      },
    }
  })
})

test("E2E-AUTHZ-010 reopen a closed run", async ({ slot, project }) => {
  await caseIn(project)
  await check(slot, members(["admin", "lead"]), async () => {
    const run = await project.lead.createRun(project.key, {
      name: "Authz reopen",
    })
    await project.lead.post(`/projects/${project.key}/runs/${run.key}/close`)
    return {
      method: "post",
      path: `/projects/${project.key}/runs/${run.key}/reopen`,
    }
  })
})

test("E2E-AUTHZ-011 create a defect", async ({ slot, project }) => {
  await check(slot, members(["admin", "lead", "tester"]), async () => ({
    method: "post",
    path: `/projects/${project.key}/defects`,
    data: {
      title: "Authz defect",
      steps: "1. Do",
      actual: "Breaks",
      severity: "minor",
    },
  }))
})

test("E2E-AUTHZ-012 triage a new defect (New → Open)", async ({
  slot,
  project,
}) => {
  await check(slot, members(["admin", "lead"]), async () => {
    const d = await project.tester.createDefect(project.key, {
      title: "Authz triage",
    })
    return {
      method: "post",
      path: `/projects/${project.key}/defects/${d.key}/transition`,
      data: { to: "open", note: "", version: d.version },
    }
  })
})

test("E2E-AUTHZ-013 comment on a defect", async ({ slot, project }) => {
  const d = await project.tester.createDefect(project.key, {
    title: "Authz comments",
  })
  await check(slot, members(["admin", "lead", "tester"]), async () => ({
    method: "post",
    path: `/projects/${project.key}/defects/${d.key}/comments`,
    data: { body: "Seen it too" },
  }))
})

test("E2E-AUTHZ-014 view project reports", async ({ slot, project }) => {
  await check(
    slot,
    members(["admin", "lead", "tester", "viewer"]),
    async () => ({
      method: "get",
      path: `/projects/${project.key}/reports?release=none`,
    })
  )
})

test("E2E-AUTHZ-015 export test cases", async ({ slot, project }) => {
  await check(
    slot,
    members(["admin", "lead", "tester", "viewer"]),
    async () => ({
      method: "get",
      path: `/projects/${project.key}/cases/export`,
    })
  )
})

test("E2E-AUTHZ-016 list users", async ({ slot }) => {
  await check(slot, adminOnly, async () => ({ method: "get", path: "/users" }))
})

test("E2E-AUTHZ-017 create a user", async ({ slot }) => {
  await check(slot, adminOnly, async () => {
    const tag = Math.random().toString(36).slice(2, 9)
    return {
      method: "post",
      path: "/users",
      data: {
        name: `Authz ${tag}`,
        username: `e2e.authz.${tag}`,
        email: `e2e.authz.${tag}@e2e.qa-portal.local`,
        password: `pw-${tag}-long-enough`,
        role: "user",
      },
    }
  })
})

test("E2E-AUTHZ-018 deactivate a user", async ({ slot, project }) => {
  await check(slot, adminOnly, async () => ({
    method: "post",
    path: `/users/${(await freshUser(project.admin)).id}/deactivate`,
  }))
})

test("E2E-AUTHZ-019 nobody signed in gets 401 everywhere", async ({ slot }) => {
  const api = await apiContext(slot, "anonymous")
  for (const path of ["/me", "/projects", "/home", "/users"])
    expect((await api.get(`/api${path}`)).status(), path).toBe(401)
  await api.dispose()
})

test("E2E-AUTHZ-020 another project's items can't be reached through your own project", async ({
  slot,
  project,
}) => {
  // A project this slot's lead isn't in, led by a throwaway account (the
  // slot's own users keep their roles for other tests).
  const other = await project.admin.createProject({
    key: `X${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    name: `Other ${Math.random().toString(36).slice(2, 7)}`,
    leadUserId: (await freshUser(project.admin)).id,
  })
  const c = await project.admin.createCase(other.key, { title: "Secret case" })
  const d = await project.admin.createDefect(other.key, {
    title: "Secret defect",
  })
  const r = await project.admin.createRun(other.key, { name: "Secret run" })
  const leadApi = await apiContext(slot, "lead")
  for (const path of [`cases/${c.key}`, `defects/${d.key}`, `runs/${r.key}`])
    expect(
      (await leadApi.get(`/api/projects/${project.key}/${path}`)).status(),
      path
    ).toBe(404)
  await leadApi.dispose()
})

test("E2E-AUTHZ-021 writes from another site are refused", async ({
  slot,
  project,
}) => {
  const evil = await request.newContext({
    baseURL: e2eEnv.baseURL,
    storageState: statePath("lead", slot),
    extraHTTPHeaders: {
      Origin: "https://evil.example",
      "X-Forwarded-For": clientIp(slot),
    },
  })
  const res = await evil.post(`/api/projects/${project.key}/releases`, {
    data: { name: "Evil", status: "planned" },
  })
  expect(res.status()).toBe(403)
  await evil.dispose()
  const list = await project.lead.get<{ items: { name: string }[] }>(
    `/projects/${project.key}/releases`
  )
  expect(list.items.map((r) => r.name)).not.toContain("Evil")
})
