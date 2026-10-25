import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"
import type { PortalApi } from "./api.ts"
import { unique } from "./api.ts"
import type { TestProject } from "./index.ts"
import { choose as chooseOption } from "./cases-helpers.ts"

export interface SeededResult {
  caseKey: string
  caseTitle: string
  runKey: string
  runCaseId: string
}

/**
 * One case in a new run with a failed (or blocked) result recorded by the
 * project's tester, the usual starting point for "Log defect".
 */
export async function failedResult(
  project: TestProject,
  opts: {
    status?: "failed" | "blocked" | "passed"
    note?: string
    title?: string
    releaseId?: string | null
    runName?: string
  } = {}
): Promise<SeededResult> {
  const status = opts.status ?? "failed"
  const caseTitle = opts.title ?? `Pay with a saved card ${unique()}`
  const c = await project.tester.createCase(project.key, { title: caseTitle })
  return resultInNewRun(project, c.key, caseTitle, status, opts)
}

/** A new run of one existing case, with a result recorded on it. */
export async function resultInNewRun(
  project: TestProject,
  caseKey: string,
  caseTitle: string,
  status: "failed" | "blocked" | "passed",
  opts: { note?: string; releaseId?: string | null; runName?: string } = {}
): Promise<SeededResult> {
  const run = await project.tester.createRun(project.key, {
    name: opts.runName ?? `Run ${unique()}`,
    releaseId: opts.releaseId ?? null,
    environment: "staging build 7",
    selection: { mode: "all" },
  })
  const rc = (await project.tester.runCases(project.key, run.key)).find(
    (x) => x.caseKey === caseKey
  )!
  await project.tester.recordResult(project.key, run.key, rc.id, {
    status,
    note:
      status === "passed"
        ? ""
        : (opts.note ?? "Card is refused with error 500"),
    expectedVersion: rc.version,
  })
  return { caseKey, caseTitle, runKey: run.key, runCaseId: rc.id }
}

export interface SeededDefect {
  id: string
  key: string
  version: number
  title: string
}

/** Logs a new defect from a result, as the tester (source: result, linked). */
export async function logDefect(
  project: TestProject,
  result: SeededResult,
  fields: { title?: string; severity?: string; assigneeId?: string | null } = {}
): Promise<SeededDefect> {
  const title = fields.title ?? `${result.caseTitle}: refused`
  const d = await project.tester.post<{
    id: string
    key: string
    version: number
  }>(`/projects/${project.key}/defects/log`, {
    runCaseId: result.runCaseId,
    defect: {
      mode: "new",
      title,
      steps: "1. Pay",
      actual: "Refused",
      severity: fields.severity ?? "major",
      assigneeId: fields.assigneeId ?? null,
    },
  })
  return { ...d, title }
}

/** A defect logged by hand. */
export async function manualDefect(
  api: PortalApi,
  key: string,
  fields: {
    title?: string
    severity?: "critical" | "major" | "minor" | "trivial"
    assigneeId?: string | null
    foundInReleaseId?: string | null
  } = {}
): Promise<SeededDefect> {
  const title = fields.title ?? `Receipt total is wrong ${unique()}`
  const d = await api.createDefect(key, { ...fields, title })
  return { ...d, title }
}

const PATHS: Record<string, string[]> = {
  new: [],
  open: ["open"],
  in_progress: ["open", "in_progress"],
  fixed: ["open", "in_progress", "fixed"],
  closed: ["open", "in_progress", "fixed", "closed"],
}

/** Walks a defect through the workflow (lead confirms, the rest as tester). */
export async function moveDefect(
  project: TestProject,
  d: SeededDefect,
  to: "open" | "in_progress" | "fixed" | "closed" | "rejected"
): Promise<SeededDefect> {
  let version = d.version
  const steps = to === "rejected" ? ["rejected"] : PATHS[to]!
  for (const step of steps) {
    const actor =
      step === "open" || step === "rejected" ? project.lead : project.tester
    ;({ version } = await actor.transition(project.key, d.key, {
      to: step as "open",
      note: "",
      version,
      ...(step === "rejected" ? { resolution: "not_a_defect" } : {}),
    } as never))
  }
  return { ...d, version }
}

/**
 * Picks an option from a Base UI select by the select's accessible name. Plain
 * names go through the shared `choose`; a RegExp matches options whose name
 * also carries a hint (e.g. "Critical — blocks …").
 */
export async function choose(
  page: Page,
  select: string | RegExp,
  option: string | RegExp
) {
  const trigger = page.getByRole("combobox", { name: select })
  if (typeof option === "string") return chooseOption(page, trigger, option)
  const shown = option.source.replace(/^\^/, "")
  await expect(async () => {
    if (!(await page.getByRole("listbox").isVisible()))
      await trigger.click({ timeout: 2000 })
    await page.getByRole("option", { name: option }).click({ timeout: 2000 })
    await expect(trigger).toContainText(shown, { timeout: 1000 })
  }).toPass({ timeout: 15_000 })
}

/** The defects table rows' title links. */
export const defectLinks = (page: Page) =>
  page
    .getByRole("region", { name: "Defects" })
    .locator("tbody tr td:nth-child(2) > a")

/** Waits for the defect page header. */
export async function openDefect(
  page: Page,
  key: string,
  ref: string,
  title: string
) {
  await page.goto(`/projects/${key}/defects/${ref}`)
  await expect(
    page.getByRole("heading", { level: 1, name: title })
  ).toBeVisible()
}

/** YYYY-MM-DD, `days` from today (UTC). */
export const dayFromNow = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)

export interface SeededRelease {
  id: string
  name: string
  runKey: string
  defect: SeededDefect
}

/**
 * A release in progress with one run of three Ready cases (2 passed, 1
 * failed, assigned to the tester) and an open Critical defect found in it.
 */
export async function releaseWithResults(
  project: TestProject,
  opts: { name?: string; targetInDays?: number; leaveUntested?: boolean } = {}
): Promise<SeededRelease> {
  const name = opts.name ?? "R1"
  const release = await project.lead.createRelease(project.key, {
    name,
    status: "in_progress",
    targetDate: dayFromNow(opts.targetInDays ?? 5),
  })
  for (const t of ["Pay by card", "Pay by voucher", "Refund an order"])
    await project.tester.createCase(project.key, { title: t })
  const run = await project.tester.createRun(project.key, {
    name: `${name} regression`,
    releaseId: release.id,
    assigneeIds: [project.ids.tester],
  })
  if (!opts.leaveUntested) {
    const outcomes = ["passed", "passed", "failed"] as const
    for (const [i, rc] of (
      await project.tester.runCases(project.key, run.key)
    ).entries())
      await project.tester.recordResult(project.key, run.key, rc.id, {
        status: outcomes[i]!,
        note: outcomes[i] === "failed" ? "Refund never arrives" : "",
        expectedVersion: rc.version,
      })
  }
  const defect = await moveDefect(
    project,
    await manualDefect(project.tester, project.key, {
      title: `Refund never arrives ${unique()}`,
      severity: "critical",
      foundInReleaseId: release.id,
    }),
    "open"
  )
  return { id: release.id, name, runKey: run.key, defect }
}

/** Reads a downloaded CSV into rows (byte-order mark removed). */
export async function readCsv(download: import("@playwright/test").Download) {
  const { readFile } = await import("node:fs/promises")
  const Papa = (await import("papaparse")).default
  const text = (await readFile(await download.path()))
    .toString("utf8")
    .replace(/^\uFEFF/, "")
  return Papa.parse<string[]>(text.trim()).data
}
