import { zodResolver } from "@hookform/resolvers/zod"
import {
  needsNote,
  RESULT_STATUSES,
  RUN_CASE_STATUS_LABELS,
  type ResultStatus,
  type TestRun,
  type UpdateRunInput,
  updateRunSchema,
} from "@qa/shared"
import { CircleAlertIcon } from "lucide-react"
import { useId, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import type { z } from "zod"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
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
import {
  useAddCases,
  useAssign,
  useBulkResults,
  useRunPreview,
  useUpdateRun,
} from "./api"
import {
  CaseChoiceFields,
  type Choice,
  emptyChoice,
  toSelection,
} from "./case-choice"
import { useSuites } from "@/features/cases/api"
import { useAssignable } from "./run-people"

const NONE = "__none__"

type EditValues = z.input<typeof updateRunSchema>

function EditRunForm({ run, onDone }: { run: TestRun; onDone: () => void }) {
  const { project } = useProjectContext()
  const update = useUpdateRun(project.key, run.key)
  const releases = useReleases(project.key)
  const [formError, setFormError] = useState<string | null>(null)
  const ids = { name: useId(), env: useId(), release: useId(), desc: useId() }
  const form = useForm<EditValues, unknown, UpdateRunInput>({
    resolver: zodResolver(updateRunSchema),
    defaultValues: {
      name: run.name,
      description: run.description,
      environment: run.environment,
      releaseId: run.release?.id ?? null,
      version: run.version,
    },
  })
  const releaseItems = [
    ...(releases.data?.items ?? []).map((r) => ({
      value: r.id,
      label: r.name,
    })),
    { value: NONE, label: "No release" },
  ]

  async function onSubmit(values: UpdateRunInput) {
    setFormError(null)
    try {
      await update.mutateAsync(values)
      toast.add({ title: "Run details saved" })
      onDone()
    } catch (err) {
      setFormError(errorMessage(err))
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <DialogHeader>
        <DialogTitle>Edit {run.key}</DialogTitle>
        <DialogDescription>
          Results and the cases in the run stay as they are.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup className="py-4">
        {formError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={ids.name}>Name</FieldLabel>
              <Input
                {...field}
                id={ids.name}
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="releaseId"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor={ids.release}>Release</FieldLabel>
              <Select
                items={releaseItems}
                value={field.value ?? NONE}
                onValueChange={(v) =>
                  field.onChange(v === NONE ? null : (v as string))
                }
              >
                <SelectTrigger id={ids.release} className="w-full">
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
            </Field>
          )}
        />
        <Controller
          name="environment"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={ids.env}>Environment / build</FieldLabel>
              <Input
                {...field}
                id={ids.env}
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="description"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={ids.desc}>Description</FieldLabel>
              <Textarea
                {...field}
                id={ids.desc}
                rows={3}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
      <DialogFooter>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner data-icon="inline-start" />}
          Save changes
        </Button>
      </DialogFooter>
    </form>
  )
}

