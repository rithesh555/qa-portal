import type {
  CaseSummary,
  Project,
  ProjectRole,
  SessionUser,
  Suite,
  TestCase,
} from "@qa/shared"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, useLocation } from "react-router"
import { RouterProvider } from "react-router/dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Toaster } from "@/components/ui/toast"
import { sessionQueryKey } from "@/features/auth/session"
import { ProjectLayout } from "@/features/projects/project-layout"
import { CaseEditorPage } from "./case-editor-page"
import { CasePage } from "./case-page"
import { CasesPage } from "./cases-page"
import { ImportPage } from "./import-page"

const user: SessionUser = {
  id: "u-me",
  username: "me",
  name: "Me Myself",
  email: "me@example.com",
  role: "user",
}

const project = (myRole: ProjectRole): Project => ({
  id: "p1",
  key: "PAY",
  name: "Payments",
  description: "",
  archived: false,
  myRole,
  memberCount: 3,
  leads: [],
  currentRelease: null,
  createdAt: "2026-10-01T10:00:00.000Z",
  version: 1,
  roleCounts: { lead: 1, tester: 1, viewer: 1 },
  updatedAt: "2026-10-01T10:00:00.000Z",
})

const suites: Suite[] = [
  {
    id: "0199c0de-0000-7000-8000-0000000000a1",
    name: "Checkout",
    parentId: null,
    caseCount: 1,
    version: 1,
  },
  {
    id: "0199c0de-0000-7000-8000-0000000000a2",
    name: "Refunds",
    parentId: "0199c0de-0000-7000-8000-0000000000a1",
    caseCount: 1,
    version: 1,
  },
]

const summary = (overrides: Partial<CaseSummary> = {}): CaseSummary => ({
  id: "c1",
  number: 1,
  key: "PAY-TC-1",
  title: "Declined card shows a retry message",
  suiteId: "0199c0de-0000-7000-8000-0000000000a2",
  priority: "critical",
  type: "functional",
  status: "ready",
  labels: ["smoke"],
  archived: false,
  stepCount: 2,
  updatedAt: "2026-10-12T10:00:00.000Z",
  ...overrides,
})

const full = (overrides: Partial<TestCase> = {}): TestCase => ({
  ...summary(),
  references: "PAY-1188",
  preconditions: "Test card 4000 0000 0000 0002",
  steps: [
    { action: "Pay with the declined card", expected: "Payment is declined" },
    { action: "Read the message", expected: "" },
  ],
  revision: 3,
  version: 5,
  archiveReason: "",
  duplicatedFrom: null,
  importNumber: null,
  createdBy: { id: "u1", name: "Marco" },
  updatedBy: { id: "u2", name: "Priya Nair" },
  createdAt: "2026-10-01T10:00:00.000Z",
  ...overrides,
})

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })

type Handler = (init?: RequestInit) => Response
let routes: Record<string, Handler>
let calls: { method: string; path: string; body: unknown }[]

