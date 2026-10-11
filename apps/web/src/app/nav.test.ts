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

  it("gives members every module except user management", () => {
    expect(titles("user")).toEqual([
      "Home",
      "Projects",
      "Test cases",
      "Test runs",
      "Defects",
      "Reports",
    ])
  })
})
