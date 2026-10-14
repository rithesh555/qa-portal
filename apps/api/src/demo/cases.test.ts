import { caseInputSchema, suiteNameSchema } from "@qa/shared"
import { describe, expect, it } from "vitest"
import { demoCaseLibrary } from "./cases.ts"

const KEYS = [
  "PAY",
  "MOB",
  "CHK",
  "ONB",
  "SRCH",
  "CAT",
  "ACC",
  "NOTIF",
  "ADM",
  "RPT",
  "INV",
  "LOY",
  "API",
  "SEC",
  "LEG",
]

describe("demoCaseLibrary", () => {
  const libraries = KEYS.map((key, i) => demoCaseLibrary(key, i))

  it("is the same every run", () => {
    expect(demoCaseLibrary("PAY", 0)).toEqual(libraries[0])
  })

  it("makes thousands of valid cases across the projects", () => {
    const total = libraries.reduce((sum, l) => sum + l.cases.length, 0)
    expect(total).toBeGreaterThan(2000)
    expect(total).toBeLessThan(4000)
    for (const library of libraries) {
      for (const c of library.cases) {
        const parsed = caseInputSchema.safeParse({ ...c, suiteId: null })
        expect(
          parsed.success,
          `${c.title}: ${JSON.stringify(parsed.error?.issues)}`
        ).toBe(true)
      }
    }
  })

  it("uses suites one level deep with valid, unique names, and only those suites", () => {
    for (const library of libraries) {
      const tops = library.suites.map((s) => s.name)
      expect(new Set(tops).size).toBe(tops.length)
      for (const suite of library.suites) {
        expect(suiteNameSchema.safeParse(suite.name).success).toBe(true)
        expect(new Set(suite.children).size).toBe(suite.children.length)
      }
      for (const c of library.cases) {
        if (c.suitePath.length === 0) continue
        const [top, child] = c.suitePath
        const suite = library.suites.find((s) => s.name === top)
        expect(suite, `${c.title} → ${top}`).toBeDefined()
        if (child) expect(suite!.children).toContain(child)
      }
    }
  })

  it("mixes statuses, priorities and labels, and leaves a few cases without a suite", () => {
    const pay = libraries[0]!.cases
    expect(new Set(pay.map((c) => c.status))).toEqual(
      new Set(["draft", "ready"])
    )
    expect(new Set(pay.map((c) => c.priority)).size).toBe(4)
    expect(pay.some((c) => c.labels.includes("smoke"))).toBe(true)
    expect(pay.some((c) => c.suitePath.length === 0)).toBe(true)
  })
})
