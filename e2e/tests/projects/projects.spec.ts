import type { Page } from "@playwright/test"
import { newProjectKey } from "../../fixtures/api.ts"
import {
  apiContext,
  expect,
  PortalApi,
  test,
  unique,
} from "../../fixtures/index.ts"
import {
  renameProject,
  rowWith,
  search,
} from "../../fixtures/projects-helpers.ts"
import { displayName, username } from "../../fixtures/roles.ts"

const projectActions = (page: Page) =>
  page.getByRole("button", { name: "Project actions" })

async function pickPerson(page: Page, trigger: string, who: string) {
  await page.getByLabel(trigger).click()
  await page.getByRole("combobox", { name: "Search people" }).fill(who)
  await page
    .getByRole("option", { name: new RegExp(`@${who.replaceAll(".", "\\.")}`) })
    .click()
}

test.describe("list", () => {
  test("E2E-PROJ-001 admins see every project in a table and can search by key", async ({
    page,
    project,
    slot,
  }) => {
    await page.goto("/projects")
    await expect(
      page.getByRole("button", { name: "New project" })
    ).toBeVisible()
    for (const col of ["Project", "QA Leads"])
      await expect(page.getByRole("columnheader", { name: col })).toBeVisible()
    await search(page, "Search name or key", project.key)
    const row = rowWith(page, project.key)
    await expect(row).toContainText(project.name)
    await expect(row).toContainText(displayName("lead", slot))
  })

  test.describe("as a tester", () => {
    test.use({ role: "tester" })
    test("E2E-PROJ-002 members see only their projects, as cards with their role", async ({
      page,
      project,
      slot,
    }) => {
      const admin = new PortalApi(await apiContext(slot, "admin"))
      const elsewhere = `Not mine ${unique()}`
      // A project this tester isn't in (led by someone else).
      const lead = await admin.get<{ items: { id: string }[] }>(
        `/users/directory?q=${username("viewer", slot)}`
      )
      await admin.createProject({
        key: newProjectKey(),
        name: elsewhere,
        leadUserId: lead.items[0]!.id,
      })

      // Straight to a search: in a full run the tester is on many projects.
      await page.goto(`/projects?q=${project.key}`)
      await expect(
        page.getByRole("button", { name: "New project" })
      ).toHaveCount(0)
      const card = page.getByRole("link", { name: new RegExp(project.name) })
      await expect(card).toContainText("Tester")
      await search(page, "Search projects", elsewhere)
      await expect(page.getByText("No projects match")).toBeVisible()
    })

    test("E2E-PROJ-004 project cards fit a phone screen @mobile", async ({
      page,
      project,
      isMobile,
    }) => {
      test.skip(!isMobile, "Phone layout only")
      await page.goto(`/projects?q=${project.key}`)
      const card = page.getByRole("link", { name: new RegExp(project.name) })
      const box = await card.boundingBox()
      expect(box!.width).toBeLessThanOrEqual(page.viewportSize()!.width)
      await card.click()
      await expect(page).toHaveURL(`/projects/${project.key}`)
    })
  })

  test.describe("as an outsider", () => {
    test.use({ role: "outsider" })
    test("E2E-PROJ-003 someone on no project is told how to get added", async ({
      page,
      slot,
    }) => {
      await page.goto("/projects")
      await expect(
        page.getByText("You're not on any project yet")
      ).toBeVisible()
      await expect(page.getByRole("status")).toContainText(
        username("outsider", slot)
      )
    })
  })
})

