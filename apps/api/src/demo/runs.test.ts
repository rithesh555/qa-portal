import { needsNote, recordResultSchema } from "@qa/shared"
import { describe, expect, it } from "vitest"
import { demoOutcome, demoRuns } from "./runs.ts"

describe("demoRuns", () => {
  it("gives every project a finished run, one in progress and a fresh one", () => {
    const runs = demoRuns("PAY", 0)
    expect(runs.map((r) => [r.closed, r.tested])).toEqual([
      [true, 1],
      [false, 0.6],
      [false, 0],
    ])
    expect(new Set(runs.map((r) => r.name)).size).toBe(runs.length)
    // Oldest first, so run numbers follow the dates.
    const days = runs.map((r) => r.daysAgo)
    expect([...days].sort((a, b) => b - a)).toEqual(days)
  })

  it("is the same every time", () => {
    expect(demoRuns("MOB", 3)).toEqual(demoRuns("MOB", 3))
  })
})

describe("demoOutcome", () => {
  const outcomes = (tested: number) =>
    Array.from({ length: 1000 }, (_, i) => demoOutcome(1, i, tested, 3))

  it("leaves the untested share without a result", () => {
    expect(outcomes(0).every((o) => o === null)).toBe(true)
    expect(outcomes(1).every((o) => o !== null)).toBe(true)
    const some = outcomes(0.6).filter((o) => o !== null).length
    expect(some).toBeGreaterThan(550)
    expect(some).toBeLessThan(650)
  })

  it("mostly passes, with a few failed, blocked and skipped results", () => {
    const all = outcomes(1).map((o) => o!.status)
    const share = (s: string) => all.filter((x) => x === s).length / all.length
    expect(share("passed")).toBeGreaterThan(0.7)
    expect(share("failed")).toBeGreaterThan(0.03)
    expect(share("blocked")).toBeGreaterThan(0.02)
    expect(share("skipped")).toBeGreaterThan(0.02)
  })

  it("makes results the API would accept", () => {
    for (const o of outcomes(1)) {
      const parsed = recordResultSchema.safeParse({ ...o, expectedVersion: 1 })
      expect(parsed.success, JSON.stringify(o)).toBe(true)
      if (needsNote(o!.status)) expect(o!.note).not.toBe("")
      if (o!.failedStep !== null) expect(o!.failedStep).toBeLessThanOrEqual(3)
    }
  })
})
