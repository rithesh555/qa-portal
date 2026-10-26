import type {
  Home,
  Project,
  ProjectRole,
  ReleaseSummary,
  Report,
  SessionUser,
} from "@qa/shared"
import { exitChecks } from "@qa/shared"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { createMemoryRouter } from "react-router"
import { RouterProvider } from "react-router/dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Toaster } from "@/components/ui/toast"
import { sessionQueryKey } from "@/features/auth/session"
import { ProjectLayout } from "@/features/projects/project-layout"
import { HomePage } from "./home-page"
import { printCoverageRows } from "./print-page"
import { daysUntil, targetText } from "./release-table"
import { ReleasesOverviewPage } from "./releases-overview-page"
import { readinessTitle, ReportsPage, runPassRate } from "./reports-page"

const user: SessionUser = {
  id: "u-me",
  username: "me",
  name: "Demo Lead",
  email: "me@example.com",
  role: "user",
  mustChangePassword: false,
}

const R42 = "0199c0de-0000-7000-8000-000000000042"
const R41 = "0199c0de-0000-7000-8000-000000000041"

const project = (myRole: ProjectRole): Project => ({
  id: "p1",
  key: "PAY",
  name: "Payments",
  description: "",
  archived: false,
  myRole,
  memberCount: 3,
  leads: [{ id: "u-lena", name: "Lena Ortiz" }],
  currentRelease: { id: R42, name: "4.2" },
  createdAt: "2026-10-01T10:00:00.000Z",
  version: 1,
  roleCounts: { lead: 1, tester: 1, viewer: 1 },
  updatedAt: "2026-10-01T10:00:00.000Z",
})

const counts = (p: number, f: number, b: number, s: number, u: number) => ({
  passed: p,
  failed: f,
  blocked: b,
  skipped: s,
  untested: u,
})

const report = (over: Partial<Report> = {}): Report => ({
  release: { id: R42, name: "4.2", status: "in_progress", targetDate: null },
  asOf: "2026-10-19T09:14:00.000Z",
  snapshot: false,
  hasRuns: true,
  previousRelease: "4.1",
  checks: exitChecks({
    passRate: 0.9,
    readyCases: 10,
    testedReady: 8,
    untestedHighPriority: 1,
    openCritical: 1,
    openMajor: 0,
    blockedHighPriority: 0,
    awaitingRetest: 0,
  }),
  kpis: {
    passRate: 0.9,
    passRatePrevious: 0.87,
    readyCases: 10,
    testedReady: 8,
    openDefects: 1,
    openCritical: 1,
    openMajor: 0,
    productionEscapes: 0,
    productionEscapesPrevious: 1,
    timeToFix: { medianDays: 2.5, p90Days: 6, count: 4 },
    netOpenThisWeek: 2,
    foundThisWeek: 3,
    closedThisWeek: 1,
  },
  blocking: [
    {
      id: "d1",
      key: "PAY-D-14",
      title: "Spinner never stops",
      severity: "critical",
      priority: "high",
      status: "open",
      ageDays: 3,
      assignee: null,
      foundIn: "4.2",
    },
  ],
  failing: [
    {
      runCaseId: "rc-40",
      caseKey: "PAY-TC-40",
      title: "Payout schedule shows the next date",
      status: "failed",
      failedStep: 3,
      runKey: "PAY-R-12",
      defect: null,
    },
  ],
  untestedByPriority: [
    { priority: "critical", count: 0 },
    { priority: "high", count: 1 },
    { priority: "medium", count: 1 },
    { priority: "low", count: 0 },
  ],
  carriedOver: [],
  runs: [
    {
      key: "PAY-R-11",
      name: "Smoke",
      state: "closed",
      counts: counts(8, 2, 0, 0, 0),
      closedAt: "2026-10-12T10:00:00.000Z",
    },
    {
      key: "PAY-R-12",
      name: "Regression",
      state: "open",
      counts: counts(9, 1, 0, 0, 2),
      closedAt: null,
    },
  ],
  aging: [
    { label: "0–2 days", count: 0 },
    { label: "3–7 days", count: 1 },
    { label: "8–14 days", count: 0 },
    { label: "15–30 days", count: 0 },
    { label: "Over 30 days", count: 0 },
  ],
  oldestOpen: { key: "PAY-D-14", ageDays: 3 },
  weekly: [
    "2026-09-14",
    "2026-09-21",
    "2026-09-28",
    "2026-10-05",
    "2026-10-12",
    "2026-10-19",
  ].map((week, i) => ({ week, found: i, closed: 1 })),
  coverage: [
    {
      suiteId: "s1",
      suite: "Payouts",
      depth: 0,
      ready: 10,
      tested: 8,
      passRate: 0.9,
      openDefects: 1,
    },
  ],
  workload: null,
  ...over,
})

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })

