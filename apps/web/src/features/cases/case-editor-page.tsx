import { zodResolver } from "@hookform/resolvers/zod"
import {
  CASE_PRIORITIES,
  CASE_PRIORITY_LABELS,
  CASE_STATUS_LABELS,
  CASE_STATUSES,
  CASE_TYPE_LABELS,
  CASE_TYPES,
  type CaseFields,
  caseInputSchema,
  caseSchema,
  type CaseStatus,
  type TestCase,
} from "@qa/shared"
import { CheckIcon, CircleAlertIcon, TriangleAlertIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form"
import {
  Link,
  useBlocker,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router"
import type { z } from "zod"
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
import { ButtonLink } from "@/components/button-link"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useSession } from "@/features/auth/session"
import { useProjectContext } from "@/features/projects/project-layout"
import { ApiError, apiGet, errorMessage } from "@/lib/api"
import {
  useCase,
  useCreateCase,
  useLabels,
  useSuites,
  useUpdateCase,
} from "./api"
import { SELECTED_TOGGLE, suitePath } from "./case-badges"
import {
  changedFields,
  conflictRows,
  type DiffRow,
  mergeMine,
} from "./conflict-merge"
import { casePagePath } from "./case-details"
import { LabelsInput } from "./labels-input"
import { StepsEditor } from "./steps-editor"
import { suiteOptions } from "./suite-tree"
import { PageLoading } from "@/components/page-loading"
import { useStickyFooter } from "@/hooks/use-sticky-footer"
import { PageHeader } from "@/components/composites/page-header"
import { timeAgo } from "@/lib/time"

type FormValues = z.input<typeof caseInputSchema>

const STATUS_HINTS: Record<CaseStatus, string> = {
  draft:
    "Still being written. It can be added to runs, but run setup shows Ready cases first.",
  ready: "Reviewed and ready to run.",
}

const NONE = "none"

function valuesOf(c: TestCase): FormValues {
  return {
    title: c.title,
    suiteId: c.suiteId,
    priority: c.priority,
    type: c.type,
    status: c.status,
    labels: c.labels,
    references: c.references,
    preconditions: c.preconditions,
    steps: c.steps.map((s) => ({ ...s })),
  }
}

/** Form values in the saved shape, without validating (for comparing). */
function asFields(v: FormValues): CaseFields {
  return {
    title: v.title,
    suiteId: v.suiteId ?? null,
    priority: v.priority,
    type: v.type,
    status: v.status,
    labels: v.labels ?? [],
    references: v.references ?? "",
    preconditions: v.preconditions ?? "",
    steps: v.steps.map((step) => ({
      action: step.action,
      expected: step.expected ?? "",
    })),
  }
}

const blank = (suiteId: string | null): FormValues => ({
  title: "",
  suiteId,
  priority: "medium",
  type: "functional",
  status: "draft",
  labels: [],
  references: "",
  preconditions: "",
  steps: [{ action: "", expected: "" }],
})

function ConflictPanel({
  rows,
  author,
  version,
  busy,
  onDiscard,
  onOverwrite,
}: {
  rows: DiffRow[]
  author: string
  version: number
  busy: boolean
  onDiscard: () => void
  onOverwrite: () => void
}) {
  return (
    <section
      role="alert"
      aria-labelledby="conflict-title"
      className="overflow-hidden rounded-xl border border-warning/50"
    >
      <div className="flex flex-col gap-1 bg-warning-surface px-4 py-3">
        <h2
          id="conflict-title"
          tabIndex={-1}
          className="font-semibold outline-none"
        >
          {author} saved a newer version (version {version}) while you were
          editing.
        </h2>
        <p className="text-sm">
          Your changes aren&apos;t saved. Below are the fields you changed.
          Saving yours keeps their other changes; fields marked “Both changed”
          will replace theirs.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-semibold">
                Field
              </th>
              <th scope="col" className="px-3 py-2 text-left font-semibold">
                Their version ({version})
              </th>
              <th scope="col" className="px-3 py-2 text-left font-semibold">
                Your edits
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-2 text-muted-foreground">
                  You haven&apos;t changed anything yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.field} className="border-t align-top">
                  <th scope="row" className="px-3 py-2 text-left font-medium">
                    {row.field}
                    {row.both && (
                      <span className="mt-0.5 block text-xs font-semibold text-warning-ink">
                        Both changed
                      </span>
                    )}
                  </th>
                  <td className="px-3 py-2 whitespace-pre-line">
                    {row.theirs}
                  </td>
                  <td className="px-3 py-2 whitespace-pre-line">{row.mine}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t px-4 py-3">
        <span className="mr-auto text-xs text-muted-foreground">
          Saving over is recorded in the case history.
        </span>
        <Button variant="outline" disabled={busy} onClick={onDiscard}>
          Discard mine, load theirs
        </Button>
        <Button disabled={busy} onClick={onOverwrite}>
          {busy && <Spinner data-icon="inline-start" />}
          Save mine over theirs
        </Button>
      </div>
    </section>
  )
}

