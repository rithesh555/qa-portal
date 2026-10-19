import { describe, expect, it } from "vitest"
import {
  AGE_BUCKETS,
  ageBucket,
  EXIT_THRESHOLDS,
  exitChecks,
  quantile,
  weekStart,
} from "./reports.ts"

const good = {
  passRate: 0.97,
  readyCases: 100,
  testedReady: 100,
  untestedHighPriority: 0,
  openCritical: 0,
  openMajor: 2,
  blockedHighPriority: 0,
  awaitingRetest: 0,
}

describe("exitChecks", () => {
  it("passes a release that meets every fixed threshold", () => {
    const checks = exitChecks(good)
    expect(checks.map((c) => c.id)).toEqual([
      "critical",
      "major",
      "coverage",
      "passRate",
      "blocked",
      "retest",
    ])
    expect(checks.every((c) => c.ok === true)).toBe(true)
  })

  it("fails each check on its own rule, and says why", () => {
    const checks = exitChecks({
      ...good,
      passRate: 0.9,
      testedReady: 112,
      readyCases: 144,
      untestedHighPriority: 10,
      openCritical: 2,
      openMajor: 4,
      blockedHighPriority: 1,
      awaitingRetest: 3,
    })
    expect(checks.every((c) => c.ok === false)).toBe(true)
    const byId = Object.fromEntries(checks.map((c) => [c.id, c.detail]))
    expect(byId.critical).toBe("2 open")
    expect(byId.major).toBe("4 open")
    expect(byId.coverage).toBe(
      "112 of 144 tested; 32 untested, 10 of them High or Critical priority"
    )
    expect(byId.passRate).toBe("90%")
    expect(byId.retest).toBe("3 waiting for a retest")
  })

  it("can't judge pass rate or coverage without results", () => {
    const checks = exitChecks({
      ...good,
      passRate: null,
      readyCases: 0,
      testedReady: 0,
    })
    const byId = Object.fromEntries(checks.map((c) => [c.id, c.ok]))
    expect(byId.passRate).toBeNull()
    expect(byId.coverage).toBeNull()
  })

  it("uses the shared thresholds", () => {
    expect(EXIT_THRESHOLDS).toEqual({
      passRate: 0.95,
      maxOpenCritical: 0,
      maxOpenMajor: 3,
    })
    expect(
      exitChecks({ ...good, openMajor: 3 }).find((c) => c.id === "major")!.ok
    ).toBe(true)
    expect(
      exitChecks({ ...good, passRate: 0.95 }).find((c) => c.id === "passRate")!
        .ok
    ).toBe(true)
  })
})

describe("quantile", () => {
  it("interpolates the median and 90th percentile", () => {
    expect(quantile([], 0.5)).toBeNull()
    expect(quantile([4], 0.9)).toBe(4)
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5)
    expect(quantile([10, 1, 5], 0.5)).toBe(5)
    expect(quantile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9)).toBeCloseTo(9.1)
  })
})

describe("ageBucket", () => {
  it("puts whole days into non-overlapping buckets", () => {
    expect(AGE_BUCKETS.map((b) => b.label)).toEqual([
      "0–2 days",
      "3–7 days",
      "8–14 days",
      "15–30 days",
      "Over 30 days",
    ])
    expect([0, 2, 3, 7, 8, 14, 15, 30, 31, 400].map(ageBucket)).toEqual([
      0, 0, 1, 1, 2, 2, 3, 3, 4, 4,
    ])
  })
})

describe("weekStart", () => {
  it("is the Monday of the week, in UTC", () => {
    expect(weekStart(new Date("2026-10-19T09:00:00Z"))).toBe("2026-10-19")
    expect(weekStart(new Date("2026-10-25T23:59:00Z"))).toBe("2026-10-19")
    expect(weekStart(new Date("2026-10-18T12:00:00Z"))).toBe("2026-10-12")
  })
})
