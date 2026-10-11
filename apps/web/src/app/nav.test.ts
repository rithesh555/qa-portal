import { describe, expect, it } from "vitest"
import { navFor, PROJECT_NAV, projectPath } from "./nav.ts"

const titles = (role: Parameters<typeof navFor>[0]) =>
  navFor(role).map((item) => item.title)

describe("navFor", () => {
  it("shows admins user management", () => {
    expect(titles("admin")).toEqual(["Home", "Projects", "Users"])
  })

  it("gives members the workspace links only", () => {
    expect(titles("user")).toEqual(["Home", "Projects"])
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
