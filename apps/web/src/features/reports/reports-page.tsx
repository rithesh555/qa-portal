import {
  CASE_PRIORITY_LABELS,
  countTotal,
  DEFECT_PRIORITY_LABELS,
  type ExitCheck,
  formatPercent,
  RELEASE_STATUS_LABELS,
  type Report,
  type ReportDefectRow,
  type ReportExportKind,
  RUN_CASE_STATUS_LABELS,
  type RunCounts,
} from "@qa/shared"
import {
  ChartColumnIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleHelpIcon,
  PrinterIcon,
  XIcon,
} from "lucide-react"
import { type ReactNode, useState } from "react"
import { Link } from "react-router"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ButtonLink } from "@/components/button-link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import {
  DefectStatusBadge,
  SeverityIndicator,
} from "@/features/defects/defect-badges"
import { useReleases } from "@/features/projects/api"
import { useProjectContext } from "@/features/projects/project-layout"
import {
  ProgressBar,
  RunCaseStatusBadge,
  StatusLegend,
} from "@/features/runs/run-status"
import { errorMessage } from "@/lib/api"
import { exactTime } from "@/lib/time"
import { cn } from "@/lib/utils"
import { fetchReportExport, useReport } from "./api"
import {
  BarList,
  ChartCard,
  DataTable,
  FlowChart,
  FlowLegend,
  PassRateChart,
} from "./charts"
import { type CsvTable, csvFileName, downloadCsv } from "./csv"
import { useLatestSearchParams } from "@/hooks/use-latest-search-params"

const NONE = "none"

const linkCls = "text-primary underline underline-offset-4"

