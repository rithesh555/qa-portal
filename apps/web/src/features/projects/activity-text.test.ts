import type { ActivityItem } from "@qa/shared"
import { describe, expect, it } from "vitest"
import { describeActivity } from "./activity-text"

const item = (
  entityType: string,
  action: string,
  changes: Record<string, unknown> | null = null
): ActivityItem => ({
  id: "a1",
  entityType,
  entityId: "e1",
  action,
  changes,
  actor: { id: "u1", name: "Demo Lead" },
  createdAt: "2026-10-11T10:00:00.000Z",
})

describe("describeActivity", () => {
  it.each([
    [
      item("project", "created", { lead: { id: "u2", name: "Omar" } }),
      "created the project and made Omar QA Lead",
    ],
    [
      item("project", "updated", { name: { from: "A", to: "B" } }),
      "renamed the project to B",
    ],
    [
      item("project", "updated", { description: { from: "", to: "x" } }),
      "updated the project description",
    ],
    [item("project", "archived"), "archived the project"],
    [item("project", "unarchived"), "restored the project from the archive"],
    [
      item("member", "added", {
        user: { id: "u3", name: "Elena Shah" },
        role: "tester",
      }),
      "added Elena Shah as Tester",
    ],
    [
      item("member", "role_changed", {
        user: { id: "u3", name: "Elena Shah" },
        role: { from: "tester", to: "lead" },
      }),
      "changed Elena Shah from Tester to QA Lead",
    ],
    [
      item("member", "removed", {
        user: { id: "u3", name: "Elena Shah" },
        role: "viewer",
      }),
      "removed Elena Shah",
    ],
    [item("release", "created", { name: "4.2" }), "created release 4.2"],
    [
      item("release", "updated", {
        name: "4.2",
        status: { from: "planned", to: "in_progress" },
      }),
      "set release 4.2 to In progress",
    ],
    [
      item("release", "updated", {
        name: "4.2",
        targetDate: { from: null, to: "2026-10-24" },
      }),
      "updated release 4.2",
    ],
  ])("%#: describes %o", (activity, text) => {
    expect(describeActivity(activity)).toBe(text)
  })

  it("falls back to a neutral sentence for anything it doesn't know", () => {
    expect(describeActivity(item("widget", "exploded"))).toBe("made a change")
  })

  it("copes with missing or malformed details", () => {
    expect(describeActivity(item("member", "added", null))).toBe(
      "added someone"
    )
    expect(describeActivity(item("release", "created", { name: 42 }))).toBe(
      "created a release"
    )
  })
})
