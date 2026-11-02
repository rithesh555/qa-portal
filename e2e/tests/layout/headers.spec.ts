import type { Page } from "@playwright/test"
import { BASE, expect, test } from "../../fixtures/index.ts"

/**
 * At phone width the page header shows (with its facts where the page has
 * them) and nothing scrolls sideways.
 */
async function headerFits(page: Page, path: string, facts?: string | RegExp) {
  await page.goto(path)
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  if (facts)
    await expect(page.getByRole("group", { name: facts })).toBeVisible()
  await page.waitForLoadState("networkidle")
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  )
  expect(overflow, `${path} scrolls sideways`).toBeLessThanOrEqual(0)
}

const project = `/projects/${BASE.key}`

test.describe("at phone width", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
  })

  test.describe("as an admin", () => {
    test.use({ role: "admin" })

    test("E2E-LAYOUT-004 Home and All releases headers fit @mobile", async ({
      page,
    }) => {
      await headerFits(page, "/")
      await headerFits(page, "/releases")
    })

    test("E2E-LAYOUT-006 the Users header fits @mobile", async ({ page }) => {
      await headerFits(page, "/users")
    })
  })

  test.describe("as a lead", () => {
    test.use({ role: "lead" })

    test("E2E-LAYOUT-005 project overview, members and releases headers fit @mobile", async ({
      page,
    }) => {
      await headerFits(page, project, `${BASE.name} details`)
      await headerFits(page, `${project}/members`)
      await headerFits(page, `${project}/releases`)
    })

    test("E2E-LAYOUT-007 test cases and import headers fit @mobile", async ({
      page,
    }) => {
      await headerFits(page, `${project}/cases`)
      await headerFits(page, `${project}/cases/import`)
    })

    test("E2E-LAYOUT-008 defects list and defect page headers fit @mobile", async ({
      page,
    }) => {
      await headerFits(page, `${project}/defects`)
      await page
        .getByRole("link", { name: BASE.defects[0]!.title })
        .first()
        .click()
      await expect(
        page.getByRole("group", { name: /^BASE-D-\d+ details$/ })
      ).toBeVisible()
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      )
      expect(overflow).toBeLessThanOrEqual(0)
      await headerFits(page, `${project}/defects/new`)
    })
  })

  test.describe("as a tester", () => {
    test.use({ role: "tester" })

    test("E2E-LAYOUT-009 test runs and new run headers fit @mobile", async ({
      page,
    }) => {
      await headerFits(page, `${project}/runs`)
      await headerFits(page, `${project}/runs/new`)
    })
  })
})
