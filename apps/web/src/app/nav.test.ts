import { describe, expect, it } from "vitest"
import { navFor } from "./nav.ts"

const titles = (role: Parameters<typeof navFor>[0]) =>
  navFor(role).map((item) => item.title)

describe("navFor", () => {
  it("shows every module to an admin, including user management", () => {
    expect(titles("admin")).toEqual([
      "Home",
      "Projects",
      "Test cases",
      "Test runs",
      "Defects",
      "Reports",
      "Users",
    ])
  })

  it("hides user management from QA leads and below", () => {
    for (const role of ["qa_lead", "tester", "viewer"] as const) {
      expect(titles(role)).not.toContain("Users")
    }
  })

  it("gives viewers the read-only modules", () => {
    expect(titles("viewer")).toEqual([
      "Home",
      "Projects",
      "Test cases",
      "Test runs",
      "Defects",
      "Reports",
    ])
  })
})