test.describe("create and edit", () => {
  test("E2E-PROJ-005 create a project with its first QA Lead", async ({
    page,
    slot,
  }) => {
    const name = `Zeta Payments ${unique()}`
    const key = newProjectKey()
    await page.goto("/projects")
    await page.getByRole("button", { name: "New project" }).click()
    const d = page.getByRole("dialog", { name: "New project" })
    await d.getByLabel("Name").fill(name)
    await expect(d.getByLabel("Key")).toHaveValue(/^[A-Z][A-Z0-9]{1,5}$/)
    await d.getByLabel("Key").fill(key)
    await d.getByLabel("Description").fill("Made by the E2E suite")
    await pickPerson(page, "First QA Lead", username("lead", slot))
    await d.getByRole("button", { name: "Create project" }).click()
    await expect(page.getByText(`${name} created`)).toBeVisible()
    await expect(page).toHaveURL(`/projects/${key}`)
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible()
    await expect(
      page.getByText(`QA Leads: ${displayName("lead", slot)}`)
    ).toBeVisible()
  })

  test("E2E-PROJ-006 new project checks name, key and lead", async ({
    page,
  }) => {
    await page.goto("/projects")
    await page.getByRole("button", { name: "New project" }).click()
    const d = page.getByRole("dialog", { name: "New project" })
    await d.getByRole("button", { name: "Create project" }).click()
    await expect(d.getByText("Enter a project name")).toBeVisible()
    await expect(d.getByText("Choose the first QA Lead")).toBeVisible()
    await d.getByLabel("Key").fill("9AB")
    await d.getByRole("button", { name: "Create project" }).click()
    await expect(
      d.getByText("Use 2–6 capital letters or digits, starting with a letter")
    ).toBeVisible()
  })

  test("E2E-PROJ-007 a key that's already used is refused", async ({
    page,
    project,
    slot,
  }) => {
    await page.goto("/projects")
    await page.getByRole("button", { name: "New project" }).click()
    const d = page.getByRole("dialog", { name: "New project" })
    await d.getByLabel("Name").fill(`Copycat ${unique()}`)
    await d.getByLabel("Key").fill(project.key)
    await pickPerson(page, "First QA Lead", username("lead", slot))
    await d.getByRole("button", { name: "Create project" }).click()
    await expect(
      d.getByText("Another project already uses this key. Choose another.")
    ).toBeVisible()
    await expect(d.getByLabel("Key")).toBeFocused()
  })

  test("E2E-PROJ-008 admins aren't offered as a project's QA Lead", async ({
    page,
    slot,
  }) => {
    await page.goto("/projects")
    await page.getByRole("button", { name: "New project" }).click()
    await page.getByLabel("First QA Lead").click()
    await page
      .getByRole("combobox", { name: "Search people" })
      .fill(username("admin", slot))
    await expect(page.getByText("No active person matches.")).toBeVisible()
  })

  test("E2E-PROJ-009 edit a project's name and description", async ({
    page,
    project,
  }) => {
    const name = `Renamed ${unique()}`
    await page.goto(`/projects/${project.key}`)
    await projectActions(page).click()
    await page.getByRole("menuitem", { name: "Edit details" }).click()
    const d = page.getByRole("dialog")
    await d.getByLabel("Name").fill(name)
    await d.getByLabel("Description").fill("Now with a description")
    await d.getByRole("button", { name: "Save changes" }).click()
    await expect(page.getByText("Project details saved")).toBeVisible()
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible()
    await expect(page.getByText("Now with a description")).toBeVisible()
  })

  for (const [id, title, choice] of [
    [
      "E2E-PROJ-010",
      "editing a project someone else just changed: load their version",
      "Load their version",
    ],
    [
      "E2E-PROJ-011",
      "editing a project someone else just changed: save mine anyway",
      "Save mine anyway",
    ],
  ] as const) {
    test(`${id} ${title}`, async ({ page, project }) => {
      const theirs = `Theirs ${unique()}`
      const mine = `Mine ${unique()}`
      await page.goto(`/projects/${project.key}`)
      await projectActions(page).click()
      await page.getByRole("menuitem", { name: "Edit details" }).click()
      const d = page.getByRole("dialog")
      await d.getByLabel("Name").fill(mine)
      await renameProject(project.admin, project.key, theirs)
      await d.getByRole("button", { name: "Save changes" }).click()
      await expect(d.getByText("changed this project meanwhile")).toBeVisible()
      await d.getByRole("button", { name: choice }).click()
      if (choice === "Load their version") {
        await expect(d.getByLabel("Name")).toHaveValue(theirs)
      } else {
        await expect(page.getByText("Project details saved")).toBeVisible()
        await expect(
          page.getByRole("heading", { level: 1, name: mine })
        ).toBeVisible()
      }
    })
  }
})

test.describe("archive", () => {
  test("E2E-PROJ-012 archive a project: read-only and on the Archived tab", async ({
    page,
    project,
  }) => {
    await page.goto(`/projects/${project.key}`)
    await projectActions(page).click()
    await page.getByRole("menuitem", { name: "Archive project" }).click()
    await page
      .getByRole("alertdialog", { name: `Archive ${project.name}?` })
      .getByRole("button", { name: "Archive" })
      .click()
    await expect(page.getByText(`${project.name} archived`)).toBeVisible()
    await expect(page.getByText("This project is archived")).toBeVisible()

    await page.goto(`/projects/${project.key}/releases`)
    await expect(
      page.getByRole("heading", { level: 1, name: "Releases" })
    ).toBeVisible()
    await expect(page.getByRole("button", { name: "New release" })).toHaveCount(
      0
    )

    // Open the search straight from the URL: typing and then switching tabs
    // within a moment can drop the search (F5).
    await page.goto(`/projects?status=archived&q=${project.key}`)
    await expect(rowWith(page, project.key)).toBeVisible()
    await page.getByRole("tab", { name: "Active" }).click()
    await expect(page.getByText("No projects match")).toBeVisible()
  })

  test("E2E-PROJ-013 restore an archived project", async ({
    page,
    project,
  }) => {
    await project.admin.post(`/projects/${project.key}/archive`)
    await page.goto(`/projects/${project.key}`)
    await expect(
      page.getByText("Restore it from Project actions on the overview.")
    ).toBeVisible()
    await projectActions(page).click()
    await page.getByRole("menuitem", { name: "Restore project" }).click()
    await expect(page.getByText(`${project.name} restored`)).toBeVisible()
    await expect(page.getByText("This project is archived")).toBeHidden()
  })

  test.describe("as the lead", () => {
    test.use({ role: "lead" })
    test("E2E-PROJ-014 members of an archived project can read it but not change it", async ({
      page,
      project,
    }) => {
      await project.admin.post(`/projects/${project.key}/archive`)
      await page.goto(`/projects/${project.key}`)
      await expect(
        page.getByText("It's read-only. An admin can restore it.")
      ).toBeVisible()
      await expect(projectActions(page)).toHaveCount(0)
      const res = await project.lead.api.post(
        `/api/projects/${project.key}/releases`,
        {
          data: { name: "Too late", status: "planned" },
        }
      )
      expect(res.status()).toBe(409)
      expect(await res.text()).toContain("archived")
    })
  })
})
