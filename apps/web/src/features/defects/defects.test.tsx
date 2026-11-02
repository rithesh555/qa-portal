import type {
  Defect,
  DefectSummary,
  Project,
  ProjectRole,
  RunCaseDetail,
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
import { DefectPage } from "./defect-page"
import { DefectsPage } from "./defects-page"
import { draftFromResult } from "./log-defect-dialog"

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

const tom = { id: "u-tom", name: "Tom Reyes" }

const summary = (over: Partial<DefectSummary> = {}): DefectSummary => ({
  id: "0199c0de-0000-7000-8000-0000000000d1",
  number: 14,
  key: "PAY-D-14",
  title: "3-D Secure spinner never stops",
  status: "new",
  severity: "critical",
  priority: null,
  assignee: null,
  reporter: tom,
  foundInRelease: { id: "r1", name: "4.2" },
  foundInRun: { key: "PAY-R-12" },
  environment: "Safari 18",
  detectedIn: "qa",
  linkCount: 1,
  createdAt: "2026-10-14T10:00:00.000Z",
  updatedAt: "2026-10-14T10:00:00.000Z",
  ...over,
})

const defect = (over: Partial<Defect> = {}): Defect => ({
  ...summary(),
  description: "",
  steps: "1. Pay",
  expected: "Paid",
  actual: "Spins",
  reproducibility: "always",
  developer: "",
  trackerUrl: "",
  source: "result",
  case: null,
  resolution: null,
  duplicateOf: null,
  fixedInRelease: null,
  fixedInBuild: "",
  reopenCount: 0,
  openedAt: null,
  fixedAt: null,
  closedAt: null,
  links: [],
  path: ["new"],
  version: 3,
  ...over,
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
    "GET /api/projects/PAY/members": () =>
      json(200, { items: [], total: 0, page: 1, pageSize: 100 }),
    "GET /api/projects/PAY/defects/PAY-D-14/activity": () =>
      json(200, { items: [] }),
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
          { path: "defects", element: <DefectsPage /> },
          { path: "defects/:ref", element: <DefectPage /> },
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

const page = (items: DefectSummary[]) =>
  json(200, { items, total: items.length, page: 1, pageSize: 25 })

describe("DefectsPage", () => {
  it("lists defects with severity, status and where they were found", async () => {
    routes["GET /api/projects/PAY/defects"] = () => page([summary()])
    renderAt("/projects/PAY/defects", "tester")
    const link = await screen.findByRole("link", {
      name: "3-D Secure spinner never stops",
    })
    expect(link).toHaveAttribute("href", "/projects/PAY/defects/PAY-D-14")
    const row = link.closest("tr")!
    // In its column and, for narrow screens, under the title.
    expect(within(row).getAllByText("Critical")).toHaveLength(2)
    expect(within(row).getAllByText("New")).toHaveLength(2)
    expect(within(row).getByText("Not set")).toBeInTheDocument()
    expect(
      within(row).getByRole("link", { name: "PAY-R-12" })
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /New defect/ })).toBeInTheDocument()
  })

  it("shows a QA Lead how many defects wait for triage, and filters to them", async () => {
    routes["GET /api/projects/PAY/defects"] = () => page([summary()])
    renderAt("/projects/PAY/defects", "lead")
    await userEvent.click(
      await screen.findByRole("button", { name: "Show new defects" })
    )
    await waitFor(() =>
      expect(
        calls.some(
          (c) => c.path === "/api/projects/PAY/defects" && c.method === "GET"
        )
      ).toBe(true)
    )
    expect(
      await screen.findByRole("button", { name: "Clear filters" })
    ).toBeInTheDocument()
  })

  it("explains the empty project, without a New button for viewers", async () => {
    routes["GET /api/projects/PAY/defects"] = () => page([])
    renderAt("/projects/PAY/defects", "viewer")
    expect(
      await screen.findByRole("heading", { name: "No defects yet" })
    ).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /New defect/ })).toBeNull()
    expect(
      screen.getByText(/once QA Leads and Testers log them/)
    ).toBeInTheDocument()
  })
})

