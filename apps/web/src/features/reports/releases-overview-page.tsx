import { DataError } from "@/components/composites/data-state"
import { PageHeader } from "@/components/composites/page-header"
import { FlagIcon } from "lucide-react"
import { useMemo } from "react"
import { SearchBox } from "@/components/search-box"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Empty,
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
import { Toggle } from "@/components/ui/toggle"
import { DownloadIcon } from "lucide-react"
import { useCan } from "@/hooks/use-can"
import { useReleasesOverview } from "./api"
import { downloadCsv } from "./csv"
import {
  daysUntil,
  ReleaseTable,
  verdictOf,
  verdictText,
} from "./release-table"
import { useLatestSearchParams } from "@/hooks/use-latest-search-params"

const WITHIN = [
  { value: "any", label: "Any target date" },
  { value: "7", label: "Next 7 days" },
  { value: "30", label: "Next 30 days" },
]

/** Not ready first (most failing checks), then no runs yet, then ready; soonest target first within each. */
const RANK = { no: 0, na: 1, yes: 2 } as const

export function ReleasesOverviewPage() {
  const isAdmin = useCan()("projects:manage")
  const overview = useReleasesOverview()
  const [params, setParams] = useLatestSearchParams()
  const q = params.get("q") ?? ""
  const notReady = params.get("notReady") === "true"
  const within = WITHIN.some((w) => w.value === params.get("within"))
    ? params.get("within")!
    : "any"
  const set = (key: string, value: string | undefined) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true }
    )

  const all = overview.data?.items
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (all ?? [])
      .filter(
        (r) =>
          !needle ||
          r.project.name.toLowerCase().includes(needle) ||
          r.project.key.toLowerCase().includes(needle) ||
          r.release.name.toLowerCase().includes(needle)
      )
      .filter((r) => !notReady || verdictOf(r) === "no")
      .filter((r) => {
        if (within === "any") return true
        if (!r.release.targetDate) return false
        return daysUntil(r.release.targetDate) <= Number(within)
      })
      .sort(
        (a, b) =>
          RANK[verdictOf(a)] - RANK[verdictOf(b)] ||
          b.failingChecks - a.failingChecks ||
          (a.release.targetDate ?? "9999").localeCompare(
            b.release.targetDate ?? "9999"
          ) ||
          a.project.name.localeCompare(b.project.name)
      )
  }, [all, q, notReady, within])

  const scope = isAdmin ? "every project" : "the projects you lead"
  const filtered = Boolean(q || notReady || within !== "any")

  function csv() {
    downloadCsv(`all-releases-${new Date().toISOString().slice(0, 10)}.csv`, {
      scope: `Active releases in ${scope}`,
      asOf: new Date().toISOString(),
      columns: [
        "Project",
        "Release",
        "Ready to ship?",
        "Failing checks",
        "Pass rate %",
        "Tested",
        "Ready cases",
        "Open Critical",
        "Open Major",
        "Target",
        "QA Lead",
      ],
      rows: rows.map((r) => [
        r.project.key,
        r.release.name,
        verdictText(r),
        r.failingChecks,
        r.passRate === null ? null : Math.round(r.passRate * 1000) / 10,
        r.testedReady,
        r.readyCases,
        r.openCritical,
        r.openMajor,
        r.release.targetDate,
        r.lead,
      ]),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="All releases"
        description={
          <>
            Active releases in {scope}, those needing attention first. Each
            project&apos;s numbers are counted on its own; nothing is averaged
            across projects.
          </>
        }
      />

      {overview.isError ? (
        <DataError
          title="Couldn't load releases"
          error={overview.error}
          onRetry={() => void overview.refetch()}
        />
      ) : !all ? (
        <Skeleton className="h-72" aria-busy="true" />
      ) : all.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FlagIcon />
            </EmptyMedia>
            <EmptyTitle>
              <h2>No active releases</h2>
            </EmptyTitle>
            <EmptyDescription>
              {isAdmin
                ? "No project has a release that's planned or in progress."
                : "This lists the releases of projects you lead as QA Lead. None of them has a release that's planned or in progress."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <SearchBox
              label="Search projects"
              value={q}
              onChange={(v) => set("q", v || undefined)}
            />
            <Toggle
              variant="outline"
              pressed={notReady}
              onPressedChange={(p) => set("notReady", p ? "true" : undefined)}
            >
              Not ready only
            </Toggle>
            <Select
              items={WITHIN}
              value={within}
              onValueChange={(v) =>
                set("within", v === "any" ? undefined : (v as string))
              }
            >
              <SelectTrigger aria-label="Target date" className="w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WITHIN.map((w) => (
                  <SelectItem key={w.value} value={w.value}>
                    {w.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="ml-auto"
              onClick={csv}
              disabled={rows.length === 0}
            >
              <DownloadIcon data-icon="inline-start" />
              CSV
            </Button>
          </div>
          <Card>
            <CardContent>
              {rows.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No release matches{filtered ? " these filters" : ""}.
                </p>
              ) : (
                <ReleaseTable releases={rows} showLead />
              )}
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">
            {rows.length} of {all.length} active releases shown.
          </p>
        </>
      )}
    </div>
  )
}
