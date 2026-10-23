import { render, screen } from "@testing-library/react"
import { createMemoryRouter, Outlet } from "react-router"
import { RouterProvider } from "react-router/dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { RouteError } from "./route-error"

function renderFailing(error: unknown) {
  const router = createMemoryRouter(
    [
      {
        // As in the app: the boundary wraps the pages, which load lazily.
        path: "/",
        element: <Outlet />,
        errorElement: <RouteError />,
        children: [
          {
            index: true,
            lazy: async () => Promise.reject(error),
          },
        ],
      },
    ],
    { initialEntries: ["/"] }
  )
  render(<RouterProvider router={router} />)
}

afterEach(() => vi.restoreAllMocks())

describe("RouteError", () => {
  it("offers a reload when a page's code can't be fetched (e.g. after an update)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    renderFailing(
      new TypeError("Failed to fetch dynamically imported module: /assets/x.js")
    )
    expect(
      await screen.findByRole("heading", { name: "This page couldn't load" })
    ).toBeInTheDocument()
    expect(screen.getByText(/new version/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument()
  })

  it("says something went wrong for any other error, without its details", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    renderFailing(new Error("secret internal detail"))
    expect(
      await screen.findByRole("heading", { name: "Something went wrong" })
    ).toBeInTheDocument()
    expect(screen.queryByText(/secret internal detail/)).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Go to home" })
    ).toBeInTheDocument()
  })
})
