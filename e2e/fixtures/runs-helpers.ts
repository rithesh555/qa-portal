import type { Locator, Page } from "@playwright/test"
import type { PortalApi, TestProject } from "./index.ts"

export interface SeededCase {
  id: string
  key: string
  title: string
}

/**
 * Cases for a run: `ready` Ready ones in suite "Checkout" (titles
 * "Run case 1"…), plus `drafts` Draft ones and `labelled` Ready ones
 * labelled "smoke" in suite "Payments".
 */
export async function seedCases(
  p: TestProject,
  { ready = 3, drafts = 0, labelled = 0 } = {}
) {
  const checkout = await p.lead.createSuite(p.key, "Checkout")
  const payments = await p.lead.createSuite(p.key, "Payments")
  const cases: SeededCase[] = []
  for (let i = 1; i <= ready; i++)
    cases.push({
      ...(await p.tester.createCase(p.key, {
        title: `Run case ${i}`,
        suiteId: checkout.id,
      })),
      title: `Run case ${i}`,
    })
  const draftCases: SeededCase[] = []
  for (let i = 1; i <= drafts; i++)
    draftCases.push({
      ...(await p.tester.createCase(p.key, {
        title: `Draft case ${i}`,
        suiteId: checkout.id,
        status: "draft",
      })),
      title: `Draft case ${i}`,
    })
  const smoke: SeededCase[] = []
  for (let i = 1; i <= labelled; i++)
    smoke.push({
      ...(await p.tester.createCase(p.key, {
        title: `Smoke case ${i}`,
        suiteId: payments.id,
        labels: ["smoke"],
      })),
      title: `Smoke case ${i}`,
    })
  return { checkout, payments, cases, draftCases, smoke }
}

/** A run over every Ready case, started by `api` (the tester unless given). */
export async function startRun(
  p: TestProject,
  name = "Smoke run",
  api: PortalApi = p.tester,
  extra: Record<string, unknown> = {}
) {
  return api.createRun(p.key, { name, ...extra })
}

/** Records a result on every case of a run, through the API. */
export async function recordAll(
  p: TestProject,
  run: string,
  status: "passed" | "failed" | "blocked" | "skipped",
  api: PortalApi = p.tester
) {
  for (const rc of await api.runCases(p.key, run))
    await api.recordResult(p.key, run, rc.id, {
      status,
      note: status === "failed" || status === "blocked" ? "Broken" : "",
      expectedVersion: rc.version,
    })
}

/** Changes a case's title (a new version of the case). */
export async function retitleCase(
  api: PortalApi,
  projectKey: string,
  caseKey: string,
  title: string
) {
  const c = await api.get<Record<string, unknown>>(
    `/projects/${projectKey}/cases/${caseKey}`
  )
  await api.patch(`/projects/${projectKey}/cases/${caseKey}`, {
    title,
    suiteId: c.suiteId,
    priority: c.priority,
    type: c.type,
    status: c.status,
    labels: c.labels,
    references: c.references,
    preconditions: c.preconditions,
    steps: c.steps,
    version: c.version,
  })
}

export const runUrl = (p: { key: string }, run: string) =>
  `/projects/${p.key}/runs/${run}`

/** The desktop list of cases beside the current one. */
export const caseList = (page: Page) =>
  page.getByRole("complementary", { name: "Cases in this run" })

export const resultButton = (page: Page, label: string): Locator =>
  page
    .getByRole("group", { name: "Record a result" })
    .getByRole("button", { name: label, exact: true })

export const currentCase = (page: Page) => page.locator("#run-case-title")

/** Opens a Base UI select by its accessible name and picks an option. */
export async function choose(
  scope: Page | Locator,
  name: string,
  option: string
) {
  await scope.getByRole("combobox", { name }).click()
  const page = "keyboard" in scope ? scope : scope.page()
  await page.getByRole("option", { name: option, exact: true }).click()
}
