import type { Page } from "@playwright/test"
import { apiContext, BASE, expect, test, unique } from "../../fixtures/index.ts"
import {
  choose,
  editRelease,
  rowWith,
} from "../../fixtures/projects-helpers.ts"

const releasesUrl = (key: string) => `/projects/${key}/releases`
const releaseName = () => `R${unique().slice(0, 6)}`

async function openNew(page: Page) {
  await page.getByRole("button", { name: "New release" }).click()
  return page.getByRole("dialog", { name: "New release" })
}

test.describe("as the lead", () => {
  test.use({ role: "lead" })

  test("E2E-REL-001 a QA Lead creates a release", async ({ page, project }) => {
    const name = releaseName()
    await page.goto(releasesUrl(project.key))
    const d = await openNew(page)
    await d.getByLabel("Name").fill(name)
    await d.getByLabel("Summary").fill("Autumn payments release")
    await choose(page, d.getByLabel("Status"), "In progress")
    await d.getByLabel("Start date").fill("2026-11-02")
    await d.getByLabel("Target date").fill("2026-12-18")
    await d.getByRole("button", { name: "Create release" }).click()
    await expect(page.getByText(`Release ${name} created`)).toBeVisible()
    const row = rowWith(page, name)
    await expect(row).toContainText("Autumn payments release")
    await expect(row).toContainText("In progress")
    await expect(row).toContainText("2026")
  })

  test("E2E-REL-002 release names are unique within a project", async ({
    page,
    project,
  }) => {
    const name = releaseName()
    await project.lead.createRelease(project.key, { name, status: "planned" })
    await page.goto(releasesUrl(project.key))
    const d = await openNew(page)
    await d.getByLabel("Name").fill(name)
    await d.getByRole("button", { name: "Create release" }).click()
    await expect(
      d.getByText(
        "This project already has a release with that name. Choose another."
      )
    ).toBeVisible()
    await expect(d.getByLabel("Name")).toBeFocused()
  })

  test("E2E-REL-003 the target date can't be before the start date", async ({
    page,
    project,
  }) => {
    await page.goto(releasesUrl(project.key))
    const d = await openNew(page)
    await d.getByLabel("Name").fill(releaseName())
    await d.getByLabel("Start date").fill("2026-12-01")
    await d.getByLabel("Target date").fill("2026-11-01")
    await d.getByRole("button", { name: "Create release" }).click()
    await expect(
      d.getByText("The target date can't be before the start date")
    ).toBeVisible()
  })

  test("E2E-REL-004 mark a release as released", async ({ page, project }) => {
    const name = releaseName()
    await project.lead.createRelease(project.key, {
      name,
      status: "in_progress",
    })
    await page.goto(releasesUrl(project.key))
    await page.getByRole("button", { name: `Edit release ${name}` }).click()
    const d = page.getByRole("dialog", { name: `Edit release ${name}` })
    await choose(page, d.getByLabel("Status"), "Released")
    await d.getByRole("button", { name: "Save changes" }).click()
    await expect(page.getByText(`Release ${name} saved`)).toBeVisible()
    await expect(rowWith(page, name)).toContainText("Released")
  })

  for (const [id, title, choice] of [
    [
      "E2E-REL-005",
      "editing a release someone else changed: load their version",
      "Load their version",
    ],
    [
      "E2E-REL-006",
      "editing a release someone else changed: save mine anyway",
      "Save mine anyway",
    ],
  ] as const) {
    test(`${id} ${title}`, async ({ page, project }) => {
      const name = releaseName()
      const theirs = releaseName()
      const mine = releaseName()
      const release = await project.lead.createRelease(project.key, {
        name,
        status: "planned",
      })
      await page.goto(releasesUrl(project.key))
      await page.getByRole("button", { name: `Edit release ${name}` }).click()
      const d = page.getByRole("dialog", { name: `Edit release ${name}` })
      await d.getByLabel("Name").fill(mine)
      await editRelease(project.admin, project.key, release.id, {
        name: theirs,
      })
      await d.getByRole("button", { name: "Save changes" }).click()
      await expect(d.getByText("changed this release meanwhile")).toBeVisible()
      await d.getByRole("button", { name: choice }).click()
      if (choice === "Load their version") {
        await expect(d.getByLabel("Name")).toHaveValue(theirs)
      } else {
        await expect(page.getByText(`Release ${mine} saved`)).toBeVisible()
        await expect(rowWith(page, mine)).toBeVisible()
      }
    })
  }

  test("E2E-REL-007 a project with no releases says who adds them", async ({
    page,
    project,
    as,
  }) => {
    await page.goto(releasesUrl(project.key))
    await expect(page.getByText("No releases yet")).toBeVisible()
    await expect(page.getByText("Create one with New release")).toBeVisible()

    const tester = await as("tester")
    await tester.page.goto(releasesUrl(project.key))
    await expect(
      tester.page.getByText("A QA Lead adds releases for this project.")
    ).toBeVisible()
    await expect(
      tester.page.getByRole("button", { name: "New release" })
    ).toHaveCount(0)
  })
})

test.describe("as a viewer", () => {
  test.use({ role: "viewer" })
  test("E2E-REL-008 testers and viewers can't add or edit releases", async ({
    page,
    slot,
  }) => {
    await page.goto(releasesUrl(BASE.key))
    await expect(rowWith(page, BASE.releases.shipped)).toContainText("Released")
    await expect(page.getByRole("button", { name: "New release" })).toHaveCount(
      0
    )
    await expect(
      page.getByRole("button", { name: /^Edit release/ })
    ).toHaveCount(0)
    const viewer = await apiContext(slot, "viewer")
    const res = await viewer.post(`/api/projects/${BASE.key}/releases`, {
      data: { name: releaseName(), status: "planned" },
    })
    expect(res.status()).toBe(403)
    await viewer.dispose()
  })
})
