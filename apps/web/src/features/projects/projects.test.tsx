import type {
  Member,
  Project,
  ProjectRole,
  ProjectSummary,
  SessionUser,
} from "@qa/shared"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, useLocation } from "react-router"
import { RouterProvider } from "react-router/dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { sessionQueryKey } from "@/features/auth/session"
import { MembersPage } from "./members-page"
import { ProjectLayout } from "./project-layout"
import { ProjectsPage } from "./projects-page"

const me = (role: SessionUser["role"]): SessionUser => ({
  id: "u-me",
  username: "me",
  name: "Me Myself",
  email: "me@example.com",
  role,
})

const summary = (overrides: Partial<ProjectSummary> = {}): ProjectSummary => ({
  id: "p1",
  key: "PAY",
  name: "Payments",
  description: "Cards and refunds",
  archived: false,
  myRole: "lead",
  memberCount: 3,
  leads: [{ id: "u-me", name: "Me Myself" }],
  currentRelease: null,
  createdAt: "2026-10-01T10:00:00.000Z",
  ...overrides,
})

const project = (myRole: ProjectRole | null, archived = false): Project => ({
  ...summary({ myRole, archived }),
  version: 1,
  roleCounts: { lead: 1, tester: 1, viewer: 1 },
  updatedAt: "2026-10-01T10:00:00.000Z",
})

const member = (overrides: Partial<Member>): Member => ({
  userId: "u-x",
  name: "Tom Tester",
  username: "tom",
  role: "tester",
  active: true,
  addedAt: "2026-10-02T10:00:00.000Z",
  ...overrides,
})

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })

let routes: Record<string, (init?: RequestInit) => Response>

beforeEach(() => {
  routes = {}
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const path = url.split("?")[0]!
      const handler = routes[path]
      return handler
        ? handler(init)
        : json(404, { statusCode: 404, message: "Not found" })
    })
  )
})
afterEach(() => vi.unstubAllGlobals())

function Where() {
  const location = useLocation()
  return <p data-testid="where">{location.pathname}</p>
}

function renderAt(path: string, user: SessionUser) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClient.setQueryData(sessionQueryKey, user)
  const router = createMemoryRouter(
    [
      { path: "/projects", element: <ProjectsPage /> },
      {
        path: "/projects/:key",
        element: (
          <>
            <Where />
            <ProjectLayout />
          </>
        ),
        children: [
          { index: true, element: <p>overview</p> },
          { path: "members", element: <MembersPage /> },
        ],
      },
    ],
    { initialEntries: [path] }
  )
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

const page = <T,>(items: T[]) => ({
  items,
  total: items.length,
  page: 1,
  pageSize: 25,
})

describe("ProjectsPage", () => {
  it("shows a member their projects as cards with their role", async () => {
    routes["/api/projects"] = () =>
      json(200, page([summary({ myRole: "tester" })]))
    renderAt("/projects", me("user"))
    const card = await screen.findByRole("link", { name: /Payments/ })
    expect(card).toHaveAttribute("href", "/projects/PAY")
    expect(within(card).getByText("Tester")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "New project" })
    ).not.toBeInTheDocument()
  })

  it("shows admins a table, flags projects without a lead, and offers New project", async () => {
    routes["/api/projects"] = () =>
      json(200, page([summary({ myRole: null, leads: [] })]))
    renderAt("/projects", me("admin"))
    expect(await screen.findByRole("table")).toBeInTheDocument()
    expect(screen.getByText("No active lead")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "New project" })
    ).toBeInTheDocument()
  })

  it("explains what to do when a member has no projects", async () => {
    routes["/api/projects"] = () => json(200, page([]))
    renderAt("/projects", me("user"))
    expect(
      await screen.findByText("You're not on any project yet")
    ).toBeInTheDocument()
    expect(screen.getByText("me")).toBeInTheDocument()
  })

  it("suggests a key from the name until the admin edits it", async () => {
    routes["/api/projects"] = () => json(200, page([]))
    renderAt("/projects", me("admin"))
    const ui = userEvent.setup()
    await ui.click(await screen.findByRole("button", { name: "New project" }))
    const dialog = await screen.findByRole("dialog")
    const name = within(dialog).getByLabelText("Name")
    const key = within(dialog).getByLabelText("Key")
    await ui.type(name, "Mobile App")
    expect(key).toHaveValue("MA")
    await ui.clear(key)
    await ui.type(key, "mob")
    expect(key).toHaveValue("MOB")
    await ui.type(name, " Two")
    expect(key).toHaveValue("MOB")
  })
})

