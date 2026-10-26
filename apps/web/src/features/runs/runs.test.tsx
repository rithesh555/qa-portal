import type {
  Project,
  ProjectRole,
  RunCase,
  RunCaseDetail,
  RunSummary,
  SessionUser,
  TestRun,
} from "@qa/shared"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter } from "react-router"
import { RouterProvider } from "react-router/dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Toaster } from "@/components/ui/toast"
import { sessionQueryKey } from "@/features/auth/session"
import { ProjectLayout } from "@/features/projects/project-layout"
import { RunPage } from "./run-page"
import { RunsPage } from "./runs-page"

const user: SessionUser = {
  id: "u-me",
  username: "me",
  name: "Me Myself",
  email: "me@example.com",
  role: "user",
  mustChangePassword: false,
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

const person = { id: "u-other", name: "Priya Nair" }

const summary = (overrides: Partial<RunSummary> = {}): RunSummary => ({
  id: "r1",
  number: 12,
  key: "PAY-R-12",
  name: "Release 4.2 regression",
  environment: "Chrome 128",
  release: { id: "rel1", name: "4.2" },
  state: "open",
  counts: { passed: 6, failed: 1, blocked: 1, skipped: 0, untested: 2 },
  assignees: [person],
  createdBy: person,
  createdAt: "2026-10-12T10:00:00.000Z",
  updatedAt: "2026-10-13T10:00:00.000Z",
  closedAt: null,
  closedBy: null,
  ...overrides,
})

const run = (overrides: Partial<TestRun> = {}): TestRun => ({
  ...summary(),
  description: "",
  version: 1,
  ...overrides,
})

const rc = (n: number, overrides: Partial<RunCase> = {}): RunCase => ({
  id: `0199c0de-0000-7000-8000-00000000000${n}`,
  position: n,
  caseKey: `PAY-TC-${n}`,
  title: `Case number ${n}`,
  suitePath: "Checkout",
  priority: "high",
  status: "untested",
  assignee: null,
  version: 1,
  ...overrides,
})

const detail = (c: RunCase): RunCaseDetail => ({
  ...c,
  type: "functional",
  caseStatus: "ready",
  labels: [],
  preconditions: "",
  steps: [
    { action: "Open checkout", expected: "It opens" },
    { action: "Pay", expected: "Paid" },
  ],
  revision: 2,
  latestRevision: 2,
  results: [],
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
    "GET /api/projects/PAY/releases": () => json(200, { items: [] }),
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
  try {
    localStorage.clear()
  } catch {
    // Not available.
  }
})
afterEach(() => vi.unstubAllGlobals())

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
        element: <ProjectLayout />,
        children: [
          { path: "runs", element: <RunsPage /> },
          { path: "runs/:ref", element: <RunPage /> },
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
  return router
}

/** A run of three cases; detail requests answer from `cases`. */
function serveRun(r: TestRun, cases: RunCase[]) {
  routes["GET /api/projects/PAY/runs/PAY-R-12"] = () => json(200, r)
  routes["GET /api/projects/PAY/runs/PAY-R-12/cases"] = () =>
    json(200, { items: cases })
  for (const c of cases) {
    routes[`GET /api/projects/PAY/runs/PAY-R-12/cases/${c.id}`] = () =>
      json(200, detail(c))
    routes[`POST /api/projects/PAY/runs/PAY-R-12/cases/${c.id}/results`] = (
      init
    ) => {
      const body = JSON.parse(String(init!.body)) as { status: string }
      return json(200, {
        ...detail(c),
        status: body.status,
        version: c.version + 1,
      })
    }
  }
}

const resultButton = (name: string) =>
  within(screen.getByRole("group", { name: "Record a result" })).getByRole(
    "button",
    { name: new RegExp(`^${name}`) }
  )

const resultCalls = () =>
  calls.filter((c) => c.method === "POST" && c.path.endsWith("/results"))

describe("RunsPage", () => {
  it("lists runs with progress and the shared pass rate", async () => {
    routes["GET /api/projects/PAY/runs"] = () =>
      json(200, { items: [summary()], total: 1, page: 1, pageSize: 25 })
    renderAt("/projects/PAY/runs", "tester")
    const link = await screen.findByRole("link", {
      name: "Release 4.2 regression",
    })
    expect(link).toHaveAttribute("href", "/projects/PAY/runs/PAY-R-12")
    const row = link.closest("tr")!
    // passed ÷ (passed + failed + blocked) = 6 ÷ 8
    expect(within(row).getByText("75%")).toBeInTheDocument()
    // Twice: its column, and the copy folded under the name for phones
    // (CSS shows one; jsdom applies none).
    expect(
      within(row).getAllByRole("img", { name: /80% complete/ })
    ).toHaveLength(2)
    expect(screen.getByRole("link", { name: /New run/ })).toBeInTheDocument()
  })

  it("doesn't offer a new run to a Viewer", async () => {
    routes["GET /api/projects/PAY/runs"] = () =>
      json(200, { items: [summary()], total: 1, page: 1, pageSize: 25 })
    renderAt("/projects/PAY/runs", "viewer")
    await screen.findByRole("link", { name: "Release 4.2 regression" })
    expect(screen.queryByRole("link", { name: /New run/ })).toBeNull()
  })
})

describe("RunPage", () => {
  it("recovers from an edit conflict: says who, then saves over their version on request", async () => {
    // No release: the fixture's release id isn't a real uuid, which the form rejects.
    let current = run({ release: null })
    const patches: { version: number; environment: string }[] = []
    serveRun(current, [rc(1)])
    routes["GET /api/projects/PAY/runs/PAY-R-12"] = () => json(200, current)
    routes["PATCH /api/projects/PAY/runs/PAY-R-12"] = (init) => {
      const body = JSON.parse(String(init!.body)) as {
        version: number
        environment: string
      }
      patches.push(body)
      // Tom saved just before the first attempt.
      if (patches.length === 1)
        current = { ...current, environment: "Safari 18", version: 2 }
      if (body.version !== current.version)
        return json(409, {
          statusCode: 409,
          message:
            "Tom Reyes changed this run meanwhile. Load their version to continue.",
          reason: "stale",
        })
      current = { ...current, ...body, version: current.version + 1 }
      return json(200, current)
    }
    renderAt("/projects/PAY/runs/PAY-R-12", "lead")
    await screen.findByRole("heading", { name: "Case number 1" })

    await userEvent.click(screen.getByRole("button", { name: /Run actions/ }))
    await userEvent.click(
      await screen.findByRole("menuitem", {
        name: /Edit details and environment/,
      })
    )
    const dialog = await screen.findByRole("dialog")
    const env = within(dialog).getByLabelText(/Environment/)
    await userEvent.clear(env)
    await userEvent.type(env, "Chrome 130")
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Save changes" })
    )

    expect(
      await within(dialog).findByText(/Tom Reyes changed this run meanwhile/)
    ).toBeInTheDocument()
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Save mine anyway" })
    )
    await waitFor(() => expect(current.environment).toBe("Chrome 130"))
    expect(patches.map((p) => p.version)).toEqual([1, 2])
  })

  it("records Passed with P and moves to the next untested case", async () => {
    const cases = [rc(1), rc(2, { status: "passed" }), rc(3)]
    serveRun(run(), cases)
    const router = renderAt("/projects/PAY/runs/PAY-R-12", "tester")
    await screen.findByRole("heading", { name: "Case number 1" })
    await waitFor(() => expect(resultButton("Passed")).toBeEnabled())
    await userEvent.keyboard("p")
    await waitFor(() => expect(resultCalls()).toHaveLength(1))
    expect(resultCalls()[0]).toMatchObject({
      path: `/api/projects/PAY/runs/PAY-R-12/cases/${cases[0]!.id}/results`,
      body: { status: "passed", expectedVersion: 1, note: "" },
    })
    // Skips PAY-TC-2, which already has a result.
    await screen.findByRole("heading", { name: "Case number 3" })
    expect(router.state.location.search).toContain(cases[2]!.id)
    expect(screen.getByRole("button", { name: /Undo/ })).toBeInTheDocument()
  })

  it("asks what went wrong before saving Failed, then saves with Ctrl+Enter", async () => {
    serveRun(run(), [rc(1), rc(2)])
    renderAt("/projects/PAY/runs/PAY-R-12", "tester")
    await screen.findByRole("heading", { name: "Case number 1" })
    await waitFor(() => expect(resultButton("Failed")).toBeEnabled())
    await userEvent.keyboard("f")
    const note = await screen.findByRole("textbox", {
      name: /What went wrong/,
    })
    await waitFor(() => expect(note).toHaveFocus())
    await userEvent.keyboard("{Control>}{Enter}{/Control}")
    expect(
      await screen.findByText("Say what went wrong before saving")
    ).toBeInTheDocument()
    expect(resultCalls()).toHaveLength(0)
    // Typing in the note doesn't trigger shortcuts.
    await userEvent.type(note, "Spinner never stops")
    await userEvent.keyboard("{Control>}{Enter}{/Control}")
    await waitFor(() => expect(resultCalls()).toHaveLength(1))
    expect(resultCalls()[0]!.body).toMatchObject({
      status: "failed",
      note: "Spinner never stops",
      failedStep: null,
    })
  })

  it("keeps an unsaved Failed note when moving to another case and back", async () => {
    serveRun(run(), [rc(1), rc(2)])
    renderAt("/projects/PAY/runs/PAY-R-12", "tester")
    await screen.findByRole("heading", { name: "Case number 1" })
    await waitFor(() => expect(resultButton("Failed")).toBeEnabled())
    await userEvent.keyboard("f")
    const note = await screen.findByRole("textbox", {
      name: /What went wrong/,
    })
    await userEvent.type(note, "Spinner never stops")
    await userEvent.click(screen.getByRole("button", { name: /^Next/ }))
    await screen.findByRole("heading", { name: "Case number 2" })
    expect(
      screen.queryByRole("textbox", { name: /What went wrong/ })
    ).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /^Previous/ }))
    await screen.findByRole("heading", { name: "Case number 1" })
    expect(
      await screen.findByRole("textbox", { name: /What went wrong/ })
    ).toHaveValue("Spinner never stops")
    expect(resultCalls()).toHaveLength(0)
  })

  it("asks before leaving the run with an unsaved note", async () => {
    serveRun(run(), [rc(1)])
    routes["GET /api/projects/PAY/runs"] = () =>
      json(200, { items: [], total: 0 })
    const router = renderAt("/projects/PAY/runs/PAY-R-12", "tester")
    await screen.findByRole("heading", { name: "Case number 1" })
    await waitFor(() => expect(resultButton("Blocked")).toBeEnabled())
    await userEvent.keyboard("b")
    await userEvent.type(
      await screen.findByRole("textbox", { name: /What went wrong/ }),
      "Login is down"
    )
    void router.navigate("/projects/PAY/runs")
    const dialog = await screen.findByRole("alertdialog")
    expect(dialog).toHaveTextContent(/will be lost/)
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Keep editing" })
    )
    expect(router.state.location.pathname).toBe("/projects/PAY/runs/PAY-R-12")
    expect(
      screen.getByRole("textbox", { name: /What went wrong/ })
    ).toHaveValue("Login is down")
  })

  it("forgets the note once it's saved: leaving doesn't ask", async () => {
    serveRun(run(), [rc(1), rc(2)])
    routes["GET /api/projects/PAY/runs"] = () =>
      json(200, { items: [], total: 0 })
    const router = renderAt("/projects/PAY/runs/PAY-R-12", "tester")
    await screen.findByRole("heading", { name: "Case number 1" })
    await waitFor(() => expect(resultButton("Failed")).toBeEnabled())
    await userEvent.keyboard("f")
    await userEvent.type(
      await screen.findByRole("textbox", { name: /What went wrong/ }),
      "Spinner never stops{Control>}{Enter}{/Control}"
    )
    await screen.findByRole("heading", { name: "Case number 2" })
    await router.navigate("/projects/PAY/runs")
    expect(router.state.location.pathname).toBe("/projects/PAY/runs")
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  it("undoes the last result by recording the one before it", async () => {
    const cases = [rc(1), rc(2)]
    serveRun(run(), cases)
    renderAt("/projects/PAY/runs/PAY-R-12", "tester")
    await screen.findByRole("heading", { name: "Case number 1" })
    await waitFor(() => expect(resultButton("Skipped")).toBeEnabled())
    await userEvent.keyboard("s")
    await screen.findByRole("button", { name: /Undo/ })
    await userEvent.keyboard("u")
    await waitFor(() => expect(resultCalls()).toHaveLength(2))
    expect(resultCalls()[1]).toMatchObject({
      path: `/api/projects/PAY/runs/PAY-R-12/cases/${cases[0]!.id}/results`,
      body: { status: "untested", expectedVersion: 2 },
    })
  })

  it("explains why a tester can't close a run with untested cases", async () => {
    serveRun(run({ createdBy: { id: user.id, name: user.name } }), [rc(1)])
    renderAt("/projects/PAY/runs/PAY-R-12", "tester")
    const close = await screen.findByRole("button", { name: "Close run" })
    expect(close).toBeDisabled()
    expect(
      screen.getByText(
        "You can close this run once every case has a result (2 left)."
      )
    ).toBeInTheDocument()
  })

  it("lets a QA Lead close a run early, after confirming", async () => {
    serveRun(run(), [rc(1)])
    routes["POST /api/projects/PAY/runs/PAY-R-12/close"] = () =>
      json(200, run({ state: "closed", closedAt: "2026-10-14T10:00:00.000Z" }))
    renderAt("/projects/PAY/runs/PAY-R-12", "lead")
    await userEvent.click(
      await screen.findByRole("button", { name: "Close run" })
    )
    const dialog = await screen.findByRole("alertdialog")
    expect(dialog).toHaveTextContent("2 cases have no result")
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Close run" })
    )
    await waitFor(() =>
      expect(
        calls.some(
          (c) =>
            c.method === "POST" &&
            c.path === "/api/projects/PAY/runs/PAY-R-12/close"
        )
      ).toBe(true)
    )
  })

  it("is read-only for a Viewer", async () => {
    serveRun(run(), [rc(1)])
    renderAt("/projects/PAY/runs/PAY-R-12", "viewer")
    await screen.findByRole("heading", { name: "Case number 1" })
    expect(screen.queryByRole("group", { name: "Record a result" })).toBeNull()
    await userEvent.keyboard("p")
    expect(resultCalls()).toHaveLength(0)
    expect(screen.queryByRole("button", { name: "Close run" })).toBeNull()
  })
})