describe("DefectPage links", () => {
  it("unlinks a result with an Undo that stays put and takes focus, and Undo hands focus back (F7, F9)", async () => {
    const link = {
      id: "link-1",
      resultId: "result-1",
      kind: "failed" as const,
      runKey: "PAY-R-12",
      runCaseId: "rc-1",
      caseKey: "PAY-TC-3",
      caseTitle: "Pay by card",
      failedStep: 2,
      note: "Spins",
      recordedBy: tom,
      recordedAt: "2026-10-14T10:00:00.000Z",
      linkedBy: tom,
      linkedAt: "2026-10-14T10:00:00.000Z",
    }
    let current = defect({ links: [link] })
    routes["GET /api/projects/PAY/defects/PAY-D-14"] = () => json(200, current)
    routes["DELETE /api/projects/PAY/defects/PAY-D-14/links/link-1"] = () => {
      current = defect({ links: [] })
      return json(200, current)
    }
    routes["POST /api/projects/PAY/defects/PAY-D-14/links"] = () => {
      // Linking again makes a new link for the same result.
      current = defect({ links: [{ ...link, id: "link-2" }] })
      return json(200, current)
    }
    renderAt("/projects/PAY/defects/PAY-D-14", "tester")
    await userEvent.click(
      await screen.findByRole("button", { name: "Unlink PAY-TC-3 in PAY-R-12" })
    )
    const undo = await screen.findByRole("button", {
      name: "Undo unlinking PAY-TC-3 in PAY-R-12",
    })
    await waitFor(() => expect(undo).toHaveFocus())
    await userEvent.click(undo)
    await waitFor(() =>
      expect(
        calls.find((c) => c.method === "POST" && c.path.endsWith("/links"))
          ?.body
      ).toEqual({ resultId: "result-1" })
    )
    const unlinkAgain = await screen.findByRole("button", {
      name: "Unlink PAY-TC-3 in PAY-R-12",
    })
    await waitFor(() => expect(unlinkAgain).toHaveFocus())
  })
})

describe("DefectPage comments (F19)", () => {
  const comment = (body: string) => ({
    id: "c1",
    kind: "comment" as const,
    actor: tom,
    action: "commented",
    changes: null,
    body,
    createdAt: "2026-10-14T11:00:00.000Z",
  })

  it("posts a comment with Ctrl+Enter", async () => {
    routes["GET /api/projects/PAY/defects/PAY-D-14"] = () => json(200, defect())
    routes["POST /api/projects/PAY/defects/PAY-D-14/comments"] = () =>
      json(200, comment("Seen on staging too"))
    renderAt("/projects/PAY/defects/PAY-D-14", "tester")
    const box = await screen.findByLabelText("Add a comment")
    await userEvent.type(box, "Seen on staging too")
    await userEvent.keyboard("{Control>}{Enter}{/Control}")
    await waitFor(() =>
      expect(
        calls.find((c) => c.method === "POST" && c.path.endsWith("/comments"))
          ?.body
      ).toEqual({ body: "Seen on staging too" })
    )
  })

  it("turns web addresses in comments into links, and nothing else", async () => {
    routes["GET /api/projects/PAY/defects/PAY-D-14"] = () => json(200, defect())
    routes["GET /api/projects/PAY/defects/PAY-D-14/activity"] = () =>
      json(200, {
        items: [
          comment(
            "Log: https://logs.example.com/run/42?x=1. Not javascript:alert(1)"
          ),
        ],
      })
    renderAt("/projects/PAY/defects/PAY-D-14", "tester")
    const link = await screen.findByRole("link", {
      name: "https://logs.example.com/run/42?x=1",
    })
    expect(link).toHaveAttribute("href", "https://logs.example.com/run/42?x=1")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
    expect(screen.getByText(/Not javascript:alert\(1\)/)).toBeInTheDocument()
    expect(
      screen.queryByRole("link", { name: /javascript/ })
    ).not.toBeInTheDocument()
  })
})

