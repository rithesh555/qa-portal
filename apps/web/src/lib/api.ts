import type { z } from "zod"

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

/** GET a JSON endpoint on our API and validate the response. */
export async function apiGet<S extends z.ZodType>(
  path: string,
  schema: S,
  init?: RequestInit
): Promise<z.infer<S>> {
  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: "same-origin",
    headers: { accept: "application/json", ...init?.headers },
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string
    } | null
    throw new ApiError(res.status, body?.message ?? res.statusText)
  }
  return schema.parse(await res.json())
}