beforeEach(() => {
  calls = []
  routes = {
    "GET /api/projects/PAY/suites": () =>
      json(200, { items: suites, noSuiteCount: 0, archivedCount: 0 }),
    "GET /api/projects/PAY/case-labels": () =>
      json(200, { items: ["smoke", "regression"] }),
  }
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const path = url.split("?")[0]!
      const method = init?.method ?? "GET"
      calls.push({
        method,
        path,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      })
      const handler = routes[`${method} ${path}`]
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

function renderAt(path: string, role: ProjectRole) {
  routes["GET /api/projects/PAY"] = () => json(200, project(role))
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClient.setQueryData(sessionQueryKey, user)
  const router = createMemoryRouter(
    [
      {
        path: "/projects/:key",
        element: (
          <>
            <Where />
            <ProjectLayout />
          </>
        ),
        children: [
          { path: "cases", element: <CasesPage /> },
          { path: "cases/new", element: <CaseEditorPage /> },
          { path: "cases/import", element: <ImportPage /> },
          { path: "cases/:ref", element: <CasePage /> },
          { path: "cases/:ref/edit", element: <CaseEditorPage /> },
        ],
      },
    ],
    { initialEntries: [path] }
  )
  render(
    <QueryClientProvider client={queryClient}>
      <Toaster>
        <RouterProvider router={router} />
      </Toaster>
    </QueryClientProvider>
  )
}

const list = (items: CaseSummary[]) => () =>
  json(200, { items, total: items.length, page: 1, pageSize: 25 })

describe("CasesPage", () => {
  it("lists cases with their suite, labels and status, and lets a QA Lead act", async () => {
    routes["GET /api/projects/PAY/cases"] = list([summary()])
    renderAt("/projects/PAY/cases", "lead")
    const link = await screen.findByRole("link", {
      name: "Declined card shows a retry message",
    })
    expect(link).toHaveAttribute("href", "/projects/PAY/cases/PAY-TC-1")
    const row = link.closest("tr")!
    // Shown in its column and, for narrow screens, under the title.
    expect(within(row).getAllByText("PAY-TC-1")).toHaveLength(2)
    expect(within(row).getByText("Checkout › Refunds")).toBeInTheDocument()
    expect(within(row).getByText("smoke")).toBeInTheDocument()
    expect(within(row).getAllByText("Ready")).toHaveLength(2)
    expect(within(row).getAllByText("Critical")).toHaveLength(2)
    expect(
      screen.getByRole("button", { name: /New test case/ })
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Import/ })).toBeInTheDocument()
    expect(
      screen.getByRole("checkbox", { name: "Select PAY-TC-1" })
    ).toBeInTheDocument()
  })

  it("opens a preview on click, without leaving the list", async () => {
    routes["GET /api/projects/PAY/cases"] = list([summary()])
    routes["GET /api/projects/PAY/cases/PAY-TC-1"] = () => json(200, full())
    renderAt("/projects/PAY/cases", "tester")
    await userEvent.click(
      await screen.findByRole("link", {
        name: "Declined card shows a retry message",
      })
    )
    const preview = await screen.findByRole("article")
    expect(
      await within(preview).findByText("Pay with the declined card")
    ).toBeInTheDocument()
    expect(within(preview).getByText("· version 3")).toBeInTheDocument()
    expect(screen.getByTestId("where")).toHaveTextContent("/projects/PAY/cases")
    // Testers edit but don't archive.
    expect(
      within(preview).getByRole("button", { name: /Edit/ })
    ).toBeInTheDocument()
    expect(
      within(preview).queryByRole("button", { name: /Archive/ })
    ).not.toBeInTheDocument()
  })

  it("is read-only for viewers", async () => {
    routes["GET /api/projects/PAY/cases"] = list([summary()])
    renderAt("/projects/PAY/cases", "viewer")
    await screen.findByRole("link", {
      name: "Declined card shows a retry message",
    })
    expect(screen.getByText(/You're a Viewer/)).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /New test case/ })
    ).not.toBeInTheDocument()
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Export/ })).toBeInTheDocument()
  })

  it("keeps the list for a project whose cases are all archived", async () => {
    routes["GET /api/projects/PAY/suites"] = () =>
      json(200, { items: [], noSuiteCount: 0, archivedCount: 3 })
    routes["GET /api/projects/PAY/cases"] = list([])
    renderAt("/projects/PAY/cases", "lead")
    expect(
      await screen.findByRole("combobox", { name: "Status" })
    ).toBeInTheDocument()
    expect(screen.queryByText("No test cases yet")).not.toBeInTheDocument()
  })

  it("leaves unticked cases out of an all-matching bulk change", async () => {
    const many = Array.from({ length: 25 }, (_, i) =>
      summary({
        id: `0199c0de-0000-7000-8000-${String(i).padStart(12, "0")}`,
        number: i + 1,
        key: `PAY-TC-${i + 1}`,
        title: `Case ${i + 1}`,
      })
    )
    routes["GET /api/projects/PAY/cases"] = () =>
      json(200, { items: many, total: 60, page: 1, pageSize: 25 })
    routes["POST /api/projects/PAY/cases/bulk"] = () =>
      json(200, { updated: 59 })
    renderAt("/projects/PAY/cases", "lead")
    await userEvent.click(
      await screen.findByRole("checkbox", { name: "Select all on this page" })
    )
    await userEvent.click(
      screen.getByRole("button", { name: "Select all 60 matching" })
    )
    await userEvent.click(
      screen.getByRole("checkbox", { name: "Select PAY-TC-2" })
    )
    expect(
      screen.getByText("59 of 60 matching cases selected")
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Set priority…" }))
    await userEvent.click(screen.getByRole("combobox", { name: "Priority" }))
    await userEvent.click(await screen.findByRole("option", { name: "Low" }))
    await userEvent.click(
      screen.getByRole("button", { name: "Update 59 test cases" })
    )
    await waitFor(() =>
      expect(calls.some((c) => c.method === "POST")).toBe(true)
    )
    expect(calls.find((c) => c.method === "POST")!.body).toEqual({
      selection: { filter: { suite: "all" }, exclude: [many[1]!.id] },
      action: { kind: "setPriority", priority: "low" },
    })
    // Many clicks through selects and dialogs: slow on a busy machine.
  }, 15_000)

  it("welcomes an empty project", async () => {
    routes["GET /api/projects/PAY/suites"] = () =>
      json(200, { items: [], noSuiteCount: 0, archivedCount: 0 })
    routes["GET /api/projects/PAY/cases"] = list([])
    renderAt("/projects/PAY/cases", "lead")
    expect(
      await screen.findByRole("heading", { name: "No test cases yet" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Import from CSV or Excel" })
    ).toBeInTheDocument()
  })
})

describe("CaseEditorPage", () => {
  it("validates the title and steps before creating", async () => {
    renderAt("/projects/PAY/cases/new", "tester")
    await userEvent.click(
      await screen.findByRole("button", { name: "Create test case" })
    )
    expect(await screen.findByText("Enter a title")).toBeInTheDocument()
    expect(
      screen.getByText("Describe what the tester does")
    ).toBeInTheDocument()
    expect(calls.some((c) => c.method === "POST")).toBe(false)
  })

  it("creates a case with its steps and goes to it", async () => {
    routes["POST /api/projects/PAY/cases"] = () =>
      json(201, full({ key: "PAY-TC-9", number: 9 }))
    renderAt(
      "/projects/PAY/cases/new?suite=0199c0de-0000-7000-8000-0000000000a2",
      "tester"
    )
    await userEvent.type(await screen.findByLabelText("Title"), "Pay by card")
    await userEvent.type(screen.getByLabelText("Step 1 action"), "Pay")
    await userEvent.click(screen.getByRole("button", { name: "Add step" }))
    await userEvent.type(screen.getByLabelText("Step 2 action"), "Check email")
    await userEvent.type(
      screen.getByLabelText("Step 2 expected result"),
      "Receipt arrives"
    )
    await userEvent.click(
      screen.getByRole("button", { name: "Create test case" })
    )
    await waitFor(() =>
      expect(screen.getByTestId("where")).toHaveTextContent(
        "/projects/PAY/cases/PAY-TC-9"
      )
    )
    const post = calls.find((c) => c.method === "POST")!
    expect(post.body).toMatchObject({
      title: "Pay by card",
      suiteId: "0199c0de-0000-7000-8000-0000000000a2",
      status: "draft",
      steps: [
        { action: "Pay", expected: "" },
        { action: "Check email", expected: "Receipt arrives" },
      ],
    })
  })

  it("removes a step from its menu, with undo", async () => {
    routes["GET /api/projects/PAY/cases/PAY-TC-1"] = () => json(200, full())
    renderAt("/projects/PAY/cases/PAY-TC-1/edit", "lead")
    await screen.findByDisplayValue("Pay with the declined card")
    await userEvent.click(
      screen.getByRole("button", { name: "Step 1 actions" })
    )
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Remove step" })
    )
    expect(
      screen.queryByDisplayValue("Pay with the declined card")
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText("Step 1 action")).toHaveValue(
      "Read the message"
    )
    await userEvent.click(await screen.findByRole("button", { name: "Undo" }))
    expect(screen.getByLabelText("Step 1 action")).toHaveValue(
      "Pay with the declined card"
    )
  })

  it("shows both versions on a conflict and can save over theirs", async () => {
    let version = 5
    routes["GET /api/projects/PAY/cases/PAY-TC-1"] = () =>
      json(
        200,
        version === 5
          ? full()
          : full({ version: 6, revision: 4, priority: "high" })
      )
    routes["PATCH /api/projects/PAY/cases/PAY-TC-1"] = (init) => {
      const body = JSON.parse(String(init!.body)) as { overwrite: boolean }
      if (!body.overwrite) {
        version = 6
        return json(409, {
          statusCode: 409,
          message: "Someone saved a newer version",
        })
      }
      return json(200, full({ version: 7, revision: 5 }))
    }
    renderAt("/projects/PAY/cases/PAY-TC-1/edit", "tester")
    const title = await screen.findByLabelText("Title")
    await userEvent.clear(title)
    await userEvent.type(title, "Declined card message")
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    const panel = await screen.findByRole("alert")
    expect(
      within(panel).getByText(/Priya Nair saved a newer version/)
    ).toBeInTheDocument()
    // Only the field I changed is listed; their priority change isn't mine to undo.
    expect(
      within(panel).queryByRole("row", { name: /Priority/ })
    ).not.toBeInTheDocument()
    const titleRow = within(panel).getByRole("row", { name: /Title/ })
    expect(
      within(titleRow).getByText("Declined card message")
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled()

    await userEvent.click(
      within(panel).getByRole("button", { name: "Save mine over theirs" })
    )
    await waitFor(() =>
      expect(screen.getByTestId("where")).toHaveTextContent(
        "/projects/PAY/cases/PAY-TC-1"
      )
    )
    const patches = calls.filter((c) => c.method === "PATCH")
    expect(patches.at(-1)!.body).toMatchObject({
      title: "Declined card message",
      priority: "high",
      version: 6,
      overwrite: true,
    })
  })

  it("won't save while the labels field holds an invalid label", async () => {
    renderAt("/projects/PAY/cases/new", "tester")
    await userEvent.type(await screen.findByLabelText("Title"), "Pay by card")
    await userEvent.type(screen.getByLabelText("Step 1 action"), "Pay")
    await userEvent.type(screen.getByLabelText(/Labels/), "bad!label{Enter}")
    expect(screen.getByText(/Use letters, digits/)).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole("button", { name: "Create test case" })
    )
    expect(screen.getByLabelText(/Labels/)).toHaveFocus()
    expect(calls.some((c) => c.method === "POST")).toBe(false)
  })

  it("shows the API's reason when a 409 isn't an edit conflict", async () => {
    routes["GET /api/projects/PAY/cases/PAY-TC-1"] = () => json(200, full())
    routes["PATCH /api/projects/PAY/cases/PAY-TC-1"] = () =>
      json(409, {
        statusCode: 409,
        message: "This project is archived, so it can't be changed",
      })
    renderAt("/projects/PAY/cases/PAY-TC-1/edit", "tester")
    const title = await screen.findByLabelText("Title")
    await userEvent.type(title, " edited")
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))
    expect(
      await screen.findByText(
        "This project is archived, so it can't be changed"
      )
    ).toBeInTheDocument()
    expect(screen.queryByText(/saved a newer version/)).not.toBeInTheDocument()
    // The form, with the edits, is still there.
    expect(screen.getByLabelText("Title")).toHaveValue(
      "Declined card shows a retry message edited"
    )
  })

  it("tells viewers they can't edit", async () => {
    renderAt("/projects/PAY/cases/new", "viewer")
    expect(
      await screen.findByText("You can't edit test cases here")
    ).toBeInTheDocument()
  })
})

