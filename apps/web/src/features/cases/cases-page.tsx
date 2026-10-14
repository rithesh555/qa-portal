import {
  CASE_PRIORITIES,
  CASE_PRIORITY_LABELS,
  CASE_STATUS_LABELS,
  CASE_TYPE_LABELS,
  CASE_TYPES,
  type CaseFilter,
  caseListQuerySchema,
  type CaseSummary,
} from "@qa/shared"
import {
  CircleAlertIcon,
  DownloadIcon,
  ListChecksIcon,
  PlusIcon,
  UploadIcon,
} from "lucide-react"
import { type MouseEvent, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { ListPagination } from "@/components/list-pagination"
import { SearchBox } from "@/components/search-box"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useProjectContext } from "@/features/projects/project-layout"
import { useListParams } from "@/hooks/use-list-params"
import { useMediaQuery } from "@/hooks/use-media-query"
import { errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useCases, useLabels, useSuites } from "./api"
import { BulkBar, type Selection } from "./bulk-actions"
import {
  CaseStatusBadge,
  LabelChip,
  PriorityIndicator,
  suitePath,
} from "./case-badges"
import { CaseDetails, casePagePath } from "./case-details"
import { ExportDialog } from "./export-dialog"
import { downloadCases } from "./spreadsheet"
import { SuiteTree, suiteOptions } from "./suite-tree"

const shortDate = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
})

const ANY = "__any__"

/** Sort and order as one choice, as people think of it. */
const SORTS = [
  { value: "number:asc", label: "Sort: ID" },
  { value: "updatedAt:desc", label: "Sort: Last updated" },
  { value: "priority:asc", label: "Sort: Priority" },
  { value: "title:asc", label: "Sort: Title" },
] as const

