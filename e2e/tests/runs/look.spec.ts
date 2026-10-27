import type { Locator, Page } from "@playwright/test"
import { expect, test } from "../../fixtures/index.ts"
import {
  caseList,
  currentCase,
  resultButton,
  runUrl,
  seedCases,
  startRun,
} from "../../fixtures/runs-helpers.ts"

test.use({ role: "tester" })

/** Presses Tab until `target` has focus, so :focus-visible applies. */
async function tabTo(page: Page, target: Locator, max = 80) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab")
    if (await target.evaluate((el) => el === document.activeElement)) return
  }
  throw new Error("Tab never reached the target")
}

const outlineStyle = (el: Locator) =>
  el.evaluate((node) => getComputedStyle(node).outlineStyle)

test("E2E-RUN-048 the current case and result buttons show a focus ring on Tab", async ({
  page,
  project,
}) => {
  await seedCases(project, { ready: 3 })
  const run = await startRun(project)
  await page.goto(runUrl(project, run.key))
  await expect(currentCase(page)).toHaveText("Run case 1")
  await expect(resultButton(page, "Passed")).toBeEnabled()

  const row = caseList(page).locator('[aria-current="true"]')
  await tabTo(page, row)
  expect(await outlineStyle(row)).toBe("solid")

  const passed = resultButton(page, "Passed")
  await tabTo(page, passed)
  expect(await outlineStyle(passed)).toBe("solid")
})

test("E2E-RUN-049 the case lane fits phone width and keeps the current case in view @mobile", async ({
  page,
  project,
}) => {
  await seedCases(project, { ready: 40 })
  const run = await startRun(project)
  await page.setViewportSize({ width: 375, height: 800 })
  const cases = await project.tester.runCases(project.key, run.key)
  await page.goto(`${runUrl(project, run.key)}?case=${cases[35]!.id}`)
  await expect(resultButton(page, "Passed")).toBeEnabled()

  const lane = page.getByRole("group", { name: "Cases in this run" })
  await expect(lane).toBeVisible()
  const pill = lane.locator('[aria-current="true"]')
  await expect(pill).toHaveAccessibleName(`${cases[35]!.caseKey}, Untested`)

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  )
  expect(overflow).toBeLessThanOrEqual(0)

  const box = (await lane.boundingBox())!
  const p = (await pill.boundingBox())!
  expect(p.y).toBeGreaterThanOrEqual(box.y)
  expect(p.y + p.height).toBeLessThanOrEqual(box.y + box.height)
  expect(p.x + p.width).toBeLessThanOrEqual(box.x + box.width)
})
