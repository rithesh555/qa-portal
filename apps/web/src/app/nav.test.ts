import { describe, expect, it } from "vitest"
import { navFor, pageTitle, PROJECT_NAV, projectPath } from "./nav.ts"

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

describe("pageTitle", () => {
  const pay = { key: "PAY", name: "Payments" }
  it("names the page, then the project, then the portal", () => {
    expect(pageTitle("/", null)).toBe("Home · QA Portal")
    expect(pageTitle("/releases", null)).toBe("All releases · QA Portal")
    expect(pageTitle("/projects/PAY", pay)).toBe(
      "Overview · Payments · QA Portal"
    )
    expect(pageTitle("/projects/pay/cases", pay)).toBe(
      "Test cases · Payments · QA Portal"
    )
  })

  it("leads with the item's key on detail pages", () => {
    expect(pageTitle("/projects/PAY/defects/pay-d-14", pay)).toBe(
      "PAY-D-14 · Defects · Payments · QA Portal"
    )
    expect(pageTitle("/projects/PAY/runs/new", pay)).toBe(
      "New · Test runs · Payments · QA Portal"
    )
    expect(pageTitle("/projects/PAY/cases/import", pay)).toBe(
      "Import · Test cases · Payments · QA Portal"
    )
  })

  it("falls back while the project loads or for unknown pages", () => {
    expect(pageTitle("/projects/PAY/cases", null)).toBe("Projects · QA Portal")
    expect(pageTitle("/projects/PAY/nope", pay)).toBe(
      "Page not found · QA Portal"
    )
  })
})