describe("NewProjectDialog", () => {
  it("shows a taken key on the Key field and focuses it", async () => {
    routes["/api/projects"] = (init) =>
      init?.method === "POST"
        ? json(409, {
            statusCode: 409,
            message: "That key is already used by another project",
          })
        : json(200, page([]))
    routes["/api/users/directory"] = () =>
      json(200, { items: [{ id: "u-l", name: "Lena Lead", username: "lena" }] })
    renderAt("/projects", me("admin"))
    const ui = userEvent.setup()
    await ui.click(await screen.findByRole("button", { name: "New project" }))
    const dialog = await screen.findByRole("dialog")
    await ui.type(within(dialog).getByLabelText("Name"), "Payments")
    await ui.click(
      within(dialog).getByRole("button", { name: "First QA Lead" })
    )
    await ui.type(
      // Inside the modal jsdom hides the popover from role queries (a real
      // browser doesn't; the Playwright walkthrough finds it by role).
      await screen.findByPlaceholderText("Name or username…"),
      "le"
    )
    await ui.click(await screen.findByText("Lena Lead"))
    await ui.click(
      within(dialog).getByRole("button", { name: "Create project" })
    )

    expect(
      await within(dialog).findByText(/Another project already uses this key/)
    ).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Key")).toHaveFocus()
  })
})

describe("ProjectLayout", () => {
  it("says the project wasn't found when the API hides it", async () => {
    renderAt("/projects/SECRET", me("user"))
    expect(
      await screen.findByRole("heading", { name: "Project not found" })
    ).toBeInTheDocument()
  })

  it("redirects a lowercase key to the canonical address", async () => {
    routes["/api/projects/PAY"] = () => json(200, project("lead"))
    renderAt("/projects/pay/members", me("user"))
    expect(await screen.findByTestId("where")).toHaveTextContent(
      "/projects/PAY/members"
    )
  })

  it("marks archived projects as read-only", async () => {
    routes["/api/projects/PAY"] = () => json(200, project("lead", true))
    renderAt("/projects/PAY", me("user"))
    expect(
      await screen.findByText("This project is archived")
    ).toBeInTheDocument()
  })
})

describe("MembersPage", () => {
  const members = page([
    member({ userId: "u-me", name: "Me Myself", role: "lead" }),
    member({}),
  ])

  it("lets a lead change roles, add and remove people", async () => {
    routes["/api/projects/PAY"] = () => json(200, project("lead"))
    routes["/api/projects/PAY/members"] = () => json(200, members)
    renderAt("/projects/PAY/members", me("user"))
    expect(
      await screen.findByRole("combobox", { name: "Role for Tom Tester" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Add members" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Remove Tom Tester" })
    ).toBeEnabled()
    // Me Myself is the only QA Lead, so a lead can't leave or demote themselves.
    expect(
      screen.getByRole("button", { name: "Leave Payments" })
    ).toBeDisabled()
    expect(
      screen.getByRole("combobox", { name: "Role for Me Myself" })
    ).toBeDisabled()
    expect(screen.getByText("Only QA Lead")).toBeInTheDocument()
  })

  it("shows testers a read-only list", async () => {
    routes["/api/projects/PAY"] = () => json(200, project("tester"))
    routes["/api/projects/PAY/members"] = () => json(200, members)
    renderAt("/projects/PAY/members", me("user"))
    expect(await screen.findByText("Tom Tester")).toBeInTheDocument()
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Add members" })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Remove" })
    ).not.toBeInTheDocument()
  })

  it("lets an admin remove the only QA Lead after a clear warning", async () => {
    routes["/api/projects/PAY"] = () => json(200, project(null))
    routes["/api/projects/PAY/members"] = () =>
      json(
        200,
        page([member({ userId: "u-lena", name: "Lena Lead", role: "lead" })])
      )
    renderAt("/projects/PAY/members", me("admin"))
    const ui = userEvent.setup()
    const remove = await screen.findByRole("button", {
      name: "Remove Lena Lead",
    })
    expect(remove).toBeEnabled()
    await ui.click(remove)
    expect(
      await screen.findByText(/will then have no active QA Lead/)
    ).toBeInTheDocument()
  })

  it("is read-only for a lead when the project is archived", async () => {
    routes["/api/projects/PAY"] = () => json(200, project("lead", true))
    routes["/api/projects/PAY/members"] = () => json(200, members)
    renderAt("/projects/PAY/members", me("user"))
    expect(await screen.findByText("Tom Tester")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Add members" })
    ).not.toBeInTheDocument()
  })
})
