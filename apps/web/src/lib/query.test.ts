import { describe, expect, it } from "vitest"
import { ApiError } from "./api"
import { sessionQueryKey } from "@/features/auth/session"
import { createQueryClient, shouldRetry } from "./query"

describe("shouldRetry", () => {
  it("never retries answers that won't change (4xx)", () => {
    for (const status of [400, 401, 403, 404, 409, 422]) {
      expect(shouldRetry(0, new ApiError(status, "x"))).toBe(false)
    }
  })

  it("retries server errors and network failures twice", () => {
    expect(shouldRetry(0, new ApiError(503, "x"))).toBe(true)
    expect(shouldRetry(1, new TypeError("Failed to fetch"))).toBe(true)
    expect(shouldRetry(2, new TypeError("Failed to fetch"))).toBe(false)
  })

  it("still retries rate limiting", () => {
    expect(shouldRetry(0, new ApiError(429, "x"))).toBe(true)
  })
})

describe("createQueryClient", () => {
  it("re-checks the session when any request comes back 401, so the app goes to sign-in", async () => {
    const client = createQueryClient()
    client.setQueryData(sessionQueryKey, { id: "u1" })
    await client
      .fetchQuery({
        queryKey: ["cases"],
        queryFn: () =>
          Promise.reject(new ApiError(401, "Authentication required")),
      })
      .catch(() => {})
    expect(client.getQueryState(sessionQueryKey)?.isInvalidated).toBe(true)
  })

  it("leaves the session alone for other errors", async () => {
    const client = createQueryClient()
    client.setQueryData(sessionQueryKey, { id: "u1" })
    await client
      .fetchQuery({
        queryKey: ["cases"],
        queryFn: () => Promise.reject(new ApiError(404, "Not found")),
        retry: false,
      })
      .catch(() => {})
    expect(client.getQueryState(sessionQueryKey)?.isInvalidated).toBe(false)
  })
})
