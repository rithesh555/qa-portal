import {
  completion,
  countTotal,
  formatPercent,
  passRate,
  runListQuerySchema,
  type RunSummary,
} from "@qa/shared"
import { CircleAlertIcon, PlayIcon, PlusIcon } from "lucide-react"
import { Link } from "react-router"
import { ListPagination } from "@/components/list-pagination"
import { SearchBox } from "@/components/search-box"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar"
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
import { useReleases } from "@/features/projects/api"
import { useProjectContext } from "@/features/projects/project-layout"
import { useListParams } from "@/hooks/use-list-params"
import { errorMessage } from "@/lib/api"
import { exactTime, timeAgo } from "@/lib/time"
import { useRuns } from "./api"
import { initials } from "./format"
import { ProgressBar, StatusLegend } from "./run-status"

const ANY = "__any__"

function Assignees({ people }: { people: RunSummary["assignees"] }) {
  if (people.length === 0)
    return <span className="text-sm text-muted-foreground">Unassigned</span>
  const shown = people.slice(0, 3)
  const names = people.map((p) => p.name).join(", ")
  return (
    <div className="flex items-center" title={names}>
      <span className="sr-only">Assigned to {names}</span>
      <AvatarGroup aria-hidden>
        {shown.map((p) => (
          <Avatar key={p.id} size="sm">
            <AvatarFallback className="text-[0.6rem]">
              {initials(p.name)}
            </AvatarFallback>
          </Avatar>
        ))}
      </AvatarGroup>
      {people.length > shown.length && (
        <span aria-hidden className="ms-1.5 text-xs text-muted-foreground">
          +{people.length - shown.length}
        </span>
      )}
    </div>
  )
}

function RunRow({ run }: { run: RunSummary }) {
  const total = countTotal(run.counts)
  const readyToClose =
    run.state === "open" && total > 0 && run.counts.untested === 0
  const details = [
    run.release ? `Release ${run.release.name}` : null,
    `${total} ${total === 1 ? "case" : "cases"}`,
    run.environment || null,
  ].filter(Boolean)
  return (
    <TableRow>
      <TableCell className="align-top font-mono text-xs whitespace-nowrap text-muted-foreground">
        {run.key}
      </TableCell>
      <TableCell className="max-w-96 min-w-56 align-top whitespace-normal">
        <Link
          to={run.key}
          className="font-semibold underline-offset-4 hover:text-primary hover:underline"
        >
          {run.name}
        </Link>
        <p className="text-xs text-muted-foreground">{details.join(" · ")}</p>
        {readyToClose && (
          <p className="mt-1 text-xs font-medium text-status-pass-ink">
            All tested · ready to close
          </p>
        )}
        {run.state === "closed" && run.closedAt && (
          <p className="mt-1 text-xs text-muted-foreground">
            Closed{run.closedBy ? ` by ${run.closedBy.name}` : ""} ·{" "}
            {timeAgo(run.closedAt)}
            {run.counts.untested > 0 &&
              ` · ${run.counts.untested} left untested`}
          </p>
        )}
      </TableCell>
      <TableCell className="min-w-48 align-top">
        <ProgressBar counts={run.counts} />
        <p className="mt-1.5 text-xs text-muted-foreground">
          {formatPercent(completion(run.counts))} complete · {run.counts.failed}{" "}
          failed · {run.counts.blocked} blocked
        </p>
      </TableCell>
      <TableCell className="align-top font-medium tabular-nums">
        {formatPercent(passRate(run.counts))}
      </TableCell>
      <TableCell className="align-top">
        <Assignees people={run.assignees} />
      </TableCell>
      <TableCell
        className="align-top text-sm whitespace-nowrap text-muted-foreground"
        title={exactTime.format(new Date(run.updatedAt))}
      >
        {timeAgo(run.updatedAt)}
      </TableCell>
    </TableRow>
  )
}

