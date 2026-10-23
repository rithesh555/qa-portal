import type { Home } from "@qa/shared"
import { FolderKanbanIcon } from "lucide-react"
import { Link } from "react-router"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSession } from "@/features/auth/session"
import {
  DefectStatusBadge,
  SeverityIndicator,
} from "@/features/defects/defect-badges"
import { describeActivity } from "@/features/projects/activity-text"
import { initials } from "@/features/runs/format"
import { ProgressBar } from "@/features/runs/run-status"
import { errorMessage } from "@/lib/api"
import { exactTime, timeAgo } from "@/lib/time"
import { useHome } from "./api"
import { ReleaseTable } from "./release-table"

const linkCls = "text-sm text-primary underline-offset-4 hover:underline"

const today = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
})

function greeting(now = new Date()) {
  const h = now.getHours()
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"
}

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`

export function HomePage() {
  const me = useSession().data
  const home = useHome()
  const h = home.data
  const firstName = me?.name.split(" ")[0] ?? ""

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting()}
          {firstName && `, ${firstName}`}
        </h1>
        <p className="text-sm text-muted-foreground">
          {today.format(new Date())}
          {h && h.hasProjects && ` · ${summary(h)}`}
        </p>
      </div>

      {home.isError ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            {errorMessage(home.error)}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void home.refetch()}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : !h ? (
        <div className="flex flex-col gap-6" aria-busy="true">
          <span className="sr-only">Loading your work…</span>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : !h.hasProjects ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderKanbanIcon />
            </EmptyMedia>
            <EmptyTitle>
              <h2>
                {me?.role === "admin"
                  ? "No projects yet"
                  : "You're not in any project yet"}
              </h2>
            </EmptyTitle>
            <EmptyDescription>
              {me?.role === "admin" ? (
                <>
                  Create the first one on the{" "}
                  <Link to="/projects" className="underline">
                    Projects
                  </Link>{" "}
                  page and give it a QA Lead. Its runs, defects and release
                  summaries will show up here.
                </>
              ) : (
                "Ask an admin or a project's QA Lead to add you. Your runs, defects and project summaries will show up here."
              )}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {hasWork(h) && <YourWork home={h} />}
          {hasWork(h) && (
            <div className="grid gap-6 xl:grid-cols-2">
              <MyRuns home={h} />
              <MyDefects home={h} />
            </div>
          )}
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Releases in your projects</h2>
              </CardTitle>
              <CardAction>
                <Link to="/releases" className={linkCls}>
                  See all releases
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent>
              {h.releases.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No release is planned or in progress in your projects.
                </p>
              ) : (
                <ReleaseTable releases={h.releases} />
              )}
            </CardContent>
          </Card>
          <Activity home={h} />
        </>
      )}
    </div>
  )
}

const leftCount = (h: Home) => h.runs.reduce((a, r) => a + r.mineLeft, 0)

function hasWork(h: Home) {
  return (
    h.runs.length > 0 ||
    h.assigned.length > 0 ||
    h.readyToRetest.length > 0 ||
    (h.toTriage?.length ?? 0) > 0 ||
    h.runsReadyToClose > 0
  )
}

function summary(h: Home) {
  if (!hasWork(h))
    return "Nothing is waiting for you. Here's how the releases in your projects are doing."
  const cases = leftCount(h)
  const defects = h.assigned.length
  const parts = [
    cases ? plural(cases, "case") : null,
    defects ? plural(defects, "defect") : null,
  ].filter(Boolean)
  if (!parts.length) return "Here's what needs a look."
  const one = parts.length === 1 && (cases || defects) === 1
  return `${parts.join(" and ")} ${one ? "is" : "are"} waiting for you.`
}

function WorkTile({
  label,
  value,
  note,
  href,
}: {
  label: string
  value: number
  note: string
  href: string
}) {
  return (
    <a
      href={href}
      className="flex flex-col gap-1 rounded-xl bg-card px-4 py-3.5 ring-1 ring-foreground/10 hover:ring-primary"
    >
      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span className="text-3xl leading-tight font-semibold tabular-nums">
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{note}</span>
    </a>
  )
}

function YourWork({ home: h }: { home: Home }) {
  const reopened = h.assigned.filter((d) => d.status === "reopened").length
  return (
    <section aria-labelledby="h-work" className="flex flex-col gap-3">
      <h2 id="h-work" className="sr-only">
        Your work
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <WorkTile
          label="Cases to test"
          value={leftCount(h)}
          note={`in ${plural(h.runs.length, "open run")}`}
          href="#h-runs"
        />
        <WorkTile
          label="My open defects"
          value={h.assigned.length}
          note={reopened ? `${reopened} reopened` : "assigned to me"}
          href="#h-defects"
        />
        <WorkTile
          label="Ready to retest"
          value={h.readyToRetest.length}
          note="defects you reported, now fixed"
          href="#h-defects"
        />
        {h.toTriage ? (
          <WorkTile
            label="Defects to triage"
            value={h.toTriage.length}
            note={`in ${h.triageProjects.join(", ")}, which you lead`}
            href="#h-defects"
          />
        ) : (
          <WorkTile
            label="Runs ready to close"
            value={h.runsReadyToClose}
            note="every case has a result"
            href="#h-runs"
          />
        )}
      </div>
    </section>
  )
}

function MyRuns({ home: h }: { home: Home }) {
  return (
    <Card role="region" aria-labelledby="h-runs">
      <CardHeader>
        <CardTitle>
          <h2 id="h-runs">Runs with cases for you</h2>
        </CardTitle>
        <CardAction>
          <span className="text-xs text-muted-foreground">
            Most of yours left first
          </span>
        </CardAction>
      </CardHeader>
      <CardContent>
        {h.runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No open run has untested cases assigned to you.
            {h.runsReadyToClose > 0 &&
              ` ${plural(h.runsReadyToClose, "run is", "runs are")} ready to close.`}
          </p>
        ) : (
          <ul className="divide-y">
            {h.runs.map((r) => (
              <li
                key={r.key}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3"
              >
                <span className="flex min-w-0 flex-1 basis-56 flex-col gap-1.5">
                  <span className="flex flex-col">
                    <span className="font-medium">{r.name}</span>
                    <span className="text-xs text-muted-foreground">
                      <span className="font-mono">{r.key}</span> ·{" "}
                      {r.projectName}
                      {r.environment && ` · ${r.environment}`}
                    </span>
                  </span>
                  <ProgressBar counts={r.counts} className="h-2" />
                  <span className="text-xs text-muted-foreground">
                    {r.mineLeft} of your {r.mine} cases left
                  </span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={
                    <Link
                      to={`/projects/${r.projectKey}/runs/${r.key}?show=mine`}
                    />
                  }
                >
                  Continue <span className="sr-only">{r.key}</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

type HomeDefect = Home["assigned"][number]

function DefectList({ items, empty }: { items: HomeDefect[]; empty: string }) {
  if (items.length === 0)
    return <p className="py-3 text-sm text-muted-foreground">{empty}</p>
  return (
    <ul className="divide-y">
      {items.map((d) => (
        <li
          key={d.key}
          className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5"
        >
          <Link
            to={`/projects/${d.projectKey}/defects/${d.key}`}
            className="flex min-w-0 flex-1 basis-56 flex-col underline-offset-4 hover:[&>span:last-child]:underline"
          >
            <span className="font-mono text-xs text-muted-foreground">
              {d.key}
            </span>
            <span className="font-medium break-words">{d.title}</span>
          </Link>
          <SeverityIndicator severity={d.severity} />
          <DefectStatusBadge status={d.status} />
        </li>
      ))}
    </ul>
  )
}

function MyDefects({ home: h }: { home: Home }) {
  const tabs = [
    {
      value: "mine",
      label: "Assigned to me",
      items: h.assigned,
      empty: "No defects are assigned to you.",
    },
    {
      value: "retest",
      label: "Ready to retest",
      items: h.readyToRetest,
      empty: "Nothing you reported is waiting for a retest.",
    },
    ...(h.toTriage
      ? [
          {
            value: "triage",
            label: "To triage",
            items: h.toTriage,
            empty: "Nothing to triage in the projects you lead.",
          },
        ]
      : []),
  ]
  return (
    <Card role="region" aria-labelledby="h-defects">
      <CardHeader>
        <CardTitle>
          <h2 id="h-defects">Defects</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="mine">
          <TabsList className="flex-wrap">
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label} ({t.items.length})
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((t) => (
            <TabsContent key={t.value} value={t.value}>
              <DefectList items={t.items} empty={t.empty} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}

function Activity({ home: h }: { home: Home }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Recent activity in your projects</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {h.activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          <ul className="divide-y">
            {h.activity.map((a) => (
              <li key={a.id} className="flex items-start gap-3 py-2.5 text-sm">
                <span
                  aria-hidden
                  className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold"
                >
                  {initials(a.actor.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{a.actor.name}</span>{" "}
                  {describeActivity(a)}{" "}
                  <span className="inline-flex items-center gap-1 align-middle text-muted-foreground">
                    ·{" "}
                    <Link
                      to={`/projects/${a.projectKey}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {a.projectName}
                    </Link>
                  </span>
                </span>
                <time
                  dateTime={a.createdAt}
                  title={exactTime.format(new Date(a.createdAt))}
                  className="whitespace-nowrap text-muted-foreground"
                >
                  {timeAgo(a.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
