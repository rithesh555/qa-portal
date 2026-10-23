import {
  DEFECT_STATUS_LABELS,
  type Defect,
  RESOLUTION_LABELS,
  RUN_CASE_STATUS_LABELS,
} from "@qa/shared"
import { CircleAlertIcon } from "lucide-react"
import { useRef, useState } from "react"
import { Link, useParams } from "react-router"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { projectPath } from "@/app/nav"
import { useProjectContext } from "@/features/projects/project-layout"
import { initials } from "@/features/runs/format"
import { RunCaseStatusIcon } from "@/features/runs/run-status"
import { ApiError, errorMessage } from "@/lib/api"
import { exactTime, timeAgo } from "@/lib/time"
import {
  useAddComment,
  useDefect,
  useDefectActivity,
  useLinkResult,
  useUnlink,
  useUpdateDefect,
} from "./api"
import { describeDefectActivity } from "./defect-activity-text"
import { DefectStatusBadge } from "./defect-badges"
import { DefectFields } from "./defect-fields"
import { DefectWorkflow } from "./defect-workflow"
import { PageLoading } from "@/components/page-loading"
import { InlineError } from "@/components/inline-error"

function Section({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h3 className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </h3>
      <div className="text-sm break-words whitespace-pre-wrap">{children}</div>
    </div>
  )
}

function Details({ defect }: { defect: Defect }) {
  const { project, allowed } = useProjectContext()
  const update = useUpdateDefect(project.key, defect.key)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(defect)
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const [tried, setTried] = useState(false)
  const detail = useDefect(project.key, defect.key)
  const editButton = useRef<HTMLButtonElement>(null)
  /** The section swaps between reading and editing; focus follows it. */
  const focusAfter = (target: () => HTMLElement | null | undefined) =>
    requestAnimationFrame(() => target()?.focus())
  const stopEditing = () => {
    setEditing(false)
    focusAfter(() => editButton.current)
  }
  const missing = {
    title: !draft.title.trim(),
    steps: !draft.steps.trim(),
    actual: !draft.actual.trim(),
  }

  async function save() {
    setTried(true)
    const firstEmpty = (["title", "steps", "actual"] as const).find(
      (k) => missing[k]
    )
    if (firstEmpty) {
      focusAfter(() => document.getElementById(`defect-${firstEmpty}`))
      return
    }
    setError(null)
    try {
      await update.mutateAsync({
        title: draft.title,
        description: draft.description,
        steps: draft.steps,
        expected: draft.expected,
        actual: draft.actual,
        version: defect.version,
      })
      stopEditing()
      toast.add({ title: "Details saved" })
    } catch (err) {
      setConflict(err instanceof ApiError && err.status === 409)
      setError(
        err instanceof ApiError && err.status === 409
          ? `${err.message} Your text is still here: copy what you need, then reload their version, or save again to replace it with yours.`
          : errorMessage(err)
      )
    }
  }

  const text = (
    key: "description" | "steps" | "expected" | "actual",
    label: string,
    required = false
  ) => (
    <Field
      data-invalid={tried && required && missing[key as keyof typeof missing]}
    >
      <FieldLabel htmlFor={`defect-${key}`}>{label}</FieldLabel>
      <Textarea
        id={`defect-${key}`}
        rows={key === "steps" ? 4 : 3}
        value={draft[key]}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
        aria-invalid={tried && required && missing[key as keyof typeof missing]}
      />
      {tried && required && missing[key as keyof typeof missing] && (
        <FieldError errors={[{ message: `${label} can't be empty` }]} />
      )}
    </Field>
  )

  return (
    <section
      aria-labelledby="defect-details"
      className="flex flex-col gap-4 rounded-xl border bg-card p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="defect-details" className="text-base font-semibold">
          Details
        </h2>
        {allowed("defects:edit") && !editing && (
          <Button
            ref={editButton}
            size="sm"
            variant="outline"
            onClick={() => {
              setDraft(defect)
              setTried(false)
              setEditing(true)
              focusAfter(() => document.getElementById("defect-title"))
            }}
          >
            Edit
          </Button>
        )}
      </div>
      {editing ? (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
          className="flex flex-col gap-4"
        >
          {error && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertDescription>
                <p>{error}</p>
                {conflict && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => {
                      setError(null)
                      setConflict(false)
                      stopEditing()
                      void detail.refetch()
                    }}
                  >
                    Reload their version
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}
          <FieldGroup>
            <Field data-invalid={tried && missing.title}>
              <FieldLabel htmlFor="defect-title">Title</FieldLabel>
              <Input
                id="defect-title"
                value={draft.title}
                maxLength={200}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                aria-invalid={tried && missing.title}
              />
              {tried && missing.title && (
                <FieldError errors={[{ message: "Give the defect a title" }]} />
              )}
            </Field>
            {text("description", "What happens")}
            {text("steps", "Steps to reproduce", true)}
            <div className="grid gap-4 md:grid-cols-2">
              {text("expected", "Expected")}
              {text("actual", "Actual", true)}
            </div>
          </FieldGroup>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={stopEditing}>
              Cancel
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending && <Spinner data-icon="inline-start" />}
              Save details
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          {defect.description && (
            <Section label="What happens">{defect.description}</Section>
          )}
          <Section label="Steps to reproduce">{defect.steps}</Section>
          <div className="grid gap-4 md:grid-cols-2">
            <Section label="Expected">
              {defect.expected || (
                <span className="text-muted-foreground">—</span>
              )}
            </Section>
            <Section label="Actual">{defect.actual}</Section>
          </div>
        </div>
      )}
    </section>
  )
}

