import { describe, expect, it } from "vitest"
import {
  effectiveRole,
  hasRole,
  type Role,
  ROLES,
  roleSchema,
} from "./roles.ts"

describe("roles", () => {
  it("lists the four roles from most to least privileged", () => {
    expect(ROLES).toEqual(["admin", "qa_lead", "tester", "viewer"])
  })

  it("validates role strings", () => {
    expect(roleSchema.safeParse("tester").success).toBe(true)
    expect(roleSchema.safeParse("superuser").success).toBe(false)
  })

  it("treats a higher role as satisfying a lower requirement", () => {
    expect(hasRole("admin", "tester")).toBe(true)
    expect(hasRole("qa_lead", "qa_lead")).toBe(true)
    expect(hasRole("viewer", "tester")).toBe(false)
    expect(hasRole("tester", "admin")).toBe(false)
  })

  it("fails closed for a role it doesn't know", () => {
    expect(hasRole("superuser" as Role, "viewer")).toBe(false)
    expect(hasRole("admin", "superuser" as Role)).toBe(false)
  })
})

describe("effectiveRole", () => {
  it("returns a single stored role as-is", () => {
    expect(effectiveRole("qa_lead")).toBe("qa_lead")
  })

  it("takes the most privileged of several stored roles", () => {
    expect(effectiveRole("tester,admin")).toBe("admin")
    expect(effectiveRole(" viewer , qa_lead ")).toBe("qa_lead")
  })

  it("ignores unknown entries", () => {
    expect(effectiveRole("superuser,tester")).toBe("tester")
  })

  it("falls back to viewer when nothing usable is stored", () => {
    expect(effectiveRole(null)).toBe("viewer")
    expect(effectiveRole(undefined)).toBe("viewer")
    expect(effectiveRole("")).toBe("viewer")
    expect(effectiveRole("superuser")).toBe("viewer")
  })
})
