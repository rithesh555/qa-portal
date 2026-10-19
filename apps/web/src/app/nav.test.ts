import { describe, expect, it } from "vitest"
import { navFor, PROJECT_NAV, projectPath } from "./nav.ts"

const titles = (role: Parameters<typeof navFor>[0], projectsLed = 0) =>
  navFor(role, projectsLed).map((item) => item.title)

describe("navFor", () => {
  it("shows admins user management", () => {
    expect(titles("admin")).toEqual([
      "Home",
      "Projects",
      "All releases",
      "Users",
    ])
  })

  it("gives members the workspace links only", () => {
    expect(titles("user")).toEqual(["Home", "Projects"])
    expect(titles("user", 1)).toEqual(["Home", "Projects"])
  })

  it("shows all releases to QA Leads of two or more projects", () => {
    expect(titles("user", 2)).toEqual(["Home", "Projects", "All releases"])
  })
})

describe("project navigation", () => {
  it("lists the project's pages in the agreed order", () => {
    expect(PROJECT_NAV.map((item) => item.title)).toEqual([
      "Overview",
      "Test cases",
      "Test runs",
      "Defects",
      "Releases",
      "Reports",
      "Members",
    ])
  })

  it("builds project-scoped paths", () => {
    expect(projectPath("PAY")).toBe("/projects/PAY")
    expect(projectPath("PAY", "members")).toBe("/projects/PAY/members")
  })
})