function LinkedResults({ defect }: { defect: Defect }) {
  const { project, allowed } = useProjectContext()
  const unlink = useUnlink(project.key, defect.key)
  const relink = useLinkResult(project.key, defect.key)
  // Results unlinked here, kept as rows with an Undo until this page is left
  // (not a timed toast: it can be reached whenever someone gets to it).
  const [removed, setRemoved] = useState<Defect["links"]>([])
  const focusUndo = (id: string) =>
    requestAnimationFrame(() =>
      document.getElementById(`undo-unlink-${id}`)?.focus()
    )
  return (
    <section
      aria-labelledby="defect-links"
      className="flex flex-col gap-2 rounded-xl border bg-card p-5"
    >
      <h2 id="defect-links" className="text-base font-semibold">
        Linked results ({defect.links.length})
      </h2>
      <p className="text-xs text-muted-foreground">
        To link another result, choose “Log defect” on it in its run and pick
        this defect.
      </p>
      <ul className="flex flex-col">
        {defect.links.map((l) => (
          <li
            key={l.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t py-2.5 text-sm"
          >
            <RunCaseStatusIcon status={l.kind} decorative />
            <span className="font-medium">
              {l.kind === "passed"
                ? "Passed (verified the fix)"
                : RUN_CASE_STATUS_LABELS[l.kind]}
              {l.failedStep !== null && ` at step ${l.failedStep}`}
            </span>
            <Link
              to={projectPath(
                project.key,
                `runs/${l.runKey}?case=${l.runCaseId}`
              )}
              className="font-mono text-xs text-primary underline-offset-4 hover:underline"
            >
              {l.runKey} › {l.caseKey}
            </Link>
            <span className="min-w-0 flex-1 basis-full text-xs break-words text-muted-foreground sm:basis-auto">
              {l.caseTitle} · {l.recordedBy.name} ·{" "}
              {exactTime.format(new Date(l.recordedAt))}
              {l.note && ` · “${l.note}”`}
            </span>
            {allowed("defects:edit") && (
              <Button
                size="sm"
                variant="ghost"
                disabled={unlink.isPending}
                onClick={() =>
                  unlink.mutate(l.id, {
                    onSuccess: () => {
                      setRemoved((r) => [...r, l])
                      focusUndo(l.id)
                    },
                    onError: (err) =>
                      toast.add({
                        type: "error",
                        title: "Couldn't unlink",
                        description: errorMessage(err),
                      }),
                  })
                }
              >
                Unlink{" "}
                <span className="sr-only">
                  {l.runKey} › {l.caseKey}
                </span>
              </Button>
            )}
          </li>
        ))}
        {removed.map((l) => (
          <li
            key={`removed-${l.id}`}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t py-2.5 text-sm text-muted-foreground"
          >
            <span>
              Unlinked{" "}
              <span className="font-mono text-xs">
                {l.runKey} › {l.caseKey}
              </span>
            </span>
            <Button
              id={`undo-unlink-${l.id}`}
              size="sm"
              variant="outline"
              disabled={relink.isPending}
              focusableWhenDisabled
              onClick={() =>
                relink.mutate(l.resultId, {
                  onSuccess: () =>
                    setRemoved((r) => r.filter((x) => x.id !== l.id)),
                  onError: (err) =>
                    toast.add({
                      type: "error",
                      title: "Couldn't link it again",
                      description: errorMessage(err),
                    }),
                })
              }
            >
              Undo{" "}
              <span className="sr-only">
                unlinking {l.runKey} › {l.caseKey}
              </span>
            </Button>
          </li>
        ))}
        {defect.links.length === 0 && removed.length === 0 && (
          <li className="border-t py-3 text-sm text-muted-foreground">
            No run results are linked.
          </li>
        )}
      </ul>
    </section>
  )
}

function Activity({ defect }: { defect: Defect }) {
  const { project, allowed } = useProjectContext()
  const activity = useDefectActivity(project.key, defect.key)
  const comment = useAddComment(project.key, defect.key)
  const [tab, setTab] = useState<"all" | "comments">("all")
  const [body, setBody] = useState("")
  const items = activity.data ?? []
  const comments = items.filter((i) => i.kind === "comment")
  const shown = tab === "all" ? items : comments

  async function post() {
    if (!body.trim()) return
    try {
      await comment.mutateAsync(body.trim())
      setBody("")
    } catch (err) {
      toast.add({
        type: "error",
        title: "Couldn't post the comment",
        description: errorMessage(err),
      })
    }
  }

  return (
    <section
      aria-labelledby="defect-activity"
      className="flex flex-col gap-4 rounded-xl border bg-card p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="defect-activity" className="text-base font-semibold">
          Activity
        </h2>
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "all" | "comments")}
        >
          <TabsList>
            <TabsTrigger value="all">Everything ({items.length})</TabsTrigger>
            <TabsTrigger value="comments">
              Comments ({comments.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {activity.isPending ? (
        <PageLoading label="Loading the activity…">
          <Skeleton className="h-24" />
        </PageLoading>
      ) : activity.isError ? (
        <InlineError
          what="Couldn't load the activity."
          error={activity.error}
          onRetry={() => void activity.refetch()}
        />
      ) : (
        <ol className="flex flex-col gap-4">
          {shown.map((e) => (
            <li key={e.id} className="flex gap-3">
              <span
                aria-hidden
                className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-[0.65rem] font-semibold text-accent-foreground"
              >
                {initials(e.actor.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-semibold">{e.actor.name}</span>{" "}
                  <span className="text-muted-foreground">
                    {describeDefectActivity(e)} ·{" "}
                    <time
                      dateTime={e.createdAt}
                      title={exactTime.format(new Date(e.createdAt))}
                    >
                      {timeAgo(e.createdAt)}
                    </time>
                  </span>
                </p>
                {(e.body || typeof e.changes?.note === "string") && (
                  <p className="mt-1 text-sm break-words whitespace-pre-wrap">
                    {e.body || String(e.changes?.note)}
                  </p>
                )}
              </div>
            </li>
          ))}
          {shown.length === 0 && (
            <li className="text-sm text-muted-foreground">
              {tab === "comments"
                ? "No comments yet."
                : "Nothing has happened yet."}
            </li>
          )}
        </ol>
      )}
      {allowed("defects:edit") && (
        <form
          className="flex flex-col gap-2 border-t pt-4"
          onSubmit={(e) => {
            e.preventDefault()
            void post()
          }}
        >
          <label htmlFor="defect-comment" className="sr-only">
            Add a comment
          </label>
          <Textarea
            id="defect-comment"
            rows={3}
            maxLength={10000}
            placeholder="Add a comment. Plain text; paste links to logs or screenshots."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={!body.trim() || comment.isPending}>
              {comment.isPending && <Spinner data-icon="inline-start" />}
              {comment.isPending ? "Posting…" : "Comment"}
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}

export function DefectPage() {
  const { ref = "" } = useParams()
  const { project } = useProjectContext()
  const query = useDefect(project.key, ref)

  if (query.isError) {
    const notFound =
      query.error instanceof ApiError && query.error.status === 404
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>
          {notFound ? "Defect not found" : "Couldn't load this defect"}
        </AlertTitle>
        <AlertDescription>
          {notFound
            ? `There's no defect ${ref} in ${project.name}.`
            : errorMessage(query.error)}{" "}
          <Link
            to={projectPath(project.key, "defects")}
            className="underline underline-offset-4"
          >
            Back to defects
          </Link>
        </AlertDescription>
      </Alert>
    )
  }
  if (!query.data)
    return (
      <PageLoading label="Loading the defect…">
        <Skeleton className="h-96 rounded-xl" />
      </PageLoading>
    )
  const defect = query.data
  const firstLink = defect.links[0]

  return (
    <div className="flex flex-col gap-5">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              render={<Link to={projectPath(project.key, "defects")} />}
            >
              Defects
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{defect.key}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-[1_1_28rem] flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-xs text-muted-foreground">
              {defect.key}
            </span>
            <DefectStatusBadge status={defect.status} />
            <span className="text-sm text-muted-foreground">
              {defect.source === "result" && firstLink
                ? `Logged by ${defect.reporter.name} from a ${RUN_CASE_STATUS_LABELS[firstLink.kind].toLowerCase()} result`
                : `Logged by hand by ${defect.reporter.name}`}{" "}
              · {timeAgo(defect.createdAt)}
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight break-words">
            {defect.title}
          </h1>
          <ol
            aria-label="Status history"
            className="flex flex-wrap items-center gap-1 text-xs"
          >
            {defect.path.map((s, i) => {
              const last = i === defect.path.length - 1
              return (
                <li key={i} className="flex items-center gap-1">
                  <span
                    aria-current={last ? "step" : undefined}
                    className={
                      last
                        ? "rounded-full bg-foreground px-2 py-0.5 font-semibold text-background"
                        : "px-1 text-foreground"
                    }
                  >
                    {DEFECT_STATUS_LABELS[s]}
                  </span>
                  {!last && (
                    <span aria-hidden className="text-muted-foreground">
                      ›
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
          {defect.resolution && (
            <p className="text-sm">
              <span className="font-semibold">
                Resolution: {RESOLUTION_LABELS[defect.resolution]}
              </span>
              {defect.duplicateOf && (
                <>
                  {" "}
                  of{" "}
                  <Link
                    to={projectPath(
                      project.key,
                      `defects/${defect.duplicateOf.key}`
                    )}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {defect.duplicateOf.key} · {defect.duplicateOf.title}
                  </Link>
                </>
              )}
            </p>
          )}
        </div>
        <DefectWorkflow defect={defect} />
      </div>

      {project.myRole === "viewer" && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          You&apos;re a Viewer in this project, so you can read defects and
          their discussion but not change them.
        </p>
      )}

      <div className="flex flex-wrap items-start gap-5">
        <div className="flex min-w-0 flex-[999_1_32rem] flex-col gap-5">
          <Details defect={defect} />
          <LinkedResults defect={defect} />
          <Activity defect={defect} />
        </div>
        <div className="min-w-0 flex-[1_1_20rem]">
          <DefectFields defect={defect} />
        </div>
      </div>
    </div>
  )
}
