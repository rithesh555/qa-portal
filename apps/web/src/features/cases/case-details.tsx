import { CASE_TYPE_LABELS, type TestCase } from "@qa/shared"
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  CircleAlertIcon,
  CopyIcon,
  ExternalLinkIcon,
  LinkIcon,
  PencilIcon,
  XIcon,
} from "lucide-react"
import { useState } from "react"
import { Link, useNavigate } from "react-router"
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
import { ButtonLink } from "@/components/button-link"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/toast"
import { useProjectContext } from "@/features/projects/project-layout"
import { ApiError, errorMessage } from "@/lib/api"
import {
  useArchiveCase,
  useCase,
  useCaseHistory,
  useDuplicateCase,
  useRestoreCase,
  useSuites,
} from "./api"
import {
  CaseStatusBadge,
  LabelChip,
  PriorityIndicator,
  suitePath,
} from "./case-badges"
import { describeCaseChange } from "./case-activity-text"
import { PageLoading } from "@/components/page-loading"
import { InlineError } from "@/components/inline-error"

const exact = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
})

export const casePagePath = (projectKey: string, caseKey: string) =>
  `/projects/${projectKey}/cases/${caseKey}`

function History({ caseKey }: { caseKey: string }) {
  const { project } = useProjectContext()
  const history = useCaseHistory(project.key, caseKey)
  if (history.isPending) return <Skeleton className="h-24" />
  if (history.isError) {
    return (
      <InlineError
        what="Couldn't load the history."
        error={history.error}
        onRetry={() => void history.refetch()}
      />
    )
  }
  return (
    <ol className="flex flex-col gap-3">
      {history.data.map((entry) => (
        <li key={entry.id} className="flex flex-col gap-0.5 text-sm">
          <span>
            <span className="font-semibold">{entry.actor.name}</span>{" "}
            {describeCaseChange(entry)}
          </span>
          <time
            dateTime={entry.createdAt}
            className="text-xs text-muted-foreground"
          >
            {exact.format(new Date(entry.createdAt))}
          </time>
        </li>
      ))}
    </ol>
  )
}

