import { describe, expect, it } from "vitest"
import {
  bulkResultSchema,
  completion,
  createRunSchema,
  emptyCounts,
  formatRunKey,
  parseRunRef,
  passRate,
  recordResultSchema,
  runSelectionSchema,
} from "./runs.ts"

const ID = "0199c0de-0000-7000-8000-000000000001"

describe("run keys", () => {
  it("formats and parses PROJECT-R-n", () => {
    expect(formatRunKey("PAY", 12)).toBe("PAY-R-12")
    expect(parseRunRef("PAY", "pay-r-12")).toBe(12)
    expect(parseRunRef("PAY", "7")).toBe(7)
    for (const bad of ["MOB-R-1", "PAY-TC-1", "PAY-R-0", "x"]) {
      expect(parseRunRef("PAY", bad), bad).toBeNull()
    }
  })
})

describe("completion and pass rate", () => {
  const counts = { passed: 96, failed: 7, blocked: 3, skipped: 2, untested: 32 }

  it("completion is tested ÷ total; skipped counts as tested", () => {
    expect(completion(counts)).toBeCloseTo(108 / 140)
    expect(completion(emptyCounts())).toBeNull()
  })

  it("pass rate is passed ÷ (passed + failed + blocked), leaving skipped out", () => {
    expect(passRate(counts)).toBeCloseTo(96 / 106)
    expect(passRate({ ...emptyCounts(), skipped: 4, untested: 2 })).toBeNull()
  })
})

describe("runSelectionSchema", () => {
  it("accepts the three ways of choosing cases, Drafts off by default", () => {
    expect(runSelectionSchema.parse({ mode: "all" })).toEqual({
      mode: "all",
      includeDrafts: false,
    })
    expect(
      runSelectionSchema.parse({
        mode: "filter",
        label: "Smoke",
        priority: "high",
      })
    ).toEqual({
      mode: "filter",
      label: "smoke",
      priority: "high",
      includeDrafts: false,
    })
    expect(
      runSelectionSchema.parse({ mode: "suites", suiteIds: [ID] })
    ).toEqual({
      mode: "suites",
      suiteIds: [ID],
      caseIds: [],
      includeNoSuite: false,
      includeDrafts: false,
    })
  })

  it("needs something to pick when choosing suites", () => {
    expect(runSelectionSchema.safeParse({ mode: "suites" }).success).toBe(false)
  })
})

describe("createRunSchema", () => {
  it("trims, defaults and requires a name", () => {
    expect(
      createRunSchema.parse({
        name: " Regression ",
        releaseId: null,
        selection: { mode: "all" },
      })
    ).toEqual({
      name: "Regression",
      description: "",
      environment: "",
      releaseId: null,
      assigneeIds: [],
      selection: { mode: "all", includeDrafts: false },
    })
    expect(
      createRunSchema.safeParse({
        name: " ",
        releaseId: null,
        selection: { mode: "all" },
      }).success
    ).toBe(false)
  })
})

describe("recordResultSchema", () => {
  it("needs a note for Failed and Blocked", () => {
    expect(
      recordResultSchema.safeParse({
        status: "failed",
        note: " ",
        expectedVersion: 1,
      }).success
    ).toBe(false)
    expect(
      recordResultSchema.parse({
        status: "failed",
        note: "Spinner never stops",
        failedStep: 2,
        expectedVersion: 1,
      })
    ).toMatchObject({
      note: "Spinner never stops",
      failedStep: 2,
      overwrite: false,
    })
    expect(
      recordResultSchema.parse({ status: "passed", expectedVersion: 3 })
    ).toMatchObject({
      note: "",
      failedStep: null,
    })
  })

  it("allows untested only as an undo, and a failed step only on Failed or Blocked", () => {
    expect(
      recordResultSchema.safeParse({ status: "untested", expectedVersion: 2 })
        .success
    ).toBe(true)
    expect(
      recordResultSchema.safeParse({
        status: "passed",
        failedStep: 1,
        expectedVersion: 2,
      }).success
    ).toBe(false)
  })
})

describe("bulkResultSchema", () => {
  it("records one status with a shared note on up to 2,000 run cases", () => {
    expect(
      bulkResultSchema.safeParse({
        runCaseIds: [ID],
        status: "blocked",
        note: "Sandbox down",
      }).success
    ).toBe(true)
    expect(
      bulkResultSchema.safeParse({ runCaseIds: [ID], status: "blocked" })
        .success
    ).toBe(false)
    expect(
      bulkResultSchema.safeParse({ runCaseIds: [ID], status: "untested" })
        .success
    ).toBe(false)
    expect(
      bulkResultSchema.safeParse({ runCaseIds: [], status: "passed" }).success
    ).toBe(false)
  })
})
