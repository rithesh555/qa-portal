import { createUserSchema } from "@qa/shared"
import { describe, expect, it } from "vitest"
import { DEMO_ACCOUNTS, demoUsers } from "./users.ts"

describe("demoUsers", () => {
  const users = demoUsers("demo-password-123")

  it("makes 100 people including the named demo accounts", () => {
    expect(users).toHaveLength(100)
    for (const account of DEMO_ACCOUNTS) {
      expect(users.map((u) => u.username)).toContain(account)
    }
  })

  it("has unique usernames and emails", () => {
    expect(new Set(users.map((u) => u.username)).size).toBe(100)
    expect(new Set(users.map((u) => u.email)).size).toBe(100)
  })

  it("only produces users the API would accept", () => {
    for (const user of users) {
      expect(createUserSchema.safeParse(user).success).toBe(true)
    }
  })

  it("includes a second admin and some deactivated people", () => {
    expect(users.filter((u) => u.role === "admin")).toHaveLength(1)
    expect(users.filter((u) => u.deactivated).length).toBeGreaterThanOrEqual(5)
  })

  it("is the same every run", () => {
    expect(demoUsers("demo-password-123")).toEqual(users)
  })
})
