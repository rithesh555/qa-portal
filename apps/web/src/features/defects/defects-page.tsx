import { PageHeader } from "@/components/composites/page-header"
import { DataError } from "@/components/composites/data-state"
import {
  DEFECT_PRIORITIES,
  DEFECT_PRIORITY_LABELS,
  DEFECT_STATUS_LABELS,
  DEFECT_STATUSES,
  defectListQuerySchema,
  type DefectSummary,
  isActiveDefect,
  SEVERITIES,
  SEVERITY_LABELS,
} from "@qa/shared"
import { BugIcon, PlusIcon } from "lucide-react"
import { Link } from "react-router"
import { ListPagination } from "@/components/list-pagination"
import { SearchBox } from "@/components/search-box"
import { ButtonLink } from "@/components/button-link"
import { Button } from "@/components/ui/button"
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
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toggle } from "@/components/ui/toggle"
import { projectPath } from "@/app/nav"
import { useSession } from "@/features/auth/session"
import { useReleases } from "@/features/projects/api"
import { useProjectContext } from "@/features/projects/project-layout"
import { initials } from "@/features/runs/format"
import { useAssignable } from "@/features/runs/run-people"
import { useListParams } from "@/hooks/use-list-params"
import { exactTime, timeAgo } from "@/lib/time"
import { useDefects } from "./api"
import { DefectStatusBadge, SeverityIndicator } from "./defect-badges"

const ANY = "__any__"

const SORTS = [
  { value: "number:desc", label: "Sort: Newest" },
  { value: "updatedAt:desc", label: "Sort: Last updated" },
  { value: "severity:asc", label: "Sort: Severity" },
  { value: "priority:asc", label: "Sort: Priority" },
] as const

function FilterSelect({
  label,
  value,
  items,
  onChange,
}: {
  label: string
  value: string
  items: { value: string; label: string }[]
  onChange: (value: string | undefined) => void
}) {
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(v) => onChange(v === ANY ? undefined : (v as string))}
    >
      <SelectTrigger aria-label={label} className="w-auto">
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

function DefectRow({
  defect,
  projectKey,
}: {
  defect: DefectSummary
  projectKey: string
}) {
  const sub = [
    defect.foundInRelease ? `Found in ${defect.foundInRelease.name}` : null,
    defect.environment || null,
    `reported by ${defect.reporter.name}`,
  ].filter(Boolean)
  return (
    <TableRow>
      <TableCell className="align-top font-mono text-xs whitespace-nowrap text-muted-foreground">
        {defect.key}
      </TableCell>
      <TableCell className="max-w-[28rem] min-w-64 align-top whitespace-normal">
        <Link
          to={defect.key}
          className="font-semibold break-words underline-offset-4 hover:text-primary hover:underline"
        >
          {defect.title}
        </Link>
        <p className="text-xs text-muted-foreground">{sub.join(" · ")}</p>
        {/* On narrow screens the side columns fold in under the title. */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 md:hidden">
          <DefectStatusBadge status={defect.status} />
          <SeverityIndicator severity={defect.severity} />
          <span className="text-xs text-muted-foreground">
            {defect.assignee ? defect.assignee.name : "Unassigned"}
          </span>
        </div>
      </TableCell>
      <TableCell className="hidden align-top md:table-cell">
        <SeverityIndicator severity={defect.severity} />
      </TableCell>
      <TableCell className="hidden align-top text-sm whitespace-nowrap md:table-cell">
        {defect.priority ? (
          DEFECT_PRIORITY_LABELS[defect.priority]
        ) : (
          <span className="text-muted-foreground">Not set</span>
        )}
      </TableCell>
      <TableCell className="hidden align-top md:table-cell">
        <DefectStatusBadge status={defect.status} />
      </TableCell>
      <TableCell className="hidden align-top md:table-cell">
        {defect.assignee ? (
          <span className="inline-flex items-center gap-2 text-sm whitespace-nowrap">
            <span
              aria-hidden
              className="grid size-6 place-items-center rounded-full bg-accent text-2xs font-semibold text-accent-foreground"
            >
              {initials(defect.assignee.name)}
            </span>
            {defect.assignee.name}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Unassigned</span>
        )}
      </TableCell>
      <TableCell className="hidden align-top text-sm whitespace-nowrap lg:table-cell">
        {defect.foundInRun ? (
          <Link
            to={projectPath(projectKey, `runs/${defect.foundInRun.key}`)}
            className="font-mono text-xs text-primary underline-offset-4 hover:underline"
          >
            {defect.foundInRun.key}
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">Logged by hand</span>
        )}
        {defect.linkCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {defect.linkCount} linked{" "}
            {defect.linkCount === 1 ? "result" : "results"}
          </p>
        )}
      </TableCell>
      <TableCell
        className="hidden align-top text-sm whitespace-nowrap text-muted-foreground xl:table-cell"
        title={exactTime.format(new Date(defect.updatedAt))}
      >
        {timeAgo(defect.updatedAt)}
      </TableCell>
    </TableRow>
  )
}

