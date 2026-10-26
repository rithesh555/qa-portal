import { zodResolver } from "@hookform/resolvers/zod"
import { ArchivedNotice } from "@/components/archived-notice"
import { countTotal, type CreateRunInput, createRunSchema } from "@qa/shared"
import { CircleAlertIcon } from "lucide-react"
import { useId, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { Link, useNavigate, useSearchParams } from "react-router"
import type { z } from "zod"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ButtonLink } from "@/components/button-link"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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
import { toast } from "@/components/ui/toast"
import { projectPath } from "@/app/nav"
import { useReleases } from "@/features/projects/api"
import { useProjectContext } from "@/features/projects/project-layout"
import { NoAccess } from "@/components/no-access"
import { useSuites } from "@/features/cases/api"
import { errorMessage } from "@/lib/api"
import { useCopyRun, useCreateRun, useRun, useRunPreview } from "./api"
import {
  CaseChoiceFields,
  type Choice,
  emptyChoice,
  toSelection,
} from "./case-choice"
import { AssigneePicker, useAssignable } from "./run-people"
import { PageLoading } from "@/components/page-loading"

const NONE = "__none__"

type FormValues = z.input<typeof createRunSchema>

function ReleaseSelect({
  value,
  onChange,
  id,
}: {
  value: string | null
  onChange: (value: string | null) => void
  id: string
}) {
  const { project } = useProjectContext()
  const releases = useReleases(project.key)
  const items = [
    ...(releases.data?.items ?? []).map((r) => ({
      value: r.id,
      label: r.name,
    })),
    { value: NONE, label: "No release" },
  ]
  return (
    <Select
      items={items}
      value={value ?? NONE}
      onValueChange={(v) => onChange(v === NONE ? null : (v as string))}
    >
      <SelectTrigger id={id} className="w-full sm:w-72">
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
  )
}

function PageHeader({
  crumb,
  title,
  note,
}: {
  crumb: string
  title: string
  note?: string
}) {
  const { project } = useProjectContext()
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
            <BreadcrumbPage>{crumb}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {note && (
        <p className="max-w-2xl text-sm text-muted-foreground">{note}</p>
      )}
    </div>
  )
}

/** Duplicate a run, or start one from its failed and blocked cases. */
function CopyRunForm({
  from,
  only,
}: {
  from: string
  only: "all" | "failedOrBlocked"
}) {
  const { project } = useProjectContext()
  const navigate = useNavigate()
  const source = useRun(project.key, from)
  const copy = useCopyRun(project.key, from)
  const [error, setError] = useState<string | null>(null)
  const nameId = useId()
  const envId = useId()
  const releaseId = useId()

  if (source.isPending)
    return (
      <PageLoading label="Loading the run to copy…">
        <Skeleton className="h-96 rounded-xl" />
      </PageLoading>
    )
  if (source.isError)
    return (
      <div className="flex max-w-2xl flex-col gap-6">
        <PageHeader crumb="New run" title="Can't copy this run" />
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>
            {errorMessage(source.error)}{" "}
            <Link
              to={projectPath(project.key, "runs")}
              className="underline underline-offset-4"
            >
              Back to test runs
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    )
  const failing = source.data.counts.failed + source.data.counts.blocked
  if (only === "failedOrBlocked" && failing === 0)
    return (
      <div className="flex max-w-2xl flex-col gap-6">
        <PageHeader crumb="Re-test failures" title="Nothing to re-test" />
        <Alert>
          <AlertDescription>
            Nothing failed or was blocked in {source.data.key} (
            {source.data.name}), so there&apos;s no run to start from it.{" "}
            <Link
              to={projectPath(project.key, `runs/${source.data.key}`)}
              className="underline underline-offset-4"
            >
              Back to {source.data.key}
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    )
  return (
    <CopyRunFields
      key={source.data.id}
      initial={{
        name:
          only === "all"
            ? `${source.data.name} (copy)`
            : `Re-test failures from ${source.data.key}`,
        environment: source.data.environment,
        releaseId: source.data.release?.id ?? null,
      }}
      crumb={
        only === "all" ? `Duplicate ${source.data.key}` : "Re-test failures"
      }
      title={
        only === "all"
          ? "Duplicate run"
          : "New run from failed and blocked cases"
      }
      note={
        only === "all"
          ? `Copies ${source.data.key} (${source.data.name}) with the same cases and assignments, at their latest versions. Change the environment for another browser or build.`
          : `Starts with the ${failing} ${failing === 1 ? "case that" : "cases that"} failed or ${failing === 1 ? "was" : "were"} blocked in ${source.data.key} (${source.data.name}), at their latest versions.`
      }
      ids={{ nameId, envId, releaseId }}
      error={error}
      onSubmit={async (values) => {
        setError(null)
        try {
          const run = await copy.mutateAsync({ ...values, only })
          toast.add({ title: `${run.key} started` })
          void navigate(projectPath(project.key, `runs/${run.key}`))
        } catch (err) {
          setError(errorMessage(err))
        }
      }}
    />
  )
}