function Steps({
  testCase,
  Subheading,
}: {
  testCase: TestCase
  /** One level below the case title. */
  Subheading: "h2" | "h3"
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Subheading className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Preconditions
        </Subheading>
        <p className="text-sm whitespace-pre-line">
          {testCase.preconditions || (
            <span className="text-muted-foreground">None</span>
          )}
        </p>
      </div>
      <ol className="flex flex-col gap-3">
        {testCase.steps.map((step, i) => (
          <li key={i} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2.5">
            <span
              aria-hidden
              className="grid size-6 place-items-center rounded-full bg-muted text-xs font-semibold"
            >
              {i + 1}
            </span>
            <div className="flex flex-col gap-1 text-sm">
              <p className="whitespace-pre-line">
                <span className="sr-only">Step {i + 1}: </span>
                {step.action}
              </p>
              {step.expected && (
                <p className="rounded-md border bg-background px-2 py-1.5 whitespace-pre-line">
                  <span className="font-semibold text-muted-foreground">
                    Expected:{" "}
                  </span>
                  {step.expected}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

function ArchiveCaseDialog({
  testCase,
  open,
  onOpenChange,
}: {
  testCase: TestCase
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { project } = useProjectContext()
  const archive = useArchiveCase(project.key)
  const [reason, setReason] = useState("")

  async function confirm() {
    try {
      await archive.mutateAsync({ ref: testCase.key, reason: reason.trim() })
      toast.add({ title: `${testCase.key} archived` })
      onOpenChange(false)
    } catch (err) {
      toast.add({
        type: "error",
        title: "Couldn't archive the test case",
        description: errorMessage(err),
      })
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive {testCase.key}?</AlertDialogTitle>
          <AlertDialogDescription>
            It becomes read-only and is left out of new test runs. Past runs
            keep their copy. A QA Lead can restore it later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Field>
          <FieldLabel htmlFor="archive-reason">
            Reason{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </FieldLabel>
          <Input
            id="archive-reason"
            value={reason}
            maxLength={200}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !archive.isPending) {
                e.preventDefault()
                void confirm()
              }
            }}
            placeholder="e.g. Replaced by the new wallet flow"
          />
        </Field>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={archive.isPending}
            onClick={() => void confirm()}
          >
            {archive.isPending && <Spinner data-icon="inline-start" />}
            Archive
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * A test case's details: shown in the list's preview pane (`onClose` set) or
 * as its own page.
 */
export function CaseDetails({
  caseRef,
  onClose,
  headingLevel = 2,
}: {
  caseRef: string
  onClose?: () => void
  headingLevel?: 1 | 2
}) {
  const { project, allowed } = useProjectContext()
  const query = useCase(project.key, caseRef)
  const suites = useSuites(project.key)
  const duplicate = useDuplicateCase(project.key)
  const restore = useRestoreCase(project.key)
  const navigate = useNavigate()
  const [archiving, setArchiving] = useState(false)

  if (query.isPending) {
    return (
      <PageLoading
        label="Loading the test case…"
        className="flex flex-col gap-3 p-4"
      >
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-40" />
      </PageLoading>
    )
  }
  if (query.isError) {
    const missing =
      query.error instanceof ApiError && query.error.status === 404
    return (
      <div className="p-4">
        <Alert variant={missing ? "default" : "destructive"}>
          <CircleAlertIcon />
          <AlertTitle>
            {missing ? "Test case not found" : "Couldn't load the test case"}
          </AlertTitle>
          <AlertDescription>
            {missing
              ? `There's no ${caseRef.toUpperCase()} in ${project.name}.`
              : errorMessage(query.error)}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const testCase = query.data
  const Heading = headingLevel === 1 ? "h1" : "h2"
  const canEdit = allowed("cases:edit") && !testCase.archived
  const canArchive = allowed("cases:archive")
  const fullPage = casePagePath(project.key, testCase.key)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        new URL(fullPage, window.location.origin).href
      )
      toast.add({ title: `Link to ${testCase.key} copied` })
    } catch {
      toast.add({ type: "error", title: "Couldn't copy the link" })
    }
  }

  async function makeCopy() {
    try {
      const copy = await duplicate.mutateAsync(testCase.key)
      toast.add({ title: `${copy.key} created as a copy` })
      navigate(`${casePagePath(project.key, copy.key)}/edit`)
    } catch (err) {
      toast.add({
        type: "error",
        title: "Couldn't duplicate the test case",
        description: errorMessage(err),
      })
    }
  }

  async function restoreCase() {
    try {
      await restore.mutateAsync(testCase.key)
      toast.add({ title: `${testCase.key} restored` })
    } catch (err) {
      toast.add({
        type: "error",
        title: "Couldn't restore the test case",
        description: errorMessage(err),
      })
    }
  }

  return (
    <article aria-labelledby="case-title" className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-xs text-muted-foreground">
          {testCase.key}
        </span>
        <span
          className="text-xs text-muted-foreground"
          title="The version goes up when the title, preconditions or steps change"
        >
          · version {testCase.revision}
        </span>
        <span className="ml-auto" />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Copy link to ${testCase.key}`}
          onClick={() => void copyLink()}
        >
          <LinkIcon />
        </Button>
        {onClose && (
          <>
            <ButtonLink
              variant="ghost"
              size="icon-sm"
              aria-label={`Open ${testCase.key} as a full page`}
              to={fullPage}
            >
              <ExternalLinkIcon />
            </ButtonLink>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close preview"
              onClick={onClose}
            >
              <XIcon />
            </Button>
          </>
        )}
      </div>
      <Heading
        id="case-title"
        className={
          headingLevel === 1
            ? "text-2xl font-semibold tracking-tight"
            : "text-lg leading-snug font-semibold"
        }
      >
        {testCase.title}
      </Heading>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <CaseStatusBadge
          status={testCase.status}
          archived={testCase.archived}
        />
        <PriorityIndicator priority={testCase.priority} />
        <span className="text-muted-foreground">·</span>
        <span>{CASE_TYPE_LABELS[testCase.type]}</span>
      </div>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Suite</dt>
        <dd>{suitePath(suites.data?.items, testCase.suiteId)}</dd>
        <dt className="text-muted-foreground">Labels</dt>
        <dd className="flex flex-wrap gap-1">
          {testCase.labels.length ? (
            testCase.labels.map((l) => <LabelChip key={l} label={l} />)
          ) : (
            <span className="text-muted-foreground">None</span>
          )}
        </dd>
        <dt className="text-muted-foreground">References</dt>
        <dd className="break-words">{testCase.references || "—"}</dd>
        {testCase.duplicatedFrom && (
          <>
            <dt className="text-muted-foreground">Copied from</dt>
            <dd>
              <Link
                to={casePagePath(project.key, testCase.duplicatedFrom)}
                className="text-primary underline-offset-4 hover:underline"
              >
                {testCase.duplicatedFrom}
              </Link>
            </dd>
          </>
        )}
      </dl>
      {testCase.archived && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm">
          <span className="font-semibold">Archived</span>
          {testCase.archiveReason && ` — ${testCase.archiveReason}`}. It&apos;s
          read-only and left out of new test runs; past runs keep their copy.
        </p>
      )}
      {(canEdit || canArchive) && (
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <>
              <ButtonLink size="sm" to={`${fullPage}/edit`}>
                <PencilIcon data-icon="inline-start" />
                Edit
              </ButtonLink>
              <Button
                size="sm"
                variant="outline"
                disabled={duplicate.isPending}
                onClick={() => void makeCopy()}
              >
                {duplicate.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <CopyIcon data-icon="inline-start" />
                )}
                Duplicate
              </Button>
            </>
          )}
          {canArchive && !testCase.archived && (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive"
              onClick={() => setArchiving(true)}
            >
              <ArchiveIcon data-icon="inline-start" />
              Archive…
            </Button>
          )}
          {canArchive && testCase.archived && allowed("cases:edit") && (
            <Button
              size="sm"
              variant="outline"
              disabled={restore.isPending}
              onClick={() => void restoreCase()}
            >
              {restore.isPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <ArchiveRestoreIcon data-icon="inline-start" />
              )}
              Restore
            </Button>
          )}
        </div>
      )}
      <Tabs defaultValue="steps" className="mt-1">
        <TabsList variant="line">
          <TabsTrigger value="steps">
            Steps ({testCase.steps.length})
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="steps" className="pt-3">
          <Steps
            testCase={testCase}
            Subheading={headingLevel === 1 ? "h2" : "h3"}
          />
        </TabsContent>
        <TabsContent value="history" className="pt-3">
          <History caseKey={testCase.key} />
        </TabsContent>
      </Tabs>
      <ArchiveCaseDialog
        testCase={testCase}
        open={archiving}
        onOpenChange={setArchiving}
      />
    </article>
  )
}