export function DefectsPage() {
  const { project, allowed } = useProjectContext()
  const [query, setQuery] = useListParams(defectListQuerySchema)
  const defects = useDefects(project.key, query)
  // The other tab's count and the triage count, from cheap one-row queries.
  const other = query.state === "active" ? "done" : "active"
  // The other tab's count, under the same filters (status is per tab).
  const otherDefects = useDefects(project.key, {
    ...query,
    status: undefined,
    state: other,
    page: 1,
    pageSize: 1,
  })
  const newDefects = useDefects(project.key, {
    state: "active",
    status: "new",
    page: 1,
    pageSize: 1,
  })
  const releases = useReleases(project.key)
  const people = useAssignable(project.key) ?? []
  const canEdit = allowed("defects:edit")
  const canTriage = allowed("defects:triage")
  const me = useSession().data?.id

  function clearFilters() {
    setQuery({
      q: undefined,
      status: undefined,
      severity: undefined,
      priority: undefined,
      assigneeId: undefined,
      reporterId: undefined,
      releaseId: undefined,
      mine: undefined,
    })
  }

  const page = defects.data
  const filtersOn = Boolean(
    query.q ||
    query.status ||
    query.severity ||
    query.priority ||
    query.assigneeId ||
    query.reporterId ||
    query.releaseId ||
    query.mine
  )
  const counts = {
    [query.state]: page?.total,
    [other]: otherDefects.data?.total,
  } as Record<"active" | "done", number | undefined>
  const nothingYet =
    !filtersOn && page?.total === 0 && otherDefects.data?.total === 0
  const newCount = newDefects.data?.total ?? 0

  const header = (
    <PageHeader
      title="Defects"
      description="Problems found while testing. Most are logged from a failed or blocked result, so they link back to the run and case. Defects are never deleted; a QA Lead rejects the ones that aren't real."
      actions={
        canEdit &&
        !nothingYet && (
          <ButtonLink to="new">
            <PlusIcon data-icon="inline-start" />
            New defect
          </ButtonLink>
        )
      }
    />
  )

  if (nothingYet) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BugIcon />
            </EmptyMedia>
            <EmptyTitle>
              <h2>No defects yet</h2>
            </EmptyTitle>
            <EmptyDescription>
              {canEdit
                ? "When a case fails or is blocked in a test run, choose “Log defect” on it: the steps, your note and the run's environment are filled in for you."
                : "Defects appear here once QA Leads and Testers log them."}
            </EmptyDescription>
          </EmptyHeader>
          {canEdit && (
            <EmptyContent className="flex-row flex-wrap justify-center">
              <ButtonLink
                variant="outline"
                to={projectPath(project.key, "runs")}
              >
                Go to test runs
              </ButtonLink>
              <ButtonLink variant="outline" to="new">
                Log one by hand
              </ButtonLink>
            </EmptyContent>
          )}
        </Empty>
      </div>
    )
  }

  const statuses = DEFECT_STATUSES.filter(
    (s) => isActiveDefect(s) === (query.state === "active")
  )
  const countLabel = (n: number | undefined) =>
    n === undefined ? "" : ` (${n})`

  return (
    <div className="flex flex-col gap-5">
      {header}

      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
        <Tabs
          value={query.state}
          onValueChange={(state) =>
            setQuery({ state: state as string, status: undefined })
          }
        >
          <TabsList>
            <TabsTrigger value="active">
              Active{countLabel(counts.active)}
            </TabsTrigger>
            <TabsTrigger value="done">
              Closed or rejected{countLabel(counts.done)}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="min-w-48 flex-1">
          <SearchBox
            value={query.q ?? ""}
            onChange={(q) => setQuery({ q })}
            label="Search by ID or title"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <FilterSelect
          label="Status"
          value={query.status ?? ANY}
          items={[
            { value: ANY, label: "Any status" },
            ...statuses.map((s) => ({
              value: s,
              label: DEFECT_STATUS_LABELS[s],
            })),
          ]}
          onChange={(status) => setQuery({ status })}
        />
        <FilterSelect
          label="Severity"
          value={query.severity ?? ANY}
          items={[
            { value: ANY, label: "Any severity" },
            ...SEVERITIES.map((s) => ({ value: s, label: SEVERITY_LABELS[s] })),
          ]}
          onChange={(severity) => setQuery({ severity })}
        />
        <FilterSelect
          label="Priority"
          value={query.priority ?? ANY}
          items={[
            { value: ANY, label: "Any priority" },
            ...DEFECT_PRIORITIES.map((p) => ({
              value: p,
              label: DEFECT_PRIORITY_LABELS[p],
            })),
            { value: "none", label: "Not set yet" },
          ]}
          onChange={(priority) => setQuery({ priority })}
        />
        <FilterSelect
          label="Assignee"
          value={query.assigneeId ?? ANY}
          items={[
            { value: ANY, label: "Any assignee" },
            ...people.map((p) => ({ value: p.userId, label: p.name })),
          ]}
          onChange={(assigneeId) => setQuery({ assigneeId })}
        />
        <FilterSelect
          label="Reported by"
          value={query.reporterId ?? ANY}
          items={[
            { value: ANY, label: "Anyone reported" },
            ...(me ? [{ value: me, label: "Me" }] : []),
            ...people
              .filter((p) => p.userId !== me)
              .map((p) => ({ value: p.userId, label: p.name })),
          ]}
          onChange={(reporterId) => setQuery({ reporterId })}
        />
        <FilterSelect
          label="Found in release"
          value={query.releaseId ?? ANY}
          items={[
            { value: ANY, label: "All releases" },
            ...(releases.data?.items ?? []).map((r) => ({
              value: r.id,
              label: r.name,
            })),
          ]}
          onChange={(releaseId) => setQuery({ releaseId })}
        />
        <FilterSelect
          label="Sort"
          value={`${query.sort}:${query.order}`}
          items={SORTS.map((s) => ({ ...s }))}
          onChange={(v) => {
            const [sort, order] = (v ?? "number:desc").split(":")
            setQuery({ sort, order })
          }}
        />
        <Toggle
          variant="outline"
          className="aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-accent-foreground"
          pressed={query.mine}
          onPressedChange={(on) => setQuery({ mine: on ? "true" : undefined })}
        >
          Assigned to me
        </Toggle>
        {filtersOn && (
          <Button variant="ghost" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {canTriage &&
        query.state === "active" &&
        query.status !== "new" &&
        newCount > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-defect-new-ink/30 bg-defect-new/60 px-4 py-3 text-sm">
            <span className="min-w-0 flex-1">
              <span className="font-semibold">
                {newCount} new {newCount === 1 ? "defect is" : "defects are"}
              </span>{" "}
              waiting for triage: confirm {newCount === 1 ? "it" : "them"} (and
              set a priority) or reject {newCount === 1 ? "it" : "them"} with a
              reason.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setQuery({ status: "new" })}
            >
              Show new defects
            </Button>
          </div>
        )}

      {defects.isError ? (
        <DataError
          title="Couldn't load defects"
          error={defects.error}
          onRetry={() => void defects.refetch()}
        />
      ) : !page ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : page.total === 0 ? (
        <Empty role="status" className="border">
          <EmptyHeader>
            <EmptyTitle>
              {filtersOn
                ? "No defects match these filters"
                : query.state === "active"
                  ? "No active defects"
                  : "No closed or rejected defects"}
            </EmptyTitle>
            <EmptyDescription>
              {filtersOn
                ? "Try another status or severity, or clear the filters."
                : query.state === "active"
                  ? "Everything logged has been closed or rejected."
                  : "Defects show up here once they're closed or rejected."}
            </EmptyDescription>
          </EmptyHeader>
          {filtersOn && (
            <EmptyContent>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <section
          aria-label="Defects"
          className="overflow-clip rounded-xl border bg-card"
        >
          <div className="overflow-x-auto">
            <Table aria-busy={defects.isFetching}>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Defect</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Severity
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    Priority
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Assignee
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Found in
                  </TableHead>
                  <TableHead className="hidden xl:table-cell">
                    Updated
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.items.map((d) => (
                  <DefectRow key={d.id} defect={d} projectKey={project.key} />
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end border-t p-3">
            <ListPagination
              page={page.page}
              pageSize={page.pageSize}
              total={page.total}
              noun={["defect", "defects"]}
              onPageChange={(p) => setQuery({ page: p })}
            />
          </div>
        </section>
      )}
    </div>
  )
}
