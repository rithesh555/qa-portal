import type { z } from "zod"

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as {
    message?: string
  } | null
  return new ApiError(res.status, body?.message ?? res.statusText)
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
  if (!res.ok) throw await toApiError(res)
  return schema.parse(await res.json())
}

/**
 * Send a JSON body to our API. With a schema, the response is validated and
 * returned; without one (e.g. 204 No Content) nothing is returned.
 */
export async function apiSend<S extends z.ZodType>(
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
  schema?: S,
  init?: { signal?: AbortSignal }
): Promise<z.infer<S>> {
  const res = await fetch(`/api${path}`, {
    method,
    signal: init?.signal,
    credentials: "same-origin",
    headers: {
      accept: "application/json",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  if (!res.ok) throw await toApiError(res)
  return schema ? schema.parse(await res.json()) : (undefined as z.infer<S>)
}

/** A message fit to show the user for any thrown error. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message
  return "We couldn't reach the server. Try again in a moment."
}

/** A query string from an object, skipping undefined and empty values. */
export function toSearch(query: object): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value))
  }
  return params.toString()
}
