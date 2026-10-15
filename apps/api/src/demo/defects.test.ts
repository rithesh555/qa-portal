import { createDefectSchema, findTransition } from "@qa/shared"
import { describe, expect, it } from "vitest"
import { demoDefects } from "./defects.ts"

describe("demoDefects", () => {
  const plans = demoDefects("PAY", 0)

  it("is the same every time and covers every status", () => {
    expect(demoDefects("PAY", 0)).toEqual(plans)
    const last = new Set(plans.map((p) => p.path.at(-1)))
    for (const s of [
      "new",
      "open",
      "in_progress",
      "fixed",
      "reopened",
      "closed",
      "rejected",
    ]) {
      expect(last.has(s as never), s).toBe(true)
    }
  })

  it("only takes steps the workflow allows, starting from New", () => {
    for (const p of plans) {
      expect(p.path[0]).toBe("new")
      for (let i = 1; i < p.path.length; i++) {
        expect(
          findTransition(p.path[i - 1]!, p.path[i]!),
          p.path.join(">")
        ).toBeDefined()
      }
      if (p.path.at(-1) === "rejected") expect(p.resolution).toBeDefined()
    }
  })

  it("makes defects the API would accept", () => {
    for (const p of plans) {
      const parsed = createDefectSchema.safeParse({ ...p.fields })
      expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true)
    }
  })
})
