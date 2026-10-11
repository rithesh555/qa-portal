import { type MouseEvent, useEffect } from "react"
import { useLocation } from "react-router"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

/**
 * "Showing 26–50 of 103 users" with previous/next links. A page past the end
 * (e.g. after items were removed, or an old link) moves to the last page. The links carry the
 * current filters (open in a new tab works); a plain click navigates in-app.
 */
export function ListPagination({
  page,
  pageSize,
  total,
  noun,
  onPageChange,
}: {
  page: number
  pageSize: number
  total: number
  /** [singular, plural], e.g. ["project", "projects"]. */
  noun: readonly [string, string]
  onPageChange: (page: number) => void
}) {
  const location = useLocation()
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(total, page * pageSize)

  useEffect(() => {
    if (page > pages) onPageChange(pages)
  }, [page, pages, onPageChange])

  function hrefFor(target: number) {
    const params = new URLSearchParams(location.search)
    if (target <= 1) params.delete("page")
    else params.set("page", String(target))
    const search = params.toString()
    return search ? `${location.pathname}?${search}` : location.pathname
  }

  // The registry link renders through Base UI's Button, which marks it
  // role="button"; it is a real link, so say so for screen readers.
  function linkProps(target: number, enabled: boolean) {
    if (!enabled) {
      return {
        role: "link",
        "aria-disabled": true,
        tabIndex: -1,
        className: "pointer-events-none opacity-50",
      }
    }
    return {
      role: "link",
      href: hrefFor(target),
      onClick: (event: MouseEvent<HTMLAnchorElement>) => {
        // Let modified clicks (new tab/window) behave like normal links.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return
        }
        event.preventDefault()
        onPageChange(target)
      },
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <p aria-live="polite">
        Showing {first}–{last} of {total} {total === 1 ? noun[0] : noun[1]}
      </p>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious {...linkProps(page - 1, page > 1)} />
          </PaginationItem>
          <PaginationItem>
            <span className="px-2 tabular-nums">
              Page {page} of {pages}
            </span>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext {...linkProps(page + 1, page < pages)} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
