import {
  CASE_PRIORITY_LABELS,
  needsNote,
  RESULT_STATUSES,
  RUN_CASE_STATUS_LABELS,
  type ResultStatus,
  type RunCase,
  type RunCaseDetail,
  type RunCaseStatus,
  type TestRun,
} from "@qa/shared"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  HistoryIcon,
} from "lucide-react"
import { type KeyboardEvent, useEffect, useRef, useState } from "react"
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
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useCase } from "@/features/cases/api"
import { LabelChip } from "@/features/cases/case-badges"
import { useProjectContext } from "@/features/projects/project-layout"
import { ApiError, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { exactTime } from "@/lib/time"
import { useRecordResult, useRefreshCase, useRunCase } from "./api"
import {
  RunCaseStatusBadge,
  RunCaseStatusIcon,
  STATUS_PRESSED,
} from "./run-status"
import { type ShortcutAction, useRunShortcuts } from "./use-run-shortcuts"

const RESULT_KEYS: Record<ResultStatus, string> = {
  passed: "P",
  failed: "F",
  blocked: "B",
  skipped: "S",
}

export interface Recorded {
  item: RunCase
  status: RunCaseStatus
  /** The result it replaced, to undo to. */
  previous: { status: RunCaseStatus; note: string; failedStep: number | null }
  /** The run case's version after this result. */
  version: number
}

const NO_STEP = "__none__"

function EarlierResults({ detail }: { detail: RunCaseDetail }) {
  if (detail.results.length === 0) return null
  return (
    <section aria-labelledby="earlier-results" className="flex flex-col gap-2">
      <h3
        id="earlier-results"
        className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
      >
        <HistoryIcon aria-hidden className="size-3.5" />
        Results in this run ({detail.results.length})
      </h3>
      <ol className="flex flex-col gap-2">
        {detail.results.map((r) => (
          <li key={r.id} className="flex gap-2 text-sm">
            <RunCaseStatusIcon status={r.status} className="mt-0.5" />
            <div className="min-w-0">
              <p>
                <span className="font-medium">
                  {RUN_CASE_STATUS_LABELS[r.status]}
                  {r.failedStep !== null && ` at step ${r.failedStep}`}
                </span>{" "}
                <span className="text-muted-foreground">
                  by {r.recordedBy.name} ·{" "}
                  {exactTime.format(new Date(r.recordedAt))} · version{" "}
                  {r.revision}
                </span>
              </p>
              {r.note && (
                <p className="break-words whitespace-pre-wrap text-muted-foreground">
                  “{r.note}”
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** The run's copy next to the case as it is now, changed fields only. */
function CompareDialog({
  detail,
  open,
  onOpenChange,
  onUseLatest,
  canUpdate,
}: {
  detail: RunCaseDetail
  open: boolean
  onOpenChange: (open: boolean) => void
  onUseLatest: () => void
  canUpdate: boolean
}) {
  const { project } = useProjectContext()
  const latest = useCase(project.key, open ? detail.caseKey : null)
  const rows: { field: string; before: string; after: string }[] = []
  if (latest.data) {
    const now = latest.data
    if (now.title !== detail.title)
      rows.push({ field: "Title", before: detail.title, after: now.title })
    if (now.preconditions !== detail.preconditions)
      rows.push({
        field: "Preconditions",
        before: detail.preconditions || "—",
        after: now.preconditions || "—",
      })
    const steps = Math.max(now.steps.length, detail.steps.length)
    const text = (s?: { action: string; expected: string }) =>
      s ? `${s.action}${s.expected ? ` → ${s.expected}` : ""}` : "—"
    for (let i = 0; i < steps; i++) {
      const a = detail.steps[i]
      const b = now.steps[i]
      if (a?.action !== b?.action || a?.expected !== b?.expected)
        rows.push({
          field: `Step ${i + 1}`,
          before: a ? text(a) : "—",
          after: b ? text(b) : "Removed",
        })
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {detail.caseKey}: version {detail.revision} →{" "}
            {detail.latestRevision}
          </DialogTitle>
          <DialogDescription>
            Only the fields that changed are listed.
          </DialogDescription>
        </DialogHeader>
        {latest.isPending ? (
          <Skeleton className="h-32" />
        ) : latest.isError ? (
          <p className="text-sm text-destructive">
            {errorMessage(latest.error)}
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            The title, preconditions and steps are the same; only details such
            as priority or labels changed.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pe-3 font-semibold">Field</th>
                  <th className="py-2 pe-3 font-semibold">
                    In this run (v{detail.revision})
                  </th>
                  <th className="py-2 font-semibold">
                    Latest (v{detail.latestRevision})
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.field} className="border-b align-top">
                    <th
                      scope="row"
                      className="py-2 pe-3 text-left font-medium whitespace-nowrap"
                    >
                      {r.field}
                    </th>
                    <td className="py-2 pe-3 whitespace-pre-wrap">
                      {r.before}
                    </td>
                    <td className="py-2 whitespace-pre-wrap">{r.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {canUpdate && (
            <Button onClick={onUseLatest}>Use the latest version…</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function RunCasePane({
  run,
  item,
  position,
  canRecord,
  shortcutsOn,
  onPrevious,
  onNext,
  onRecorded,
  onUndo,
  onHelp,
  advance,
  autoFocus,
}: {
  run: TestRun
  item: RunCase
  /** "3 of 140" within the list being shown. */
  position: string
  canRecord: boolean
  shortcutsOn: boolean
  onPrevious: (() => void) | null
  onNext: (() => void) | null
  onRecorded: (recorded: Recorded) => void
  onUndo: () => void
  onHelp: () => void
  /** Saving moves on to the next untested case. */
  advance: boolean
  /** Move focus to the case heading on arrival (after navigating or saving). */
  autoFocus: boolean
}) {
  const { project } = useProjectContext()
  const detailQuery = useRunCase(project.key, run.key, item.id)
  const record = useRecordResult(project.key, run.key)
  const refresh = useRefreshCase(project.key, run.key)
  const [pending, setPending] = useState<"failed" | "blocked" | null>(null)
  const [note, setNote] = useState("")
  const [failedStep, setFailedStep] = useState<number | null>(null)
  const [noteError, setNoteError] = useState(false)
  const [conflict, setConflict] = useState<{
    message: string
    retry: { status: ResultStatus; note: string; failedStep: number | null }
  } | null>(null)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<{
    message: string
    retry: () => void
  } | null>(null)
  const [comparing, setComparing] = useState(false)
  const [confirmLatest, setConfirmLatest] = useState(false)
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const detail = detailQuery.data

  useEffect(() => {
    if (pending) noteRef.current?.focus()
  }, [pending])

  // The pane is remounted per case; keep keyboard and screen reader users on it.
  useEffect(() => {
    if (autoFocus) headingRef.current?.focus()
  }, [autoFocus])

  async function save(
    status: ResultStatus,
    withNote = "",
    step: number | null = null,
    overwrite = false
  ) {
    if (!detail || record.isPending) return
    const last = detail.results[0]
    setConflict(null)
    setSaveError(null)
    try {
      const after = await record.mutateAsync({
        id: item.id,
        status,
        note: withNote,
        failedStep: step,
        expectedVersion: detail.version,
        overwrite,
      })
      setPending(null)
      setNote("")
      setFailedStep(null)
      onRecorded({
        item,
        status,
        previous: last
          ? {
              status: last.status,
              note: last.note,
              failedStep: last.failedStep,
            }
          : { status: "untested", note: "", failedStep: null },
        version: after.version,
      })
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setConflict({
          message: err.message,
          retry: { status, note: withNote, failedStep: step },
        })
        void detailQuery.refetch()
      } else {
        setSaveError({
          message: errorMessage(err),
          retry: () => void save(status, withNote, step, overwrite),
        })
      }
    }
  }

  function choose(status: ResultStatus) {
    if (!canRecord || record.isPending) return
    if (needsNote(status)) {
      setPending(status as "failed" | "blocked")
      setNoteError(false)
      return
    }
    void save(status)
  }

  function savePending() {
    if (!pending) return
    if (!note.trim()) {
      setNoteError(true)
      noteRef.current?.focus()
      return
    }
    void save(pending, note.trim(), failedStep)
  }

  function onNoteKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      savePending()
    } else if (event.key === "Escape" && !note.trim()) {
      // Only an empty note is dropped; a typed one is kept until Cancel.
      setPending(null)
      headingRef.current?.focus()
    }
  }

  useRunShortcuts(shortcutsOn, (action: ShortcutAction) => {
    if (action === "next") onNext?.()
    else if (action === "previous") onPrevious?.()
    else if (action === "undo") onUndo()
    else if (action === "help") onHelp()
    else choose(action)
  })

  async function applyLatest() {
    setConfirmLatest(false)
    setComparing(false)
    setRefreshError(null)
    try {
      await refresh.mutateAsync({ id: item.id, expectedVersion: item.version })
      headingRef.current?.focus()
    } catch (err) {
      setRefreshError(errorMessage(err))
    }
  }

  const changed =
    detail?.latestRevision != null && detail.latestRevision > detail.revision
  const shown: RunCaseStatus = pending ?? item.status
  const nextLabel = advance ? " and go to next untested" : ""

  return (
    <article
      aria-labelledby="run-case-title"
      className="flex min-w-0 flex-1 flex-col rounded-xl border bg-card"
    >
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-xs text-muted-foreground">
            {item.caseKey} · copied at version {detail?.revision ?? "…"} ·{" "}
            {position}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={!onPrevious}
              onClick={() => onPrevious?.()}
              aria-keyshortcuts={shortcutsOn ? "K" : undefined}
            >
              <ChevronLeftIcon data-icon="inline-start" />
              Previous
              {shortcutsOn && (
                <kbd
                  aria-hidden
                  className="ms-1 hidden text-xs text-muted-foreground sm:inline"
                >
                  K
                </kbd>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!onNext}
              onClick={() => onNext?.()}
              aria-keyshortcuts={shortcutsOn ? "J N" : undefined}
            >
              Next
              {shortcutsOn && (
                <kbd
                  aria-hidden
                  className="ms-1 hidden text-xs text-muted-foreground sm:inline"
                >
                  J
                </kbd>
              )}
              <ChevronRightIcon data-icon="inline-end" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <h2
            id="run-case-title"
            ref={headingRef}
            tabIndex={-1}
            className="text-xl font-semibold tracking-tight outline-none"
          >
            {item.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {[
              item.suitePath || "No suite",
              CASE_PRIORITY_LABELS[item.priority],
              item.assignee
                ? `assigned to ${item.assignee.name}`
                : "unassigned",
            ].join(" · ")}
          </p>
          {detail && detail.labels.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {detail.labels.map((l) => (
                <LabelChip key={l} label={l} />
              ))}
            </div>
          )}
        </div>

        {detailQuery.isError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Couldn&apos;t load this case</AlertTitle>
            <AlertDescription>
              {errorMessage(detailQuery.error)}{" "}
              <Button
                variant="link"
                className="h-auto p-0"
                onClick={() => void detailQuery.refetch()}
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {changed && (
          <Alert>
            <HistoryIcon />
            <AlertTitle>This case was edited after the run started</AlertTitle>
            <AlertDescription>
              <p>
                It&apos;s now at version {detail.latestRevision}; the run shows
                version {detail.revision}.
              </p>
              {refreshError && (
                <p className="mt-1 text-destructive">{refreshError}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setComparing(true)}
                >
                  Compare
                </Button>
                {canRecord && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={refresh.isPending}
                    onClick={() =>
                      item.status === "untested"
                        ? void applyLatest()
                        : setConfirmLatest(true)
                    }
                  >
                    {refresh.isPending && <Spinner data-icon="inline-start" />}
                    Use the latest version
                    {item.status === "untested" ? "" : "…"}
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
        {detail && detail.latestRevision === null && (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
            The original test case has been archived. The run keeps its copy.
          </p>
        )}

        {!detail ? (
          !detailQuery.isError && <Skeleton className="h-48" />
        ) : (
          <>
            {detail.preconditions && (
              <section aria-labelledby="run-case-pre">
                <h3
                  id="run-case-pre"
                  className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                >
                  Preconditions
                </h3>
                <p className="text-sm whitespace-pre-wrap">
                  {detail.preconditions}
                </p>
              </section>
            )}
            <section aria-labelledby="run-case-steps">
              <h3
                id="run-case-steps"
                className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                Steps
              </h3>
              <ol className="flex flex-col divide-y rounded-lg border">
                {detail.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 p-3 text-sm">
                    <span
                      aria-hidden
                      className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold"
                    >
                      {i + 1}
                    </span>
                    <div className="grid min-w-0 flex-1 gap-1 md:grid-cols-2 md:gap-4">
                      <p className="whitespace-pre-wrap">
                        <span className="sr-only">Step {i + 1}: </span>
                        {step.action}
                      </p>
                      <p className="whitespace-pre-wrap text-muted-foreground">
                        <span className="font-medium text-foreground">
                          Expected:{" "}
                        </span>
                        {step.expected || "—"}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
            <EarlierResults detail={detail} />
          </>
        )}
      </div>

      {/* The result bar stays in reach while the steps scroll. */}
      {/* Sticky while choosing; with the note open it scrolls, so it never covers the case on a phone. */}
      <div
        className={cn(
          "mt-auto flex flex-col gap-3 rounded-b-xl border-t bg-card/95 p-4 backdrop-blur sm:px-6",
          !pending && "sticky bottom-0"
        )}
      >
        {saveError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>
              <p>The result wasn&apos;t saved: {saveError.message}</p>
              <div className="mt-2">
                <Button size="sm" variant="outline" onClick={saveError.retry}>
                  Try again
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        {conflict && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>
              <p>{conflict.message}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void save(
                      conflict.retry.status,
                      conflict.retry.note,
                      conflict.retry.failedStep,
                      true
                    )
                  }
                >
                  Record mine anyway
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConflict(null)}
                >
                  Keep theirs
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Result:</span>
            <RunCaseStatusBadge status={item.status} />
          </div>
          {canRecord && (
            <div
              role="group"
              aria-label="Record a result"
              className="grid w-full grid-cols-4 gap-2 sm:w-auto"
            >
              {RESULT_STATUSES.map((status) => {
                const on = shown === status
                return (
                  <Button
                    key={status}
                    variant={on ? "default" : "outline"}
                    aria-pressed={on}
                    aria-keyshortcuts={
                      shortcutsOn ? RESULT_KEYS[status] : undefined
                    }
                    disabled={!detail || record.isPending}
                    onClick={() => choose(status)}
                    className={cn(
                      "h-10 gap-2 px-3",
                      on && STATUS_PRESSED[status]
                    )}
                  >
                    {RUN_CASE_STATUS_LABELS[status]}
                    {shortcutsOn && (
                      <kbd
                        aria-hidden
                        className={cn(
                          "hidden rounded border px-1 font-mono text-[0.7rem] sm:inline",
                          on ? "border-current/40" : "text-muted-foreground"
                        )}
                      >
                        {RESULT_KEYS[status]}
                      </kbd>
                    )}
                  </Button>
                )
              })}
            </div>
          )}
        </div>

        {pending && detail && (
          <form
            noValidate
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              savePending()
            }}
          >
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem]">
              <Field data-invalid={noteError}>
                <FieldLabel htmlFor="result-note">
                  What went wrong? (required)
                </FieldLabel>
                <Textarea
                  id="result-note"
                  ref={noteRef}
                  rows={2}
                  maxLength={4000}
                  value={note}
                  aria-invalid={noteError}
                  onKeyDown={onNoteKey}
                  onChange={(e) => {
                    setNote(e.target.value)
                    setNoteError(false)
                  }}
                />
                {noteError && (
                  <FieldError
                    errors={[{ message: "Say what went wrong before saving" }]}
                  />
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="result-step">
                  At step (optional)
                </FieldLabel>
                <Select
                  items={[
                    { value: NO_STEP, label: "—" },
                    ...detail.steps.map((_, i) => ({
                      value: String(i + 1),
                      label: `Step ${i + 1}`,
                    })),
                  ]}
                  value={failedStep === null ? NO_STEP : String(failedStep)}
                  onValueChange={(v) =>
                    setFailedStep(v === NO_STEP ? null : Number(v))
                  }
                >
                  <SelectTrigger id="result-step" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_STEP}>—</SelectItem>
                    {detail.steps.map((_, i) => (
                      <SelectItem key={i} value={String(i + 1)}>
                        Step {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPending(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={record.isPending}
                aria-keyshortcuts="Control+Enter"
              >
                {record.isPending && <Spinner data-icon="inline-start" />}
                Save {RUN_CASE_STATUS_LABELS[pending]}
                {nextLabel}
                <kbd
                  aria-hidden
                  className="ms-1 hidden font-mono text-[0.7rem] opacity-80 sm:inline"
                >
                  Ctrl+Enter
                </kbd>
              </Button>
            </div>
          </form>
        )}
      </div>

      {detail && changed && (
        <CompareDialog
          detail={detail}
          open={comparing}
          onOpenChange={setComparing}
          canUpdate={canRecord}
          onUseLatest={() =>
            item.status === "untested"
              ? void applyLatest()
              : (setComparing(false), setConfirmLatest(true))
          }
        />
      )}
      <AlertDialog open={confirmLatest} onOpenChange={setConfirmLatest}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Use version {detail?.latestRevision} of {item.caseKey}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This case already has a result (
              {RUN_CASE_STATUS_LABELS[item.status]}). Using the new version sets
              it back to untested; the earlier result stays in its history,
              marked with version {detail?.revision}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void applyLatest()}>
              Use version {detail?.latestRevision}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  )
}
