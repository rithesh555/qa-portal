import type { ActivityItem } from "@qa/shared"
import { describe, expect, it } from "vitest"
import { describeCaseChange } from "./case-activity-text"

const item = (
  action: string,
  changes: Record<string, unknown> | null
): ActivityItem => ({
  id: "a1",
  action,
  entityType: "case",
  entityId: "c1",
  actor: { id: "u1", name: "Priya" },
  changes,
  createdAt: "2026-10-12T10:00:00.000Z",
})

describe("describeCaseChange", () => {
  it("describes how the case was created", () => {
    expect(describeCaseChange(item("created", { key: "PAY-TC-3" }))).toBe(
      "created this case"
    )
    expect(
      describeCaseChange(item("created", { duplicatedFrom: "PAY-TC-1" }))
    ).toBe("created this case as a copy of PAY-TC-1")
    expect(
      describeCaseChange(item("created", { importNumber: 7, bulk: true }))
    ).toBe("created this case in import #7")
  })

  it("lists each change of an update", () => {
    expect(
      describeCaseChange(
        item("updated", {
          key: "PAY-TC-3",
          title: { from: "Old", to: "New" },
          priority: { from: "medium", to: "critical" },
          status: { from: "draft", to: "ready" },
          type: { from: "functional", to: "security" },
          suite: { from: null, to: "Refunds" },
          labels: { added: ["smoke", "web"], removed: ["old"] },
          references: { from: "", to: "PAY-1" },
          preconditions: { from: "", to: "x" },
          steps: ["step 3 expected result", "added step 4"],
          revision: 4,
        })
      )
    ).toBe(
      "renamed it to “New”; changed priority from Medium to Critical; changed type from Functional to Security; " +
        "changed status from Draft to Ready; moved it from No suite to Refunds; added labels smoke, web; removed label old; " +
        "changed the references; changed the preconditions; changed step 3 expected result, added step 4 (version 4)"
    )
  })

  it("says when steps were only reordered", () => {
    expect(
      describeCaseChange(
        item("updated", { steps: ["reordered the steps"], revision: 2 })
      )
    ).toBe("reordered the steps (version 2)")
  })

  it("notes bulk changes and saving over someone else's version", () => {
    expect(
      describeCaseChange(
        item("updated", { priority: { from: "low", to: "high" }, bulk: true })
      )
    ).toBe("changed priority from Low to High (bulk change)")
    expect(
      describeCaseChange(
        item("updated", { title: { from: "a", to: "b" }, overwrote: true })
      )
    ).toBe("renamed it to “b” (saved over a newer version)")
  })

  it("describes archiving and restoring", () => {
    expect(describeCaseChange(item("archived", { reason: "Replaced" }))).toBe(
      "archived it: Replaced"
    )
    expect(describeCaseChange(item("archived", { key: "PAY-TC-1" }))).toBe(
      "archived it"
    )
    expect(
      describeCaseChange(item("restored", { restoredSuites: ["Refunds"] }))
    ).toBe("restored it, and its suite Refunds")
    expect(describeCaseChange(item("restored", null))).toBe("restored it")
    expect(
      describeCaseChange(item("restored", { importNumber: 7, bulk: true }))
    ).toBe("restored it with import #7")
  })

  it("survives unexpected stored data", () => {
    expect(
      describeCaseChange(item("updated", { priority: "weird", steps: "nope" }))
    ).toBe("updated it")
    expect(describeCaseChange(item("mystery", null))).toBe("changed it")
  })
})
