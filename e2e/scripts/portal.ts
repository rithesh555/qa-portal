// A small client for the dev portal (where E2E cases and runs are recorded).
import "../fixtures/env.ts"

export function portalSettings() {
  const need = (name: string) => {
    const v = process.env[name]
    if (!v) throw new Error(`${name} is missing in .env — see .env.example.`)
    return v
  }
  return {
    url: need("E2E_PORTAL_URL").replace(/\/$/, ""),
    username: need("E2E_PORTAL_USERNAME"),
    password: () => need("E2E_PORTAL_PASSWORD"),
    projectKey: need("E2E_PORTAL_PROJECT_KEY"),
    need,
  }
}

export class PortalError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export interface Portal {
  call<T>(method: string, path: string, body?: unknown): Promise<T>
}

/** Signs in and returns a client that keeps the session cookie. */
export async function signInToPortal(
  url: string,
  username: string,
  password: string
): Promise<Portal> {
  let cookie = ""
  const call = async <T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> => {
    const res = await fetch(`${url}/api${path}`, {
      method,
      headers: {
        // Writes must carry the portal's own origin.
        Origin: url,
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const set = res.headers.getSetCookie()
    if (set.length) cookie = set.map((c) => c.split(";")[0]).join("; ")
    const text = await res.text()
    if (!res.ok)
      throw new PortalError(
        res.status,
        `${method} ${path}: ${res.status} ${text.slice(0, 300)}`
      )
    return (text ? JSON.parse(text) : undefined) as T
  }
  await call("POST", "/auth/sign-in/username", { username, password })
  return { call }
}
