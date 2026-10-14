import { describe, expect, it } from "vitest"
import { describeStepChanges } from "./service.ts"

const s = (action: string, expected = "") => ({ action, expected })

describe("describeStepChanges", () => {
  it("names changed, added and removed steps", () => {
    expect(
      describeStepChanges([s("a"), s("b", "x")], [s("a2"), s("b", "y"), s("c")])
    ).toEqual(["step 1", "step 2 expected result", "added step 3"])
    expect(describeStepChanges([s("a"), s("b")], [s("a")])).toEqual([
      "removed step 2",
    ])
  })

  it("says the steps were reordered when only their order changed", () => {
    expect(
      describeStepChanges([s("a"), s("b"), s("c")], [s("a"), s("c"), s("b")])
    ).toEqual(["reordered the steps"])
  })

  it("is empty when nothing changed", () => {
    expect(describeStepChanges([s("a")], [s("a")])).toEqual([])
  })
})
