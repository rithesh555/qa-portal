import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it, vi } from "vitest"
import { ListPagination } from "./list-pagination"

function renderPagination(page: number, total: number) {
  const onPageChange = vi.fn()
  render(
    <MemoryRouter>
      <ListPagination
        page={page}
        pageSize={25}
        total={total}
        noun={["project", "projects"]}
        onPageChange={onPageChange}
      />
    </MemoryRouter>
  )
  return onPageChange
}

describe("ListPagination", () => {
  it("uses the singular for one item", () => {
    renderPagination(1, 1)
    expect(screen.getByText("Showing 1 to 1 of 1 project")).toBeInTheDocument()
  })

  it("uses the plural otherwise", () => {
    renderPagination(2, 60)
    expect(
      screen.getByText("Showing 26 to 50 of 60 projects")
    ).toBeInTheDocument()
  })

  it("moves back to the last page when the page is past the end", () => {
    const onPageChange = renderPagination(5, 30)
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it("leaves a valid page alone", () => {
    const onPageChange = renderPagination(2, 30)
    expect(onPageChange).not.toHaveBeenCalled()
  })
})