describe("ImportPage", () => {
  const batch = (archived: boolean) => ({
    number: 7,
    fileName: "cases.xlsx",
    caseCount: 40,
    archived,
    createdBy: { id: "u1", name: "Marco" },
    createdAt: "2026-10-13T10:00:00.000Z",
  })

  it("lets a QA Lead restore an archived import", async () => {
    let archived = true
    routes["GET /api/projects/PAY/imports"] = () =>
      json(200, { items: [batch(archived)] })
    routes["POST /api/projects/PAY/imports/7/restore"] = () => {
      archived = false
      return json(200, { restoredCases: 40 })
    }
    renderAt("/projects/PAY/cases/import", "lead")
    await userEvent.click(
      await screen.findByRole("button", { name: "Restore this import…" })
    )
    await userEvent.click(
      screen.getByRole("button", { name: "Restore import" })
    )
    expect(await screen.findByText("Import #7 restored")).toBeInTheDocument()
    expect(
      await screen.findByRole("button", { name: "Archive this import…" })
    ).toBeInTheDocument()
  })

  it("doesn't offer restore to testers", async () => {
    routes["GET /api/projects/PAY/imports"] = () =>
      json(200, { items: [batch(true)] })
    renderAt("/projects/PAY/cases/import", "tester")
    expect(await screen.findByText("Archived")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Restore this import…" })
    ).not.toBeInTheDocument()
  })
})
