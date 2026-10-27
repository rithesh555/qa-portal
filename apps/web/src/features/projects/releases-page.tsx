import { PageHeader } from "@/components/composites/page-header"
import { DataError } from "@/components/composites/data-state"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  RELEASE_STATUS_LABELS,
  RELEASE_STATUSES,
  type Release,
  type ReleaseInput,
  releaseInputSchema,
} from "@qa/shared"
import { CircleAlertIcon, FlagIcon, PencilIcon, PlusIcon } from "lucide-react"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import type { z } from "zod"
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { ConflictAlert, isEditConflict } from "@/components/conflict-alert"
import { ApiError, errorMessage } from "@/lib/api"
import { useCreateRelease, useReleases, useUpdateRelease } from "./api"
import { useProjectContext } from "./project-layout"
import { formatDay, ReleaseStatusBadge } from "./release-status"

const STATUS_ITEMS = RELEASE_STATUSES.map((value) => ({
  value,
  label: RELEASE_STATUS_LABELS[value],
}))

type FormValues = z.input<typeof releaseInputSchema>

function ReleaseForm({
  release,
  onDone,
}: {
  release: Release | null
  onDone: () => void
}) {
  const { project } = useProjectContext()
  const create = useCreateRelease(project.key)
  const update = useUpdateRelease(project.key)
  const releases = useReleases(project.key)
  const [formError, setFormError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<string | null>(null)
  // The version this edit builds on; a conflict moves it to the latest.
  const [version, setVersion] = useState(release?.version ?? 0)
  const form = useForm<
    FormValues,
    unknown,
    z.output<typeof releaseInputSchema>
  >({
    resolver: zodResolver(releaseInputSchema),
    defaultValues: {
      name: release?.name ?? "",
      description: release?.description ?? "",
      status: release?.status ?? "planned",
      startDate: release?.startDate ?? "",
      targetDate: release?.targetDate ?? "",
    },
  })

  const onSubmit = (values: ReleaseInput) => save(values, version)

  async function save(values: ReleaseInput, onVersion: number) {
    setFormError(null)
    setConflict(null)
    try {
      if (release) {
        await update.mutateAsync({
          id: release.id,
          input: { ...values, version: onVersion },
        })
        toast.add({ title: `Release ${values.name} saved` })
      } else {
        await create.mutateAsync(values)
        toast.add({ title: `Release ${values.name} created` })
      }
      onDone()
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 409 &&
        /already has a release with that name/i.test(err.message)
      ) {
        form.setError(
          "name",
          {
            message:
              "This project already has a release with that name. Choose another.",
          },
          { shouldFocus: true }
        )
        return
      }
      if (release && isEditConflict(err)) setConflict(errorMessage(err))
      else setFormError(errorMessage(err))
    }
  }

  /** The release as saved now (someone else changed it meanwhile). */
  async function latest() {
    const { data, error } = await releases.refetch()
    const fresh = data?.items.find((r) => r.id === release?.id)
    if (!fresh) throw error ?? new Error("Couldn't load the release")
    setVersion(fresh.version)
    return fresh
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <DialogHeader>
        <DialogTitle>
          {release ? `Edit release ${release.name}` : "New release"}
        </DialogTitle>
        <DialogDescription>
          Test runs and reports are grouped by release.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup className="py-4">
        {formError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        {conflict && (
          <ConflictAlert
            message={conflict}
            onLoadTheirs={async () => {
              const fresh = await latest()
              form.reset({
                name: fresh.name,
                description: fresh.description,
                status: fresh.status,
                startDate: fresh.startDate ?? "",
                targetDate: fresh.targetDate ?? "",
              })
              setConflict(null)
            }}
            onSaveMine={async () => {
              const fresh = await latest()
              await form.handleSubmit((values) => save(values, fresh.version))()
            }}
          />
        )}
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="release-name">Name</FieldLabel>
              <Input
                {...field}
                id="release-name"
                placeholder="e.g. 4.2"
                autoComplete="off"
                autoFocus
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
              <FieldLabel htmlFor="release-description">
                Summary{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </FieldLabel>
              <Input
                {...field}
                id="release-description"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="status"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="release-status">Status</FieldLabel>
              <Select
                items={STATUS_ITEMS}
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger id="release-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["startDate", "Start date"],
              ["targetDate", "Target date"],
            ] as const
          ).map(([name, label]) => (
            <Controller
              key={name}
              name={name}
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`release-${name}`}>
                    {label}{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </FieldLabel>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    id={`release-${name}`}
                    type="date"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          ))}
        </div>
      </FieldGroup>
      <DialogFooter>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner data-icon="inline-start" />}
          {release ? "Save changes" : "Create release"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function ReleasesPage() {
  const { project, allowed } = useProjectContext()
  const releases = useReleases(project.key)
  const canManage = allowed("releases:manage")
  const [editing, setEditing] = useState<Release | null>(null)
  const [open, setOpen] = useState(false)
  const items = releases.data?.items

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <PageHeader
        title="Releases"
        description="Test runs and reports are grouped by release."
        actions={
          canManage && (
            <Button
              onClick={() => {
                setEditing(null)
                setOpen(true)
              }}
            >
              <PlusIcon data-icon="inline-start" />
              New release
            </Button>
          )
        }
      />

      {releases.isError ? (
        <DataError
          title="Couldn't load releases"
          error={releases.error}
          onRetry={() => void releases.refetch()}
        />
      ) : items && items.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FlagIcon />
            </EmptyMedia>
            <EmptyTitle>No releases yet</EmptyTitle>
            <EmptyDescription>
              {canManage
                ? "Create one with New release to group test runs and reports."
                : "A QA Lead adds releases for this project."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Release</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Start</TableHead>
                <TableHead className="hidden sm:table-cell">
                  Target date
                </TableHead>
                {canManage && (
                  <TableHead className="w-12">
                    <span className="sr-only">Edit</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {!items
                ? Array.from({ length: 3 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : items.map((release) => (
                    <TableRow key={release.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{release.name}</span>
                          {release.description && (
                            <span className="text-xs text-muted-foreground">
                              {release.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <ReleaseStatusBadge status={release.status} />
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
                        {formatDay(release.startDate) ?? "—"}
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
                        {formatDay(release.targetDate) ?? "—"}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit release ${release.name}`}
                            onClick={() => {
                              setEditing(release)
                              setOpen(true)
                            }}
                          >
                            <PencilIcon />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
          {open && (
            <ReleaseForm
              key={editing?.id ?? "new"}
              release={editing}
              onDone={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