type Handler = (url: string) => Response
let routes: Record<string, Handler>
let calls: string[]

beforeEach(() => {
  calls = []
  routes = {
    "GET /api/projects/PAY/releases": () =>
      json(200, {
        items: [
          {
            id: R42,
            name: "4.2",
            description: "",
            status: "in_progress",
            startDate: null,
            targetDate: null,
            version: 1,
            createdAt: "2026-10-02T10:00:00.000Z",
          },
          {
            id: R41,
            name: "4.1",
            description: "",
            status: "released",
            startDate: null,
            targetDate: null,
            version: 2,
            createdAt: "2026-09-02T10:00:00.000Z",
          },
        ],
      }),
  }
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const path = url.split("?")[0]!
      const method = init?.method ?? "GET"
      calls.push(`${method} ${url}`)
      const handler = routes[`${method} ${path}`]
      return handler
        ? handler(url)
        : json(404, { statusCode: 404, message: "Not found" })
    })
  )
})
afterEach(() => vi.unstubAllGlobals())

function mount(path: string, routeList: object[], me: SessionUser = user) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClient.setQueryData(sessionQueryKey, me)
  const router = createMemoryRouter(routeList as never, {
    initialEntries: [path],
  })
  render(
    <QueryClientProvider client={queryClient}>
      <Toaster>
        <RouterProvider router={router} />
      </Toaster>
    </QueryClientProvider>
  )
  return router
}

function renderReports(path: string, role: ProjectRole) {
  routes["GET /api/projects/PAY"] = () => json(200, project(role))
  return mount(path, [
    {
      path: "/projects/:key",
      element: <ProjectLayout />,
      children: [{ path: "reports", element: <ReportsPage /> }],
    },
  ])
}

const at = (path: string, element: ReactNode) =>
  mount(path, [{ path, element }])