function FilterSelect({
  label,
  value,
  items,
  onChange,
  className,
}: {
  label: string
  value: string
  items: { value: string; label: string }[]
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(v) => onChange(v as string)}
    >
      <SelectTrigger aria-label={label} className={cn("w-auto", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** A plain click opens the preview; modified clicks open the case page as a normal link. */
function isPlainClick(event: MouseEvent) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  )
}

export function CasesPage() {
  const { project, allowed } = useProjectContext()
  const [query, setQuery] = useListParams(caseListQuerySchema)
  const [searchParams, setSearchParams] = useSearchParams()
  const preview = searchParams.get("case")
  const suitesQuery = useSuites(project.key)
  const labelsQuery = useLabels(project.key)
  const cases = useCases(project.key, query)
  const wide = useMediaQuery("(min-width: 1600px)")
  const canEdit = allowed("cases:edit")
  const canArchive = allowed("cases:archive")
  const isViewer = project.myRole === "viewer"
  const [exporting, setExporting] = useState(false)

  const filter: Partial<CaseFilter> = {
    suite: query.suite,
    q: query.q,
    status: query.status,
    priority: query.priority,
    type: query.type,
    label: query.label,
  }
  // A selection belongs to the filters it was made under; changing them clears it.
  const filterKey = JSON.stringify(filter)
  // With allMatching, `ids` holds the cases unticked from "all matching".
  const [selected, setSelected] = useState<{
    key: string
    ids: Set<string>
    allMatching: boolean
  }>({ key: filterKey, ids: new Set(), allMatching: false })
  const sel =
    selected.key === filterKey
      ? selected
      : { key: filterKey, ids: new Set<string>(), allMatching: false }

  function setPreview(ref: string | null) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (ref) next.set("case", ref)
      else next.delete("case")
      return next
    })
  }

  const suites = suitesQuery.data?.items ?? []
  const totalActive =
    (suitesQuery.data?.noSuiteCount ?? 0) +
    suites.reduce((sum, s) => sum + s.caseCount, 0)
  const page = cases.data
  const items = page?.items ?? []
  const filtersOn = Boolean(
    query.q || query.status || query.priority || query.type || query.label
  )
  const projectEmpty =
    suitesQuery.isSuccess &&
    totalActive === 0 &&
    suites.length === 0 &&
    // Archived cases still need the list (Status › Archived) to be restored.
    suitesQuery.data.archivedCount === 0 &&
    !filtersOn
  const selectedSuite = suites.find((s) => s.id === query.suite)
  const paneOpen = Boolean(preview) && wide

  const pageIds = items.filter((c) => !c.archived).map((c) => c.id)
  const isChecked = (id: string) =>
    sel.allMatching ? !sel.ids.has(id) : sel.ids.has(id)
  const pageSelected = pageIds.length > 0 && pageIds.every(isChecked)
  const pageSome = !pageSelected && pageIds.some(isChecked)
  const selectedCount = sel.allMatching
    ? Math.max(0, (page?.total ?? 0) - sel.ids.size)
    : sel.ids.size
  const selection: Selection = sel.allMatching
    ? { filter, exclude: [...sel.ids] }
    : { ids: [...sel.ids] }

  function toggle(c: CaseSummary) {
    const ids = new Set(sel.ids)
    if (ids.has(c.id)) ids.delete(c.id)
    else ids.add(c.id)
    setSelected({ key: filterKey, ids, allMatching: sel.allMatching })
  }

  function togglePage() {
    const ids = new Set(sel.ids)
    // Ticking adds to an explicit selection but removes from the exclusions
    // of an all-matching one, and the other way round for unticking.
    const add = sel.allMatching === pageSelected
    for (const id of pageIds) {
      if (add) ids.add(id)
      else ids.delete(id)
    }
    setSelected({ key: filterKey, ids, allMatching: sel.allMatching })
  }

  const newCaseLink = selectedSuite ? `new?suite=${selectedSuite.id}` : "new"

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Test cases</h1>
        <p className="text-sm text-muted-foreground">
          {suitesQuery.isSuccess
            ? `${totalActive} active ${totalActive === 1 ? "case" : "cases"} in ${suites.length} ${suites.length === 1 ? "suite" : "suites"}`
            : " "}
        </p>
      </div>
      {!projectEmpty && (
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to="import" />}
            >
              <UploadIcon data-icon="inline-start" />
              Import
            </Button>
          )}
          <Button variant="outline" onClick={() => setExporting(true)}>
            <DownloadIcon data-icon="inline-start" />
            Export
          </Button>
          {canEdit && (
            <Button nativeButton={false} render={<Link to={newCaseLink} />}>
              <PlusIcon data-icon="inline-start" />
              New test case
            </Button>
          )}
        </div>
      )}
    </div>
  )

  if (projectEmpty) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListChecksIcon />
            </EmptyMedia>
            <EmptyTitle>
              <h2>No test cases yet</h2>
            </EmptyTitle>
            <EmptyDescription>
              {canEdit
                ? "Write your first case, or bring in an existing library from a spreadsheet."
                : "Test cases appear here once a QA Lead or Tester adds them."}
            </EmptyDescription>
          </EmptyHeader>
          {canEdit && (
            <EmptyContent className="flex-row flex-wrap justify-center">
              <Button nativeButton={false} render={<Link to="new" />}>
                New test case
              </Button>
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link to="import" />}
              >
                Import from CSV or Excel
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  void downloadCases([], "xlsx", "test-case-template")
                }
              >
                Download template
              </Button>
            </EmptyContent>
          )}
        </Empty>
      </div>
    )
  }

  const statusItems = [
    { value: ANY, label: "Active (Draft + Ready)" },
    { value: "draft", label: CASE_STATUS_LABELS.draft },
    { value: "ready", label: CASE_STATUS_LABELS.ready },
    { value: "archived", label: "Archived" },
  ]
  const priorityItems = [
    { value: ANY, label: "Any priority" },
    ...CASE_PRIORITIES.map((v) => ({
      value: v,
      label: CASE_PRIORITY_LABELS[v],
    })),
  ]
  const typeItems = [
    { value: ANY, label: "Any type" },
    ...CASE_TYPES.map((v) => ({ value: v, label: CASE_TYPE_LABELS[v] })),
  ]
  const labelItems = [
    { value: ANY, label: "Any label" },
    ...(labelsQuery.data ?? []).map((l) => ({ value: l, label: l })),
  ]
  const suiteItems = [
    { value: "all", label: "All suites" },
    ...suiteOptions(suites),
  ]
  const showWideColumns = !paneOpen

  return (
    <div className="flex flex-col gap-6">
      {header}
      {isViewer && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          You&apos;re a Viewer in this project, so you can read and export test
          cases but not change them.
        </p>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <aside className="hidden w-60 shrink-0 rounded-xl border bg-card p-2 lg:block">
          {suitesQuery.isPending ? (
            <Skeleton className="h-40" />
          ) : (
            <SuiteTree
              suites={suites}
              noSuiteCount={suitesQuery.data?.noSuiteCount ?? 0}
              selected={query.suite}
              onSelect={(suite) => setQuery({ suite })}
              canEdit={canEdit}
              canArchive={canArchive}
            />
          )}
        </aside>

        <div className="flex min-w-0 flex-1 items-start gap-4">
          <section
            aria-label="Test case list"
            className="min-w-0 flex-1 overflow-clip rounded-xl border bg-card"
          >
            <div className="flex flex-wrap gap-2 border-b p-3">
              <FilterSelect
                label="Suite"
                value={query.suite}
                items={suiteItems}
                onChange={(suite) => setQuery({ suite })}
                className="w-full lg:hidden"
              />
              <div className="min-w-48 flex-1">
                <SearchBox
                  value={query.q ?? ""}
                  onChange={(q) => setQuery({ q })}
                  label="Search by ID or title"
                />
              </div>
              <FilterSelect
                label="Status"
                value={query.status ?? ANY}
                items={statusItems}
                onChange={(v) =>
                  setQuery({ status: v === ANY ? undefined : v })
                }
              />
              <FilterSelect
                label="Priority"
                value={query.priority ?? ANY}
                items={priorityItems}
                onChange={(v) =>
                  setQuery({ priority: v === ANY ? undefined : v })
                }
              />
              <FilterSelect
                label="Type"
                value={query.type ?? ANY}
                items={typeItems}
                onChange={(v) => setQuery({ type: v === ANY ? undefined : v })}
              />
              <FilterSelect
                label="Label"
                value={query.label ?? ANY}
                items={labelItems}
                onChange={(v) => setQuery({ label: v === ANY ? undefined : v })}
              />
              <FilterSelect
                label="Sort"
                value={`${query.sort}:${query.order}`}
                items={SORTS.map((s) => ({ ...s }))}
                onChange={(v) => {
                  const [sort, order] = v.split(":")
                  setQuery({ sort, order })
                }}
              />
            </div>

            {canEdit && selectedCount > 0 && (
              <BulkBar
                selection={selection}
                count={selectedCount}
                pageCount={pageIds.length}
                matchCount={page?.total ?? 0}
                allMatching={sel.allMatching}
                onSelectAllMatching={() =>
                  setSelected({
                    key: filterKey,
                    ids: new Set(),
                    allMatching: true,
                  })
                }
                onClear={() =>
                  setSelected({
                    key: filterKey,
                    ids: new Set(),
                    allMatching: false,
                  })
                }
                canArchive={canArchive}
                suites={suites}
                labels={labelsQuery.data ?? []}
              />
            )}

            {cases.isError ? (
              <Alert variant="destructive" className="m-3 w-auto">
                <CircleAlertIcon />
                <AlertTitle>Couldn&apos;t load test cases</AlertTitle>
                <AlertDescription>
                  {errorMessage(cases.error)}{" "}
                  <Button
                    variant="link"
                    className="h-auto p-0"
                    onClick={() => void cases.refetch()}
                  >
                    Try again
                  </Button>
                </AlertDescription>
              </Alert>
            ) : page && page.total === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>
                    {filtersOn || !selectedSuite
                      ? "No test cases match these filters"
                      : `No test cases in ${suitePath(suites, selectedSuite.id)} yet`}
                  </EmptyTitle>
                  <EmptyDescription>
                    {filtersOn || !selectedSuite
                      ? "Try a different search, status, label or suite."
                      : "Add a case to this suite, or move cases here from the list."}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  {filtersOn ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setQuery({
                          q: undefined,
                          status: undefined,
                          priority: undefined,
                          type: undefined,
                          label: undefined,
                        })
                      }
                    >
                      Clear filters
                    </Button>
                  ) : (
                    canEdit &&
                    selectedSuite && (
                      <Button
                        size="sm"
                        nativeButton={false}
                        render={<Link to={newCaseLink} />}
                      >
                        New case in this suite
                      </Button>
                    )
                  )}
                </EmptyContent>
              </Empty>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table aria-busy={cases.isFetching}>
                    <TableHeader>
                      <TableRow>
                        {canEdit && (
                          <TableHead className="w-10">
                            <Checkbox
                              aria-label="Select all on this page"
                              checked={pageSelected}
                              indeterminate={pageSome}
                              disabled={pageIds.length === 0}
                              onCheckedChange={togglePage}
                            />
                          </TableHead>
                        )}
                        <TableHead className="hidden md:table-cell">
                          ID
                        </TableHead>
                        <TableHead className="md:min-w-60">Title</TableHead>
                        <TableHead className="hidden md:table-cell">
                          Priority
                        </TableHead>
                        {showWideColumns && (
                          <TableHead className="hidden md:table-cell">
                            Type
                          </TableHead>
                        )}
                        <TableHead className="hidden md:table-cell">
                          Status
                        </TableHead>
                        {showWideColumns && (
                          <>
                            <TableHead className="hidden text-right md:table-cell">
                              Steps
                            </TableHead>
                            <TableHead className="hidden md:table-cell">
                              Updated
                            </TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!page
                        ? Array.from({ length: 6 }, (_, i) => (
                            <TableRow key={i}>
                              <TableCell colSpan={8}>
                                <Skeleton className="h-8 w-full" />
                              </TableCell>
                            </TableRow>
                          ))
                        : items.map((c) => {
                            const open = preview?.toUpperCase() === c.key
                            return (
                              <TableRow
                                key={c.id}
                                data-state={open ? "selected" : undefined}
                              >
                                {canEdit && (
                                  <TableCell className="align-top">
                                    <Checkbox
                                      aria-label={`Select ${c.key}`}
                                      disabled={c.archived}
                                      checked={!c.archived && isChecked(c.id)}
                                      onCheckedChange={() => toggle(c)}
                                    />
                                  </TableCell>
                                )}
                                <TableCell className="hidden align-top font-mono text-xs whitespace-nowrap text-muted-foreground md:table-cell">
                                  {c.key}
                                </TableCell>
                                <TableCell className="align-top whitespace-normal">
                                  <Link
                                    to={casePagePath(project.key, c.key)}
                                    onClick={(event) => {
                                      if (!isPlainClick(event)) return
                                      event.preventDefault()
                                      setPreview(c.key)
                                    }}
                                    className="font-medium underline-offset-4 hover:text-primary hover:underline"
                                  >
                                    {c.title}
                                  </Link>
                                  {/* Narrow screens: ID, priority and status move under the title. */}
                                  <div className="mt-1 flex flex-wrap items-center gap-2 md:hidden">
                                    <span className="font-mono text-xs text-muted-foreground">
                                      {c.key}
                                    </span>
                                    <PriorityIndicator priority={c.priority} />
                                    <CaseStatusBadge
                                      status={c.status}
                                      archived={c.archived}
                                    />
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                    <span className="text-xs text-muted-foreground">
                                      {suitePath(suites, c.suiteId)}
                                    </span>
                                    {c.labels.map((l) => (
                                      <LabelChip key={l} label={l} />
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell className="hidden align-top md:table-cell">
                                  <PriorityIndicator priority={c.priority} />
                                </TableCell>
                                {showWideColumns && (
                                  <TableCell className="hidden align-top md:table-cell">
                                    {CASE_TYPE_LABELS[c.type]}
                                  </TableCell>
                                )}
                                <TableCell className="hidden align-top md:table-cell">
                                  <CaseStatusBadge
                                    status={c.status}
                                    archived={c.archived}
                                  />
                                </TableCell>
                                {showWideColumns && (
                                  <>
                                    <TableCell className="hidden text-right align-top tabular-nums md:table-cell">
                                      {c.stepCount}
                                    </TableCell>
                                    <TableCell className="hidden align-top whitespace-nowrap text-muted-foreground md:table-cell">
                                      {shortDate.format(new Date(c.updatedAt))}
                                    </TableCell>
                                  </>
                                )}
                              </TableRow>
                            )
                          })}
                    </TableBody>
                  </Table>
                </div>
                {page && (
                  <div className="border-t px-3 py-2">
                    <ListPagination
                      page={page.page}
                      pageSize={page.pageSize}
                      total={page.total}
                      noun={["case", "cases"]}
                      onPageChange={(p) => setQuery({ page: p })}
                    />
                  </div>
                )}
              </>
            )}
          </section>

          {paneOpen && preview && (
            <aside
              aria-label="Test case preview"
              className="sticky top-4 w-[400px] shrink-0 overflow-y-auto rounded-xl border bg-card p-4"
              style={{ maxHeight: "calc(100dvh - 2rem)" }}
            >
              <CaseDetails caseRef={preview} onClose={() => setPreview(null)} />
            </aside>
          )}
        </div>
      </div>

      {!wide && (
        <Sheet
          open={Boolean(preview)}
          onOpenChange={(open) => !open && setPreview(null)}
        >
          <SheetContent
            showCloseButton={false}
            className="overflow-y-auto p-4 data-[side=right]:w-full sm:data-[side=right]:max-w-md"
          >
            <SheetTitle className="sr-only">Test case preview</SheetTitle>
            {preview && (
              <CaseDetails caseRef={preview} onClose={() => setPreview(null)} />
            )}
          </SheetContent>
        </Sheet>
      )}

      <ExportDialog
        open={exporting}
        onOpenChange={setExporting}
        filter={filter}
        count={page?.total ?? 0}
      />
    </div>
  )
}