function CaseForm({ initial }: { initial: TestCase | null }) {
  const { project } = useProjectContext()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const suites = useSuites(project.key)
  const labels = useLabels(project.key)
  const create = useCreateCase(project.key)
  const update = useUpdateCase(project.key, initial?.key ?? "")
  const [formError, setFormError] = useState<string | null>(null)
  const stickyFooter = useStickyFooter<HTMLDivElement>()
  const [conflict, setConflict] = useState<TestCase | null>(null)
  const [baseVersion, setBaseVersion] = useState(initial?.version ?? 1)
  // The version the edits started from, for the three-way compare.
  const [base, setBase] = useState<CaseFields | null>(() =>
    initial ? asFields(valuesOf(initial)) : null
  )
  const { data: me } = useSession()
  const [labelError, setLabelError] = useState(false)
  // Set after a save; an effect then leaves, once the blocker below has seen it.
  const [savedTo, setSavedTo] = useState<string | null>(null)

  const suiteList = suites.data?.items ?? []
  const requestedSuite = searchParams.get("suite")
  const form = useForm<FormValues, unknown, CaseFields>({
    resolver: zodResolver(caseInputSchema),
    defaultValues: initial
      ? valuesOf(initial)
      : blank(
          requestedSuite && suiteList.some((s) => s.id === requestedSuite)
            ? requestedSuite
            : null
        ),
  })
  const { isDirty, isSubmitting } = form.formState
  const title = useWatch({ control: form.control, name: "title" })
  const status = useWatch({ control: form.control, name: "status" })

  // Leaving with unsaved changes asks first — in the app and when closing the tab.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty &&
      savedTo === null &&
      currentLocation.pathname !== nextLocation.pathname
  )
  useEffect(() => {
    if (savedTo) navigate(savedTo)
  }, [savedTo, navigate])
  useEffect(() => {
    if (!isDirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [isDirty])

  const suiteName = (id: string | null) => suitePath(suiteList, id)

  async function save(
    values: CaseFields,
    options: { overwrite?: boolean; another?: boolean } = {}
  ) {
    setFormError(null)
    try {
      if (initial) {
        const saved = await update.mutateAsync({
          ...values,
          version:
            options.overwrite && conflict ? conflict.version : baseVersion,
          overwrite: options.overwrite ?? false,
        })
        toast.add({
          title: `${saved.key} saved`,
          description: `Version ${saved.revision}`,
        })
        setSavedTo(casePagePath(project.key, saved.key))
        return
      }
      const created = await create.mutateAsync(values)
      toast.add({ title: `${created.key} created` })
      if (options.another) {
        form.reset(blank(values.suiteId))
        requestAnimationFrame(() =>
          document.getElementById("case-title")?.focus()
        )
        return
      }
      setSavedTo(casePagePath(project.key, created.key))
    } catch (err) {
      if (
        initial &&
        err instanceof ApiError &&
        err.status === 409 &&
        !initial.archived
      ) {
        try {
          // Fetched outside the query cache: updating it would swap this form
          // for the page's "archived" notice and lose the edits.
          const latest = await apiGet(
            `/projects/${encodeURIComponent(project.key)}/cases/${encodeURIComponent(initial.key)}`,
            caseSchema
          )
          const sent =
            options.overwrite && conflict ? conflict.version : baseVersion
          if (latest.archived) {
            setFormError(
              "This test case was archived while you were editing. Ask a QA Lead to restore it."
            )
            return
          }
          // No newer version: the 409 was about something else (e.g. the
          // project was archived), so show the API's reason.
          if (latest.version === sent) {
            setFormError(errorMessage(err))
            return
          }
          setConflict(latest)
          // Focus, not just scroll: Save is disabled meanwhile, and the
          // conflict is what needs reading next.
          requestAnimationFrame(() => {
            const title = document.getElementById("conflict-title")
            title?.scrollIntoView({ block: "center" })
            title?.focus({ preventScroll: true })
          })
          return
        } catch {
          // Fall through to the plain message.
        }
      }
      setFormError(errorMessage(err))
    }
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={(event) => {
          // Text in the labels field that isn't a valid label would be lost.
          if (labelError) {
            event.preventDefault()
            document.getElementById("case-labels")?.focus()
            return
          }
          void form.handleSubmit((values) => save(values))(event)
        }}
        noValidate
        aria-label={initial ? `Edit ${initial.key}` : "New test case"}
        className="flex max-w-5xl flex-col gap-5"
      >
        {conflict && (
          <ConflictPanel
            rows={conflictRows(
              base ?? asFields(valuesOf(conflict)),
              asFields(form.getValues()),
              asFields(valuesOf(conflict)),
              suiteName
            )}
            author={
              conflict.updatedBy.id === me?.id ? "You" : conflict.updatedBy.name
            }
            version={conflict.revision}
            busy={isSubmitting || update.isPending}
            onDiscard={() => {
              form.reset(valuesOf(conflict))
              setBaseVersion(conflict.version)
              setBase(asFields(valuesOf(conflict)))
              setConflict(null)
              toast.add({ title: "Loaded their version" })
            }}
            onOverwrite={() =>
              void form.handleSubmit((values) =>
                save(
                  mergeMine(
                    asFields(valuesOf(conflict)),
                    values,
                    changedFields(base ?? values, values)
                  ),
                  { overwrite: true }
                )
              )()
            }
          />
        )}
        {formError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Couldn&apos;t save</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex min-w-0 flex-col gap-5">
            <section
              aria-labelledby="case-what"
              className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5"
            >
              <h2 id="case-what" className="text-base font-semibold">
                What it tests
              </h2>
              <FieldGroup>
                <Controller
                  name="title"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="case-title">Title</FieldLabel>
                      <Input
                        {...field}
                        id="case-title"
                        autoComplete="off"
                        maxLength={200}
                        autoFocus={!initial}
                        aria-invalid={fieldState.invalid}
                        aria-describedby="case-title-hint"
                      />
                      <div className="flex justify-between gap-2">
                        {fieldState.invalid ? (
                          <FieldError
                            id="case-title-hint"
                            errors={[fieldState.error]}
                          />
                        ) : (
                          <FieldDescription id="case-title-hint">
                            Say what is checked, e.g. “Declined card shows a
                            retry message”.
                          </FieldDescription>
                        )}
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {title.length}/200
                        </span>
                      </div>
                    </Field>
                  )}
                />
                <Controller
                  name="preconditions"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="case-preconditions">
                        Preconditions{" "}
                        <span className="font-normal text-muted-foreground">
                          (optional)
                        </span>
                      </FieldLabel>
                      <Textarea
                        {...field}
                        id="case-preconditions"
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
            <section
              aria-labelledby="steps-heading"
              className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="steps-heading" className="text-base font-semibold">
                  Steps
                </h2>
                <p className="text-sm text-muted-foreground">
                  Drag a step by its handle (or focus it, Space, then the arrow
                  keys), or use its ⋯ menu.
                </p>
              </div>
              {form.formState.errors.steps?.root?.message ||
              form.formState.errors.steps?.message ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.steps?.root?.message ??
                    form.formState.errors.steps?.message}
                </p>
              ) : null}
              <StepsEditor />
            </section>
          </div>
          <section
            aria-labelledby="case-details"
            className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5"
          >
            <h2 id="case-details" className="text-base font-semibold">
              Details
            </h2>
            <FieldGroup>
              <Controller
                name="status"
                control={form.control}
                render={({ field }) => (
                  <FieldSet>
                    <FieldLegend variant="label">Status</FieldLegend>
                    <ToggleGroup
                      value={[field.value]}
                      onValueChange={(value) =>
                        value[0] && field.onChange(value[0])
                      }
                      variant="outline"
                      aria-label="Status"
                      aria-describedby="case-status-hint"
                      className="self-start"
                    >
                      {CASE_STATUSES.map((s) => (
                        <ToggleGroupItem
                          key={s}
                          value={s}
                          className={SELECTED_TOGGLE}
                        >
                          {field.value === s && (
                            <CheckIcon data-icon="inline-start" />
                          )}
                          {CASE_STATUS_LABELS[s]}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                    <FieldDescription id="case-status-hint">
                      {STATUS_HINTS[status]}
                    </FieldDescription>
                  </FieldSet>
                )}
              />
              <Controller
                name="suiteId"
                control={form.control}
                render={({ field }) => {
                  const items = suiteOptions(suiteList)
                  return (
                    <Field>
                      <FieldLabel htmlFor="case-suite">Suite</FieldLabel>
                      <Select
                        items={items}
                        value={field.value ?? NONE}
                        onValueChange={(v) =>
                          field.onChange(v === NONE ? null : v)
                        }
                      >
                        <SelectTrigger id="case-suite" className="w-full">
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
                  )
                }}
              />
              <Controller
                name="priority"
                control={form.control}
                render={({ field }) => {
                  const items = CASE_PRIORITIES.map((v) => ({
                    value: v,
                    label: CASE_PRIORITY_LABELS[v],
                  }))
                  return (
                    <Field>
                      <FieldLabel htmlFor="case-priority">Priority</FieldLabel>
                      <Select
                        items={items}
                        value={field.value}
                        onValueChange={(v) => field.onChange(v)}
                      >
                        <SelectTrigger id="case-priority" className="w-full">
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
                  )
                }}
              />
              <Controller
                name="type"
                control={form.control}
                render={({ field }) => {
                  const items = CASE_TYPES.map((v) => ({
                    value: v,
                    label: CASE_TYPE_LABELS[v],
                  }))
                  return (
                    <Field>
                      <FieldLabel htmlFor="case-type">Type</FieldLabel>
                      <Select
                        items={items}
                        value={field.value}
                        onValueChange={(v) => field.onChange(v)}
                      >
                        <SelectTrigger id="case-type" className="w-full">
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
                  )
                }}
              />
              <Controller
                name="labels"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="case-labels">
                      Labels{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </FieldLabel>
                    <LabelsInput
                      id="case-labels"
                      value={field.value ?? []}
                      onChange={field.onChange}
                      suggestions={labels.data ?? []}
                      onErrorChange={setLabelError}
                    />
                  </Field>
                )}
              />
              <Controller
                name="references"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="case-references">
                      References{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </FieldLabel>
                    <Input
                      {...field}
                      id="case-references"
                      maxLength={200}
                      aria-describedby="case-references-hint"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldDescription id="case-references-hint">
                      Jira issues or requirement IDs, separated by commas.
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
          </section>
        </div>

        <div
          ref={stickyFooter}
          className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-end gap-2 border-t bg-background px-1 py-3"
        >
          {conflict ? (
            <span className="mr-auto text-sm font-medium text-warning-ink">
              <TriangleAlertIcon className="mr-1 inline size-4" />A newer
              version exists. Compare above before saving.
            </span>
          ) : (
            isDirty && (
              <span className="mr-auto text-sm text-muted-foreground">
                Unsaved changes
              </span>
            )
          )}
          <ButtonLink
            variant="outline"
            to={
              initial
                ? casePagePath(project.key, initial.key)
                : `/projects/${project.key}/cases`
            }
          >
            Cancel
          </ButtonLink>
          {!initial && (
            <Button
              type="button"
              variant="outline"
              aria-label="Save and add another"
              disabled={isSubmitting}
              onClick={() => {
                if (labelError) {
                  document.getElementById("case-labels")?.focus()
                  return
                }
                void form.handleSubmit((values) =>
                  save(values, { another: true })
                )()
              }}
            >
              {/* Short on a phone so the bar stays one row; the name stays whole. */}
              <span className="sm:hidden" aria-hidden>
                Add another
              </span>
              <span className="hidden sm:inline">Save and add another</span>
            </Button>
          )}
          <Button
            type="submit"
            aria-label={initial ? undefined : "Create test case"}
            disabled={isSubmitting || conflict !== null}
          >
            {isSubmitting && <Spinner data-icon="inline-start" />}
            {initial ? (
              "Save changes"
            ) : (
              <>
                <span className="sm:hidden" aria-hidden>
                  Create
                </span>
                <span className="hidden sm:inline">Create test case</span>
              </>
            )}
          </Button>
        </div>
      </form>

      <AlertDialog
        open={blocker.state === "blocked"}
        onOpenChange={(open) => !open && blocker.reset?.()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription>
              Your changes to this test case will be lost.
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
    </FormProvider>
  )
}

/** /projects/:key/cases/new and /projects/:key/cases/:ref/edit */
export function CaseEditorPage() {
  const { project, allowed } = useProjectContext()
  const { ref } = useParams()
  const editing = Boolean(ref)
  const query = useCase(project.key, ref ?? null)
  const suites = useSuites(project.key)
  const listPath = `/projects/${project.key}/cases`
  // The case as the editor first loaded it. Later refetches (window focus,
  // someone archiving it) must not swap the form out from under unsaved edits.
  const [loaded, setLoaded] = useState<TestCase | null>(null)
  if (query.data && loaded === null) setLoaded(query.data)

  const crumbs = (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link to={listPath} />}>
            Test cases
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        {editing && loaded ? (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink
                render={<Link to={casePagePath(project.key, loaded.key)} />}
              >
                {loaded.key}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Edit</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : (
          <BreadcrumbItem>
            <BreadcrumbPage>
              {editing ? "Edit" : "New test case"}
            </BreadcrumbPage>
          </BreadcrumbItem>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )

  let body: React.ReactNode
  if (!allowed("cases:edit")) {
    body = (
      <Alert>
        <CircleAlertIcon />
        <AlertTitle>You can&apos;t edit test cases here</AlertTitle>
        <AlertDescription>
          {project.archived
            ? "This project is archived, so it's read-only."
            : "Viewers can read test cases but not change them. A QA Lead can change your role."}{" "}
          <Link
            to={editing ? casePagePath(project.key, ref!) : listPath}
            className="underline"
          >
            {editing ? "View the test case" : "Back to test cases"}
          </Link>
        </AlertDescription>
      </Alert>
    )
  } else if ((editing && query.isPending) || suites.isPending) {
    body = (
      <PageLoading label="Loading the test case…">
        <Skeleton className="h-96" />
      </PageLoading>
    )
  } else if (editing && !loaded && query.isError) {
    body = (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>
          {query.error instanceof ApiError && query.error.status === 404
            ? "Test case not found"
            : "Couldn't load the test case"}
        </AlertTitle>
        <AlertDescription>{errorMessage(query.error)}</AlertDescription>
      </Alert>
    )
  } else if (editing && loaded?.archived) {
    body = (
      <Alert>
        <CircleAlertIcon />
        <AlertTitle>{loaded.key} is archived</AlertTitle>
        <AlertDescription>
          Archived test cases are read-only. A QA Lead can restore it from its
          page first.
        </AlertDescription>
      </Alert>
    )
  } else {
    body = (
      <CaseForm key={loaded?.id ?? "new"} initial={editing ? loaded : null} />
    )
  }

  return (
    <div className="flex max-w-6xl flex-col gap-5">
      <PageHeader
        before={crumbs}
        title={editing ? (loaded?.title ?? "Edit test case") : "New test case"}
        factsLabel="Case details"
        facts={
          editing && loaded
            ? [
                { label: "Editing", value: loaded.key },
                { label: "Version", value: loaded.revision },
                {
                  label: "Last saved",
                  value: `${loaded.updatedBy.name}, ${timeAgo(loaded.updatedAt)}`,
                },
              ]
            : undefined
        }
      />
      {body}
    </div>
  )
}
