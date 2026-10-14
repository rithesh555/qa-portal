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
      item("case", "created", { key: "PAY-TC-3", title: "Pay" }),
      "created test case PAY-TC-3",
    ],
    [
      item("case", "updated", { key: "PAY-TC-3" }),
      "updated test case PAY-TC-3",
    ],
    [
      item("case", "archived", { key: "PAY-TC-3" }),
      "archived test case PAY-TC-3",
    ],
    [
      item("case", "restored", { key: "PAY-TC-3" }),
      "restored test case PAY-TC-3",
    ],
    [item("case", "updated", null), "updated a test case"],
    [item("suite", "created", { name: "Refunds" }), "created suite Refunds"],
    [
      item("suite", "updated", {
        name: "Refunds",
        parentId: { from: null, to: "x" },
      }),
      "updated suite Refunds",
    ],
    [
      item("suite", "archived", { name: "Refunds", cases: 3 }),
      "archived suite Refunds and its 3 test cases",
    ],
    [
      item("suite", "archived", { name: "Refunds", cases: 1 }),
      "archived suite Refunds and its 1 test case",
    ],
    [
      item("import", "created", {
        importNumber: 7,
        created: 48,
        fileName: "a.xlsx",
      }),
      "imported 48 test cases from a.xlsx (import #7)",
    ],
    [
      item("bulk", "updated", {
        kind: "setPriority",
        priority: "critical",
        count: 12,
      }),
      "set priority to Critical on 12 test cases",
    ],
    [
      item("bulk", "updated", { kind: "setType", type: "security", count: 1 }),
      "set type to Security on 1 test case",
    ],
    [
      item("bulk", "updated", { kind: "setStatus", status: "ready", count: 3 }),
      "marked 3 test cases Ready",
    ],
    [
      item("bulk", "updated", {
        kind: "move",
        suiteId: null,
        suite: null,
        count: 2,
      }),
      "moved 2 test cases to No suite",
    ],
    [
      item("bulk", "updated", { kind: "move", suite: "Refunds", count: 2 }),
      "moved 2 test cases to Refunds",
    ],
    [
      item("bulk", "updated", {
        kind: "addLabels",
        labels: ["smoke", "web"],
        count: 5,
      }),
      "added labels smoke, web to 5 test cases",
    ],
    [
      item("bulk", "archived", {
        kind: "archive",
        reason: "Old flow",
        count: 4,
      }),
      "archived 4 test cases: Old flow",
    ],
    [item("bulk", "updated", { count: 2 }), "changed 2 test cases"],
    [
      item("import", "restored", { importNumber: 7, cases: 40 }),
      "restored import #7 (40 test cases)",
    ],
    [
      item("import", "archived", { importNumber: 7, cases: 48 }),
      "archived import #7 (48 test cases)",
    ],
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