describe("ReportsPage", () => {
  it("opens on the current release and says whether it can ship", async () => {
    routes["GET /api/projects/PAY/reports"] = () => json(200, report())
    renderReports("/projects/PAY/reports", "viewer")
    expect(
      await screen.findByRole("heading", {
        name: "Not ready to ship: 3 of 6 checks fail",
      })
    ).toBeInTheDocument()
    expect(calls).toContain(`GET /api/projects/PAY/reports?release=${R42}`)
    const panel = screen.getByRole("region", { name: /Not ready to ship/ })
    expect(within(panel).getByText("1 open")).toBeInTheDocument()
    expect(
      within(panel).getAllByRole("link", { name: "See them" })[0]
    ).toHaveAttribute(
      "href",
      `/projects/PAY/defects?releaseId=${R42}&severity=critical`
    )
    // Tiles: deltas against the previous release.
    expect(screen.getByText("▲ 3 points vs 4.1")).toBeInTheDocument()
    expect(screen.getByText("90% within 6 d · 4 fixed")).toBeInTheDocument()
    // Viewers and testers don't see the per-person workload.
    expect(
      screen.queryByRole("heading", { name: "Workload" })
    ).not.toBeInTheDocument()
  })

  it("flags a failing case with no defect and links to log one", async () => {
    routes["GET /api/projects/PAY/reports"] = () => json(200, report())
    renderReports("/projects/PAY/reports", "tester")
    const log = await screen.findByRole("link", { name: "Log one" })
    expect(log).toHaveAttribute(
      "href",
      "/projects/PAY/runs/PAY-R-12?case=rc-40"
    )
    expect(
      screen.getByText(
        "Latest result is Failed or Blocked · 1 with no defect linked"
      )
    ).toBeInTheDocument()
  })

  it("offers a table view of every chart", async () => {
    routes["GET /api/projects/PAY/reports"] = () => json(200, report())
    renderReports("/projects/PAY/reports", "viewer")
    const trend = await screen.findByRole("region", {
      name: "Pass rate by run",
    })
    const chart = within(trend).getByRole("group", {
      name: /^Pass rate by run:/,
    })
    // Each point is reachable and named.
    expect(within(chart).getAllByRole("img")[0]).toHaveAccessibleName(
      /^PAY-R-11: 80%/
    )
    await userEvent.click(
      within(trend).getByRole("button", { name: "Table for pass rate by run" })
    )
    const table = within(trend).getByRole("table")
    expect(within(table).getByText("PAY-R-11")).toBeInTheDocument()
    expect(within(table).getByText("80%")).toBeInTheDocument()
    expect(within(table).getByText("Open")).toBeInTheDocument()
  })

  it("downloads the rows behind the report as CSV", async () => {
    routes["GET /api/projects/PAY/reports"] = () => json(200, report())
    routes["GET /api/projects/PAY/reports/export"] = () =>
      json(200, {
        asOf: "2026-10-19T09:14:00.000Z",
        scope: "Payments · Release 4.2",
        columns: ["Defect", "Title"],
        rows: [["PAY-D-14", "Spinner never stops"]],
      })
    const createObjectURL = vi.fn(() => "blob:csv")
    vi.stubGlobal(
      "URL",
      Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
    )
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {})
    renderReports("/projects/PAY/reports", "viewer")
    await userEvent.click(
      await screen.findByRole("button", { name: "Download data" })
    )
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Defects" })
    )
    await waitFor(() =>
      expect(calls).toContain(
        `GET /api/projects/PAY/reports/export?release=${R42}&kind=defects`
      )
    )
    await waitFor(() => expect(click).toHaveBeenCalled())
    expect(createObjectURL).toHaveBeenCalled()
    click.mockRestore()
  })

  it("shows the workload to QA Leads", async () => {
    routes["GET /api/projects/PAY/reports"] = () =>
      json(
        200,
        report({
          workload: [
            { person: { id: "u-tom", name: "Tom Reyes" }, untested: 12 },
            { person: null, untested: 3 },
          ],
        })
      )
    renderReports("/projects/PAY/reports", "lead")
    const work = await screen.findByRole("region", { name: "Workload" })
    expect(within(work).getByText("Tom Reyes")).toBeInTheDocument()
    expect(within(work).getByText("Unassigned")).toBeInTheDocument()
  })

  it("serves a released release's snapshot, with live numbers a click away", async () => {
    routes["GET /api/projects/PAY/reports"] = (url) =>
      json(
        200,
        report({
          release: {
            id: R41,
            name: "4.1",
            status: "released",
            targetDate: null,
          },
          snapshot: !url.includes("live=true"),
        })
      )
    renderReports(`/projects/PAY/reports?release=${R41}`, "viewer")
    await userEvent.click(
      await screen.findByRole("button", { name: "Show live numbers instead" })
    )
    await waitFor(() =>
      expect(calls).toContain(
        `GET /api/projects/PAY/reports?release=${R41}&live=true`
      )
    )
    expect(
      await screen.findByRole("button", { name: "Show the snapshot" })
    ).toBeInTheDocument()
  })

  it("explains an empty choice", async () => {
    routes["GET /api/projects/PAY/reports"] = () =>
      json(200, report({ hasRuns: false, release: null, runs: [] }))
    renderReports("/projects/PAY/reports?release=none", "tester")
    expect(
      await screen.findByRole("heading", {
        name: "No runs for this choice yet",
      })
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Start a run" })).toHaveAttribute(
      "href",
      "/projects/PAY/runs/new"
    )
  })
})

