import {
  completion,
  countTotal,
  formatPercent,
  passRate,
  RESULT_STATUSES,
  RUN_CASE_STATUS_LABELS,
  type RunCase,
  type TestRun,
} from "@qa/shared"
import {
  ChevronDownIcon,
  CircleAlertIcon,
  KeyboardIcon,
  ListIcon,
  LockIcon,
  PartyPopperIcon,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Link, Navigate, useBlocker, useParams } from "react-router"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { projectPath } from "@/app/nav"
import { useSession } from "@/features/auth/session"
import { useProjectContext } from "@/features/projects/project-layout"
import { ApiError, errorMessage } from "@/lib/api"
import { exactTime } from "@/lib/time"
import {
  useCloseRun,
  useRecordResult,
  useRemoveCases,
  useReopenRun,
  useRun,
  useRunCases,
} from "./api"
import { type NoteDraft, type Recorded, RunCasePane } from "./run-case-pane"
import {
  CASE_FILTERS,
  type CaseFilter,
  matchesFilter,
  matchesSearch,
  RunCaseList,
} from "./run-case-list"
import {
  AddCasesDialog,
  AssignDialog,
  BulkResultDialog,
  EditRunDialog,
  ShortcutsDialog,
} from "./run-dialogs"
import { ProgressBar, RunCaseStatusIcon } from "./run-status"
import { useShortcutsSetting } from "./use-run-shortcuts"
import { PageLoading } from "@/components/page-loading"
import { useLatestSearchParams } from "@/hooks/use-latest-search-params"

const ADVANCE_KEY = "qa.run-advance"

function useAdvanceSetting() {
  const [on, setOn] = useState(() => {
    try {
      return localStorage.getItem(ADVANCE_KEY) !== "off"
    } catch {
      return true
    }
  })
  const set = useCallback((value: boolean) => {
    setOn(value)
    try {
      localStorage.setItem(ADVANCE_KEY, value ? "on" : "off")
    } catch {
      // Applies to this page only.
    }
  }, [])
  return [on, set] as const
}

type Dialog =
  "edit" | "add" | "bulk" | "assign" | "remove" | "help" | "close" | null

