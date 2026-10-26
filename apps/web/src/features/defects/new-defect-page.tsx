import { trackerUrlSchema } from "@qa/shared"
import { ArchivedNotice } from "@/components/archived-notice"
import { CircleAlertIcon } from "lucide-react"
import { useId, useState } from "react"
import { Link, useNavigate } from "react-router"
import { NoAccess } from "@/components/no-access"
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { projectPath } from "@/app/nav"
import { useReleases } from "@/features/projects/api"
import { useProjectContext } from "@/features/projects/project-layout"
import { errorMessage } from "@/lib/api"
import { useCreateDefect } from "./api"
import {
  DefectFormFields,
  type DefectDraft,
  draftErrors,
  emptyDraft,
} from "./defect-form-fields"

const NONE = "__none__"

export function NewDefectPage() {
  const { project, allowed } = useProjectContext()
  const navigate = useNavigate()
  const create = useCreateDefect(project.key)
  const releases = useReleases(project.key)
  const [draft, setDraft] = useState<DefectDraft>(() =>
    emptyDraft({ detectedIn: "uat" })
  )
  const [releaseId, setReleaseId] = useState<string | null>(
    project.currentRelease?.id ?? null
  )
  const [developer, setDeveloper] = useState("")
  const [trackerUrl, setTrackerUrl] = useState("")
  const [tried, setTried] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ids = { release: useId(), developer: useId(), tracker: useId() }

  const trackerCheck = trackerUrlSchema.safeParse(trackerUrl.trim())
  const trackerError =
    tried && !trackerCheck.success
      ? (trackerCheck.error.issues[0]?.message ?? "Use a full link")
      : null

  if (project.archived)
    return (
      <ArchivedNotice
        title="You can't log a defect here"
        backTo={projectPath(project.key, "defects")}
        backLabel="Back to defects"
      />
    )
  if (!allowed("defects:edit")) return <NoAccess />
  const errors = tried ? draftErrors(draft) : {}

  async function submit() {
    setTried(true)
    if (Object.keys(draftErrors(draft)).length > 0 || trackerError) {
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLElement>('form [aria-invalid="true"]')
          ?.focus()
      )
      return
    }
    setError(null)
    try {
      const defect = await create.mutateAsync({
        ...draft,
        severity: draft.severity!,
        foundInReleaseId: releaseId,
        developer,
        trackerUrl,
      })
      toast.add({ title: `${defect.key} logged as New` })
      void navigate(projectPath(project.key, `defects/${defect.key}`))
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
    <div className="flex max-w-4xl flex-col gap-5">
      <div className="flex flex-col gap-2">
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
              <BreadcrumbPage>New defect</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="text-2xl font-semibold tracking-tight">New defect</h1>
        <p className="text-sm text-muted-foreground">
          For problems found outside a test run, such as exploratory testing or
          UAT. Found it while running a case? Use “Log defect” on the result
          instead: it fills most of this in.
        </p>
      </div>
      <form
        noValidate
        className="flex flex-col gap-5 rounded-xl border bg-card p-6"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        {error && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {tried && Object.keys(errors).length > 0 && (
          <p role="alert" className="text-sm font-medium text-destructive">
            Fill in the highlighted fields to log the defect.
          </p>
        )}
        <DefectFormFields
          draft={draft}
          onChange={setDraft}
          errors={errors}
          autoFocusTitle
        />
        <div className="grid gap-4 md:grid-cols-3">
          <Field>
            <FieldLabel htmlFor={ids.release}>Found in release</FieldLabel>
            <Select
              items={releaseItems}
              value={releaseId ?? NONE}
              onValueChange={(v) =>
                setReleaseId(v === NONE ? null : (v as string))
              }
            >
              <SelectTrigger id={ids.release} className="w-full">
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
            <FieldLabel htmlFor={ids.developer}>
              Developer{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </FieldLabel>
            <Input
              id={ids.developer}
              maxLength={120}
              placeholder="Name, as in your tracker"
              value={developer}
              onChange={(e) => setDeveloper(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={ids.tracker}>
              Tracker link{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </FieldLabel>
            <Input
              id={ids.tracker}
              type="url"
              aria-invalid={Boolean(trackerError)}
              aria-describedby={
                trackerError ? `${ids.tracker}-error` : undefined
              }
              placeholder="https://jira…/PAY-1203"
              value={trackerUrl}
              onChange={(e) => setTrackerUrl(e.target.value)}
            />
            {trackerError && (
              <FieldError
                id={`${ids.tracker}-error`}
                errors={[{ message: trackerError }]}
              />
            )}
          </Field>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
          <ButtonLink
            variant="outline"
            to={projectPath(project.key, "defects")}
          >
            Cancel
          </ButtonLink>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending && <Spinner data-icon="inline-start" />}
            {create.isPending ? "Logging…" : "Log defect"}
          </Button>
        </div>
      </form>
    </div>
  )
}
