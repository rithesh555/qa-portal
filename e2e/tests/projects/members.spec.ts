import type { Page } from "@playwright/test"
import { expect, test } from "../../fixtures/index.ts"
import { choose, rowWith, search } from "../../fixtures/projects-helpers.ts"
import { displayName, username } from "../../fixtures/roles.ts"
import { freshUser } from "../../fixtures/users.ts"

const membersUrl = (key: string) => `/projects/${key}/members`

async function openAdd(page: Page, projectName: string) {
  await page.getByRole("button", { name: "Add members" }).click()
  return page.getByRole("dialog", { name: `Add members to ${projectName}` })
}

test.describe("as the lead", () => {
  test.use({ role: "lead" })

  test("E2E-MEMB-001 a QA Lead adds several people at once with one role", async ({
    page,
    project,
  }) => {
    const [a, b] = [
      await freshUser(project.admin),
      await freshUser(project.admin),
    ]
    await page.goto(membersUrl(project.key))
    const d = await openAdd(page, project.name)
    for (const person of [a, b]) {
      await d
        .getByRole("searchbox", { name: "Search people" })
        .fill(person.username)
      await d.getByRole("checkbox", { name: new RegExp(person.name) }).check()
    }
    await expect(d.getByText("Selected:")).toBeVisible()
    await choose(page, d.getByLabel(/Role for the/), "Viewer")
    await d.getByRole("button", { name: "Add 2 people" }).click()
    await expect(page.getByText("Added 2 people as Viewer")).toBeVisible()
    for (const person of [a, b])
      await expect(
        page.getByRole("combobox", { name: `Role for ${person.name}` })
      ).toContainText("Viewer")
  })

  test("E2E-MEMB-002 people already on the project can't be added twice", async ({
    page,
    project,
    slot,
  }) => {
    await page.goto(membersUrl(project.key))
    const d = await openAdd(page, project.name)
    await d
      .getByRole("searchbox", { name: "Search people" })
      .fill(username("tester", slot))
    await expect(d.getByText("Already a Tester")).toBeVisible()
    await expect(
      d.getByRole("checkbox", { name: new RegExp(displayName("tester", slot)) })
    ).toBeDisabled()
  })

  test("E2E-MEMB-003 deactivated people can't be added", async ({
    page,
    project,
    slot,
  }) => {
    await page.goto(membersUrl(project.key))
    const d = await openAdd(page, project.name)
    await d
      .getByRole("searchbox", { name: "Search people" })
      .fill(username("deactivated", slot))
    await expect(d.getByText("No active person matches.")).toBeVisible()
  })

  test("E2E-MEMB-004 change someone's project role", async ({
    page,
    project,
    slot,
  }) => {
    await page.goto(membersUrl(project.key))
    const tester = displayName("tester", slot)
    await choose(
      page,
      page.getByRole("combobox", { name: `Role for ${tester}` }),
      "QA Lead"
    )
    await expect(page.getByText(`${tester} is now QA Lead`)).toBeVisible()
    await expect(
      page.getByRole("combobox", { name: `Role for ${tester}` })
    ).toContainText("QA Lead")
  })

  test("E2E-MEMB-005 the only QA Lead can't be removed or demoted by a lead", async ({
    page,
    project,
    slot,
  }) => {
    await page.goto(membersUrl(project.key))
    const me = displayName("lead", slot)
    await expect(rowWith(page, `@${username("lead", slot)}`)).toContainText(
      "Only QA Lead"
    )
    await expect(
      page.getByRole("combobox", { name: `Role for ${me}` })
    ).toBeDisabled()
    await expect(
      page.getByRole("button", { name: `Leave ${project.name}` })
    ).toBeDisabled()
    await expect(
      page.getByText("the last one can't be removed or given another role")
    ).toBeVisible()
  })

  test("E2E-MEMB-007 remove a member; they lose access straight away", async ({
    page,
    project,
    slot,
    as,
  }) => {
    const tester = displayName("tester", slot)
    await page.goto(membersUrl(project.key))
    await page.getByRole("button", { name: `Remove ${tester}` }).click()
    await page
      .getByRole("alertdialog", { name: `Remove ${tester}?` })
      .getByRole("button", { name: "Remove" })
      .click()
    await expect(
      page.getByText(`${tester} removed from ${project.name}`)
    ).toBeVisible()
    await expect(rowWith(page, `@${username("tester", slot)}`)).toHaveCount(0)

    const them = await as("tester")
    await them.page.goto(`/projects/${project.key}`)
    await expect(
      them.page.getByRole("heading", { name: "Project not found" })
    ).toBeVisible()
  })

  test("E2E-MEMB-008 a QA Lead leaves a project that has another lead", async ({
    page,
    project,
  }) => {
    const other = await freshUser(project.admin)
    await project.admin.addMembers(project.key, [other.id], "lead")
    await page.goto(membersUrl(project.key))
    await page.getByRole("button", { name: `Leave ${project.name}` }).click()
    await page
      .getByRole("alertdialog", { name: `Leave ${project.name}?` })
      .getByRole("button", { name: "Leave" })
      .click()
    await expect(page.getByText(`You left ${project.name}`)).toBeVisible()
    await expect(page).toHaveURL("/projects")
  })

  test("E2E-MEMB-010 filter members by role and search", async ({
    page,
    project,
    slot,
  }) => {
    await page.goto(membersUrl(project.key))
    await page.getByRole("tab", { name: "Viewers" }).click()
    await expect(rowWith(page, `@${username("viewer", slot)}`)).toBeVisible()
    await expect(rowWith(page, `@${username("tester", slot)}`)).toHaveCount(0)
    await search(page, "Search members", "nobody-at-all")
    await expect(page.getByText("No members match")).toBeVisible()
  })

  test("E2E-MEMB-012 manage members on a phone @mobile", async ({
    page,
    project,
    isMobile,
  }) => {
    test.skip(!isMobile, "Phone layout only")
    const person = await freshUser(project.admin)
    await page.goto(membersUrl(project.key))
    const d = await openAdd(page, project.name)
    const box = await d.boundingBox()
    expect(box!.width).toBeLessThanOrEqual(page.viewportSize()!.width)
    await d
      .getByRole("searchbox", { name: "Search people" })
      .fill(person.username)
    await d.getByRole("checkbox", { name: new RegExp(person.name) }).check()
    await d.getByRole("button", { name: "Add 1 person" }).click()
    await expect(page.getByText("Added 1 person as Tester")).toBeVisible()
  })
})