function CopyRunFields({
  initial,
  crumb,
  title,
  note,
  ids,
  error,
  onSubmit,
}: {
  initial: { name: string; environment: string; releaseId: string | null }
  crumb: string
  title: string
  note: string
  ids: { nameId: string; envId: string; releaseId: string }
  error: string | null
  onSubmit: (values: typeof initial) => Promise<void>
}) {
  const { project } = useProjectContext()
  const [values, setValues] = useState(initial)
  const [tried, setTried] = useState(false)
  const [saving, setSaving] = useState(false)
  const nameMissing = !values.name.trim()

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader crumb={crumb} title={title} note={note} />
      <form
        noValidate
        className="flex flex-col gap-6 rounded-xl border bg-card p-6"
        onSubmit={async (e) => {
          e.preventDefault()
          setTried(true)
          if (nameMissing) return
          setSaving(true)
          await onSubmit({ ...values, name: values.name.trim() })
          setSaving(false)
        }}
      >
        {error && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <FieldGroup>
          <Field data-invalid={tried && nameMissing}>
            <FieldLabel htmlFor={ids.nameId}>Name</FieldLabel>
            <Input
              id={ids.nameId}
              autoComplete="off"
              maxLength={120}
              value={values.name}
              aria-invalid={tried && nameMissing}
              onChange={(e) => setValues({ ...values, name: e.target.value })}
            />
            {tried && nameMissing && (
              <FieldError errors={[{ message: "Give the run a name" }]} />
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor={ids.releaseId}>Release</FieldLabel>
            <ReleaseSelect
              id={ids.releaseId}
              value={values.releaseId}
              onChange={(releaseId) => setValues({ ...values, releaseId })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={ids.envId}>
              Environment / build{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </FieldLabel>
            <Input
              id={ids.envId}
              autoComplete="off"
              maxLength={120}
              value={values.environment}
              onChange={(e) =>
                setValues({ ...values, environment: e.target.value })
              }
            />
          </Field>
        </FieldGroup>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving}>
            {saving && <Spinner data-icon="inline-start" />}
            {saving ? "Starting run…" : "Start run"}
          </Button>
          <ButtonLink variant="outline" to={projectPath(project.key, "runs")}>
            Cancel
          </ButtonLink>
        </div>
      </form>
    </div>
  )
}

function NewRunForm() {
  const { project } = useProjectContext()
  const navigate = useNavigate()
  const create = useCreateRun(project.key)
  const suitesQuery = useSuites(project.key)
  const people = useAssignable(project.key)
  const [formError, setFormError] = useState<string | null>(null)
  const [choice, setChoice] = useState<Choice>(emptyChoice)
  const [triedCases, setTriedCases] = useState(false)
  const ids = {
    name: useId(),
    release: useId(),
    env: useId(),
    people: useId(),
    description: useId(),
  }

  const suites = suitesQuery.data?.items ?? []
  const selection = toSelection(choice, suites)
  const preview = useRunPreview(project.key, selection)
  const total = selection ? (preview.data?.total ?? 0) : 0

  const form = useForm<FormValues, unknown, CreateRunInput>({
    resolver: zodResolver(createRunSchema),
    defaultValues: {
      name: "",
      description: "",
      environment: "",
      releaseId: project.currentRelease?.id ?? null,
      assigneeIds: [],
      // Replaced with the current choice on submit.
      selection: { mode: "all" },
    },
  })

  async function onSubmit(values: CreateRunInput) {
    setFormError(null)
    try {
      const run = await create.mutateAsync({ ...values, selection: selection! })
      const cases = countTotal(run.counts)
      toast.add({
        title: `${run.key} started with ${cases} ${cases === 1 ? "case" : "cases"}`,
      })
      void navigate(projectPath(project.key, `runs/${run.key}`))
    } catch (err) {
      setFormError(errorMessage(err))
    }
  }

  const submit = (e: React.FormEvent) => {
    setTriedCases(true)
    if (!selection || total === 0) {
      // Still show any field errors.
      void form.trigger()
      e.preventDefault()
      return
    }
    void form.handleSubmit(onSubmit)(e)
  }

  const noneChosen = triedCases && (!selection || total === 0)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader crumb="New run" title="New test run" />
      <form
        noValidate
        onSubmit={submit}
        className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
      >
        <div className="flex min-w-0 flex-col gap-6">
          <section className="rounded-xl border bg-card p-6">
            <FieldGroup>
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
                      placeholder="For example, Release 4.2 regression"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="releaseId"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={ids.release}>Release</FieldLabel>
                    <ReleaseSelect
                      id={ids.release}
                      value={field.value ?? null}
                      onChange={field.onChange}
                    />
                    <FieldDescription>
                      Runs with no release don&apos;t count towards release
                      coverage in reports.
                    </FieldDescription>
                  </Field>
                )}
              />
              <Controller
                name="environment"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={ids.env}>
                      Environment / build{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </FieldLabel>
                    <Input
                      {...field}
                      id={ids.env}
                      autoComplete="off"
                      placeholder="For example, Chrome 128 · build 4.2.0-rc1"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldDescription>
                      For several browsers, make one run each: Duplicate run
                      copies it.
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="assigneeIds"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldTitle id={ids.people}>
                      Assign all cases to{" "}
                      <span className="font-normal text-muted-foreground">
                        (you can assign single cases inside the run)
                      </span>
                    </FieldTitle>
                    {people ? (
                      <AssigneePicker
                        people={people}
                        value={field.value ?? []}
                        onChange={field.onChange}
                        labelledBy={ids.people}
                      />
                    ) : (
                      <Skeleton className="h-7 w-40" />
                    )}
                    {(field.value?.length ?? 0) > 1 && (
                      <FieldDescription>
                        With more than one person, cases are shared out by
                        suite.
                      </FieldDescription>
                    )}
                  </Field>
                )}
              />
              <Controller
                name="description"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={ids.description}>
                      Description{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </FieldLabel>
                    <Textarea
                      {...field}
                      id={ids.description}
                      rows={3}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
          </section>

          <section className="rounded-xl border bg-card p-6">
            <CaseChoiceFields
              choice={choice}
              onChange={setChoice}
              preview={selection ? preview.data : undefined}
            />
          </section>
        </div>

        <aside
          aria-labelledby="run-summary"
          className="flex flex-col gap-4 rounded-xl border bg-card p-6 lg:sticky lg:top-4"
        >
          <h2
            id="run-summary"
            className="text-xs font-semibold text-muted-foreground"
          >
            Summary
          </h2>
          <div
            className="text-2xl font-semibold tabular-nums"
            aria-live="polite"
          >
            {preview.isFetching && !preview.data ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              `${total} test ${total === 1 ? "case" : "cases"}`
            )}
          </div>
          {selection && preview.data && preview.data.groups.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {preview.data.groups.map((g) => (
                <li
                  key={g.suite ?? NONE}
                  className="flex justify-between gap-2"
                >
                  <span className="truncate">{g.suite ?? "No suite"}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {g.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {preview.isError && (
            <p className="text-sm text-destructive">
              {errorMessage(preview.error)}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Cases run in suite order, then by ID. The run copies each case now
            (its steps, suite, priority, type and labels) so later edits
            don&apos;t change it.
          </p>
          {noneChosen && (
            <p role="alert" className="text-sm font-medium text-destructive">
              Choose at least one case.
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Button
              type="submit"
              // The count shown must be for the current choice.
              disabled={form.formState.isSubmitting || preview.isFetching}
            >
              {form.formState.isSubmitting && (
                <Spinner data-icon="inline-start" />
              )}
              {form.formState.isSubmitting
                ? "Creating run…"
                : `Create run with ${total} ${total === 1 ? "case" : "cases"}`}
            </Button>
            <ButtonLink variant="outline" to={projectPath(project.key, "runs")}>
              Cancel
            </ButtonLink>
          </div>
        </aside>
      </form>
    </div>
  )
}

export function NewRunPage() {
  const { project, allowed } = useProjectContext()
  const [params] = useSearchParams()
  if (project.archived)
    return (
      <ArchivedNotice
        title="You can't start a run here"
        backTo={projectPath(project.key, "runs")}
        backLabel="Back to test runs"
      />
    )
  if (!allowed("runs:execute")) return <NoAccess />
  const from = params.get("from")
  if (from) {
    const only =
      params.get("only") === "failedOrBlocked" ? "failedOrBlocked" : "all"
    return <CopyRunForm key={`${from}:${only}`} from={from} only={only} />
  }
  return <NewRunForm />
}
