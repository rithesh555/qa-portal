import {
  DEFECT_STATUS_LABELS,
  type DefectRef,
  type RunCase,
  type RunCaseDetail,
  type TestRun,
} from "@qa/shared"
import { CircleAlertIcon } from "lucide-react"
import { useRef, useState } from "react"
import { Link, useNavigate } from "react-router"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { projectPath } from "@/app/nav"
import { useProjectContext } from "@/features/projects/project-layout"
import { errorMessage } from "@/lib/api"
import { useKnownDefects, useLogDefect } from "./api"
import {
  DefectFormFields,
  type DefectDraft,
  draftErrors,
  emptyDraft,
} from "./defect-form-fields"

/** The draft a failed or blocked result suggests: the case's steps up to where it failed, and the tester's note. */
export function draftFromResult(
  run: TestRun,
  detail: RunCaseDetail
): DefectDraft {
  const last = detail.results[0]
  const upTo = last?.failedStep ?? detail.steps.length
  const steps = detail.steps.slice(0, upTo)
  const note = last?.note.trim() ?? ""
  const firstLine = note.split("\n")[0]!.slice(0, 160)
  return emptyDraft({
    title: firstLine
      ? `${detail.title}: ${firstLine}`.slice(0, 200)
      : detail.title,
    steps: [
      ...(detail.preconditions ? [`Given: ${detail.preconditions}`] : []),
      ...steps.map((s, i) => `${i + 1}. ${s.action}`),
    ].join("\n"),
    expected: steps.at(-1)?.expected ?? "",
    actual: note,
    environment: run.environment,
  })
}

/** What linking to a known defect would do, and whether this person may. */
function linkAction(d: DefectRef, lead: boolean) {
  if (d.status === "fixed")
    return {
      label: `This fails again: reopen ${d.key}`,
      reopen: true,
      ok: true,
    }
  if (d.status === "closed" || d.status === "rejected")
    return lead
      ? { label: `Reopen ${d.key}`, reopen: true, ok: true }
      : {
          label: `${d.key} is ${DEFECT_STATUS_LABELS[d.status]}: log a new defect instead`,
          reopen: false,
          ok: false,
        }
  return { label: `Link this result to ${d.key}`, reopen: false, ok: true }
}

