import { expect, test } from "../../fixtures/index.ts"
import {
  choose,
  failedResult,
  logDefect,
  moveDefect,
  resultInNewRun,
} from "../../fixtures/defects-helpers.ts"

test.use({ role: "tester" })

const logDialog = (page: import("@playwright/test").Page) =>
  page.getByRole("dialog", { name: "Log a defect for this result" })

test("E2E-DEF-001 log a defect from a failed result, prefilled from the case", async ({
  page,
  project,
}) => {
  const r = await failedResult(project, {
    note: "Card is refused with error 500",
  })
  await page.goto(
    `/projects/${project.key}/runs/${r.runKey}?case=${r.runCaseId}`
  )
  await page.getByRole("button", { name: "Log defect…" }).click()
  const d = logDialog(page)
  await expect(d).toContainText(`${r.runKey} › ${r.caseKey}`)
  await expect(d).toContainText("failed")
  await expect(d.getByLabel("Title")).toHaveValue(
    `${r.caseTitle}: Card is refused with error 500`
  )
  await expect(d.getByLabel("Actual", { exact: true })).toHaveValue(
    "Card is refused with error 500"
  )
  await expect(d.getByLabel(/Environment/)).toHaveValue("staging build 7")
  await choose(page, "Severity", "Major")
  await d.getByRole("button", { name: "Log defect" }).click()

  const key = `${project.key}-D-1`
  await expect(page.getByText(`${key} logged as New`)).toBeVisible()
  await expect(d).toBeHidden()
  const known = page.getByRole("region", { name: "Known defects on this case" })
  await expect(known).toContainText(key)

  await known.getByRole("link", { name: key }).click()
  await expect(page).toHaveURL(`/projects/${project.key}/defects/${key}`)
  await expect(page.getByText("from a failed result")).toBeVisible()
  await expect(
    page.getByRole("region", { name: /Linked results \(1\)/ })
  ).toContainText(`${r.runKey} › ${r.caseKey}`)
})

test("E2E-DEF-002 a tester logging from a blocked result is told a lead will triage it", async ({
  page,
  project,
}) => {
  const r = await failedResult(project, {
    status: "blocked",
    note: "Payment sandbox is down",
  })
  await page.goto(
    `/projects/${project.key}/runs/${r.runKey}?case=${r.runCaseId}`
  )
  await page.getByRole("button", { name: "Log defect…" }).click()
  const d = logDialog(page)
  await expect(d).toContainText("blocked")
  await choose(page, "Severity", "Minor")
  await d.getByRole("button", { name: "Log defect" }).click()
  await expect(page.getByText("A QA Lead will triage it.")).toBeVisible()
})

test("E2E-DEF-003 link a result to a defect already reported on the case", async ({
  page,
  project,
}) => {
  const first = await failedResult(project)
  const defect = await logDefect(project, first)
  await moveDefect(project, defect, "open")
  const again = await resultInNewRun(
    project,
    first.caseKey,
    first.caseTitle,
    "failed"
  )

  await page.goto(
    `/projects/${project.key}/runs/${again.runKey}?case=${again.runCaseId}`
  )
  await page.getByRole("button", { name: "Log defect…" }).click()
  const d = logDialog(page)
  await expect(d.getByText("Already reported?")).toBeVisible()
  await d
    .getByRole("radio", {
      name: new RegExp(`Link this result to ${defect.key}`),
    })
    .check()
  await d.getByRole("button", { name: `Link to ${defect.key}` }).click()
  await expect(page.getByText(`Linked to ${defect.key}`)).toBeVisible()

  await page.goto(`/projects/${project.key}/defects/${defect.key}`)
  await expect(
    page.getByRole("region", { name: "Linked results (2)" })
  ).toBeVisible()
})

test("E2E-DEF-004 a fixed defect failing again is reopened from the log dialog, with a note", async ({
  page,
  project,
}) => {
  const first = await failedResult(project)
  const defect = await moveDefect(
    project,
    await logDefect(project, first),
    "fixed"
  )
  const again = await resultInNewRun(
    project,
    first.caseKey,
    first.caseTitle,
    "failed"
  )

  await page.goto(
    `/projects/${project.key}/runs/${again.runKey}?case=${again.runCaseId}`
  )
  await page.getByRole("button", { name: "Log defect…" }).click()
  const d = logDialog(page)
  await d
    .getByRole("radio", {
      name: new RegExp(`This fails again: reopen ${defect.key}`),
    })
    .check()
  await d.getByRole("button", { name: `Reopen ${defect.key}` }).click()
  await expect(
    d.getByText("Say what still fails before reopening")
  ).toBeVisible()
  await d
    .getByLabel("What still fails? (required to reopen)")
    .fill("Still refused on build 8")
  await d.getByRole("button", { name: `Reopen ${defect.key}` }).click()
  await expect(page.getByText(`${defect.key} reopened`)).toBeVisible()

  await page.goto(`/projects/${project.key}/defects/${defect.key}`)
  await expect(
    page.getByRole("list", { name: "Status history" })
  ).toContainText("Reopened")
})

test("E2E-DEF-005 the log dialog checks title and severity", async ({
  page,
  project,
}) => {
  const r = await failedResult(project)
  await page.goto(
    `/projects/${project.key}/runs/${r.runKey}?case=${r.runCaseId}`
  )
  await page.getByRole("button", { name: "Log defect…" }).click()
  const d = logDialog(page)
  await d.getByLabel("Title").fill("")
  await d.getByRole("button", { name: "Log defect" }).click()
  await expect(d.getByText("Give the defect a title")).toBeVisible()
  await expect(d.getByText("Choose a severity")).toBeVisible()
  await expect(d.getByLabel("Title")).toBeFocused()
})