export function EditRunDialog({
  run,
  open,
  onOpenChange,
}: {
  run: TestRun
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        {open && <EditRunForm run={run} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

/** One result with a shared note on the selected cases. */
export function BulkResultDialog({
  run,
  ids,
  open,
  onOpenChange,
  onDone,
}: {
  run: TestRun
  ids: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: () => void
}) {
  const { project } = useProjectContext()
  const bulk = useBulkResults(project.key, run.key)
  const [status, setStatus] = useState<ResultStatus | null>(null)
  const [note, setNote] = useState("")
  const [tried, setTried] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const noteMissing = status !== null && needsNote(status) && !note.trim()
  const items = RESULT_STATUSES.map((s) => ({
    value: s,
    label: RUN_CASE_STATUS_LABELS[s],
  }))

  async function submit() {
    setTried(true)
    if (!status || noteMissing) return
    setError(null)
    try {
      const { recorded } = await bulk.mutateAsync({
        runCaseIds: ids,
        status,
        note: note.trim(),
      })
      toast.add({
        title: `${recorded} ${recorded === 1 ? "case" : "cases"} marked ${RUN_CASE_STATUS_LABELS[status]}`,
      })
      onDone()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Set a result on {ids.length} {ids.length === 1 ? "case" : "cases"}
          </DialogTitle>
          <DialogDescription>
            Each case gets its own result with this note. Earlier results stay
            in their history.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          {error && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Field data-invalid={tried && !status}>
            <FieldLabel htmlFor="bulk-status">Result</FieldLabel>
            <Select
              items={items}
              value={status}
              onValueChange={(v) => setStatus(v as ResultStatus)}
            >
              <SelectTrigger id="bulk-status" className="w-full">
                <SelectValue placeholder="Choose…" />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {tried && !status && (
              <FieldError errors={[{ message: "Choose a result" }]} />
            )}
          </Field>
          <Field data-invalid={tried && noteMissing}>
            <FieldLabel htmlFor="bulk-note">
              Note{" "}
              <span className="font-normal text-muted-foreground">
                (required for Failed and Blocked)
              </span>
            </FieldLabel>
            <Textarea
              id="bulk-note"
              rows={3}
              maxLength={4000}
              value={note}
              aria-invalid={tried && noteMissing}
              onChange={(e) => setNote(e.target.value)}
            />
            {tried && noteMissing && (
              <FieldError errors={[{ message: "Say what went wrong" }]} />
            )}
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={bulk.isPending} onClick={() => void submit()}>
            {bulk.isPending && <Spinner data-icon="inline-start" />}
            Save {ids.length} {ids.length === 1 ? "result" : "results"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AssignDialog({
  run,
  ids,
  open,
  onOpenChange,
  onDone,
}: {
  run: TestRun
  ids: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: () => void
}) {
  const { project } = useProjectContext()
  const assign = useAssign(project.key, run.key)
  const people = useAssignable(project.key) ?? []
  const [who, setWho] = useState<string>(NONE)
  const [error, setError] = useState<string | null>(null)
  const items = [
    { value: NONE, label: "Nobody (unassigned)" },
    ...people.map((p) => ({ value: p.userId, label: p.name })),
  ]

  async function submit() {
    setError(null)
    try {
      const { assigned } = await assign.mutateAsync({
        runCaseIds: ids,
        assigneeId: who === NONE ? null : who,
      })
      const name = people.find((p) => p.userId === who)?.name
      toast.add({
        title: name
          ? `${assigned} ${assigned === 1 ? "case" : "cases"} assigned to ${name}`
          : `${assigned} ${assigned === 1 ? "case" : "cases"} unassigned`,
      })
      onDone()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Assign {ids.length} {ids.length === 1 ? "case" : "cases"}
          </DialogTitle>
          <DialogDescription>
            Results already recorded keep the name of whoever recorded them.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Field>
          <FieldLabel htmlFor="assign-to">Assign to</FieldLabel>
          <Select
            items={items}
            value={who}
            onValueChange={(v) => setWho(v as string)}
          >
            <SelectTrigger id="assign-to" className="w-full">
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
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={assign.isPending} onClick={() => void submit()}>
            {assign.isPending && <Spinner data-icon="inline-start" />}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AddCasesForm({ run, onDone }: { run: TestRun; onDone: () => void }) {
  const { project } = useProjectContext()
  const add = useAddCases(project.key, run.key)
  const suites = useSuites(project.key)
  const [choice, setChoice] = useState<Choice>(emptyChoice)
  const [error, setError] = useState<string | null>(null)
  const selection = toSelection(choice, suites.data?.items ?? [])
  const preview = useRunPreview(project.key, selection)

  async function submit() {
    if (!selection) return
    setError(null)
    try {
      const { added } = await add.mutateAsync(selection)
      toast.add({
        title:
          added === 0
            ? "Those cases are already in the run"
            : `${added} ${added === 1 ? "case" : "cases"} added`,
      })
      onDone()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add cases to {run.key}</DialogTitle>
        <DialogDescription>
          Cases already in the run are skipped. New ones are copied at their
          current version and start untested.
        </DialogDescription>
      </DialogHeader>
      {error && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <CaseChoiceFields
        choice={choice}
        onChange={setChoice}
        preview={selection ? preview.data : undefined}
        legend="Which cases?"
      />
      <DialogFooter className="items-center sm:justify-between">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {selection && preview.data
            ? `Up to ${preview.data.total} ${preview.data.total === 1 ? "case" : "cases"}`
            : "Nothing chosen yet"}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button
            disabled={!selection || add.isPending}
            onClick={() => void submit()}
          >
            {add.isPending && <Spinner data-icon="inline-start" />}
            Add cases
          </Button>
        </div>
      </DialogFooter>
    </>
  )
}

export function AddCasesDialog({
  run,
  open,
  onOpenChange,
}: {
  run: TestRun
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
        {open && <AddCasesForm run={run} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

const RESULT_KEYS = new Set(["P", "S", "F", "B", "U"])

const SHORTCUTS: [string[], string][] = [
  [["P"], "Passed (moves on)"],
  [["S"], "Skipped (moves on)"],
  [["F"], "Failed: then describe it and press Ctrl+Enter"],
  [["B"], "Blocked: then describe it and press Ctrl+Enter"],
  [["U"], "Undo the last result"],
  [["J", "N"], "Next case in the list"],
  [["K"], "Previous case in the list"],
  [["?"], "Show this list"],
]

export function ShortcutsDialog({
  open,
  onOpenChange,
  enabled,
  onEnabledChange,
  canRecord,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  enabled: boolean
  onEnabledChange: (on: boolean) => void
  /** Viewers and closed runs only get the moving-around keys. */
  canRecord: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            They work anywhere on this page, except while you&apos;re typing in
            a field or a dialog is open.
          </DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {SHORTCUTS.filter(
            ([keys]) => canRecord || !RESULT_KEYS.has(keys[0]!)
          ).map(([keys, what]) => (
            <div key={what} className="contents">
              <dt className="flex gap-1">
                {keys.map((k, i) => (
                  <span key={k} className="flex items-center gap-1">
                    {i > 0 && (
                      <span className="text-xs text-muted-foreground">or</span>
                    )}
                    <kbd className="min-w-6 rounded border bg-muted px-1.5 text-center font-mono text-xs leading-5">
                      {k}
                    </kbd>
                  </span>
                ))}
              </dt>
              <dd>{what}</dd>
            </div>
          ))}
        </dl>
        <Field orientation="horizontal">
          <Checkbox
            id="shortcuts-on"
            checked={enabled}
            onCheckedChange={(on) => onEnabledChange(on)}
          />
          <FieldLabel htmlFor="shortcuts-on" className="font-normal">
            Use single-key shortcuts
          </FieldLabel>
        </Field>
        <FieldDescription>
          Turn them off if you use speech input or they get in the way.
          Ctrl+Enter to save a note always works.
        </FieldDescription>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