function LogForm({
  run,
  item,
  detail,
  preselect,
  onDone,
}: {
  run: TestRun
  item: RunCase
  detail: RunCaseDetail
  preselect?: string
  onDone: () => void
}) {
  const { project, allowed } = useProjectContext()
  const known = useKnownDefects(project.key, item.id)
  const log = useLogDefect(project.key)
  const lead = allowed("defects:triage")
  const [target, setTarget] = useState<string>(preselect ?? "new")
  const [draft, setDraft] = useState<DefectDraft>(() =>
    draftFromResult(run, detail)
  )
  const [note, setNote] = useState("")
  const [tried, setTried] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const refs = (known.data ?? []).filter((d) => linkAction(d, lead).ok)
  const picked = refs.find((d) => d.id === target)
  const action = picked ? linkAction(picked, lead) : null
  const errors = tried && !picked ? draftErrors(draft) : {}
  const noteMissing = tried && action?.reopen && !note.trim()
  const result = detail.results[0]
  const navigate = useNavigate()
  const formRef = useRef<HTMLFormElement>(null)
  // After the errors render, take the person to the first one.
  const focusFirstInvalid = () =>
    requestAnimationFrame(() =>
      formRef.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus()
    )

  async function submit() {
    setTried(true)
    if (
      picked
        ? action!.reopen && !note.trim()
        : Object.keys(draftErrors(draft)).length > 0
    ) {
      focusFirstInvalid()
      return
    }
    setError(null)
    try {
      const defect = await log.mutateAsync({
        runCaseId: item.id,
        defect: picked
          ? {
              mode: "link",
              defectId: picked.id,
              note: note.trim(),
              reopen: action!.reopen,
              version: picked.version,
            }
          : { mode: "new", ...draft, severity: draft.severity! },
      })
      const id = toast.add({
        title: picked
          ? action!.reopen
            ? `${defect.key} reopened`
            : `Linked to ${defect.key}`
          : `${defect.key} logged as New`,
        description: picked || lead ? undefined : "A QA Lead will triage it.",
        actionProps: {
          children: "Open",
          onClick: () => {
            toast.close(id)
            void navigate(projectPath(project.key, `defects/${defect.key}`))
          },
        },
      })
      onDone()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <form
      ref={formRef}
      noValidate
      className="flex min-h-0 flex-col"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <DialogHeader className="border-b pb-4">
        <DialogTitle>Log a defect for this result</DialogTitle>
        <DialogDescription>
          From{" "}
          <span className="font-mono">
            {run.key} › {item.caseKey}
          </span>
          ,{" "}
          {result?.status === "blocked"
            ? "blocked"
            : result?.failedStep
              ? `failed at step ${result.failedStep}`
              : "failed"}
          . The result is linked to the defect either way.
        </DialogDescription>
      </DialogHeader>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain py-4">
        {error && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {refs.length > 0 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Already reported? Defects on this case and similar ones
            </legend>
            {refs.map((d) => (
              <div
                key={d.id}
                className="flex items-start gap-3 rounded-lg border p-3 has-checked:border-primary has-checked:bg-accent"
              >
                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                  <input
                    type="radio"
                    name="log-target"
                    className="mt-1"
                    checked={target === d.id}
                    onChange={() => setTarget(d.id)}
                  />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="me-2 font-mono text-xs text-muted-foreground">
                      {d.key}
                    </span>
                    <span className="font-medium">{d.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {DEFECT_STATUS_LABELS[d.status]} ·{" "}
                      {d.onCase ? "on this case" : "similar title"}
                      {d.assignee ? ` · ${d.assignee.name}` : ""}
                    </span>
                    <span className="block font-medium">
                      {linkAction(d, lead).label}
                    </span>
                  </span>
                </label>
                <Link
                  to={projectPath(project.key, `defects/${d.key}`)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm whitespace-nowrap text-primary underline-offset-4 hover:underline"
                >
                  View<span className="sr-only"> {d.key} in a new tab</span>
                </Link>
              </div>
            ))}
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-checked:border-primary has-checked:bg-accent">
              <input
                type="radio"
                name="log-target"
                className="mt-1"
                checked={!picked}
                onChange={() => setTarget("new")}
              />
              <span className="text-sm">
                <span className="font-semibold">Log a new defect</span>
                <span className="block text-xs text-muted-foreground">
                  Prefilled from the case and your note; change anything.
                </span>
              </span>
            </label>
          </fieldset>
        )}
        {picked ? (
          <Field data-invalid={Boolean(noteMissing)}>
            <FieldLabel htmlFor="log-note">
              {action!.reopen
                ? "What still fails? (required to reopen)"
                : "Note for the defect (optional)"}
            </FieldLabel>
            <Textarea
              id="log-note"
              rows={3}
              maxLength={4000}
              value={note}
              aria-invalid={Boolean(noteMissing)}
              onChange={(e) => setNote(e.target.value)}
            />
            {noteMissing && (
              <FieldError
                errors={[{ message: "Say what still fails before reopening" }]}
              />
            )}
          </Field>
        ) : (
          <DefectFormFields
            draft={draft}
            onChange={setDraft}
            errors={errors}
            autoFocusTitle={refs.length === 0}
            stepsNote={`Copied from the case${result?.failedStep ? ` up to step ${result.failedStep}` : ""}, as run (version ${detail.revision}).`}
            foundIn={`Found in ${run.release ? `release ${run.release.name} · ` : ""}${run.key}`}
            environmentNote={
              run.environment
                ? `From the run (“${run.environment}”): keep the one you saw it on.`
                : undefined
            }
          />
        )}
      </div>
      <DialogFooter className="border-t pt-4">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={log.isPending}>
          {log.isPending && <Spinner data-icon="inline-start" />}
          {log.isPending
            ? "Saving…"
            : picked
              ? action!.reopen
                ? `Reopen ${picked.key}`
                : `Link to ${picked.key}`
              : "Log defect"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function LogDefectDialog({
  open,
  onOpenChange,
  ...props
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  run: TestRun
  item: RunCase
  detail: RunCaseDetail
  preselect?: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col sm:max-w-3xl">
        {open && <LogForm {...props} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}
