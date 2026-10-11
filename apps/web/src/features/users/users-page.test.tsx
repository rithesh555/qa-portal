import type { SessionUser, User } from "@qa/shared"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter } from "react-router"
import { RouterProvider } from "react-router/dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { sessionQueryKey } from "@/features/auth/session"
import { UsersPage } from "./users-page"

const me: SessionUser = {
  id: "u-admin",
  username: "admin",
  name: "Ada Admin",
  email: "admin@example.com",
  role: "admin",
}

const user = (overrides: Partial<User>): User => ({
  id: "u-1",
  name: "Bob Tester",
  username: "bob",
  email: "bob@example.com",
  role: "user",
  active: true,
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-01T10:00:00.000Z",
  ...overrides,
})

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })

let fetchMock: ReturnType<typeof vi.fn>

function renderPage(path = "/users") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClient.setQueryData(sessionQueryKey, me)
  const router = createMemoryRouter(
    [{ path: "/users", element: <UsersPage /> }],
    {
      initialEntries: [path],
    }
  )
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe("UsersPage", () => {
  it("lists users from the API with paging info", async () => {
    fetchMock.mockResolvedValue(
      json(200, {
        items: [
          user({ id: me.id, name: me.name, username: "admin", role: "admin" }),
          user({}),
        ],
        total: 2,
        page: 1,
        pageSize: 25,
      })
    )
    renderPage()
    expect(await screen.findByText("Bob Tester")).toBeInTheDocument()
    const table = screen.getByRole("table")
    expect(within(table).getByText("(you)")).toBeInTheDocument()
    expect(screen.getByText("Showing 1–2 of 2 users")).toBeInTheDocument()
    expect(fetchMock.mock.calls[0]![0]).toContain("/api/users?")
    expect(fetchMock.mock.calls[0]![0]).toContain("status=active")
  })

  it("passes the URL's filters to the API", async () => {
    fetchMock.mockResolvedValue(
      json(200, { items: [], total: 0, page: 1, pageSize: 25 })
    )
    renderPage("/users?status=deactivated&q=bo")
    expect(await screen.findByText("No users match")).toBeInTheDocument()
    const url = fetchMock.mock.calls[0]![0] as string
    expect(url).toContain("status=deactivated")
    expect(url).toContain("q=bo")
  })

  it("creates a user and shows the server's conflict message", async () => {
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return json(409, {
          statusCode: 409,
          error: "Conflict",
          message: "That username is already taken",
        })
      }
      return json(200, { items: [user({})], total: 1, page: 1, pageSize: 25 })
    })
    renderPage()
    const ui = userEvent.setup()
    await ui.click(await screen.findByRole("button", { name: "New user" }))
    const dialog = await screen.findByRole("dialog")
    await ui.type(within(dialog).getByLabelText("Full name"), "Bob Again")
    await ui.type(within(dialog).getByLabelText("Username"), "bob")
    await ui.type(within(dialog).getByLabelText("Email"), "bob2@example.com")
    await ui.click(within(dialog).getByRole("button", { name: "Generate" }))
    expect(
      (within(dialog).getByLabelText("Temporary password") as HTMLInputElement)
        .value
    ).toHaveLength(16)
    await ui.click(within(dialog).getByRole("button", { name: "Create user" }))

    expect(
      await within(dialog).findByText("That username is already taken")
    ).toBeInTheDocument()
    await waitFor(() => {
      const post = fetchMock.mock.calls.find(
        ([, init]) => (init as RequestInit | undefined)?.method === "POST"
      )
      expect(
        JSON.parse((post![1] as RequestInit).body as string)
      ).toMatchObject({ name: "Bob Again", username: "bob", role: "user" })
    })
  })

  it("searches once after typing stops, ignoring surrounding spaces", async () => {
    fetchMock.mockResolvedValue(
      json(200, { items: [user({})], total: 1, page: 1, pageSize: 25 })
    )
    renderPage()
    await screen.findByText("Bob Tester")
    const ui = userEvent.setup()
    await ui.type(screen.getByRole("searchbox"), "bob ")
    await waitFor(() =>
      expect(fetchMock.mock.calls.at(-1)![0]).toContain("q=bob")
    )
    const calls = fetchMock.mock.calls.length
    // No further requests once the URL has caught up.
    await new Promise((resolve) => setTimeout(resolve, 900))
    expect(fetchMock.mock.calls.length).toBe(calls)
    expect(screen.getByRole("searchbox")).toHaveValue("bob ")
  })

  it("links pagination to the next page and keeps filters", async () => {
    fetchMock.mockResolvedValue(
      json(200, { items: [user({})], total: 60, page: 1, pageSize: 25 })
    )
    renderPage("/users?q=bo")
    expect(
      await screen.findByRole("link", { name: "Go to next page" })
    ).toHaveAttribute("href", "/users?q=bo&page=2")
    expect(
      screen.getByRole("link", { name: "Go to previous page" })
    ).toHaveAttribute("aria-disabled", "true")
  })

  it("doesn't offer to deactivate or reset yourself", async () => {
    fetchMock.mockResolvedValue(
      json(200, {
        items: [user({ id: me.id, name: me.name, role: "admin" })],
        total: 1,
        page: 1,
        pageSize: 25,
      })
    )
    renderPage()
    const ui = userEvent.setup()
    await ui.click(
      await screen.findByRole("button", { name: `Actions for ${me.name}` })
    )
    expect(
      await screen.findByRole("menuitem", { name: "Edit" })
    ).toBeInTheDocument()
    // Your own password is changed from the account menu, not reset here.
    for (const name of ["Reset password", "Deactivate"]) {
      expect(screen.queryByRole("menuitem", { name })).not.toBeInTheDocument()
    }
  })
})
