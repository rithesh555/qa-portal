import { expect, type Browser, type Locator, type Page } from "@playwright/test"
import type { PortalApi } from "./api.ts"
import { e2eEnv } from "./env.ts"
import { clientIp } from "./roles.ts"

/** Picks an option in a Base UI select opened from `trigger`. */
export async function choose(page: Page, trigger: Locator, option: string) {
  await trigger.click()
  await page.getByRole("option", { name: option, exact: true }).click()
}

/** The table row that holds `text` (a name, @username or key). */
export const rowWith = (page: Page, text: string) =>
  page.getByRole("row").filter({ hasText: text })

/** Search boxes on list pages commit 300 ms after typing stops. */
export async function search(page: Page, label: string, term: string) {
  await page.getByRole("searchbox", { name: label }).fill(term)
  // The box commits after a debounce; wait until the list is filtered by it.
  await expect
    .poll(() => new URL(page.url()).searchParams.get("q"))
    .toBe(term.trim())
}

interface ProjectDetail {
  name: string
  description: string
  version: number
}

/** Renames a project behind the UI's back (someone else's edit). */
export async function renameProject(api: PortalApi, key: string, name: string) {
  const p = await api.get<ProjectDetail>(`/projects/${key}`)
  await api.patch(`/projects/${key}`, {
    name,
    description: p.description,
    version: p.version,
  })
}

interface ReleaseRow {
  id: string
  name: string
  description: string
  status: string
  startDate: string | null
  targetDate: string | null
  version: number
}

/** Edits a release behind the UI's back. */
export async function editRelease(
  api: PortalApi,
  key: string,
  id: string,
  change: Partial<Omit<ReleaseRow, "id" | "version">>
) {
  const { items } = await api.get<{ items: ReleaseRow[] }>(
    `/projects/${key}/releases`
  )
  const r = items.find((x) => x.id === id)
  if (!r) throw new Error(`release ${id} not found`)
  await api.patch(`/projects/${key}/releases/${id}`, {
    name: r.name,
    description: r.description,
    status: r.status,
    startDate: r.startDate,
    targetDate: r.targetDate,
    version: r.version,
    ...change,
  })
}

export const setRole = (
  api: PortalApi,
  key: string,
  userId: string,
  role: string
) => api.patch(`/projects/${key}/members/${userId}`, { role })

/** A signed-out browser context that talks to the E2E stack as this slot. */
export async function anonymousBrowser(browser: Browser, slot: number) {
  return browser.newContext({
    baseURL: e2eEnv.baseURL,
    storageState: { cookies: [], origins: [] },
    extraHTTPHeaders: { "X-Forwarded-For": clientIp(slot) },
  })
}
