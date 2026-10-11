import { describe, expect, it } from "vitest"
import {
  changePasswordSchema,
  createUserSchema,
  passwordSchema,
  updateUserSchema,
  usernameSchema,
  userListQuerySchema,
} from "./users.ts"

const valid = {
  name: "Alice Tester",
  username: "alice.t",
  email: "alice@example.com",
  password: "long-enough-pass",
  role: "user",
}

describe("usernameSchema", () => {
  it("accepts letters, digits, dots and underscores", () => {
    expect(usernameSchema.parse("Alice_T.1")).toBe("alice_t.1")
  })

  it("rejects spaces, other symbols and bad lengths", () => {
    for (const bad of ["al", "a".repeat(31), "alice t", "alice-t", "a@b"]) {
      expect(usernameSchema.safeParse(bad).success).toBe(false)
    }
  })
})

describe("passwordSchema", () => {
  it("requires 12 to 128 characters", () => {
    expect(passwordSchema.safeParse("x".repeat(11)).success).toBe(false)
    expect(passwordSchema.safeParse("x".repeat(12)).success).toBe(true)
    expect(passwordSchema.safeParse("x".repeat(129)).success).toBe(false)
  })
})

describe("createUserSchema", () => {
  it("accepts a complete user and normalises email and username", () => {
    expect(
      createUserSchema.parse({
        ...valid,
        email: " Alice@Example.COM ",
        username: "Alice.T",
      })
    ).toMatchObject({ email: "alice@example.com", username: "alice.t" })
  })

  it("requires a name, a valid email and a known role", () => {
    expect(createUserSchema.safeParse({ ...valid, name: " " }).success).toBe(
      false
    )
    expect(
      createUserSchema.safeParse({ ...valid, email: "nope" }).success
    ).toBe(false)
    expect(
      createUserSchema.safeParse({ ...valid, role: "qa_lead" }).success
    ).toBe(false)
  })
})

describe("updateUserSchema", () => {
  it("requires the updatedAt the client last saw", () => {
    const { password: _password, username: _username, ...rest } = valid
    expect(updateUserSchema.safeParse(rest).success).toBe(false)
    expect(
      updateUserSchema.safeParse({
        ...rest,
        updatedAt: "2026-10-11T10:00:00.000Z",
      }).success
    ).toBe(true)
  })
})

describe("userListQuerySchema", () => {
  it("defaults to active users sorted by name", () => {
    expect(userListQuerySchema.parse({})).toMatchObject({
      status: "active",
      sort: "name",
    })
  })

  it("accepts the deactivated and all filters only", () => {
    expect(userListQuerySchema.parse({ status: "all" }).status).toBe("all")
    expect(userListQuerySchema.safeParse({ status: "banned" }).success).toBe(
      false
    )
  })
})

describe("changePasswordSchema", () => {
  const ok = {
    currentPassword: "old-password",
    newPassword: "a-new-password-123",
    confirmPassword: "a-new-password-123",
  }

  it("accepts a matching new password", () => {
    expect(changePasswordSchema.safeParse(ok).success).toBe(true)
  })

  it("flags a confirmation that doesn't match on the confirm field", () => {
    const result = changePasswordSchema.safeParse({
      ...ok,
      confirmPassword: "something-else-123",
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(["confirmPassword"])
  })

  it("rejects reusing the current password", () => {
    const same = "same-password-123"
    const result = changePasswordSchema.safeParse({
      currentPassword: same,
      newPassword: same,
      confirmPassword: same,
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(["newPassword"])
  })
})
