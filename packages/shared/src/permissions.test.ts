import { describe, expect, it } from "vitest"
import { type Action, ACTIONS, can } from "./permissions.ts"
import type { ProjectRole } from "./roles.ts"

const admin = { portalRole: "admin" } as const
const member = (projectRole: ProjectRole | null) =>
  ({ portalRole: "user", projectRole }) as const

/** The matrix agreed with the user (plan 2026-10-11). */
const EXPECTED: Record<Action, ProjectRole[]> = {
  "users:manage": [],
  "projects:manage": [],
  "project:view": ["lead", "tester", "viewer"],
  "members:manage": ["lead"],
  "releases:manage": ["lead"],
  "cases:edit": ["lead", "tester"],
  "cases:archive": ["lead"],
  "runs:execute": ["lead", "tester"],
  // Testers only for runs they own once nothing is untested; that check
  // needs the run, so the test-runs service enforces it on top of this.
  "runs:close": ["lead", "tester"],
  "runs:reopen": ["lead"],
  "defects:edit": ["lead", "tester"],
}

describe("can", () => {
  it("covers every action in the agreed matrix", () => {
    expect([...ACTIONS].sort()).toEqual(Object.keys(EXPECTED).sort())
  })

  it("allows admins every action, with or without a membership", () => {
    for (const action of ACTIONS) {
      expect(can(action, admin)).toBe(true)
    }
  })

  it.each(Object.entries(EXPECTED) as [Action, ProjectRole[]][])(
    "%s is allowed for exactly %j",
    (action, allowed) => {
      for (const role of ["lead", "tester", "viewer"] as const) {
        expect(can(action, member(role))).toBe(allowed.includes(role))
      }
    }
  )

  it("denies non-admins without a membership", () => {
    for (const action of ACTIONS) {
      expect(can(action, member(null))).toBe(false)
    }
  })

  it("fails closed for unknown roles and actions", () => {
    expect(can("project:view", member("owner" as ProjectRole))).toBe(false)
    expect(can("project:view", { portalRole: "root" as "admin" })).toBe(false)
    expect(can("anything" as Action, member("lead"))).toBe(false)
  })
})
