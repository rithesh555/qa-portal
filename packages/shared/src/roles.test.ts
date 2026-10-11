import { describe, expect, it } from "vitest"
import {
  effectivePortalRole,
  PORTAL_ROLES,
  portalRoleSchema,
  PROJECT_ROLE_LABELS,
  PROJECT_ROLES,
  projectRoleSchema,
} from "./roles.ts"

describe("portal roles", () => {
  it("has admin and user only", () => {
    expect(PORTAL_ROLES).toEqual(["admin", "user"])
  })

  it("validates portal role strings", () => {
    expect(portalRoleSchema.safeParse("user").success).toBe(true)
    expect(portalRoleSchema.safeParse("qa_lead").success).toBe(false)
  })
})

describe("project roles", () => {
  it("lists lead, tester and viewer from most to least privileged", () => {
    expect(PROJECT_ROLES).toEqual(["lead", "tester", "viewer"])
  })

  it("validates project role strings", () => {
    expect(projectRoleSchema.safeParse("tester").success).toBe(true)
    expect(projectRoleSchema.safeParse("admin").success).toBe(false)
  })

  it("labels the lead role as QA Lead", () => {
    expect(PROJECT_ROLE_LABELS.lead).toBe("QA Lead")
  })
})

describe("effectivePortalRole", () => {
  it("returns admin when admin is stored", () => {
    expect(effectivePortalRole("admin")).toBe("admin")
  })

  it("finds admin among several comma-separated roles", () => {
    expect(effectivePortalRole(" user , admin ")).toBe("admin")
  })

  it("treats everything else as user (fails closed)", () => {
    expect(effectivePortalRole("user")).toBe("user")
    expect(effectivePortalRole("qa_lead")).toBe("user")
    expect(effectivePortalRole("administrator")).toBe("user")
    expect(effectivePortalRole("")).toBe("user")
    expect(effectivePortalRole(null)).toBe("user")
    expect(effectivePortalRole(undefined)).toBe("user")
  })
})
