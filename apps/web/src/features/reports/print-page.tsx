import {
  formatPercent,
  type Report,
  RUN_CASE_STATUS_LABELS,
  SEVERITY_LABELS,
  DEFECT_STATUS_LABELS,
} from "@qa/shared"
import { ArrowLeftIcon, PrinterIcon } from "lucide-react"
import { useEffect } from "react"
import { Link, useParams, useSearchParams } from "react-router"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useSession } from "@/features/auth/session"
import { useProject } from "@/features/projects/api"
import { formatDay } from "@/features/projects/release-status"
import { errorMessage } from "@/lib/api"
import { exactTime } from "@/lib/time"
import { useReport } from "./api"
import { netOpenText, readinessTitle } from "./reports-page"

const pct = (v: number | null) => (v === null ? "—" : formatPercent(v))

/**
 * Coverage rows as on screen, in the same order: each suite counts only its
 * own cases, so sub-suites are printed too, named under their parent, and
 * the Ready column adds up to the release's Ready cases (F12).
 */
export function printCoverageRows(coverage: Report["coverage"]): string[][] {
  let parent = ""
  return coverage.map((c) => {
    if (c.depth === 0) parent = c.suite
    return [
      c.depth === 0 ? c.suite : `${parent} › ${c.suite}`,
      String(c.ready),
      `${c.tested} · ${c.ready ? formatPercent(c.tested / c.ready) : "—"}`,
      pct(c.passRate),
      String(c.openDefects),
    ]
  })
}

/**
 * One A4 page for sign-off meetings and email: the verdict, exit checks, key
 * numbers and the tables that matter. Printed in black and white, saved as
 * PDF from the browser's print dialog.
 */
