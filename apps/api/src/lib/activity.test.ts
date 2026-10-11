import { describe, expect, it } from "vitest"
import { diff } from "./activity.ts"

describe("diff", () => {
  const before = { name: "Bob", email: "b@x.io", role: "user" }

  it("lists only fields that changed", () => {
    expect(
      diff(before, { name: "Bobby", email: "b@x.io", role: "admin" }, [
        "name",
        "email",
        "role",
      ])
    ).toEqual({
      name: { from: "Bob", to: "Bobby" },
      role: { from: "user", to: "admin" },
    })
  })

  it("ignores fields that aren't listed or aren't supplied", () => {
    expect(diff(before, { name: "Bobby" }, ["email", "role"])).toEqual({})
  })
})
