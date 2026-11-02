import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import {
  expect,
  type Download,
  type Locator,
  type Page,
} from "@playwright/test"
import Papa from "papaparse"
import { readSheet } from "read-excel-file/node"
import type { PortalApi } from "./api.ts"

/** The sample spreadsheets in docs/samples. */
export const SAMPLES = {
  clean: fileURLToPath(
    new URL("../../docs/samples/test-cases-sample.xlsx", import.meta.url)
  ),
  problems: fileURLToPath(
    new URL("../../docs/samples/test-cases-with-problems.xlsx", import.meta.url)
  ),
}

export interface CaseDetail {
  id: string
  key: string
  title: string
  version: number
  revision: number
  suiteId: string | null
  priority: string
  type: string
  status: string
  labels: string[]
  references: string
  preconditions: string
  steps: { action: string; expected: string }[]
  archived: boolean
}

export const getCase = (api: PortalApi, key: string, ref: string) =>
  api.get<CaseDetail>(`/projects/${key}/cases/${ref}`)

/** Saves a case's fields as someone else would (a new version). */
export async function editCase(
  api: PortalApi,
  key: string,
  ref: string,
  changes: Partial<CaseDetail>
) {
  const c = await getCase(api, key, ref)
  return api.patch<CaseDetail>(`/projects/${key}/cases/${ref}`, {
    title: c.title,
    suiteId: c.suiteId,
    priority: c.priority,
    type: c.type,
    status: c.status,
    labels: c.labels,
    references: c.references,
    preconditions: c.preconditions,
    steps: c.steps,
    ...changes,
    version: c.version,
  })
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/**
 * Opens a Base UI select (by its trigger) and picks an option. Retried: a
 * click that lands while the list is still opening is ignored by Base UI.
 */
export async function choose(page: Page, trigger: Locator, option: string) {
  const listbox = page.getByRole("listbox")
  await expect(async () => {
    if (!(await listbox.isVisible())) await trigger.click({ timeout: 2000 })
    await page
      .getByRole("option", { name: option, exact: true })
      .click({ timeout: 2000 })
    await expect(listbox).toBeHidden({ timeout: 1000 })
    // `option` is escaped; it comes from the test itself.
    // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp
    await expect(trigger).toHaveText(new RegExp(escape(option)), {
      timeout: 1000,
    })
  }).toPass({ timeout: 15_000 })
}

/** Opens a menu from its trigger and picks an item, retried like `choose`. */
export async function pickMenu(page: Page, trigger: Locator, item: string) {
  await expect(async () => {
    const menu = page.getByRole("menu")
    if (!(await menu.isVisible())) await trigger.click({ timeout: 2000 })
    await page
      .getByRole("menuitem", { name: item, exact: true })
      .click({ timeout: 2000 })
    await expect(menu).toBeHidden({ timeout: 1000 })
  }).toPass({ timeout: 15_000 })
}

/** The case list table. */
export const caseList = (page: Page) =>
  page.getByRole("region", { name: "Test case list" })

/** The titles shown in the list, top to bottom. */
export async function listedTitles(page: Page): Promise<string[]> {
  const table = caseList(page).getByRole("table")
  await expect(table).toHaveAttribute("aria-busy", "false")
  return table.getByRole("row").locator("td a").allInnerTexts()
}

export const suiteNav = (page: Page) =>
  page.getByRole("navigation", { name: "Suites" })

export async function rowsOfCsv(download: Download): Promise<string[][]> {
  const raw = readFileSync(await download.path(), "utf8")
  // Our CSVs start with a byte-order mark so Excel reads them as UTF-8.
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw
  return Papa.parse<string[]>(text.trim(), { skipEmptyLines: true }).data
}

export async function rowsOfXlsx(download: Download): Promise<string[][]> {
  const rows = await readSheet(await download.path())
  return rows.map((r) => r.map((c) => (c === null ? "" : String(c))))
}