export function PrintReportPage() {
  const { key = "" } = useParams()
  const [params] = useSearchParams()
  const release = params.get("release") ?? "none"
  const live = params.get("live") === "true"
  const project = useProject(key)
  const report = useReport(key, release, live)
  const me = useSession().data
  const r = report.data
  const p = project.data

  useEffect(() => {
    if (!r || !p) return
    const before = document.title
    document.title = `Release report — ${p.name} ${r.release?.name ?? "no release"}`
    // Leaving the print view gives the tab its usual title back.
    return () => {
      document.title = before
    }
  }, [r, p])

  const back = `/projects/${key}/reports?release=${release}${live ? "&live=true" : ""}`

  if (report.isError || project.isError) {
    return (
      <main className="mx-auto flex max-w-xl flex-col gap-4 p-8">
        <h1 className="text-xl font-semibold">Couldn&apos;t load the report</h1>
        <p role="alert" className="text-destructive">
          {errorMessage(report.error ?? project.error)}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              void report.refetch()
              void project.refetch()
            }}
          >
            Try again
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to={back} />}
          >
            Back to reports
          </Button>
        </div>
      </main>
    )
  }
  if (!r || !p) {
    return (
      <main className="grid min-h-svh place-items-center" aria-busy="true">
        <Spinner />
        <span className="sr-only">Loading the report…</span>
      </main>
    )
  }

  const k = r.kpis
  const failing = r.checks.filter((c) => c.ok === false).length
  const points =
    k.passRate !== null && k.passRatePrevious !== null
      ? Math.round((k.passRate - k.passRatePrevious) * 100)
      : null
  const noDefect = r.failing.filter((f) => !f.defect)
  const coverageRows = printCoverageRows(r.coverage)
  const lead = p.leads.map((l) => l.name).join(", ")

  return (
    <div className="min-h-svh bg-muted/40 py-6 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-2 px-4 print:hidden">
        <Button
          variant="ghost"
          nativeButton={false}
          render={<Link to={back} />}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Back to reports
        </Button>
        <Button onClick={() => window.print()}>
          <PrinterIcon data-icon="inline-start" />
          Print or save as PDF
        </Button>
      </div>
      <main className="print-page mx-auto flex max-w-[210mm] flex-col gap-4 bg-white p-[14mm] text-[12px] leading-snug text-[#1d232c] shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-4 border-b-2 border-[#1d232c] pb-3">
          <div>
            <div className="text-[10px] font-semibold tracking-wide text-[#5a6270] uppercase">
              Release report
            </div>
            <h1 className="mt-0.5 text-[22px] font-semibold">
              {p.name} ·{" "}
              {r.release ? `Release ${r.release.name}` : "No release"}
            </h1>
            <div className="text-[#5a6270]">
              {[
                r.release?.targetDate
                  ? `Target ${formatDay(r.release.targetDate)}`
                  : null,
                lead ? `QA Lead: ${lead}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
          <div className="text-right text-[#5a6270]">
            <div>
              {r.snapshot
                ? "Snapshot taken when released"
                : "Live numbers as of"}
            </div>
            <div className="font-semibold text-[#1d232c]">
              {exactTime.format(new Date(r.asOf))}
            </div>
            {me && <div>Printed by {me.name}</div>}
          </div>
        </header>

        <section aria-labelledby="p-ready">
          <div className="flex items-baseline justify-between">
            <h2 id="p-ready" className="mb-1.5 text-[15px] font-semibold">
              {readinessTitle(r.checks)}
            </h2>
            <span className="text-[10px] font-semibold tracking-wide text-[#5a6270] uppercase">
              Exit checks
            </span>
          </div>
          {r.checks.map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-start gap-2 border-b border-[#e1e4e9] py-1.5"
            >
              <span
                aria-hidden
                className={
                  c.ok === false
                    ? "grid size-4 place-items-center rounded-full bg-[#1d232c] text-[10px] font-bold text-white"
                    : "grid size-4 place-items-center rounded-full border border-[#1d232c] text-[10px] font-bold"
                }
              >
                {c.ok === false ? "✕" : c.ok ? "✓" : "?"}
              </span>
              <span>
                <strong>{c.label}</strong> — {c.detail}
              </span>
              <span>
                {c.ok === false ? "Fails" : c.ok ? "Passes" : "Not yet"}
              </span>
            </div>
          ))}
          <span className="sr-only">
            {failing} of {r.checks.length} checks fail.
          </span>
        </section>

        <section aria-label="Key numbers" className="grid grid-cols-3 gap-2">
          {[
            {
              label: "Pass rate",
              n: pct(k.passRate),
              sub:
                points !== null
                  ? `${points > 0 ? "▲" : points < 0 ? "▼" : "="} ${Math.abs(points)} points vs ${r.previousRelease}`
                  : "latest result per case",
            },
            {
              label: "Tested",
              n: k.readyCases
                ? formatPercent(k.testedReady / k.readyCases)
                : "—",
              sub: `${k.testedReady} of ${k.readyCases} Ready cases`,
            },
            {
              label: "Open defects",
              n: String(k.openDefects),
              sub: `${k.openCritical} Critical · ${k.openMajor} Major`,
            },
            {
              label: "Escaped to production",
              n: String(k.productionEscapes),
              sub:
                k.productionEscapesPrevious !== null
                  ? `${k.productionEscapesPrevious} in ${r.previousRelease}`
                  : "first seen in production",
            },
            {
              label: "Time to fix",
              n:
                k.timeToFix.medianDays === null
                  ? "—"
                  : `${k.timeToFix.medianDays} d`,
              sub: k.timeToFix.count
                ? `median · 90% within ${k.timeToFix.p90Days} d · ${k.timeToFix.count} fixed`
                : "nothing fixed yet",
            },
            {
              label: "Net open this week",
              n:
                k.netOpenThisWeek > 0
                  ? `+${k.netOpenThisWeek}`
                  : String(k.netOpenThisWeek),
              sub: `${k.foundThisWeek} found · ${k.closedThisWeek} closed`,
            },
          ].map((t) => (
            <div
              key={t.label}
              className="rounded-md border border-[#c9ced6] px-2.5 py-2"
            >
              <div className="text-[10px] font-semibold tracking-wide text-[#5a6270] uppercase">
                {t.label}
              </div>
              <div className="text-[20px] leading-tight font-semibold">
                {t.n}
              </div>
              <div className="text-[#5a6270]">{t.sub}</div>
            </div>
          ))}
        </section>

        <PrintTable
          title="Blocking defects"
          empty="No open Critical or Major defects."
          head={["ID", "Defect", "Severity", "Status", "Open for", "Assignee"]}
          numeric={[4]}
          rows={r.blocking
            .slice(0, 8)
            .map((d) => [
              d.key,
              d.title,
              SEVERITY_LABELS[d.severity],
              DEFECT_STATUS_LABELS[d.status],
              `${d.ageDays} d`,
              d.assignee?.name ?? "Unassigned",
            ])}
          more={r.blocking.length - 8}
        />

        <PrintTable
          title="Coverage by suite"
          empty="No Ready cases yet."
          head={["Suite", "Ready", "Tested", "Pass rate", "Open defects"]}
          numeric={[1, 2, 3, 4]}
          rows={coverageRows.slice(0, 8)}
          more={coverageRows.length - 8}
        />

        <PrintTable
          title="Failing cases without a defect"
          empty="Every failing case has a defect."
          rows={noDefect
            .slice(0, 5)
            .map((f) => [
              f.caseKey,
              f.title,
              `${RUN_CASE_STATUS_LABELS[f.status]}${f.failedStep ? ` at step ${f.failedStep}` : ""} · ${f.runKey}`,
            ])}
          more={noDefect.length - 5}
        />

        <footer className="mt-auto flex justify-between gap-4 border-t border-[#c9ced6] pt-2 text-[#5a6270]">
          <span>
            Pass rate and coverage use each Ready case&apos;s latest result in
            these runs, counted once. {netOpenText(k.netOpenThisWeek)}.
          </span>
          <span className="whitespace-nowrap">QA Portal · page 1 of 1</span>
        </footer>
      </main>
    </div>
  )
}

function PrintTable({
  title,
  head,
  rows,
  numeric = [],
  empty,
  more,
}: {
  title: string
  head?: string[]
  rows: string[][]
  numeric?: number[]
  empty: string
  more: number
}) {
  const align = (i: number) =>
    numeric.includes(i) ? "text-right" : "text-left"
  return (
    <section>
      <h2 className="mb-1.5 text-[13px] font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-[#5a6270]">{empty}</p>
      ) : (
        <table className="w-full border-collapse">
          {head && (
            <thead>
              <tr>
                {head.map((h, i) => (
                  <th
                    key={h}
                    scope="col"
                    className={`border-b border-[#1d232c] px-1.5 py-1 text-[10px] font-semibold text-[#5a6270] ${align(i)}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                {r.map((c, i) => (
                  <td
                    key={i}
                    className={`border-b border-[#c9ced6] px-1.5 py-1 align-top tabular-nums ${align(i)} ${i === 0 ? "font-mono text-[11px] whitespace-nowrap" : ""}`}
                  >
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {more > 0 && (
        <p className="mt-1 text-[#5a6270]">…and {more} more in the portal.</p>
      )}
    </section>
  )
}
