import {
  DEFECT_STATUS_LABELS,
  type Defect,
  type DefectStatus,
  nextStatuses,
  RESOLUTION_LABELS,
  RESOLUTIONS,
  type Resolution,
  type Transition,
} from "@qa/shared"
import { CircleAlertIcon } from "lucide-react"
import { type KeyboardEvent, useRef, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { useReleases } from "@/features/projects/api"
import { useProjectContext } from "@/features/projects/project-layout"
import { errorMessage } from "@/lib/api"
import { useDefects, useTransition } from "./api"

const NONE = "__none__"

/** Button wording per move; the form asks for what the move needs. */
const ACTION_LABEL: Record<string, string> = {
  "new>open": "Confirm (Open)",
  "new>rejected": "Reject…",
  "open>in_progress": "Start work",
  "open>rejected": "Reject…",
  "in_progress>fixed": "Mark fixed…",
  "fixed>closed": "Verified, close…",
  "fixed>reopened": "Still failing, reopen…",
  "reopened>in_progress": "Start work",
  "closed>reopened": "Reopen…",
  "rejected>reopened": "Reopen…",
}

const FORM_TITLE: Partial<Record<DefectStatus, string>> = {
  rejected: "Reject this defect",
  fixed: "Mark as fixed",
  closed: "Close as verified",
  reopened: "Reopen this defect",
}

/** Picks the defect this one duplicates, from a search of the project's defects. */
function DuplicatePicker({
  self,
  value,
  onChange,
  invalid,
  searchRef,
}: {
  self: string
  value: string | null
  onChange: (id: string | null) => void
  invalid: boolean
  searchRef: React.RefObject<HTMLInputElement | null>
}) {
  const { project } = useProjectContext()
  const [q, setQ] = useState("")
  const active = useDefects(project.key, {
    state: "active",
    q: q || undefined,
    pageSize: 8,
  })
  const done = useDefects(project.key, {
    state: "done",
    q: q || undefined,
    pageSize: 8,
  })
  const items = [...(active.data?.items ?? []), ...(done.data?.items ?? [])]
    // The original must stand: not this defect, and not a rejected one.
    .filter((d) => d.id !== self && d.status !== "rejected")
    .slice(0, 10)
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">Duplicate of</legend>
      <Input
        ref={searchRef}
        aria-label="Search the original defect by ID or title"
        aria-describedby={invalid ? "duplicate-error" : undefined}
        placeholder="Search by ID or title"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-invalid={invalid}
      />
      <ul className="max-h-48 overflow-y-auto rounded-lg border">
        {items.map((d) => (
          <li key={d.id}>
            <label className="flex cursor-pointer items-start gap-2 px-3 py-2 text-sm hover:bg-muted">
              <input
                type="radio"
                name="duplicate-of"
                className="mt-1"
                checked={value === d.id}
                onChange={() => onChange(d.id)}
              />
              <span className="min-w-0">
                <span className="me-2 font-mono text-xs text-muted-foreground">
                  {d.key}
                </span>
                {d.title}
                <span className="block text-xs text-muted-foreground">
                  {DEFECT_STATUS_LABELS[d.status]}
                </span>
              </span>
            </label>
          </li>
        ))}
        {items.length === 0 && (
          <li className="px-3 py-3 text-sm text-muted-foreground">
            No other defects match.
          </li>
        )}
      </ul>
    </fieldset>
  )
}

