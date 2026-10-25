import {
  test as base,
  expect,
  request as playwrightRequest,
  type APIRequestContext,
  type Browser,
  type Page,
} from "@playwright/test"
import { newProjectKey, PortalApi, unique, userIds } from "./api.ts"
import { e2eEnv } from "./env.ts"
import { clientIp, statePath, username, type Role } from "./roles.ts"

export { expect }
export { BASE } from "./baseline.ts"
export { PortalApi, unique } from "./api.ts"

/** A throwaway project for one test: slot lead, tester and viewer as members. */
export interface TestProject {
  key: string
  name: string
  /** Account ids of this slot's users. */
  ids: Record<Role, string>
  admin: PortalApi
  lead: PortalApi
  tester: PortalApi
}

export interface Actor {
  role: Role
  username: string
  page: Page
  api: APIRequestContext
}

interface Fixtures {
  /** Who the default `page` and `api` are signed in as. */
  role: Role | "anonymous"
  /** This worker's account slot: e2e.<role>.<slot>. */
  slot: number
  /** API client signed in as `role`, sending the portal's Origin. */
  api: APIRequestContext
  /** Another signed-in user in the same test (own browser context). */
  as: (role: Role) => Promise<Actor>
  /** Created on first use; every test that changes data uses its own. */
  project: TestProject
}

export async function apiContext(
  slot: number,
  role: Role | "anonymous",
  ip = clientIp(slot)
): Promise<APIRequestContext> {
  return playwrightRequest.newContext({
    baseURL: e2eEnv.baseURL,
    // Explicitly empty when anonymous: new contexts otherwise inherit the
    // test's signed-in storage state.
    storageState:
      role === "anonymous"
        ? { cookies: [], origins: [] }
        : statePath(role, slot),
    // The API only accepts writes that carry the portal's own origin.
    extraHTTPHeaders: { Origin: e2eEnv.baseURL, "X-Forwarded-For": ip },
  })
}

async function actor(
  browser: Browser,
  slot: number,
  role: Role
): Promise<Actor & { close: () => Promise<void> }> {
  const context = await browser.newContext({
    baseURL: e2eEnv.baseURL,
    storageState: statePath(role, slot),
    extraHTTPHeaders: { "X-Forwarded-For": clientIp(slot) },
  })
  const api = await apiContext(slot, role)
  const page = await context.newPage()
  return {
    role,
    username: username(role, slot),
    page,
    api,
    close: async () => {
      await context.close()
      await api.dispose()
    },
  }
}

export const test = base.extend<Fixtures>({
  role: ["admin", { option: true }],
  // eslint-disable-next-line no-empty-pattern -- Playwright needs the pattern
  slot: async ({}, use, testInfo) => {
    await use(testInfo.parallelIndex)
  },
  storageState: async ({ role, slot }, use) => {
    await use(role === "anonymous" ? undefined : statePath(role, slot))
  },
  extraHTTPHeaders: async ({ slot }, use) => {
    await use({ "X-Forwarded-For": clientIp(slot) })
  },
  api: async ({ role, slot }, use) => {
    const api = await apiContext(slot, role)
    await use(api)
    await api.dispose()
  },
  as: async ({ browser, slot }, use) => {
    const opened: { close: () => Promise<void> }[] = []
    await use(async (role) => {
      const a = await actor(browser, slot, role)
      opened.push(a)
      return a
    })
    for (const a of opened) await a.close()
  },
  project: async ({ slot }, use) => {
    const [adminCtx, leadCtx, testerCtx] = await Promise.all([
      apiContext(slot, "admin"),
      apiContext(slot, "lead"),
      apiContext(slot, "tester"),
    ])
    const admin = new PortalApi(adminCtx)
    const ids = userIds(slot)
    const key = newProjectKey()
    const name = `E2E project ${unique()}`
    await admin.createProject({ key, name, leadUserId: ids.lead })
    await admin.addMembers(key, [ids.tester], "tester")
    await admin.addMembers(key, [ids.viewer], "viewer")
    await use({
      key,
      name,
      ids,
      admin,
      lead: new PortalApi(leadCtx),
      tester: new PortalApi(testerCtx),
    })
    await Promise.all([adminCtx, leadCtx, testerCtx].map((c) => c.dispose()))
  },
})
