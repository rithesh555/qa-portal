import { userListQuerySchema } from "@qa/shared"
import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter, useLocation } from "react-router"
import { describe, expect, it } from "vitest"
import { useListParams } from "./use-list-params"

function setup(initial: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
  )
  return renderHook(
    () => {
      const [params, update] = useListParams(userListQuerySchema)
      return { params, update, search: useLocation().search }
    },
    { wrapper }
  )
}

describe("useListParams", () => {
  it("reads the list state from the URL", () => {
    const { result } = setup("/users?page=2&q=bob&status=all")
    expect(result.current.params).toMatchObject({
      page: 2,
      q: "bob",
      status: "all",
      sort: "name",
    })
  })

  it("falls back to defaults for invalid values", () => {
    const { result } = setup("/users?page=-4&status=nope")
    expect(result.current.params).toMatchObject({ page: 1, status: "active" })
  })

  it("resets to page 1 when a filter changes and drops default values", () => {
    const { result } = setup("/users?page=3&status=all")
    act(() => result.current.update({ q: "car" }))
    expect(result.current.search).toBe("?status=all&q=car")
  })

  it("keeps the filter when only the page changes", () => {
    const { result } = setup("/users?q=car")
    act(() => result.current.update({ page: 2 }))
    expect(result.current.search).toBe("?q=car&page=2")
  })

  it("removes cleared values", () => {
    const { result } = setup("/users?q=car&page=2")
    act(() => result.current.update({ q: "" }))
    expect(result.current.search).toBe("")
  })
})