const summary = (over: Partial<ReleaseSummary> = {}): ReleaseSummary => ({
  project: { key: "PAY", name: "Payments" },
  release: { id: R42, name: "4.2", status: "in_progress", targetDate: null },
  lead: "Lena Ortiz",
  hasRuns: true,
  failingChecks: 3,
  totalChecks: 6,
  passRate: 0.91,
  readyCases: 100,
  testedReady: 78,
  openCritical: 2,
  openMajor: 4,
  ...over,
})

const home = (over: Partial<Home> = {}): Home => ({
  runs: [
    {
      projectKey: "PAY",
      projectName: "Payments",
      key: "PAY-R-12",
      name: "Release 4.2 regression",
      environment: "Safari 18",
      counts: counts(96, 7, 3, 2, 32),
      mine: 38,
      mineLeft: 14,
    },
  ],
  runsReadyToClose: 1,
  assigned: [
    {
      projectKey: "PAY",
      key: "PAY-D-12",
      title: "Declined card message is cut off",
      severity: "minor",
      status: "reopened",
    },
  ],
  readyToRetest: [],
  toTriage: null,
  triageProjects: [],
  releases: [summary()],
  activity: [],
  hasProjects: true,
  ...over,
})

describe("HomePage", () => {
  it("tells someone in no project how to get added", async () => {
    routes["GET /api/home"] = () =>
      json(
        200,
        home({ hasProjects: false, runs: [], assigned: [], releases: [] })
      )
    at("/", <HomePage />)
    expect(
      await screen.findByRole("heading", {
        name: "You're not in any project yet",
      })
    ).toBeInTheDocument()
  })

  it("shows a tester their cases and defects, without triage", async () => {
    routes["GET /api/home"] = () => json(200, home())
    at("/", <HomePage />)
    expect(
      await screen.findByText(/14 cases and 1 defect are waiting for you\./)
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Continue PAY-R-12" })
    ).toHaveAttribute("href", "/projects/PAY/runs/PAY-R-12?show=mine")
    expect(screen.getByText("14 of your 38 cases left")).toBeInTheDocument()
    expect(
      screen.getByRole("tab", { name: "Assigned to me (1)" })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("tab", { name: /To triage/ })
    ).not.toBeInTheDocument()
    expect(screen.getByText("Runs ready to close")).toBeInTheDocument()
    const releases = screen.getByRole("link", { name: "Payments · 4.2" })
    expect(releases).toHaveAttribute(
      "href",
      `/projects/PAY/reports?release=${R42}`
    )
    // Its column, and the copy folded under the name for phones.
    expect(screen.getAllByText("Not ready · 3 checks fail")).toHaveLength(2)
  })

  it("links to All releases only for people who oversee several projects (F13)", async () => {
    routes["GET /api/home"] = () => json(200, home())
    at("/", <HomePage />)
    await screen.findByRole("heading", { name: "Releases in your projects" })
    expect(
      screen.queryByRole("link", { name: "See all releases" })
    ).not.toBeInTheDocument()
  })

  it("offers All releases to a QA Lead of two projects", async () => {
    routes["GET /api/home"] = () => json(200, home())
    mount("/", [{ path: "/", element: <HomePage /> }], {
      ...user,
      projectsLed: 2,
    } as SessionUser)
    expect(
      await screen.findByRole("link", { name: "See all releases" })
    ).toHaveAttribute("href", "/releases")
  })

  it("gives a QA Lead a triage tab for the projects they lead", async () => {
    routes["GET /api/home"] = () =>
      json(
        200,
        home({
          toTriage: [
            {
              projectKey: "PAY",
              key: "PAY-D-15",
              title: "Refund total ignores shipping",
              severity: "major",
              status: "new",
            },
          ],
          triageProjects: ["Payments"],
        })
      )
    at("/", <HomePage />)
    await userEvent.click(
      await screen.findByRole("tab", { name: "To triage (1)" })
    )
    expect(
      screen.getByRole("link", { name: /Refund total ignores shipping/ })
    ).toHaveAttribute("href", "/projects/PAY/defects/PAY-D-15")
    expect(screen.getByText("in Payments, which you lead")).toBeInTheDocument()
  })
})

