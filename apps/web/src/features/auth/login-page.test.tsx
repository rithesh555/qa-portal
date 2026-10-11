import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter } from "react-router"
import { RouterProvider } from "react-router/dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { authClient } from "@/lib/auth-client"
import { LoginPage } from "./login-page"
import { sessionQueryKey } from "./session"

vi.mock("@/lib/auth-client", () => ({
  authClient: { signIn: { username: vi.fn() } },
}))

const signInMock = vi.mocked(authClient.signIn.username)

async function submitLogin() {
  const queryClient = new QueryClient()
  queryClient.setQueryData(sessionQueryKey, null)
  const router = createMemoryRouter(
    [{ path: "/login", element: <LoginPage /> }],
    {
      initialEntries: ["/login"],
    }
  )
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText("Username"), "sam")
  await user.type(screen.getByLabelText("Password"), "a-password")
  await user.click(screen.getByRole("button", { name: "Sign in" }))
}

describe("LoginPage errors", () => {
  beforeEach(() => {
    signInMock.mockReset()
  })

  it("explains a wrong username or password", async () => {
    signInMock.mockResolvedValue({
      data: null,
      error: { status: 401, statusText: "Unauthorized" },
    } as never)
    await submitLogin()
    expect(
      await screen.findByText(/username and password don't match/)
    ).toBeInTheDocument()
  })

  it("explains a deactivated account", async () => {
    signInMock.mockResolvedValue({
      data: null,
      error: { status: 403, statusText: "Forbidden" },
    } as never)
    await submitLogin()
    expect(
      await screen.findByText(/This account has been deactivated/)
    ).toBeInTheDocument()
  })

  it("explains when the server can't be reached", async () => {
    signInMock.mockRejectedValue(new TypeError("Failed to fetch"))
    await submitLogin()
    expect(
      await screen.findByText(/couldn't reach the server/i)
    ).toBeInTheDocument()
  })
})
