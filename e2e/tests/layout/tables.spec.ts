import type { Page } from "@playwright/test"
import { BASE, expect, test } from "../../fixtures/index.ts"

/** Tables whose scroll box is narrower than the table: "heading: table/box px". */
async function overflowing(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("table")]
      .map((t) => {
        const box = t.parentElement as HTMLElement
        const heading = t
          .closest("section,[data-slot=card],main")
          ?.querySelector("h1,h2,h3")?.textContent
        return box.scrollWidth > box.clientWidth + 1
          ? `${heading}: ${box.scrollWidth}/${box.clientWidth}px`
          : null
      })
      .filter((x) => x !== null)
  )
}

test("E2E-LAYOUT-001 at 1280px every table shows all its columns without scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  const pages = [
    `/projects/${BASE.key}/cases`,
    `/projects/${BASE.key}/runs`,
    `/projects/${BASE.key}/defects`,
    `/projects/${BASE.key}/reports`,
    "/releases",
    "/projects",
    "/users",
  ]
  const found: string[] = []
  for (const path of pages) {
    await page.goto(path)
    await expect(page.getByRole("table").first()).toBeVisible()
    await page.waitForLoadState("networkidle")
    for (const o of await overflowing(page)) found.push(`${path} → ${o}`)
  }
  expect(found).toEqual([])
})

test.describe("on a phone", () => {
  test.use({ role: "tester" })
  test("E2E-LAYOUT-002 at phone width the run and release lists fit without scrolling sideways", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const found: string[] = []
    for (const path of [
      `/projects/${BASE.key}/runs`,
      "/",
      `/projects/${BASE.key}/cases`,
    ]) {
      await page.goto(path)
      await expect(page.getByRole("table").first()).toBeVisible()
      await page.waitForLoadState("networkidle")
      for (const o of await overflowing(page)) found.push(`${path} → ${o}`)
    }
    expect(found).toEqual([])

    // What the hidden columns said is still there, under each name.
    await page.goto(`/projects/${BASE.key}/runs`)
    const run = page.getByRole("row").filter({ hasText: BASE.runs.open })
    await expect(
      run.getByText(/% complete/).filter({ visible: true })
    ).toBeVisible()
    await expect(
      run.getByText(/pass rate/i).filter({ visible: true })
    ).toBeVisible()
    await page.goto("/")
    const release = page
      .getByRole("row")
      .filter({
        has: page.getByRole("link", { name: /E2E Baseline, Release / }),
      })
      .first()
    await expect(
      release.getByText(/Pass rate/).filter({ visible: true })
    ).toBeVisible()
  })
})

test.describe("as a tester", () => {
  test.use({ role: "tester" })
  test("E2E-LAYOUT-003 a confirmation never covers the case editor's sticky buttons", async ({
    page,
    project,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto(`/projects/${project.key}/cases/new`)
    await page.getByLabel("Title").fill("First of many")
    await page
      .getByLabel("Step 1 action", { exact: true })
      .fill("Do the first thing")
    const another = page.getByRole("button", { name: "Save and add another" })
    await another.click()
    const toast = page
      .getByRole("region", { name: "Notifications" })
      .getByText(`${project.key}-TC-1 created`)
    await expect(toast).toBeVisible()
    // Settled where it ends up, not mid-animation.
    await page.evaluate(() =>
      Promise.allSettled(document.getAnimations().map((a) => a.finished))
    )
    const footer = await another.evaluate(
      (el) => el.parentElement!.getBoundingClientRect().top
    )
    const card = await toast.evaluate(
      (el) =>
        el
          .closest("[data-slot=toast], li, [role=status], [role=alert]")!
          .getBoundingClientRect().bottom
    )
    expect(card).toBeLessThanOrEqual(footer)
  })
})
