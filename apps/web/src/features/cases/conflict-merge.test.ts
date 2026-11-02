import type { CaseFields } from "@qa/shared"
import { describe, expect, it } from "vitest"
import { changedFields, conflictRows, mergeMine } from "./conflict-merge"

const base: CaseFields = {
  title: "Pay with card",
  suiteId: null,
  priority: "medium",
  type: "functional",
  status: "draft",
  labels: ["smoke"],
  references: "",
  preconditions: "",
  steps: [
    { action: "Open checkout", expected: "" },
    { action: "Pay", expected: "Paid" },
  ],
}

describe("three-way conflict handling", () => {
  // They renamed the case; I only changed step 1's expected result.
  const theirs: CaseFields = {
    ...base,
    title: "Pay with a saved card",
    priority: "high",
  }
  const mine: CaseFields = {
    ...base,
    priority: "critical",
    steps: [
      { action: "Open checkout", expected: "Card listed" },
      base.steps[1]!,
    ],
  }

  it("finds only the fields I changed", () => {
    expect(changedFields(base, mine)).toEqual(["priority", "steps"])
    expect(changedFields(base, { ...base, title: " Pay with card " })).toEqual(
      []
    )
  })

  it("keeps their changes and applies only mine on top", () => {
    expect(mergeMine(theirs, mine, changedFields(base, mine))).toEqual({
      ...theirs,
      priority: "critical",
      steps: mine.steps,
    })
  })

  it("lists my changed fields, flagging ones we both changed", () => {
    const rows = conflictRows(base, mine, theirs, () => "No suite")
    expect(rows).toEqual([
      { field: "Priority", theirs: "High", mine: "Critical", both: true },
      {
        field: "Step 1",
        theirs: "Open checkout",
        mine: "Open checkout. Expected: Card listed",
        both: false,
      },
    ])
  })
})