export function RunsPage() {
  const { project, allowed } = useProjectContext()
  const [query, setQuery] = useListParams(runListQuerySchema)
  const runs = useRuns(project.key, query)
  // The other tab's count, from the same filters.
  const other = query.state === "open" ? "closed" : "open"
  const otherRuns = useRuns(project.key, {
    ...query,
    state: other,
    page: 1,
    pageSize: 1,
  })
  const releases = useReleases(project.key)
  const canRun = allowed("runs:execute") && !project.archived

  const page = runs.data
  const filtersOn = Boolean(query.q || query.releaseId || query.mine)
  const counts = {
    [query.state]: page?.total,
    [other]: otherRuns.data?.total,
  } as Record<"open" | "closed", number | undefined>
  const noRunsAtAll = !filtersOn && counts.open === 0 && counts.closed === 0

  const releaseItems = [
    { value: ANY, label: "All releases" },
    ...(releases.data?.items ?? []).map((r) => ({
      value: r.id,
      label: r.name,
    })),
  ]

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex max-w-2xl flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Test runs</h1>
        <p className="text-sm text-muted-foreground">
          Each run keeps a copy of its cases as they were when it started, so
          results stay accurate when cases change.
        </p>
      </div>
      {canRun && !noRunsAtAll && (
        <Button nativeButton={false} render={<Link to="new" />}>
          <PlusIcon data-icon="inline-start" />
          New run
        </Button>
      )}
    </div>
  )

  if (noRunsAtAll) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PlayIcon />
            </EmptyMedia>
            <EmptyTitle>
              <h2>No test runs yet</h2>
            </EmptyTitle>
            <EmptyDescription>
              A run takes a set of test cases (say, every Ready case labelled
              “regression”) and records a result for each one.
            </EmptyDescription>
          </EmptyHeader>
          {canRun && (
            <EmptyContent>
              <Button nativeButton={false} render={<Link to="new" />}>
                Start the first run
              </Button>
            </EmptyContent>
          )}
        </Empty>
      </div>
    )
  }

  const countLabel = (n: number | undefined) =>
    n === undefined ? "" : ` (${n})`

  return (
    <div className="flex flex-col gap-6">
      {header}

      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
        <Tabs
          value={query.state}
          onValueChange={(state) => setQuery({ state: state as string })}
        >
          <TabsList>
            <TabsTrigger value="open">
              Open{countLabel(counts.open)}
            </TabsTrigger>
            <TabsTrigger value="closed">
              Closed{countLabel(counts.closed)}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="min-w-48 flex-1">
          <SearchBox
            value={query.q ?? ""}
            onChange={(q) => setQuery({ q })}
            label="Search by ID or name"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            items={releaseItems}
            value={query.releaseId ?? ANY}
            onValueChange={(v) =>
              setQuery({ releaseId: v === ANY ? undefined : (v as string) })
            }
          >
            <SelectTrigger aria-label="Release" className="w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {releaseItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Toggle
            variant="outline"
            title="Runs you started or have cases in"
            className="aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-accent-foreground"
            pressed={query.mine}
            onPressedChange={(on) =>
              setQuery({ mine: on ? "true" : undefined })
            }
          >
            My runs
          </Toggle>
        </div>
      </div>

      {runs.isError ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Couldn&apos;t load test runs</AlertTitle>
          <AlertDescription>
            {errorMessage(runs.error)}{" "}
            <Button
              variant="link"
              className="h-auto p-0"
              onClick={() => void runs.refetch()}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : !page ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : page.total === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>
              {query.state === "open"
                ? "No open runs match"
                : "No closed runs match"}
            </EmptyTitle>
            <EmptyDescription>
              {filtersOn
                ? "Try another search or release, or clear “My runs”."
                : query.state === "open"
                  ? "Every run is closed. Start a new one when the next build is ready."
                  : "Runs show up here once they're closed."}
            </EmptyDescription>
          </EmptyHeader>
          {filtersOn && (
            <EmptyContent>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setQuery({
                    q: undefined,
                    releaseId: undefined,
                    mine: undefined,
                  })
                }
              >
                Clear filters
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <section
          aria-label="Test runs"
          className="overflow-clip rounded-xl border bg-card"
        >
          <div className="overflow-x-auto">
            <Table aria-busy={runs.isFetching}>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Run</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Pass rate</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.items.map((run) => (
                  <RunRow key={run.id} run={run} />
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 border-t p-3 md:flex-row md:items-center md:justify-between">
            <StatusLegend />
            <ListPagination
              page={page.page}
              pageSize={page.pageSize}
              total={page.total}
              noun={["run", "runs"]}
              onPageChange={(p) => setQuery({ page: p })}
            />
          </div>
        </section>
      )}
    </div>
  )
}