test("E2E-MEMB-006 an admin changing the last QA Lead confirms first", async ({
  page,
  project,
  slot,
}) => {
  const lead = displayName("lead", slot)
  await page.goto(membersUrl(project.key))
  await choose(
    page,
    page.getByRole("combobox", { name: `Role for ${lead}` }),
    "Tester"
  )
  const confirm = page.getByRole("alertdialog", {
    name: `Make ${lead} Tester?`,
  })
  await expect(confirm).toContainText("is the only active QA Lead")
  await confirm.getByRole("button", { name: "Change role" }).click()
  await expect(page.getByText(`${lead} is now Tester`)).toBeVisible()
})

test("E2E-MEMB-011 admins aren't listed as members", async ({
  page,
  project,
  slot,
}) => {
  await page.goto(membersUrl(project.key))
  await expect(
    page.getByText("Admins can open every project and aren't listed here.")
  ).toBeVisible()
  await expect(page.getByText("3 active members.")).toBeVisible()
  await expect(rowWith(page, `@${username("admin", slot)}`)).toHaveCount(0)
})

test.describe("as a tester", () => {
  test.use({ role: "tester" })
  test("E2E-MEMB-009 testers and viewers see members read-only", async ({
    page,
    project,
    slot,
  }) => {
    await page.goto(membersUrl(project.key))
    await expect(rowWith(page, `@${username("viewer", slot)}`)).toContainText(
      "Viewer"
    )
    await expect(page.getByRole("button", { name: "Add members" })).toHaveCount(
      0
    )
    await expect(page.getByRole("combobox")).toHaveCount(0)
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(0)
  })
})
