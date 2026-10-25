import { expect, test } from "../../fixtures/index.ts"
import {
  failedResult,
  logDefect,
  manualDefect,
  moveDefect,
  openDefect,
  resultInNewRun,
} from "../../fixtures/defects-helpers.ts"

test.use({ role: "tester" })

test("E2E-DEF-032 comment on a defect; activity lists every change", async ({
  page,
  project,
}) => {
  const d = await moveDefect(
    project,
    await manualDefect(project.tester, project.key),
    "open"
  )
  await openDefect(page, project.key, d.key, d.title)
  const activity = page.getByRole("region", { name: "Activity" })
  await activity
    .getByRole("textbox", { name: "Add a comment" })
    .fill("Seen on Safari only, logs attached in the tracker")
  await activity.getByRole("button", { name: "Comment" }).click()
  await expect(
    activity.getByText("Seen on Safari only, logs attached in the tracker")
  ).toBeVisible()
  await expect(
    activity.getByRole("textbox", { name: "Add a comment" })
  ).toHaveValue("")
  await activity.getByRole("tab", { name: "Comments (1)" }).click()
  await expect(activity.getByRole("listitem")).toHaveCount(1)
  const everything = activity.getByRole("tab", { name: /Everything/ })
  await everything.click()
  expect(
    Number(/\((\d+)\)/.exec((await everything.textContent()) ?? "")?.[1])
  ).toBeGreaterThanOrEqual(3)
})

test("E2E-DEF-033 unlink a result and undo it", async ({ page, project }) => {
  const r = await failedResult(project)
  const d = await logDefect(project, r)
  await openDefect(page, project.key, d.key, d.title)
  const links = page.getByRole("region", { name: /Linked results/ })
  await links
    .getByRole("button", { name: `Unlink ${r.runKey} › ${r.caseKey}` })
    .click()
  await expect(links).toContainText(`Unlinked ${r.runKey} › ${r.caseKey}`)
  const undo = links.getByRole("button", {
    name: `Undo unlinking ${r.runKey} › ${r.caseKey}`,
  })
  await expect(undo).toBeFocused()
  await undo.click()
  await expect(
    page.getByRole("region", { name: "Linked results (1)" })
  ).toBeVisible()
  await expect(
    links.getByRole("button", { name: `Unlink ${r.runKey} › ${r.caseKey}` })
  ).toBeFocused()
})

test("E2E-DEF-034 a passed retest closes a fixed defect from the run", async ({
  page,
  project,
}) => {
  const r = await failedResult(project)
  const d = await moveDefect(project, await logDefect(project, r), "fixed")
  const retest = await resultInNewRun(project, r.caseKey, r.caseTitle, "passed")
  await page.goto(
    `/projects/${project.key}/runs/${retest.runKey}?case=${retest.runCaseId}`
  )
  const known = page.getByRole("region", { name: "Known defects on this case" })
  await expect(known).toContainText(`Retesting ${d.key}`)
  await known
    .getByRole("button", { name: `Close ${d.key} as verified` })
    .click()
  await expect(known).toContainText("Closed")
  const after = await project.tester.get<{
    status: string
    links: { kind: string }[]
  }>(`/projects/${project.key}/defects/${d.key}`)
  expect(after.status).toBe("closed")
  expect(after.links.map((l) => l.kind)).toContain("passed")
  // F6 (findings/app-findings.md): the "closed as verified" confirmation is
  // passed to mutate() on a button that can unmount first, so it only shows
  // sometimes. Recorded, not asserted, until it's fixed.
  const confirmed = await page
    .getByText(`${d.key} closed as verified`)
    .isVisible()
  test.info().annotations.push({
    type: "finding",
    description: `F6: confirmation ${confirmed ? "shown" : "missing"} this run`,
  })
})

test("E2E-DEF-035 a failed retest offers to reopen the fixed defect", async ({
  page,
  project,
}) => {
  const r = await failedResult(project)
  const d = await moveDefect(project, await logDefect(project, r), "fixed")
  const retest = await resultInNewRun(
    project,
    r.caseKey,
    r.caseTitle,
    "failed",
    { note: "Still refused" }
  )
  await page.goto(
    `/projects/${project.key}/runs/${retest.runKey}?case=${retest.runCaseId}`
  )
  const known = page.getByRole("region", { name: "Known defects on this case" })
  await known
    .getByRole("button", { name: `Still failing: reopen ${d.key}…` })
    .click()
  const dialog = page.getByRole("dialog", {
    name: "Log a defect for this result",
  })
  await expect(
    dialog.getByRole("radio", {
      name: new RegExp(`This fails again: reopen ${d.key}`),
    })
  ).toBeChecked()
  await expect(
    dialog.getByRole("button", { name: `Reopen ${d.key}` })
  ).toBeVisible()
})
