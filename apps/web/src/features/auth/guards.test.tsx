import type { SessionUser } from "@qa/shared"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter } from "react-router"
import { RouterProvider } from "react-router/dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { authClient } from "@/lib/auth-client"
import { RequireAuth, RequirePermission } from "./guards.tsx"
import { sessionQueryKey } from "./session.ts"

vi.mock("@/lib/auth-client", () => ({
  authClient: { changePassword: vi.fn(), signOut: vi.fn() },
}))

function renderAt(path: string, session: SessionUser | null) {
  const queryClient = new QueryClient()
  queryClient.setQueryData(sessionQueryKey, session)
  const router = createMemoryRouter(
    [
      { path: "/login", element: <p>login page</p> },
      {
        element: <RequireAuth />,
        children: [
          { path: "/", element: <p>home page</p> },
          {
            element: <RequirePermission action="users:manage" />,
            children: [{ path: "/users", element: <p>users page</p> }],
          },
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
  return { router, queryClient }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubFetchStatus(status: number) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ message: "boom" }, { status }))
  )
}

const user = (role: SessionUser["role"]): SessionUser => ({
  id: "u1",
  username: "sam",
  name: "Sam",
  email: "sam@test.local",
  role,
  mustChangePassword: false,
})

describe("RequireAuth", () => {
  it("sends signed-out visitors to the login page, remembering where they were going", async () => {
    const { router } = renderAt("/users?status=open#top", null)
    expect(await screen.findByText("login page")).toBeInTheDocument()
    expect(router.state.location.state).toEqual({
      from: "/users?status=open#top",
    })
  })

  it("renders the page for a signed-in user", async () => {
    renderAt("/", user("user"))
    expect(await screen.findByText("home page")).toBeInTheDocument()
  })

  it("makes someone whose password an admin chose pick their own first", async () => {
    let changed = false
    vi.mocked(authClient.changePassword).mockImplementation((async () => {
      changed = true
      return { data: {}, error: null }
    }) as never)
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          ...user("user"),
          mustChangePassword: !changed,
          projectsLed: 0,
        })
      )
    )
    // Real keystrokes, without the pause between them.
    const keys = userEvent.setup({ delay: null })
    renderAt("/", { ...user("user"), mustChangePassword: true })
    const dialog = await screen.findByRole("dialog", {
      name: "Choose your own password",
    })
    expect(screen.queryByText("home page")).not.toBeInTheDocument()
    // No way around it but signing out.
    expect(
      within(dialog).queryByRole("button", { name: "Close" })
    ).not.toBeInTheDocument()
    await userEvent.keyboard("{Escape}")
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(
      within(dialog).getByRole("button", { name: "Sign out" })
    ).toBeInTheDocument()

    await keys.type(
      within(dialog).getByLabelText("Current password"),
      "the-admins-choice!"
    )
    await keys.type(
      within(dialog).getByLabelText("New password"),
      "my-own-secret-pass"
    )
    await keys.type(
      within(dialog).getByLabelText("Confirm new password"),
      "my-own-secret-pass"
    )
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Save my password" })
    )
    expect(await screen.findByText("home page")).toBeInTheDocument()
    expect(changed).toBe(true)
  })

  it("keeps showing the page when a background session check fails", async () => {
    const { queryClient } = renderAt("/", user("user"))
    expect(await screen.findByText("home page")).toBeInTheDocument()
    stubFetchStatus(502)
    await queryClient.refetchQueries({ queryKey: sessionQueryKey })
    await waitFor(() =>
      expect(queryClient.getQueryState(sessionQueryKey)?.status).toBe("error")
    )
    // Give the router a chance to act on the error before asserting.
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.queryByText("login page")).not.toBeInTheDocument()
    expect(screen.getByText("home page")).toBeInTheDocument()
  })

  it("shows a retryable error, not the login page, when the first session check fails", async () => {
    stubFetchStatus(500)
    const queryClient = new QueryClient()
    const router = createMemoryRouter(
      [
        { path: "/login", element: <p>login page</p> },
        {
          element: <RequireAuth />,
          children: [{ path: "/", element: <p>home page</p> }],
        },
      ],
      { initialEntries: ["/"] }
    )
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    )
    expect(
      await screen.findByRole("heading", { name: "Can't reach QA Portal" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Try again" })
    ).toBeInTheDocument()
    expect(screen.queryByText("login page")).not.toBeInTheDocument()
  })
})

describe("RequirePermission", () => {
  it("shows a no-access message when the action is denied", async () => {
    renderAt("/users", user("user"))
    expect(
      await screen.findByRole("heading", {
        name: "You don't have access to this page",
      })
    ).toBeInTheDocument()
    expect(screen.queryByText("users page")).not.toBeInTheDocument()
  })

  it("renders the page when the action is allowed", async () => {
    renderAt("/users", user("admin"))
    expect(await screen.findByText("users page")).toBeInTheDocument()
  })
})
