import { RUN_CASE_STATUS_LABELS, type RunCase } from "@qa/shared"
import { useEffect, useRef } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { RunCaseStatusIcon } from "./run-status"
import { initials } from "./format"

export const CASE_FILTERS = ["all", "untested", "failed", "mine"] as const
export type CaseFilter = (typeof CASE_FILTERS)[number]

const FILTER_LABELS: Record<CaseFilter, string> = {
  all: "All cases",
  untested: "Untested",
  failed: "Failed or blocked",
  mine: "Assigned to me",
}

export function matchesFilter(
  c: RunCase,
  filter: CaseFilter,
  me: string
): boolean {
  if (filter === "untested") return c.status === "untested"
  if (filter === "failed")
    return c.status === "failed" || c.status === "blocked"
  if (filter === "mine") return c.assignee?.id === me
  return true
}

export function matchesSearch(c: RunCase, q: string): boolean {
  const term = q.trim().toLocaleLowerCase()
  return (
    !term ||
    c.title.toLocaleLowerCase().includes(term) ||
    c.caseKey.toLocaleLowerCase().includes(term)
  )
}

export function RunCaseList({
  all,
  shown,
  me,
  filter,
  onFilter,
  q,
  onSearch,
  currentId,
  onOpen,
  selecting,
  picked,
  onTogglePick,
  onToggleGroup,
}: {
  all: RunCase[]
  shown: RunCase[]
  me: string
  filter: CaseFilter
  onFilter: (filter: CaseFilter) => void
  q: string
  onSearch: (q: string) => void
  currentId: string | null
  onOpen: (id: string) => void
  selecting: boolean
  picked: Set<string>
  onTogglePick: (id: string) => void
  onToggleGroup: (ids: string[], on: boolean) => void
}) {
  const scroller = useRef<HTMLDivElement>(null)
  // Keep the current case in sight as J/K, saving or a deep link move it.
  useEffect(() => {
    scroller.current
      ?.querySelector("[aria-current=true]")
      ?.scrollIntoView({ block: "nearest" })
  }, [currentId, shown.length])

  const filterItems = CASE_FILTERS.map((f) => ({
    value: f,
    label: `${FILTER_LABELS[f]} (${all.filter((c) => matchesFilter(c, f, me)).length})`,
  }))

  // Progress per suite counts the whole run, not just the shown cases.
  const suiteProgress = new Map<string, { done: number; total: number }>()
  for (const c of all) {
    const p = suiteProgress.get(c.suitePath) ?? { done: 0, total: 0 }
    p.total += 1
    if (c.status !== "untested") p.done += 1
    suiteProgress.set(c.suitePath, p)
  }
  const groups: { suite: string; items: RunCase[] }[] = []
  for (const c of shown) {
    const last = groups.at(-1)
    if (last && last.suite === c.suitePath) last.items.push(c)
    else groups.push({ suite: c.suitePath, items: [c] })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-2 border-b p-3">
        <Input
          type="search"
          aria-label="Search cases in this run"
          placeholder="Search by ID or title"
          value={q}
          onChange={(e) => onSearch(e.target.value)}
        />
        <Select
          items={filterItems}
          value={filter}
          onValueChange={(v) => onFilter(v as CaseFilter)}
        >
          <SelectTrigger aria-label="Show" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {filterItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {shown.length === 0 ? (
        <p
          role="status"
          className="p-6 text-center text-sm text-muted-foreground"
        >
          No cases match.
        </p>
      ) : (
        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
          {groups.map((g, gi) => {
            const progress = suiteProgress.get(g.suite)!
            const ids = g.items.map((c) => c.id)
            const allPicked = ids.every((id) => picked.has(id))
            return (
              <section
                key={`${g.suite}:${gi}`}
                aria-label={g.suite || "No suite"}
              >
                <div className="sticky top-0 z-[1] flex items-center gap-2 border-b bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                  {selecting && (
                    <Checkbox
                      aria-label={`Select all shown in ${g.suite || "No suite"}`}
                      checked={allPicked}
                      indeterminate={
                        !allPicked && ids.some((id) => picked.has(id))
                      }
                      onCheckedChange={() => onToggleGroup(ids, !allPicked)}
                    />
                  )}
                  <span className="min-w-0 flex-1 truncate">
                    {g.suite || "No suite"}
                  </span>
                  <span className="tabular-nums">
                    {progress.done}/{progress.total}
                  </span>
                </div>
                <ul>
                  {g.items.map((c) => {
                    const current = c.id === currentId
                    return (
                      <li
                        key={c.id}
                        className="flex items-center border-b [contain-intrinsic-size:auto_3rem] [content-visibility:auto]"
                      >
                        {selecting && (
                          <Checkbox
                            className="ms-3"
                            aria-label={`Select ${c.caseKey}`}
                            checked={picked.has(c.id)}
                            onCheckedChange={() => onTogglePick(c.id)}
                          />
                        )}
                        <button
                          type="button"
                          aria-current={current ? "true" : undefined}
                          onClick={() => onOpen(c.id)}
                          className={cn(
                            "flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left text-sm outline-none hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid",
                            current &&
                              "bg-accent font-medium shadow-[inset_3px_0_0_var(--color-foreground)]"
                          )}
                        >
                          <RunCaseStatusIcon status={c.status} decorative />
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-2">{c.title}</span>
                            <span className="font-mono text-xs text-muted-foreground">
                              {c.caseKey}
                            </span>
                            <span className="sr-only">
                              , {RUN_CASE_STATUS_LABELS[c.status]},{" "}
                              {c.assignee
                                ? `assigned to ${c.assignee.name}`
                                : "unassigned"}
                            </span>
                          </span>
                          {c.assignee && (
                            <span
                              aria-hidden
                              title={c.assignee.name}
                              className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-2xs font-semibold text-accent-foreground ring-1 ring-border"
                            >
                              {initials(c.assignee.name)}
                            </span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