/** "Oct 19" for a week's Monday (YYYY-MM-DD, UTC). */
const weekLabel = (day: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`))

/** Pass rate of one run's own results; null before anything passed, failed or was blocked. */
export function runPassRate(c: RunCounts): number | null {
  const decided = c.passed + c.failed + c.blocked
  return decided ? c.passed / decided : null
}

/** The release the page opens on: the URL's, else the project's current one, else the newest, else "No release". */
function useReleaseParam() {
  const { project } = useProjectContext()
  const releases = useReleases(project.key)
  const [params, setParams] = useLatestSearchParams()
  const items = releases.data?.items ?? []
  const fromUrl = params.get("release")
  const valid =
    fromUrl === NONE || items.some((r) => r.id === fromUrl) ? fromUrl : null
  const fallback =
    project.currentRelease?.id ??
    [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.id ??
    NONE
  const release = releases.isPending ? null : (valid ?? fallback)
  const live = params.get("live") === "true"
  const set = (patch: { release?: string; live?: boolean }) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (patch.release !== undefined) {
          next.set("release", patch.release)
          next.delete("live")
        }
        if (patch.live !== undefined) {
          if (patch.live) next.set("live", "true")
          else next.delete("live")
        }
        return next
      },
      { replace: true }
    )
  return { release, live, set, releases: items, loading: releases.isPending }
}

export function ReportsPage() {
  const { project } = useProjectContext()
  const { release, live, set, releases, loading } = useReleaseParam()
  const report = useReport(project.key, release, live)
  const r = report.data
  const [busy, setBusy] = useState<ReportExportKind | null>(null)

  const releaseName = r?.release?.name ?? null
  const scope = `${project.name} · ${releaseName ? `Release ${releaseName}` : "No release"}`
  const csv = (what: string, table: Omit<CsvTable, "scope" | "asOf">) => () =>
    r &&
    downloadCsv(csvFileName(project.key, releaseName, what), {
      scope,
      asOf: r.asOf,
      ...table,
    })

  async function exportRows(kind: ReportExportKind, what: string) {
    if (!release) return
    setBusy(kind)
    try {
      const e = await fetchReportExport(project.key, release, kind)
      downloadCsv(csvFileName(project.key, releaseName, what), e)
    } catch (err) {
      toast.add({
        type: "error",
        title: "Couldn't download the CSV",
        description: errorMessage(err),
      })
    } finally {
      setBusy(null)
    }
  }

  const options = [
    ...releases.map((x) => ({
      value: x.id,
      label: `${x.name} (${RELEASE_STATUS_LABELS[x.status].toLowerCase()})`,
    })),
    { value: NONE, label: "No release" },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            {r ? asOfLine(r) : "Can this release ship? What's left, and where."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {loading ? (
            <Skeleton className="h-8 w-48" />
          ) : (
            <Select
              items={options}
              value={release ?? NONE}
              onValueChange={(v) => set({ release: v as string })}
            >
              <SelectTrigger aria-label="Release" className="w-auto min-w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <ButtonLink
            variant="outline"
            disabled={!r}
            to={`print?release=${release ?? NONE}${live ? "&live=true" : ""}`}
          >
            <PrinterIcon data-icon="inline-start" />
            Print report
          </ButtonLink>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  disabled={!r || !!busy}
                  focusableWhenDisabled
                />
              }
            >
              {busy && <Spinner data-icon="inline-start" />}
              {busy ? "Preparing CSV…" : "Download data"}
              <ChevronDownIcon data-icon="inline-end" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {/* A Base UI menu label must sit inside a group. */}
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs font-normal whitespace-normal text-muted-foreground">
                  CSV files of live numbers, stamped with “{scope}” and the
                  time.
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() =>
                    void exportRows("cases", "latest result per case")
                  }
                >
                  Latest result per case
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void exportRows("defects", "defects")}
                >
                  Defects
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void exportRows("runs", "runs")}
                >
                  Runs
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {r?.snapshot && (
        <Alert>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              This is the{" "}
              <strong className="text-foreground">
                snapshot taken when {r.release?.name} was released
              </strong>{" "}
              on {exactTime.format(new Date(r.asOf))}, so later edits don&apos;t
              change the sign-off.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => set({ live: true })}
            >
              Show live numbers instead
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {r && live && r.release?.status === "released" && (
        <Alert>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              Showing live numbers for a released release; they can differ from
              its sign-off snapshot.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => set({ live: false })}
            >
              Show the snapshot
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {report.isError ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            {errorMessage(report.error)}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void report.refetch()}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : !r ? (
        <ReportSkeleton />
      ) : !r.hasRuns ? (
        <NoRuns hasRelease={r.release !== null} />
      ) : (
        <div
          className={cn(
            "flex flex-col gap-6 transition-opacity",
            report.isPlaceholderData && "opacity-60"
          )}
          aria-busy={report.isPlaceholderData}
        >
          <ReportBody report={r} csv={csv} />
        </div>
      )}
    </div>
  )
}

function asOfLine(r: Report) {
  const when = exactTime.format(new Date(r.asOf))
  const what = r.release ? `Release ${r.release.name}` : "Runs with no release"
  return r.snapshot
    ? `${what} · snapshot from ${when}`
    : `${what} · live, as of ${when}`
}

function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <span className="sr-only">Loading the report…</span>
      <Skeleton className="h-56" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  )
}

function NoRuns({ hasRelease }: { hasRelease: boolean }) {
  const { allowed } = useProjectContext()
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ChartColumnIcon />
        </EmptyMedia>
        <EmptyTitle>
          <h2>No runs for this choice yet</h2>
        </EmptyTitle>
        <EmptyDescription>
          Reports fill in once a test run for it has results.{" "}
          {hasRelease
            ? "Runs without a release show under “No release”."
            : "Runs that belong to a release show under that release."}
        </EmptyDescription>
      </EmptyHeader>
      {allowed("runs:execute") && (
        <EmptyContent>
          <ButtonLink to="../runs/new" relative="path">
            Start a run
          </ButtonLink>
        </EmptyContent>
      )}
    </Empty>
  )
}

type Csv = (what: string, table: Omit<CsvTable, "scope" | "asOf">) => () => void

const pct = (v: number | null) => (v === null ? "—" : formatPercent(v))

function ReportBody({ report: r, csv }: { report: Report; csv: Csv }) {
  const { project } = useProjectContext()
  const releaseFilter = r.release ? `releaseId=${r.release.id}&` : ""
  const defectsUrl = (q = "") => `../defects?${releaseFilter}${q}`
  const untestedTotal = r.untestedByPriority.reduce((a, u) => a + u.count, 0)
  const noDefect = r.failing.filter((f) => !f.defect).length

  // Per-run pass rates, oldest first, for the trend; runs with no decided result are left out.
  const trend = r.runs
    .map((run) => ({ run, rate: runPassRate(run.counts) }))
    .filter(
      (x): x is { run: Report["runs"][number]; rate: number } => x.rate !== null
    )
    .map(({ run, rate }) => ({
      key: run.key,
      label: run.key.slice(project.key.length + 1),
      rate,
      open: run.state === "open",
      detail: `${run.counts.passed} passed, ${run.counts.failed} failed, ${run.counts.blocked} blocked`,
    }))
  const newestFirst = [...r.runs].reverse()

  return (
    <>
      <Readiness checks={r.checks} defectsUrl={defectsUrl} />
      <Kpis report={r} defectsUrl={defectsUrl} />

      {/* Full width at every size: both are tables to read, and the defect
          table's seven columns don't fit half the page (F14). */}
      <div className="grid gap-6">
        <ChartCard
          id="blocking"
          title="Blocking defects"
          description="Open Critical and Major defects found in this release"
        >
          <div className="-mt-1 flex justify-end print:hidden">
            <Link to={defectsUrl()} className={cn(linkCls, "text-sm")}>
              Open in Defects
            </Link>
          </div>
          {r.blocking.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No open Critical or Major defects.
            </p>
          ) : (
            <DefectTable rows={r.blocking} />
          )}
        </ChartCard>

        <ChartCard
          id="failing"
          title="Failing cases"
          description={`Latest result is Failed or Blocked${r.failing.length ? ` · ${noDefect} with no defect linked` : ""}`}
          onCsv={
            r.failing.length
              ? csv("failing cases", {
                  columns: [
                    "Case",
                    "Title",
                    "Latest result",
                    "Failed at step",
                    "Run",
                    "Defect",
                  ],
                  rows: r.failing.map((f) => [
                    f.caseKey,
                    f.title,
                    f.status,
                    f.failedStep,
                    f.runKey,
                    f.defect?.key ?? null,
                  ]),
                })
              : undefined
          }
        >
          {r.failing.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing failed or is blocked.
            </p>
          ) : (
            <DataTable
              head={["Case", "Latest result", "Run", "Defect"]}
              rows={r.failing.map((f) => [
                <span key="c" className="flex min-w-48 flex-col">
                  <span className="font-mono text-xs text-muted-foreground">
                    {f.caseKey}
                  </span>
                  {f.title}
                </span>,
                <span key="s" className="flex flex-col">
                  <RunCaseStatusBadge status={f.status} />
                  {f.failedStep && (
                    <span className="text-xs text-muted-foreground">
                      at step {f.failedStep}
                    </span>
                  )}
                </span>,
                <Link
                  key="r"
                  to={`../runs/${f.runKey}?case=${f.runCaseId}`}
                  relative="path"
                  className={cn(linkCls, "font-mono text-xs whitespace-nowrap")}
                >
                  {f.runKey}
                </Link>,
                f.defect ? (
                  <Link
                    key="d"
                    to={`../defects/${f.defect.key}`}
                    relative="path"
                    className={cn(
                      linkCls,
                      "font-mono text-xs whitespace-nowrap"
                    )}
                  >
                    {f.defect.key}
                  </Link>
                ) : (
                  <span key="d" className="whitespace-nowrap">
                    <strong>None</strong> ·{" "}
                    <Link
                      to={`../runs/${f.runKey}?case=${f.runCaseId}`}
                      relative="path"
                      className={linkCls}
                    >
                      Log one
                    </Link>
                  </span>
                ),
              ])}
            />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard
          id="untested"
          title="Untested Ready cases by priority"
          description={`No result yet in these runs · ${untestedTotal} in all`}
          onCsv={csv("untested cases by priority", {
            columns: ["Priority", "Untested Ready cases"],
            rows: r.untestedByPriority.map((u) => [
              CASE_PRIORITY_LABELS[u.priority],
              u.count,
            ]),
          })}
        >
          <BarList
            label="untested cases"
            items={r.untestedByPriority.map((u) => ({
              label: CASE_PRIORITY_LABELS[u.priority],
              value: u.count,
            }))}
          />
        </ChartCard>

        {r.release && (
          <ChartCard
            id="carry"
            title="Carried over from earlier releases"
            description={`Still open, found before ${r.release.name}`}
          >
            {r.carriedOver.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing open is left from earlier releases.
              </p>
            ) : (
              <DefectTable rows={r.carriedOver} showFoundIn />
            )}
          </ChartCard>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard
          id="trend"
          title="Pass rate by run"
          description={
            trend.length
              ? "Each run in order, its own results; an open run is dashed. The axis starts where the data does."
              : undefined
          }
          chart={trend.length ? <PassRateChart points={trend} /> : undefined}
          table={
            trend.length ? (
              <DataTable
                head={[
                  "Run",
                  "State",
                  "Pass rate",
                  "Passed / failed / blocked",
                ]}
                numeric={[2, 3]}
                rows={trend.map((p) => [
                  <span key="k" className="font-mono text-xs">
                    {p.key}
                  </span>,
                  p.open ? "Open" : "Closed",
                  formatPercent(p.rate),
                  p.detail
                    .replace(/ (passed|failed|blocked)/g, "")
                    .replace(/, /g, " / "),
                ])}
              />
            ) : undefined
          }
          onCsv={
            trend.length
              ? csv("pass rate by run", {
                  columns: [
                    "Run",
                    "State",
                    "Pass rate",
                    "Passed",
                    "Failed",
                    "Blocked",
                  ],
                  rows: r.runs
                    .filter((run) => runPassRate(run.counts) !== null)
                    .map((run) => [
                      run.key,
                      run.state,
                      Math.round((runPassRate(run.counts) ?? 0) * 1000) / 10,
                      run.counts.passed,
                      run.counts.failed,
                      run.counts.blocked,
                    ]),
                })
              : undefined
          }
        >
          {!trend.length && (
            <p className="text-sm text-muted-foreground">
              No run has a pass, fail or block yet.
            </p>
          )}
        </ChartCard>

        <ChartCard
          id="results"
          title="Results by run"
          description="Share of each run's cases, newest first"
          chart={
            <ul className="flex flex-col gap-2.5">
              {newestFirst.map((run) => (
                <li
                  key={run.key}
                  className="grid grid-cols-[4.5rem_minmax(0,1fr)_4.5rem] items-center gap-3 text-sm"
                >
                  <Link
                    to={`../runs/${run.key}`}
                    relative="path"
                    className={cn(linkCls, "font-mono text-xs")}
                  >
                    {run.key}
                  </Link>
                  <ProgressBar counts={run.counts} />
                  <span className="text-right text-xs text-muted-foreground tabular-nums">
                    {countTotal(run.counts)} cases
                  </span>
                </li>
              ))}
            </ul>
          }
          table={
            <DataTable
              head={[
                "Run",
                "Passed",
                "Failed",
                "Blocked",
                "Skipped",
                "Untested",
              ]}
              numeric={[1, 2, 3, 4, 5]}
              rows={newestFirst.map((run) => [
                <span key="k" className="font-mono text-xs">
                  {run.key}
                </span>,
                run.counts.passed,
                run.counts.failed,
                run.counts.blocked,
                run.counts.skipped,
                run.counts.untested,
              ])}
            />
          }
          onCsv={csv("results by run", {
            columns: [
              "Run",
              "Name",
              "State",
              ...Object.values(RUN_CASE_STATUS_LABELS),
            ],
            rows: newestFirst.map((run) => [
              run.key,
              run.name,
              run.state,
              ...(
                Object.keys(RUN_CASE_STATUS_LABELS) as (keyof RunCounts)[]
              ).map((s) => run.counts[s]),
            ]),
          })}
        >
          <StatusLegend />
        </ChartCard>

        <ChartCard
          id="aging"
          title="How long open defects have been open"
          description={
            <>
              Days since confirmed or last reopened
              {r.oldestOpen && (
                <>
                  {" "}
                  · oldest:{" "}
                  <Link
                    to={`../defects/${r.oldestOpen.key}`}
                    relative="path"
                    className={linkCls}
                  >
                    {r.oldestOpen.key}
                  </Link>
                  , {r.oldestOpen.ageDays} days
                </>
              )}
            </>
          }
          chart={
            <BarList
              label="open defects"
              items={r.aging.map((a) => ({ label: a.label, value: a.count }))}
            />
          }
          table={
            <DataTable
              head={["Open for", "Defects"]}
              numeric={[1]}
              rows={r.aging.map((a) => [a.label, a.count])}
            />
          }
          onCsv={csv("defect age", {
            columns: ["Open for", "Defects"],
            rows: r.aging.map((a) => [a.label, a.count]),
          })}
        />

        <ChartCard
          id="flow"
          title="Defects found and closed, per week"
          description={
            <>
              Weeks start Monday ·{" "}
              <strong className="text-foreground">
                {netOpenText(r.kpis.netOpenThisWeek)}
              </strong>
            </>
          }
          chart={
            <FlowChart
              weeks={r.weekly.map((w) => ({ ...w, label: weekLabel(w.week) }))}
            />
          }
          table={
            <DataTable
              head={["Week of", "Found", "Closed or rejected", "Net"]}
              numeric={[1, 2, 3]}
              rows={r.weekly.map((w) => [
                weekLabel(w.week),
                w.found,
                w.closed,
                signed(w.found - w.closed),
              ])}
            />
          }
          onCsv={csv("found and closed per week", {
            columns: ["Week of", "Found", "Closed or rejected", "Net"],
            rows: r.weekly.map((w) => [
              w.week,
              w.found,
              w.closed,
              w.found - w.closed,
            ]),
          })}
        >
          <FlowLegend />
        </ChartCard>
      </div>

      <ChartCard
        id="coverage"
        title="Coverage by suite"
        description="Ready cases with a result in these runs, each case counted once · least tested first"
        onCsv={csv("coverage by suite", {
          columns: ["Suite", "Ready", "Tested", "Pass rate", "Open defects"],
          rows: r.coverage.map((c) => [
            c.depth ? `  ${c.suite}` : c.suite,
            c.ready,
            c.tested,
            c.passRate === null ? null : Math.round(c.passRate * 1000) / 10,
            c.openDefects,
          ]),
        })}
      >
        {r.coverage.length === 0 ? (
          <p className="text-sm text-muted-foreground">No Ready cases yet.</p>
        ) : (
          <>
            <DataTable
              head={["Suite", "Ready", "Tested", "Pass rate", "Open defects"]}
              numeric={[1, 3, 4]}
              rows={r.coverage.map((c) => [
                <span
                  key="s"
                  className={cn(c.depth && "pl-5 text-muted-foreground")}
                >
                  {c.suite}
                </span>,
                c.ready,
                <span key="t" className="flex min-w-40 items-center gap-2.5">
                  <span
                    aria-hidden
                    className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border ring-inset"
                  >
                    <span
                      className="block h-full bg-chart-bar"
                      style={{
                        width: `${c.ready ? (c.tested / c.ready) * 100 : 0}%`,
                      }}
                    />
                  </span>
                  <span className="tabular-nums">
                    {c.tested} ·{" "}
                    {c.ready ? formatPercent(c.tested / c.ready) : "—"}
                  </span>
                </span>,
                pct(c.passRate),
                c.openDefects,
              ])}
            />
            <p className="text-xs text-muted-foreground">
              Each row counts only its own cases; sub-suites are listed under
              their parent.
            </p>
          </>
        )}
      </ChartCard>

      {r.workload && (
        <ChartCard
          id="workload"
          title="Workload"
          description="Untested cases assigned per person in open runs · for balancing work, not ranking · QA Leads only"
        >
          {r.workload.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing untested in open runs.
            </p>
          ) : (
            <BarList
              label="untested cases"
              items={r.workload.map((w) => ({
                label: w.person?.name ?? "Unassigned",
                value: w.untested,
                to: undefined,
              }))}
            />
          )}
        </ChartCard>
      )}
    </>
  )
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n))

export function netOpenText(net: number) {
  if (net === 0) return "No change in open defects this week"
  return `${signed(net)} open this week, the open pile is ${net > 0 ? "growing" : "shrinking"}`
}

export function readinessTitle(checks: ExitCheck[]) {
  const failing = checks.filter((c) => c.ok === false).length
  const unknown = checks.filter((c) => c.ok === null).length
  if (failing)
    return `Not ready to ship: ${failing} of ${checks.length} checks fail`
  if (unknown) return "Not enough results yet to judge every check"
  return "Ready to ship: all checks pass"
}

function CheckMark({ ok }: { ok: boolean | null }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-full",
        ok === false && "bg-foreground text-background",
        ok === true && "bg-muted text-foreground",
        ok === null && "border border-dashed border-input text-muted-foreground"
      )}
    >
      {ok === false ? (
        <XIcon className="size-3" strokeWidth={3} />
      ) : ok ? (
        <CheckIcon className="size-3" strokeWidth={3} />
      ) : (
        <CircleHelpIcon className="size-3" />
      )}
    </span>
  )
}

function Readiness({
  checks,
  defectsUrl,
}: {
  checks: ExitCheck[]
  defectsUrl: (q?: string) => string
}) {
  const link: Partial<Record<ExitCheck["id"], { to: string; label: string }>> =
    {
      critical: { to: defectsUrl("severity=critical"), label: "See them" },
      major: { to: defectsUrl("severity=major"), label: "See them" },
      coverage: { to: "#h-untested", label: "See untested" },
      passRate: { to: "#h-failing", label: "See failing" },
      blocked: { to: "#h-failing", label: "See blocked" },
      retest: { to: defectsUrl("status=fixed"), label: "See them" },
    }
  return (
    <Card role="region" aria-labelledby="h-ready">
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="h-ready" className="text-lg font-semibold">
            {readinessTitle(checks)}
          </h2>
          <span className="text-xs text-muted-foreground">
            Exit checks (the same for every project)
          </span>
        </div>
        <ul className="divide-y">
          {checks.map((c) => {
            const l = c.ok === false ? link[c.id] : undefined
            return (
              <li
                key={c.id}
                className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-start gap-3 py-2.5 text-sm"
              >
                <CheckMark ok={c.ok} />
                <span>
                  <strong className="font-medium">{c.label}</strong>{" "}
                  <span className="sr-only">
                    {c.ok === false
                      ? "fails"
                      : c.ok
                        ? "passes"
                        : "can't be judged yet"}
                  </span>
                  <br />
                  <span className="text-muted-foreground">{c.detail}</span>
                </span>
                {l &&
                  (l.to.startsWith("#") ? (
                    <a href={l.to} className={cn(linkCls, "whitespace-nowrap")}>
                      {l.label}
                    </a>
                  ) : (
                    <Link
                      to={l.to}
                      relative="path"
                      className={cn(linkCls, "whitespace-nowrap")}
                    >
                      {l.label}
                    </Link>
                  ))}
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}

function Tile({
  label,
  value,
  delta,
  help,
  to,
}: {
  label: string
  value: string
  delta?: ReactNode
  help: string
  to?: string
}) {
  const body = (
    <>
      <span className="text-xs font-semibold text-muted-foreground">
        {label}
      </span>
      <span className="text-3xl leading-tight font-semibold tabular-nums">
        {value}
      </span>
      {delta && <span className="text-sm">{delta}</span>}
      <span className="text-xs text-muted-foreground">{help}</span>
    </>
  )
  const cls =
    "flex flex-col gap-1 rounded-xl bg-card px-4 py-3.5 ring-1 ring-foreground/10"
  if (!to) return <div className={cls}>{body}</div>
  return to.startsWith("#") ? (
    <a href={to} className={cn(cls, "hover:ring-primary")}>
      {body}
    </a>
  ) : (
    <Link to={to} relative="path" className={cn(cls, "hover:ring-primary")}>
      {body}
    </Link>
  )
}

function Kpis({
  report: r,
  defectsUrl,
}: {
  report: Report
  defectsUrl: (q?: string) => string
}) {
  const k = r.kpis
  const points =
    k.passRate !== null && k.passRatePrevious !== null
      ? Math.round((k.passRate - k.passRatePrevious) * 100)
      : null
  const escapesDelta =
    k.productionEscapesPrevious === null
      ? null
      : k.productionEscapes - k.productionEscapesPrevious
  const ttf = k.timeToFix
  return (
    <section
      aria-label="Key numbers"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
    >
      <Tile
        label="Pass rate"
        value={pct(k.passRate)}
        delta={
          points !== null
            ? `${points > 0 ? "▲" : points < 0 ? "▼" : "="} ${Math.abs(points)} points vs ${r.previousRelease}`
            : undefined
        }
        help="latest result per case, counted once"
        to="#h-failing"
      />
      <Tile
        label="Tested"
        value={k.readyCases ? formatPercent(k.testedReady / k.readyCases) : "—"}
        delta={`${k.testedReady} of ${k.readyCases} Ready cases`}
        help="each case counted once"
        to="#h-untested"
      />
      <Tile
        label="Open defects"
        value={String(k.openDefects)}
        delta={`${k.openCritical} Critical · ${k.openMajor} Major`}
        help={
          r.release
            ? `found in ${r.release.name}, not closed or rejected`
            : "found with no release, not closed or rejected"
        }
        to={defectsUrl()}
      />
      <Tile
        label="Escaped to production"
        value={String(k.productionEscapes)}
        delta={
          escapesDelta !== null
            ? `${escapesDelta > 0 ? "▲" : escapesDelta < 0 ? "▼" : "="} ${Math.abs(escapesDelta)} vs ${r.previousRelease}`
            : undefined
        }
        help="defects of this release first seen in production"
      />
      <Tile
        label="Time to fix"
        value={ttf.medianDays === null ? "—" : `${ttf.medianDays} d`}
        delta={
          ttf.count
            ? `90% within ${ttf.p90Days} d · ${ttf.count} fixed`
            : "Nothing fixed yet"
        }
        help="Open → Fixed, median"
      />
      <Tile
        label="Net open this week"
        value={signed(k.netOpenThisWeek)}
        delta={`${k.foundThisWeek} found · ${k.closedThisWeek} closed`}
        help={
          k.netOpenThisWeek === 0
            ? "the open pile is steady"
            : `the open pile is ${k.netOpenThisWeek > 0 ? "growing" : "shrinking"}`
        }
        to="#h-flow"
      />
    </section>
  )
}

function DefectTable({
  rows,
  showFoundIn = false,
}: {
  rows: ReportDefectRow[]
  showFoundIn?: boolean
}) {
  return (
    <DataTable
      head={[
        "ID",
        "Defect",
        "Severity",
        ...(showFoundIn ? ["Found in"] : ["Priority"]),
        "Status",
        "Open for",
        "Assignee",
      ]}
      numeric={[5]}
      rows={rows.map((d) => [
        <Link
          key="k"
          to={`../defects/${d.key}`}
          relative="path"
          className={cn(linkCls, "font-mono text-xs whitespace-nowrap")}
        >
          {d.key}
        </Link>,
        <span key="t" className="block min-w-48">
          {d.title}
        </span>,
        <SeverityIndicator key="s" severity={d.severity} />,
        showFoundIn
          ? (d.foundIn ?? "—")
          : d.priority
            ? DEFECT_PRIORITY_LABELS[d.priority]
            : "—",
        <DefectStatusBadge key="st" status={d.status} />,
        <span key="a" className="whitespace-nowrap">
          {d.ageDays} d
        </span>,
        d.assignee?.name ?? (
          <span key="u" className="text-muted-foreground">
            Unassigned
          </span>
        ),
      ])}
    />
  )
}
