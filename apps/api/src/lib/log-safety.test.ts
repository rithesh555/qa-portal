import { describe, expect, it } from "vitest"
import { logSafeError, logSafeUrl } from "./log-safety.ts"

describe("logSafeUrl", () => {
  it("drops the query string, where searches carry names and emails", () => {
    expect(logSafeUrl("/api/users?q=ana%40corp.example&page=2")).toBe(
      "/api/users"
    )
    expect(logSafeUrl("/api/health")).toBe("/api/health")
  })
})

describe("logSafeError", () => {
  it("keeps only the first line and code of a Prisma error, which can echo query arguments", () => {
    const err = Object.assign(
      new Error(
        '\nInvalid `prisma.account.update()` invocation:\n\n{ data: { password: "scrypt$abc" } }\n\nRecord not found'
      ),
      { name: "PrismaClientKnownRequestError", code: "P2025" }
    )
    const safe = logSafeError(err)
    expect(safe).toEqual({
      type: "PrismaClientKnownRequestError",
      code: "P2025",
      message: "Invalid `prisma.account.update()` invocation:",
    })
    expect(JSON.stringify(safe)).not.toContain("scrypt")
  })

  it("passes other errors through for full logging", () => {
    const err = new TypeError("boom")
    expect(logSafeError(err)).toBe(err)
  })
})
