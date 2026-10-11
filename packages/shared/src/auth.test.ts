import { describe, expect, it } from "vitest"
import { loginSchema } from "./auth.ts"

describe("loginSchema", () => {
  it("accepts a username and password, trimming the username", () => {
    expect(
      loginSchema.parse({ username: "  alice ", password: "secret-pass" })
    ).toEqual({ username: "alice", password: "secret-pass" })
  })

  it("requires a username of 3 to 30 characters", () => {
    expect(
      loginSchema.safeParse({ username: "al", password: "x" }).success
    ).toBe(false)
    expect(
      loginSchema.safeParse({ username: "a".repeat(31), password: "x" }).success
    ).toBe(false)
  })

  it("requires a password", () => {
    const result = loginSchema.safeParse({ username: "alice", password: "" })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe("Enter your password")
  })
})