describe("ReleasesOverviewPage", () => {
  it("lists releases needing attention first and filters to those not ready", async () => {
    routes["GET /api/releases/overview"] = () =>
      json(200, {
        items: [
          summary({
            project: { key: "CHK", name: "Checkout" },
            release: {
              id: "r-chk",
              name: "812",
              status: "in_progress",
              targetDate: null,
            },
            failingChecks: 0,
          }),
          summary(),
          summary({
            project: { key: "MOB", name: "Mobile" },
            release: {
              id: "r-mob",
              name: "3.0",
              status: "planned",
              targetDate: null,
            },
            hasRuns: false,
            failingChecks: 0,
          }),
        ],
      })
    at("/releases", <ReleasesOverviewPage />)
    const table = await screen.findByRole("table")
    const names = within(table)
      .getAllByRole("link")
      .map((l) => l.textContent)
    expect(names).toEqual(["Payments · 4.2", "Mobile · 3.0", "Checkout · 812"])
    await userEvent.click(
      screen.getByRole("button", { name: "Not ready only" })
    )
    expect(
      within(screen.getByRole("table"))
        .getAllByRole("link")
        .map((l) => l.textContent)
    ).toEqual(["Payments · 4.2"])
    expect(
      screen.getByText("1 of 3 active releases shown.")
    ).toBeInTheDocument()
  })
})

describe("report helpers", () => {
  it("prints sub-suites under their parent so the counts add up (F12)", () => {
    const row = (suite: string, depth: number, ready: number) => ({
      suiteId: suite,
      suite,
      depth,
      ready,
      tested: ready,
      passRate: 1,
      openDefects: 0,
    })
    const rows = printCoverageRows([
      row("Accounts", 0, 7),
      row("Sign in", 1, 6),
      row("Checkout", 0, 7),
      row("No suite", 0, 6),
    ])
    expect(rows.map((r) => r[0])).toEqual([
      "Accounts",
      "Accounts › Sign in",
      "Checkout",
      "No suite",
    ])
    expect(rows.reduce((sum, r) => sum + Number(r[1]), 0)).toBe(26)
  })

  it("titles the readiness panel", () => {
    const pass = exitChecks({
      passRate: 1,
      readyCases: 1,
      testedReady: 1,
      untestedHighPriority: 0,
      openCritical: 0,
      openMajor: 0,
      blockedHighPriority: 0,
      awaitingRetest: 0,
    })
    expect(readinessTitle(pass)).toBe("Ready to ship: all checks pass")
    expect(
      readinessTitle(
        pass.map((c) => (c.id === "passRate" ? { ...c, ok: null } : c))
      )
    ).toBe("Not enough results yet to judge every check")
  })

  it("counts a run's pass rate over passed, failed and blocked only", () => {
    expect(runPassRate(counts(8, 1, 1, 5, 9))).toBe(0.8)
    expect(runPassRate(counts(0, 0, 0, 2, 9))).toBeNull()
  })

  it("says how far off a target date is", () => {
    const now = new Date("2026-10-19T09:00:00Z")
    expect(daysUntil("2026-10-28", now)).toBe(9)
    expect(targetText("2026-10-20", now)).toMatch(/· tomorrow$/)
    expect(targetText("2026-10-17", now)).toMatch(/· 2 days late$/)
    expect(targetText(null, now)).toBe("No target date")
  })
})
