import { describe, expect, it } from "vitest"
import {
  createDefectSchema,
  updateDefectSchema,
  type DefectStatus,
  DEFECT_STATUSES,
  formatDefectKey,
  isActiveDefect,
  logDefectSchema,
  nextStatuses,
  parseDefectRef,
  transitionSchema,
} from "./defects.ts"

const ID = "0199c0de-0000-7000-8000-000000000001"

describe("defect keys", () => {
  it("formats and parses PROJECT-D-n", () => {
    expect(formatDefectKey("PAY", 14)).toBe("PAY-D-14")
    expect(parseDefectRef("PAY", "pay-d-14")).toBe(14)
    expect(parseDefectRef("PAY", "3")).toBe(3)
    for (const bad of ["MOB-D-1", "PAY-R-1", "PAY-D-0", "x"]) {
      expect(parseDefectRef("PAY", bad), bad).toBeNull()
    }
  })
})

describe("workflow", () => {
  const to = (from: DefectStatus, lead: boolean) =>
    nextStatuses(from, { lead }).map((t) => t.to)

  it("lets only a QA Lead triage a new defect", () => {
    expect(to("new", true)).toEqual(["open", "rejected"])
    expect(to("new", false)).toEqual([])
  })

  it("lets anyone move work along, and only a lead reject open work", () => {
    expect(to("open", true)).toEqual(["in_progress", "rejected"])
    expect(to("open", false)).toEqual(["in_progress"])
    expect(to("in_progress", false)).toEqual(["fixed"])
    expect(to("reopened", false)).toEqual(["in_progress"])
  })

  it("verifies a fix by closing it or reopening it", () => {
    expect(to("fixed", false)).toEqual(["closed", "reopened"])
  })

  it("lets only a lead reopen a closed or rejected defect", () => {
    expect(to("closed", true)).toEqual(["reopened"])
    expect(to("closed", false)).toEqual([])
    expect(to("rejected", true)).toEqual(["reopened"])
    expect(to("rejected", false)).toEqual([])
  })

  it("says what each move needs", () => {
    const need = (from: DefectStatus, target: DefectStatus) =>
      nextStatuses(from, { lead: true }).find((t) => t.to === target)?.needs
    expect(need("new", "rejected")).toBe("resolution")
    expect(need("fixed", "reopened")).toBe("note")
    expect(need("closed", "reopened")).toBe("note")
    expect(need("in_progress", "fixed")).toBe("fixedIn")
    expect(need("new", "open")).toBe("nothing")
    expect(need("fixed", "closed")).toBe("confirm")
  })

  it("treats closed and rejected as done", () => {
    expect(DEFECT_STATUSES.filter(isActiveDefect)).toEqual([
      "new",
      "open",
      "in_progress",
      "fixed",
      "reopened",
    ])
  })
})

describe("transitionSchema", () => {
  const base = { version: 3 }
  it("needs a reason to reject, and the duplicate when it is one", () => {
    expect(
      transitionSchema.safeParse({ ...base, to: "rejected" }).success
    ).toBe(false)
    expect(
      transitionSchema.safeParse({
        ...base,
        to: "rejected",
        resolution: "duplicate",
      }).success
    ).toBe(false)
    expect(
      transitionSchema.parse({
        ...base,
        to: "rejected",
        resolution: "duplicate",
        duplicateOfId: ID,
      })
    ).toMatchObject({ resolution: "duplicate", duplicateOfId: ID, note: "" })
    expect(
      transitionSchema.safeParse({
        ...base,
        to: "rejected",
        resolution: "works_as_designed",
      }).success
    ).toBe(true)
  })

  it("takes a duplicate link only with the Duplicate reason", () => {
    expect(
      transitionSchema.safeParse({
        ...base,
        to: "rejected",
        resolution: "cannot_reproduce",
        duplicateOfId: ID,
      }).success
    ).toBe(false)
  })

  it("needs a note to reopen", () => {
    expect(
      transitionSchema.safeParse({ ...base, to: "reopened" }).success
    ).toBe(false)
    expect(
      transitionSchema.safeParse({ ...base, to: "reopened", note: "Still" })
        .success
    ).toBe(true)
  })

  it("only takes a resolution when rejecting", () => {
    expect(
      transitionSchema.safeParse({
        ...base,
        to: "open",
        resolution: "wont_fix",
      }).success
    ).toBe(false)
  })
})

describe("creating defects", () => {
  const fields = {
    title: "  Spinner never stops  ",
    severity: "critical",
    steps: "1. Pay",
    actual: "It spins",
  }

  it("needs a title, severity, steps and actual result", () => {
    expect(createDefectSchema.parse(fields)).toMatchObject({
      title: "Spinner never stops",
      expected: "",
      reproducibility: "always",
      detectedIn: "qa",
      assigneeId: null,
      foundInReleaseId: null,
    })
    for (const key of ["title", "severity", "steps", "actual"] as const) {
      const without = { ...fields, [key]: "" }
      expect(createDefectSchema.safeParse(without).success, key).toBe(false)
    }
  })

  it("logs from a result, or links the result to an existing defect", () => {
    expect(
      logDefectSchema.parse({
        runCaseId: ID,
        defect: { mode: "new", ...fields },
      }).defect
    ).toMatchObject({ mode: "new", title: "Spinner never stops" })
    expect(
      logDefectSchema.parse({
        runCaseId: ID,
        defect: { mode: "link", defectId: ID },
      }).defect
    ).toEqual({ mode: "link", defectId: ID, note: "", reopen: false })
  })
})

describe("updateDefectSchema", () => {
  it("carries only the fields sent, so a partial save never blanks others", () => {
    expect(updateDefectSchema.parse({ severity: "minor", version: 4 })).toEqual(
      {
        severity: "minor",
        version: 4,
      }
    )
  })

  it("still validates what is sent", () => {
    expect(
      updateDefectSchema.safeParse({ trackerUrl: "jira PAY-1", version: 4 })
        .success
    ).toBe(false)
    expect(
      updateDefectSchema.safeParse({ title: " ", version: 4 }).success
    ).toBe(false)
  })
})
