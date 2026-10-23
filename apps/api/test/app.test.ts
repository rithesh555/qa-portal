import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { buildTestApp } from "./helpers.ts"

describe("app", () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildTestApp({
      beforeReady: (instance) => {
        instance.get("/api/test/unique-clash", async () => {
          throw Object.assign(new Error("Unique constraint failed"), {
            code: "P2002",
          })
        })
      },
    })
  })
  afterAll(async () => {
    await app.close()
  })

  it("GET /api/health reports the process is up", async () => {
    const res = await app.inject({ method: "GET", url: "/api/health" })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: "ok" })
  })

  it("GET /api/ready checks the database", async () => {
    const res = await app.inject({ method: "GET", url: "/api/ready" })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: "ok", database: "up" })
  })

  it("sets security headers", async () => {
    const res = await app.inject({ method: "GET", url: "/api/health" })
    expect(res.headers["x-content-type-options"]).toBe("nosniff")
    expect(res.headers["x-frame-options"]).toBeDefined()
  })

  it("allows credentialed CORS from the web origin only", async () => {
    const ok = await app.inject({
      method: "OPTIONS",
      url: "/api/health",
      headers: {
        origin: "http://localhost:5173",
        "access-control-request-method": "GET",
      },
    })
    expect(ok.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173"
    )
    expect(ok.headers["access-control-allow-credentials"]).toBe("true")

    const evil = await app.inject({
      method: "OPTIONS",
      url: "/api/health",
      headers: {
        origin: "https://evil.example",
        "access-control-request-method": "GET",
      },
    })
    expect(evil.headers["access-control-allow-origin"]).toBeUndefined()
  })

  it("returns a JSON 404 for unknown routes", async () => {
    const res = await app.inject({ method: "GET", url: "/api/nope" })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toMatchObject({
      statusCode: 404,
      error: "Not Found",
    })
  })

  it("turns a database uniqueness clash into 409 without leaking details", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/test/unique-clash",
    })
    expect(res.statusCode).toBe(409)
    expect(res.json()).toEqual({
      statusCode: 409,
      error: "Conflict",
      message: "That value is already in use",
    })
  })
})

describe("API docs", () => {
  it("are served in development", async () => {
    const dev = await buildTestApp({ env: { NODE_ENV: "development" } })
    try {
      const res = await dev.inject({ method: "GET", url: "/api/docs/json" })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({
        openapi: expect.stringMatching(/^3\./),
        info: { title: "QA Portal API" },
      })
      expect(Object.keys(res.json().paths)).toContain("/api/health")
    } finally {
      await dev.close()
    }
  })

  it.each(["production", "test"] as const)(
    "are not served in %s (no route list for anyone)",
    async (NODE_ENV) => {
      const other = await buildTestApp({ env: { NODE_ENV } })
      try {
        for (const url of ["/api/docs", "/api/docs/json"])
          expect((await other.inject({ method: "GET", url })).statusCode).toBe(
            404
          )
      } finally {
        await other.close()
      }
    }
  )
})