function TransitionForm({
  defect,
  move,
  onDone,
}: {
  defect: Defect
  move: Transition
  onDone: (to: DefectStatus) => void
}) {
  const { project } = useProjectContext()
  const transition = useTransition(project.key, defect.key)
  const releases = useReleases(project.key)
  const [note, setNote] = useState("")
  const [resolution, setResolution] = useState<Resolution>("duplicate")
  const [duplicateOf, setDuplicateOf] = useState<string | null>(null)
  // The release in progress is the likeliest place a fix lands.
  const [fixedIn, setFixedIn] = useState<string | null>(
    project.currentRelease?.id ?? defect.foundInRelease?.id ?? null
  )
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [build, setBuild] = useState("")
  const [tried, setTried] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const noteMissing = move.needs === "note" && !note.trim()
  const dupMissing =
    move.needs === "resolution" && resolution === "duplicate" && !duplicateOf

  async function submit() {
    setTried(true)
    if (noteMissing || dupMissing) {
      // Take the person to what's missing.
      ;(dupMissing ? searchRef.current : noteRef.current)?.focus()
      return
    }
    setError(null)
    try {
      await transition.mutateAsync({
        to: move.to,
        note: note.trim(),
        version: defect.version,
        ...(move.needs === "resolution"
          ? {
              resolution,
              ...(resolution === "duplicate" && duplicateOf
                ? { duplicateOfId: duplicateOf }
                : {}),
            }
          : {}),
        ...(move.needs === "fixedIn"
          ? { fixedInReleaseId: fixedIn, fixedInBuild: build.trim() }
          : {}),
      })
      onDone(move.to)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const releaseItems = [
    ...(releases.data?.items ?? []).map((r) => ({
      value: r.id,
      label: r.name,
    })),
    { value: NONE, label: "No release" },
  ]

  return (
    <form
      noValidate
      className="flex flex-col gap-4 rounded-xl border border-primary bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === "Escape") onDone(defect.status)
      }}
    >
      <h2 className="text-base font-semibold">{FORM_TITLE[move.to]}</h2>
      {error && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <FieldGroup>
        {move.needs === "resolution" && (
          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="resolution">Reason</FieldLabel>
              <Select
                items={RESOLUTIONS.map((r) => ({
                  value: r,
                  label: RESOLUTION_LABELS[r],
                }))}
                value={resolution}
                onValueChange={(v) => setResolution(v as Resolution)}
              >
                <SelectTrigger id="resolution" className="w-full" autoFocus>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOLUTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {RESOLUTION_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {resolution === "duplicate" && (
              <Field data-invalid={tried && dupMissing}>
                <DuplicatePicker
                  searchRef={searchRef}
                  self={defect.id}
                  value={duplicateOf}
                  onChange={setDuplicateOf}
                  invalid={tried && dupMissing}
                />
                {tried && dupMissing && (
                  <FieldError
                    id="duplicate-error"
                    errors={[{ message: "Choose the original defect" }]}
                  />
                )}
              </Field>
            )}
          </div>
        )}
        {move.needs === "fixedIn" && (
          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="fixed-in">Fixed in release</FieldLabel>
              <Select
                items={releaseItems}
                value={fixedIn ?? NONE}
                onValueChange={(v) =>
                  setFixedIn(v === NONE ? null : (v as string))
                }
              >
                <SelectTrigger id="fixed-in" className="w-full" autoFocus>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {releaseItems.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="fixed-build">
                Fixed in build{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </FieldLabel>
              <Input
                id="fixed-build"
                placeholder="e.g. 4.2.0-rc2"
                value={build}
                onChange={(e) => setBuild(e.target.value)}
              />
            </Field>
          </div>
        )}
        <Field data-invalid={tried && noteMissing}>
          <FieldLabel htmlFor="transition-note">
            {move.needs === "note"
              ? "What still fails? (required)"
              : "Note (optional)"}
          </FieldLabel>
          {move.needs === "confirm" && (
            <p className="text-sm text-muted-foreground">
              Retested on the fixed build and it passes? Closing from the run
              screen (“Close as verified” on the passed case) also links that
              result as evidence.
            </p>
          )}
          <Textarea
            id="transition-note"
            ref={noteRef}
            rows={3}
            autoFocus={move.needs === "note" || move.needs === "confirm"}
            maxLength={4000}
            value={note}
            aria-invalid={tried && noteMissing}
            aria-describedby={tried && noteMissing ? "note-error" : undefined}
            onChange={(e) => setNote(e.target.value)}
          />
          {tried && noteMissing && (
            <FieldError
              id="note-error"
              errors={[{ message: "Say what still fails" }]}
            />
          )}
        </Field>
      </FieldGroup>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onDone(defect.status)}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={transition.isPending}>
          {transition.isPending && <Spinner data-icon="inline-start" />}
          {move.to === "rejected"
            ? "Reject defect"
            : move.to === "fixed"
              ? "Mark fixed, awaiting retest"
              : move.to === "closed"
                ? "Close defect"
                : "Reopen defect"}
        </Button>
      </div>
    </form>
  )
}

/** The next-step buttons for this person, and the form a step needs. */
export function DefectWorkflow({ defect }: { defect: Defect }) {
  const { project, allowed } = useProjectContext()
  const transition = useTransition(project.key, defect.key)
  const [open, setOpen] = useState<Transition | null>(null)
  const buttons = useRef<HTMLDivElement>(null)
  const [announce, setAnnounce] = useState("")
  const lead = allowed("defects:triage")
  const moves = nextStatuses(defect.status, { lead })
  const waiting =
    !lead && defect.status === "new"
      ? "Waiting for a QA Lead to confirm it and set a priority."
      : !lead && defect.status === "closed"
        ? "Failing again? Log a new defect and mention this one; a QA Lead can reopen it."
        : !lead && defect.status === "rejected"
          ? "A QA Lead can reopen it if the reason no longer holds."
          : null

  async function quickMove(move: Transition) {
    try {
      await transition.mutateAsync({
        to: move.to,
        note: "",
        version: defect.version,
      })
      setAnnounce(`Status changed to ${DEFECT_STATUS_LABELS[move.to]}`)
      // The clicked button is gone with the old status: keep focus here, on
      // the next move (or the group itself when there's none).
      requestAnimationFrame(() =>
        (
          buttons.current?.querySelector<HTMLElement>("button") ??
          buttons.current
        )?.focus()
      )
    } catch (err) {
      toast.add({
        type: "error",
        title: "Couldn't change the status",
        description: errorMessage(err),
      })
    }
  }

  if (!allowed("defects:edit")) return null
  return (
    <>
      <div className="flex flex-col items-end gap-1.5">
        <div
          ref={buttons}
          tabIndex={-1}
          role="group"
          aria-label="Move this defect on"
          className="flex flex-wrap justify-end gap-2"
        >
          {moves.map((m, i) => (
            <Button
              key={m.to}
              variant={
                i === 0 && m.to !== "rejected" && m.to !== "reopened"
                  ? "default"
                  : "outline"
              }
              className={m.to === "rejected" ? "text-destructive" : undefined}
              disabled={transition.isPending}
              onClick={() =>
                m.needs === "nothing" ? void quickMove(m) : setOpen(m)
              }
            >
              {ACTION_LABEL[`${defect.status}>${m.to}`]}
            </Button>
          ))}
        </div>
        {waiting && (
          <p className="max-w-sm text-right text-sm text-muted-foreground">
            {waiting}
          </p>
        )}
      </div>
      <p role="status" className="sr-only">
        {announce}
      </p>
      {open && (
        <div className="basis-full">
          <TransitionForm
            key={open.to}
            defect={defect}
            move={open}
            onDone={(to) => {
              setOpen(null)
              // Back to the step buttons, not the top of the page.
              requestAnimationFrame(() =>
                buttons.current?.querySelector("button")?.focus()
              )
              if (to !== defect.status)
                setAnnounce(`Status changed to ${DEFECT_STATUS_LABELS[to]}`)
            }}
          />
        </div>
      )}
    </>
  )
}
