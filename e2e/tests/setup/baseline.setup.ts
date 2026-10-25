import { test as setup, expect } from "@playwright/test"
import { PortalApi, userIds } from "../../fixtures/api.ts"
import { BASE } from "../../fixtures/baseline.ts"
import { e2eEnv } from "../../fixtures/env.ts"
import { apiContext } from "../../fixtures/index.ts"
import type { Role } from "../../fixtures/roles.ts"

const PRIORITIES = ["critical", "high", "medium", "low"] as const
const TYPES = [
  "functional",
  "security",
  "performance",
  "usability",
  "other",
] as const

setup("build the BASE project", async () => {
  setup.setTimeout(120_000)
  const admin = new PortalApi(await apiContext(0, "admin"))
  const lead = new PortalApi(await apiContext(0, "lead"))
  const tester = new PortalApi(await apiContext(0, "tester"))
  const slots = Array.from({ length: e2eEnv.workers }, (_, s) => userIds(s))
  const all = (role: Role) => slots.map((ids) => ids[role])

  await admin.createProject({
    key: BASE.key,
    name: BASE.name,
    description: "Shared read-only data for the E2E suite.",
    leadUserId: slots[0]!.lead,
  })
  const otherLeads = all("lead").slice(1)
  if (otherLeads.length) await admin.addMembers(BASE.key, otherLeads, "lead")
  await admin.addMembers(BASE.key, all("tester"), "tester")
  await admin.addMembers(BASE.key, all("viewer"), "viewer")

  const shipped = await lead.createRelease(BASE.key, {
    name: BASE.releases.shipped,
    status: "in_progress",
    startDate: "2026-09-01",
    targetDate: "2026-09-30",
  })
  const current = await lead.createRelease(BASE.key, {
    name: BASE.releases.current,
    status: "in_progress",
    startDate: "2026-10-01",
    targetDate: "2026-12-15",
  })
  await lead.createRelease(BASE.key, {
    name: BASE.releases.next,
    status: "planned",
    targetDate: "2027-03-31",
  })

  const checkout = await lead.createSuite(BASE.key, BASE.suites.checkout)
  const accounts = await lead.createSuite(BASE.key, BASE.suites.accounts)
  const signIn = await lead.createSuite(
    BASE.key,
    BASE.suites.signIn,
    accounts.id
  )
  const suites = [checkout.id, accounts.id, signIn.id, null]

  for (let i = 0; i < BASE.activeCases; i++) {
    await tester.createCase(BASE.key, {
      title: `${["Checkout", "Account", "Sign-in", "Misc"][i % 4]} case ${String(i + 1).padStart(2, "0")}`,
      suiteId: suites[i % 4] ?? null,
      priority: PRIORITIES[i % 4]!,
      type: TYPES[i % 5]!,
      status: i < BASE.draftCases ? "draft" : "ready",
      labels: i % 3 === 0 ? ["smoke"] : i % 3 === 1 ? ["regression"] : [],
      references: i % 5 === 0 ? `REQ-${100 + i}` : "",
    })
  }
  const retired = await tester.createCase(BASE.key, {
    title: BASE.archivedCase,
    suiteId: checkout.id,
  })
  await lead.post(`/projects/${BASE.key}/cases/${retired.key}/archive`, {
    reason: "No longer offered",
  })

  // Release 1.0: a fully tested, closed run, then shipped (takes a snapshot).
  const closed = await tester.createRun(BASE.key, {
    name: BASE.runs.closedName,
    releaseId: shipped.id,
    environment: "staging build 1.0.4",
  })
  expect(closed.key).toBe(BASE.runs.closed)
  const outcomes = [
    "passed",
    "passed",
    "passed",
    "failed",
    "blocked",
    "skipped",
  ] as const
  for (const [i, rc] of (
    await tester.runCases(BASE.key, closed.key)
  ).entries()) {
    const status = outcomes[i % outcomes.length]!
    await tester.recordResult(BASE.key, closed.key, rc.id, {
      status,
      note:
        status === "failed" || status === "blocked" ? "Seen on staging" : "",
      expectedVersion: rc.version,
    })
  }
  await lead.post(`/projects/${BASE.key}/runs/${closed.key}/close`)
  await lead.patch(`/projects/${BASE.key}/releases/${shipped.id}`, {
    name: shipped.name,
    status: "released",
    startDate: "2026-09-01",
    targetDate: "2026-09-30",
    version: shipped.version,
  })

  // Release 1.1: an open run, partly tested.
  const open = await tester.createRun(BASE.key, {
    name: BASE.runs.openName,
    releaseId: current.id,
    assigneeIds: [slots[0]!.tester],
  })
  expect(open.key).toBe(BASE.runs.open)
  for (const rc of (await tester.runCases(BASE.key, open.key)).slice(0, 8)) {
    await tester.recordResult(BASE.key, open.key, rc.id, {
      status: "passed",
      note: "",
      expectedVersion: rc.version,
    })
  }

  // Defects in different states.
  for (const d of BASE.defects) {
    const created = await tester.createDefect(BASE.key, {
      title: d.title,
      severity: d.severity,
      foundInReleaseId: current.id,
    })
    let version = created.version
    const path: Record<string, string[]> = {
      new: [],
      open: ["open"],
      fixed: ["open", "in_progress", "fixed"],
      closed: ["open", "in_progress", "fixed", "closed"],
    }
    for (const to of path[d.status]!) {
      const actor = to === "open" ? lead : tester
      ;({ version } = await actor.transition(BASE.key, created.key, {
        to: to as "open",
        note: "",
        version,
      }))
    }
  }
})
