import { describe, expect, it } from "vitest"
import { loadEnv } from "./env.ts"

const valid = {
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://u:p@localhost:5433/db",
  WEB_ORIGIN: "http://localhost:5173",
  BETTER_AUTH_SECRET: "x".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
}

describe("loadEnv", () => {
  it("applies defaults for optional settings", () => {
    const env = loadEnv(valid)
    expect(env).toMatchObject({
      API_HOST: "127.0.0.1",
      API_PORT: 3000,
      LOG_LEVEL: "info",
    })
  })

  it("coerces the port to a number", () => {
    expect(loadEnv({ ...valid, API_PORT: "4100" }).API_PORT).toBe(4100)
  })

  it("rejects a short auth secret and names the variable", () => {
    expect(() =>
      loadEnv({ ...valid, BETTER_AUTH_SECRET: "too-short" })
    ).toThrow(/BETTER_AUTH_SECRET/)
  })

  it("reports every missing required variable", () => {
    expect(() => loadEnv({})).toThrow(
      /NODE_ENV[\s\S]*DATABASE_URL[\s\S]*WEB_ORIGIN[\s\S]*BETTER_AUTH_SECRET[\s\S]*BETTER_AUTH_URL/
    )
  })

  it("requires NODE_ENV: a forgotten one must not quietly mean development", () => {
    const { NODE_ENV: _, ...rest } = valid
    expect(() => loadEnv(rest)).toThrow(/NODE_ENV/)
  })

  it("requires https origins in production, except on this machine", () => {
    const prod = { ...valid, NODE_ENV: "production" }
    expect(() =>
      loadEnv({ ...prod, WEB_ORIGIN: "http://qa.example.com" })
    ).toThrow(/WEB_ORIGIN[\s\S]*https/)
    expect(() =>
      loadEnv({ ...prod, BETTER_AUTH_URL: "http://qa.example.com" })
    ).toThrow(/BETTER_AUTH_URL[\s\S]*https/)
    expect(
      loadEnv({
        ...prod,
        WEB_ORIGIN: "https://qa.example.com",
        BETTER_AUTH_URL: "https://qa.example.com",
      }).NODE_ENV
    ).toBe("production")
    // Running the production build locally stays possible.
    expect(loadEnv(prod).NODE_ENV).toBe("production")
  })
})
