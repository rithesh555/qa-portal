import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import type { APIRequestContext, APIResponse } from "@playwright/test"
import type {
  CaseInput,
  CreateDefectInput,
  CreateRunInput,
  ReleaseInput,
  RecordResultInput,
  TransitionInput,
} from "@qa/shared"
import type { Role } from "./roles.ts"

export const idsPath = fileURLToPath(
  new URL("../.auth/ids.json", import.meta.url)
)

/** User ids of the seeded accounts, saved by auth.setup.ts: ids[slot][role]. */
export function userIds(slot: number): Record<Role, string> {
  const all = JSON.parse(readFileSync(idsPath, "utf8")) as Record<
    string,
    Record<Role, string>
  >
  const ids = all[String(slot)]
  if (!ids) throw new Error(`No seeded accounts for slot ${slot}`)
  return ids
}

async function ok<T>(res: APIResponse, what: string): Promise<T> {
  if (!res.ok())
    throw new Error(`${what} failed: ${res.status()} ${await res.text()}`)
  return (res.status() === 204 ? undefined : await res.json()) as T
}

/** A short unique suffix for names other workers will also see. */
export const unique = () =>
  `${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase()

/** A fresh project key: Z + 5 characters (keys are 2–6, letters and digits). */
export const newProjectKey = () => `Z${unique().slice(0, 5)}`

export const STEPS = [
  { action: "Open the checkout page", expected: "The basket is shown" },
  { action: "Pay with a valid card", expected: "The order is confirmed" },
]

/**
 * Test data through the real API, as whoever `api` is signed in as. Every
 * rule the UI relies on (permissions, versions, history) applies.
 */
export class PortalApi {
  readonly api: APIRequestContext
  constructor(api: APIRequestContext) {
    this.api = api
  }

  get<T>(url: string) {
    return this.api.get(`/api${url}`).then((r) => ok<T>(r, `GET ${url}`))
  }
  post<T>(url: string, data?: unknown) {
    return this.api
      .post(`/api${url}`, data === undefined ? {} : { data })
      .then((r) => ok<T>(r, `POST ${url}`))
  }
  patch<T>(url: string, data: unknown) {
    return this.api
      .patch(`/api${url}`, { data })
      .then((r) => ok<T>(r, `PATCH ${url}`))
  }
  delete<T>(url: string) {
    return this.api.delete(`/api${url}`).then((r) => ok<T>(r, `DELETE ${url}`))
  }

  createProject(input: {
    key: string
    name: string
    leadUserId: string
    description?: string
  }) {
    return this.post<{ key: string; id: string }>("/projects", {
      description: "",
      ...input,
    })
  }
  addMembers(
    key: string,
    userIds: string[],
    role: "lead" | "tester" | "viewer"
  ) {
    return this.post(`/projects/${key}/members`, { userIds, role })
  }
  createRelease(key: string, input: ReleaseInput) {
    return this.post<{ id: string; name: string; version: number }>(
      `/projects/${key}/releases`,
      input
    )
  }
  createSuite(key: string, name: string, parentId: string | null = null) {
    return this.post<{ id: string; name: string }>(`/projects/${key}/suites`, {
      name,
      parentId,
    })
  }
  createCase(key: string, input: Partial<CaseInput> & { title: string }) {
    return this.post<{ id: string; key: string; version: number }>(
      `/projects/${key}/cases`,
      {
        suiteId: null,
        priority: "medium",
        type: "functional",
        status: "ready",
        steps: STEPS,
        ...input,
      }
    )
  }
  createRun(key: string, input: Partial<CreateRunInput> & { name: string }) {
    return this.post<{ key: string; id: string }>(`/projects/${key}/runs`, {
      releaseId: null,
      selection: { mode: "all" },
      ...input,
    })
  }
  runCases(key: string, run: string) {
    return this.get<{
      items: {
        id: string
        caseKey: string
        title: string
        status: string
        version: number
      }[]
    }>(`/projects/${key}/runs/${run}/cases`).then((r) => r.items)
  }
  recordResult(
    key: string,
    run: string,
    runCaseId: string,
    input: Omit<RecordResultInput, "expectedVersion"> & {
      expectedVersion: number
    }
  ) {
    return this.post(
      `/projects/${key}/runs/${run}/cases/${runCaseId}/results`,
      input
    )
  }
  createDefect(
    key: string,
    input: Partial<CreateDefectInput> & { title: string }
  ) {
    return this.post<{ key: string; id: string; version: number }>(
      `/projects/${key}/defects`,
      { steps: "1. Do it", actual: "It breaks", severity: "major", ...input }
    )
  }
  transition(key: string, ref: string, input: TransitionInput) {
    return this.post<{ version: number }>(
      `/projects/${key}/defects/${ref}/transition`,
      input
    )
  }
  createUser(input: {
    name: string
    username: string
    email: string
    password: string
    role: "admin" | "user"
  }) {
    return this.post<{ id: string }>("/users", input)
  }
}