describe("DefectPage workflow", () => {
  it("separates No release from the run it was found in (F17)", async () => {
    routes["GET /api/projects/PAY/defects/PAY-D-14"] = () =>
      json(200, defect({ foundInRelease: null }))
    renderAt("/projects/PAY/defects/PAY-D-14", "tester")
    const run = await screen.findByRole("link", { name: "PAY-R-12" })
    expect(run.parentElement).toHaveTextContent(/^No release, PAY-R-12$/)
  })

  it("leaves triage to a QA Lead", async () => {
    routes["GET /api/projects/PAY/defects/PAY-D-14"] = () => json(200, defect())
    renderAt("/projects/PAY/defects/PAY-D-14", "tester")
    await screen.findByRole("heading", {
      name: "3-D Secure spinner never stops",
    })
    expect(screen.queryByRole("button", { name: "Confirm (Open)" })).toBeNull()
    expect(
      screen.getByText(/Waiting for a QA Lead to confirm it/)
    ).toBeInTheDocument()
  })

  it("confirms a new defect in one click for a lead", async () => {
    routes["GET /api/projects/PAY/defects/PAY-D-14"] = () => json(200, defect())
    routes["POST /api/projects/PAY/defects/PAY-D-14/transition"] = () =>
      json(200, defect({ status: "open", path: ["new", "open"], version: 4 }))
    renderAt("/projects/PAY/defects/PAY-D-14", "lead")
    await userEvent.click(
      await screen.findByRole("button", { name: "Confirm (Open)" })
    )
    await waitFor(() =>
      expect(
        calls.find((c) => c.path.endsWith("/transition"))?.body
      ).toMatchObject({
        to: "open",
        version: 3,
      })
    )
  })

  it("asks why when rejecting, and which defect it duplicates", async () => {
    routes["GET /api/projects/PAY/defects/PAY-D-14"] = () => json(200, defect())
    routes["GET /api/projects/PAY/defects"] = () =>
      page([
        summary({
          id: "0199c0de-0000-7000-8000-0000000000d2",
          key: "PAY-D-9",
          title: "Original",
        }),
      ])
    routes["POST /api/projects/PAY/defects/PAY-D-14/transition"] = () =>
      json(200, defect({ status: "rejected" }))
    renderAt("/projects/PAY/defects/PAY-D-14", "lead")
    await userEvent.click(
      await screen.findByRole("button", { name: "Reject…" })
    )
    await userEvent.click(
      await screen.findByRole("button", { name: "Reject defect" })
    )
    expect(
      await screen.findByText("Choose the original defect")
    ).toBeInTheDocument()
    expect(calls.some((c) => c.path.endsWith("/transition"))).toBe(false)
    await userEvent.click(
      (await screen.findAllByRole("radio", { name: /Original/ }))[0]!
    )
    await userEvent.click(screen.getByRole("button", { name: "Reject defect" }))
    await waitFor(() =>
      expect(
        calls.find((c) => c.path.endsWith("/transition"))?.body
      ).toMatchObject({
        to: "rejected",
        resolution: "duplicate",
        duplicateOfId: "0199c0de-0000-7000-8000-0000000000d2",
      })
    )
  })

  it("needs a note to reopen a fixed defect", async () => {
    routes["GET /api/projects/PAY/defects/PAY-D-14"] = () =>
      json(
        200,
        defect({
          status: "fixed",
          path: ["new", "open", "in_progress", "fixed"],
        })
      )
    renderAt("/projects/PAY/defects/PAY-D-14", "tester")
    await userEvent.click(
      await screen.findByRole("button", { name: /Still failing/ })
    )
    await userEvent.click(
      await screen.findByRole("button", { name: "Reopen defect" })
    )
    expect(await screen.findByText("Say what still fails")).toBeInTheDocument()
  })

  it("is read-only for a Viewer, with the tracker link still usable", async () => {
    routes["GET /api/projects/PAY/defects/PAY-D-14"] = () =>
      json(200, defect({ trackerUrl: "https://jira.example.com/browse/PAY-1" }))
    renderAt("/projects/PAY/defects/PAY-D-14", "viewer")
    await screen.findByRole("heading", {
      name: "3-D Secure spinner never stops",
    })
    expect(
      screen.queryByRole("group", { name: "Move this defect on" })
    ).toBeNull()
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull()
    expect(
      screen.getByRole("link", { name: /jira.example.com/ })
    ).toHaveAttribute("href", "https://jira.example.com/browse/PAY-1")
  })
})

describe("draftFromResult", () => {
  it("copies the steps up to where it failed, the expected result there, and the note", () => {
    const run = { environment: "Safari 18" } as TestRun
    const detail = {
      title: "Pay by card",
      preconditions: "",
      steps: [
        { action: "Open checkout", expected: "It opens" },
        { action: "Pay", expected: "Paid" },
        { action: "See receipt", expected: "Receipt" },
      ],
      results: [
        { status: "failed", note: "Spins forever\nmore detail", failedStep: 2 },
      ],
    } as unknown as RunCaseDetail
    expect(draftFromResult(run, detail)).toMatchObject({
      title: "Pay by card: Spins forever",
      steps: "1. Open checkout\n2. Pay",
      expected: "Paid",
      actual: "Spins forever\nmore detail",
      environment: "Safari 18",
      severity: null,
    })
  })
})