function RunHeader({
  run,
  canManage,
  canCopy,
  mayClose,
  closeBlocked,
  canReopen,
  onDialog,
  reopening,
  onReopen,
}: {
  run: TestRun
  canManage: boolean
  canCopy: boolean
  mayClose: boolean
  closeBlocked: boolean
  canReopen: boolean
  onDialog: (d: Dialog) => void
  reopening: boolean
  onReopen: () => void
}) {
  const { project } = useProjectContext()
  const failedOrBlocked = run.counts.failed + run.counts.blocked
  const meta = [
    run.key,
    run.release ? `Release ${run.release.name}` : null,
    `started ${exactTime.format(new Date(run.createdAt))} by ${run.createdBy.name}`,
  ].filter(Boolean)
  const newRunLink = (only: string) =>
    projectPath(
      project.key,
      `runs/new?from=${encodeURIComponent(run.key)}&only=${only}`
    )

  return (
    <div className="flex flex-col gap-2">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              render={<Link to={projectPath(project.key, "runs")} />}
            >
              Test runs
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{run.key}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs text-muted-foreground">{meta.join(" · ")}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{run.name}</h1>
          <p className="text-sm text-muted-foreground">
            Environment: {run.environment || "not set"}
          </p>
          {run.description && (
            <p className="max-w-3xl text-sm whitespace-pre-wrap">
              {run.description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            onClick={() => onDialog("help")}
            aria-keyshortcuts="?"
            className="hidden sm:inline-flex"
          >
            <KeyboardIcon data-icon="inline-start" />
            Shortcuts
          </Button>
          {(canManage || canCopy) && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" />}>
                Run actions
                <ChevronDownIcon data-icon="inline-end" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {canManage && run.state === "open" && (
                  <>
                    <DropdownMenuItem onClick={() => onDialog("edit")}>
                      Edit details and environment…
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDialog("add")}>
                      Add cases…
                    </DropdownMenuItem>
                  </>
                )}
                {canCopy && (
                  <>
                    <DropdownMenuItem render={<Link to={newRunLink("all")} />}>
                      Duplicate run…
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={failedOrBlocked === 0}
                      render={<Link to={newRunLink("failedOrBlocked")} />}
                    >
                      New run from failed and blocked ({failedOrBlocked})…
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {run.state === "open" && mayClose && (
            <Button
              onClick={() => onDialog("close")}
              disabled={closeBlocked}
              aria-describedby={closeBlocked ? "close-why" : undefined}
            >
              Close run
            </Button>
          )}
          {run.state === "closed" && canReopen && (
            <Button variant="outline" disabled={reopening} onClick={onReopen}>
              {reopening && <Spinner data-icon="inline-start" />}
              Reopen run
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function RunStats({ run }: { run: TestRun }) {
  const total = countTotal(run.counts)
  const tested = total - run.counts.untested
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-4">
      <ProgressBar counts={run.counts} className="h-3.5" />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
        <span className="font-semibold">
          {formatPercent(completion(run.counts))} complete ({tested} of {total})
        </span>
        <span className="font-semibold">
          {formatPercent(passRate(run.counts))} pass rate
        </span>
        {RESULT_STATUSES.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <RunCaseStatusIcon status={s} decorative />
            {run.counts[s]} {RUN_CASE_STATUS_LABELS[s].toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  )
}

export function RunPage() {
  const { ref = "" } = useParams()
  const { project, allowed } = useProjectContext()
  const me = useSession().data!.id
  const runQuery = useRun(project.key, ref)
  const casesQuery = useRunCases(project.key, ref)
  const [params, setParams] = useLatestSearchParams()
  const [q, setQ] = useState("")
  const [selecting, setSelecting] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [dialog, setDialog] = useState<Dialog>(null)
  const [dialogKey, setDialogKey] = useState(0)
  const [listOpen, setListOpen] = useState(false)
  const [last, setLast] = useState<Recorded | null>(null)
  const [announce, setAnnounce] = useState("")
  const [shortcutsOn, setShortcutsOn] = useShortcutsSetting()
  const [advance, setAdvance] = useAdvanceSetting()
  const record = useRecordResult(project.key, ref)
  const close = useCloseRun(project.key, ref)
  const reopen = useReopenRun(project.key, ref)
  const remove = useRemoveCases(project.key, ref)
  // Failed/Blocked notes typed but not saved, by run case. They survive moving
  // between cases, and leaving the run with one asks first.
  const [drafts, setDrafts] = useState<Record<string, NoteDraft>>({})
  const setDraft = useCallback(
    (id: string, draft: NoteDraft | null) =>
      setDrafts((d) => {
        if (draft) return { ...d, [id]: draft }
        if (!(id in d)) return d
        return Object.fromEntries(Object.entries(d).filter(([k]) => k !== id))
      }),
    []
  )
  const unsaved = Object.values(drafts).filter((d) => d.note.trim()).length
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      unsaved > 0 && currentLocation.pathname !== nextLocation.pathname
  )
  useEffect(() => {
    if (unsaved === 0) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [unsaved])

  const showParam = params.get("show")
  const filter: CaseFilter = (CASE_FILTERS as readonly string[]).includes(
    showParam ?? ""
  )
    ? (showParam as CaseFilter)
    : "all"
  const all = casesQuery.data ?? []
  const shown = all.filter(
    (c) => matchesFilter(c, filter, me) && matchesSearch(c, q)
  )
  const requested = params.get("case")
  const current: RunCase | undefined =
    all.find((c) => c.id === requested) ??
    shown.find((c) => c.status === "untested") ??
    shown[0] ??
    all[0]
  const index = current ? shown.findIndex((c) => c.id === current.id) : -1
  const currentId = current?.id
  const onDraftChange = useCallback(
    (draft: NoteDraft | null) => currentId && setDraft(currentId, draft),
    [currentId, setDraft]
  )

  // Focus follows the case only once someone moves; not on first load.
  const [focusCase, setFocusCase] = useState(false)
  const open = useCallback(
    (id: string) => {
      setFocusCase(true)
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set("case", id)
          return next
        },
        { replace: true }
      )
    },
    [setParams]
  )

  function setFilter(f: CaseFilter) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (f === "all") next.delete("show")
        else next.set("show", f)
        return next
      },
      { replace: true }
    )
  }

  if (runQuery.isError) {
    const notFound =
      runQuery.error instanceof ApiError && runQuery.error.status === 404
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>
          {notFound ? "Run not found" : "Couldn't load this run"}
        </AlertTitle>
        <AlertDescription>
          {notFound
            ? `There's no run ${ref} in ${project.name}.`
            : errorMessage(runQuery.error)}{" "}
          <Link
            to={projectPath(project.key, "runs")}
            className="underline underline-offset-4"
          >
            Back to test runs
          </Link>
        </AlertDescription>
      </Alert>
    )
  }
  if (!runQuery.data)
    return (
      <PageLoading label="Loading the run…">
        <Skeleton className="h-96 rounded-xl" />
      </PageLoading>
    )
  const run = runQuery.data
  // /runs/12 and /runs/pay-r-12 work, but the caches are keyed on PAY-R-12.
  if (ref !== run.key)
    return (
      <Navigate
        replace
        to={{
          pathname: projectPath(project.key, `runs/${run.key}`),
          search: params.toString(),
        }}
      />
    )

  const isLead = allowed("runs:reopen")
  const involved =
    run.createdBy.id === me || run.assignees.some((a) => a.id === me)
  const canExecute = allowed("runs:execute")
  const canRecord = canExecute && run.state === "open"
  const canManage = canExecute && (isLead || run.createdBy.id === me)
  const mayClose = allowed("runs:close") && (isLead || involved)
  const untested = run.counts.untested
  const closeBlocked = !isLead && untested > 0
  const failedOrBlocked = run.counts.failed + run.counts.blocked
  const total = countTotal(run.counts)
  const closeWhy =
    run.state !== "open" || !mayClose || untested === 0
      ? ""
      : isLead
        ? `${untested} ${untested === 1 ? "case is" : "cases are"} untested. You can still close the run; they stay untested.`
        : `You can close this run once every case has a result (${untested} left).`

  function openDialog(d: Dialog) {
    setDialogKey((k) => k + 1)
    setDialog(d)
  }

  function onRecorded(r: Recorded) {
    setLast(r)
    let message = `${r.item.caseKey} marked ${RUN_CASE_STATUS_LABELS[r.status]}`
    if (advance && !r.hold) {
      // The next untested case in the list being shown, wrapping round.
      const from = shown.findIndex((c) => c.id === r.item.id)
      const order =
        from >= 0 ? [...shown.slice(from + 1), ...shown.slice(0, from)] : shown
      const next = order.find(
        (c) => c.status === "untested" && c.id !== r.item.id
      )
      if (next) {
        open(next.id)
        message += `. Now on ${next.caseKey}, ${next.title}`
      } else {
        open(r.item.id)
      }
    } else {
      // Pin the case: without it, "first untested shown" would move on.
      open(r.item.id)
    }
    setAnnounce(message)
  }

  async function undo() {
    if (!last || !canRecord || record.isPending) return
    try {
      await record.mutateAsync({
        id: last.item.id,
        status: last.previous.status,
        note: last.previous.note,
        failedStep: last.previous.failedStep,
        expectedVersion: last.version,
      })
      open(last.item.id)
      setAnnounce(
        `Undone. ${last.item.caseKey} is ${RUN_CASE_STATUS_LABELS[last.previous.status]} again.`
      )
      setLast(null)
    } catch (err) {
      toast.add({
        type: "error",
        title: "Couldn't undo",
        description: errorMessage(err),
      })
      setLast(null)
    }
  }

  async function doClose() {
    try {
      await close.mutateAsync()
      setDialog(null)
      toast.add({ title: `${run.key} closed` })
    } catch (err) {
      toast.add({
        type: "error",
        title: "Couldn't close the run",
        description: errorMessage(err),
      })
    }
  }

  async function doReopen() {
    try {
      await reopen.mutateAsync()
      toast.add({ title: `${run.key} reopened` })
    } catch (err) {
      toast.add({
        type: "error",
        title: "Couldn't reopen the run",
        description: errorMessage(err),
      })
    }
  }

  async function doRemove() {
    try {
      const { removed, kept } = await remove.mutateAsync([...picked])
      setDialog(null)
      setPicked(new Set())
      setSelecting(false)
      toast.add({
        title: `${removed} ${removed === 1 ? "case" : "cases"} removed`,
        description: kept
          ? `${kept} with results ${kept === 1 ? "stays" : "stay"} in the run.`
          : undefined,
      })
    } catch (err) {
      toast.add({
        type: "error",
        title: "Couldn't remove cases",
        description: errorMessage(err),
      })
    }
  }

  function endSelecting() {
    setSelecting(false)
    setPicked(new Set())
  }

  const list = (
    <RunCaseList
      all={all}
      shown={shown}
      me={me}
      filter={filter}
      onFilter={setFilter}
      q={q}
      onSearch={setQ}
      currentId={current?.id ?? null}
      onOpen={(id) => {
        open(id)
        setListOpen(false)
      }}
      selecting={selecting}
      picked={picked}
      onTogglePick={(id) =>
        setPicked((prev) => {
          const next = new Set(prev)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return next
        })
      }
      onToggleGroup={(ids, on) =>
        setPicked((prev) => {
          const next = new Set(prev)
          for (const id of ids) {
            if (on) next.add(id)
            else next.delete(id)
          }
          return next
        })
      }
    />
  )

  const listTools = canRecord && (
    <div className="flex flex-wrap items-center gap-2 border-b p-3">
      <Button
        size="sm"
        variant={selecting ? "secondary" : "outline"}
        aria-pressed={selecting}
        onClick={() => (selecting ? endSelecting() : setSelecting(true))}
      >
        Select
      </Button>
      {selecting && (
        <>
          <span className="text-sm text-muted-foreground" aria-live="polite">
            {picked.size} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={picked.size === 0}
            onClick={() => openDialog("bulk")}
          >
            Set result…
          </Button>
          {canManage && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={picked.size === 0}
                onClick={() => openDialog("assign")}
              >
                Assign to…
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={picked.size === 0}
                onClick={() => openDialog("remove")}
              >
                Remove…
              </Button>
            </>
          )}
        </>
      )}
    </div>
  )

  return (
    <div className="flex flex-col gap-4 pb-4">
      <RunHeader
        run={run}
        canManage={canManage}
        canCopy={canExecute && !project.archived}
        mayClose={mayClose}
        closeBlocked={closeBlocked}
        canReopen={isLead}
        onDialog={openDialog}
        reopening={reopen.isPending}
        onReopen={() => void doReopen()}
      />
      <RunStats run={run} />
      {closeWhy && (
        <p id="close-why" className="text-sm text-muted-foreground">
          {closeWhy}
        </p>
      )}
      {run.state === "closed" && (
        <Alert>
          <LockIcon />
          <AlertTitle>
            Closed
            {run.closedBy ? ` by ${run.closedBy.name}` : ""}
            {run.closedAt
              ? ` on ${exactTime.format(new Date(run.closedAt))}`
              : ""}
          </AlertTitle>
          <AlertDescription>
            Results are read-only
            {isLead ? "." : "; a QA Lead can reopen it."}
          </AlertDescription>
        </Alert>
      )}
      {project.myRole === "viewer" && run.state === "open" && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          You&apos;re a Viewer in this project, so you can follow the run but
          not record results.
        </p>
      )}
      {run.state === "open" && total > 0 && untested === 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-status-pass/50 bg-status-pass/10 p-4">
          <PartyPopperIcon
            aria-hidden
            className="size-5 text-status-pass-ink"
          />
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-semibold">Every case has a result.</span>{" "}
            {failedOrBlocked > 0
              ? `${failedOrBlocked} failed or blocked: review them before closing.`
              : "Nothing failed or was blocked."}
          </p>
          {failedOrBlocked > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFilter("failed")}
            >
              Review failed and blocked
            </Button>
          )}
          {mayClose && (
            <Button size="sm" onClick={() => openDialog("close")}>
              Close run
            </Button>
          )}
        </div>
      )}

      {casesQuery.isError ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Couldn&apos;t load the cases in this run</AlertTitle>
          <AlertDescription>
            {errorMessage(casesQuery.error)}{" "}
            <Button
              variant="link"
              className="h-auto p-0"
              onClick={() => void casesQuery.refetch()}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : !casesQuery.data ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : all.length === 0 ? (
        <Alert>
          <AlertTitle>This run has no cases</AlertTitle>
          <AlertDescription>
            {canManage && run.state === "open"
              ? "Add cases from Run actions."
              : "Its cases were removed."}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="flex items-start gap-4">
          <a
            href="#run-case-title"
            className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:ring-2 focus:ring-ring"
          >
            Skip to the current case
          </a>
          <aside
            aria-label="Cases in this run"
            className="sticky top-4 hidden h-[calc(100dvh-2rem)] w-80 shrink-0 flex-col overflow-hidden rounded-xl border bg-card lg:flex"
          >
            {listTools}
            {list}
          </aside>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 lg:hidden">
              <Button variant="outline" onClick={() => setListOpen(true)}>
                <ListIcon data-icon="inline-start" />
                Cases ({untested} left)
              </Button>
            </div>
            {current && (
              <RunCasePane
                key={current.id}
                run={run}
                item={current}
                position={
                  index >= 0
                    ? `${index + 1} of ${shown.length}`
                    : "not in the list shown"
                }
                canRecord={canRecord}
                shortcutsOn={shortcutsOn && dialog === null && !listOpen}
                onPrevious={index > 0 ? () => open(shown[index - 1]!.id) : null}
                onNext={
                  index + 1 < shown.length
                    ? () => open(shown[index + 1]!.id)
                    : null
                }
                onRecorded={onRecorded}
                onUndo={() => void undo()}
                onHelp={() => openDialog("help")}
                advance={advance}
                autoFocus={focusCase}
                draft={drafts[current.id]}
                onDraftChange={onDraftChange}
              />
            )}
            {canRecord && (
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={advance}
                    onCheckedChange={(on) => setAdvance(on)}
                  />
                  Go to the next untested case after saving
                </label>
                {last && (
                  <p className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5">
                    <RunCaseStatusIcon status={last.status} />
                    {last.item.caseKey} marked{" "}
                    {RUN_CASE_STATUS_LABELS[last.status]}
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={record.isPending}
                      onClick={() => void undo()}
                      aria-keyshortcuts={shortcutsOn ? "U" : undefined}
                    >
                      Undo{shortcutsOn ? " (U)" : ""}
                    </Button>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <p aria-live="polite" className="sr-only">
        {announce}
      </p>

      <Sheet open={listOpen} onOpenChange={setListOpen}>
        <SheetContent side="left" className="w-[min(22rem,100vw)] gap-0 p-0">
          <SheetHeader className="border-b">
            <SheetTitle>Cases · {untested} left</SheetTitle>
            <SheetDescription className="sr-only">
              Choose a case to work on.
            </SheetDescription>
          </SheetHeader>
          {listTools}
          {list}
        </SheetContent>
      </Sheet>

      <ShortcutsDialog
        open={dialog === "help"}
        onOpenChange={(o) => setDialog(o ? "help" : null)}
        enabled={shortcutsOn}
        onEnabledChange={setShortcutsOn}
        canRecord={canRecord}
      />
      {canManage && (
        <>
          <EditRunDialog
            run={run}
            open={dialog === "edit"}
            onOpenChange={(o) => setDialog(o ? "edit" : null)}
          />
          <AddCasesDialog
            run={run}
            open={dialog === "add"}
            onOpenChange={(o) => setDialog(o ? "add" : null)}
          />
          <AssignDialog
            key={`assign-${dialogKey}`}
            run={run}
            ids={[...picked]}
            open={dialog === "assign"}
            onOpenChange={(o) => setDialog(o ? "assign" : null)}
            onDone={() => {
              setDialog(null)
              endSelecting()
            }}
          />
        </>
      )}
      <BulkResultDialog
        key={`bulk-${dialogKey}`}
        run={run}
        ids={[...picked]}
        open={dialog === "bulk"}
        onOpenChange={(o) => setDialog(o ? "bulk" : null)}
        onDone={() => {
          setDialog(null)
          endSelecting()
        }}
      />
      <AlertDialog
        open={blocker.state === "blocked"}
        onOpenChange={(open) => !open && blocker.reset?.()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription>
              {unsaved === 1
                ? "A result note you typed hasn't been saved and will be lost."
                : `${unsaved} result notes you typed haven't been saved and will be lost.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => blocker.proceed?.()}
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={dialog === "remove"}
        onOpenChange={(o) => setDialog(o ? "remove" : null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {picked.size} {picked.size === 1 ? "case" : "cases"} from{" "}
              {run.key}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Only cases without results are removed; cases with results stay so
              their history is kept. The test cases themselves don&apos;t
              change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => void doRemove()}
            >
              {remove.isPending && <Spinner data-icon="inline-start" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={dialog === "close"}
        onOpenChange={(o) => setDialog(o ? "close" : null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close {run.key}?</AlertDialogTitle>
            <AlertDialogDescription>
              {untested === 0
                ? "Every case has a result. The run is complete."
                : `${untested} ${untested === 1 ? "case has" : "cases have"} no result. They stay untested and show as untested in reports.`}{" "}
              A closed run is read-only. Only a QA Lead can reopen it. Closing
              and reopening are recorded in the project&apos;s activity.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={close.isPending}
              onClick={() => void doClose()}
            >
              {close.isPending && <Spinner data-icon="inline-start" />}
              Close run
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
