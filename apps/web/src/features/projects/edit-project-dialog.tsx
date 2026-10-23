import { zodResolver } from "@hookform/resolvers/zod"
import { type UpdateProjectInput, updateProjectSchema } from "@qa/shared"
import { CircleAlertIcon } from "lucide-react"
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
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { ConflictAlert, isEditConflict } from "@/components/conflict-alert"
import { errorMessage } from "@/lib/api"
import { useProject, useUpdateProject } from "./api"
import { useProjectContext } from "./project-layout"

type FormValues = z.input<typeof updateProjectSchema>

function EditProjectForm({ onDone }: { onDone: () => void }) {
  const { project } = useProjectContext()
  const update = useUpdateProject(project.key)
  const current = useProject(project.key)
  const [formError, setFormError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<string | null>(null)
  const form = useForm<FormValues, unknown, UpdateProjectInput>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: {
      name: project.name,
      description: project.description,
      version: project.version,
    },
  })

  async function onSubmit(values: UpdateProjectInput) {
    setFormError(null)
    setConflict(null)
    try {
      await update.mutateAsync(values)
      toast.add({ title: "Project details saved" })
      onDone()
    } catch (err) {
      if (isEditConflict(err)) setConflict(errorMessage(err))
      else setFormError(errorMessage(err))
    }
  }

  /** The project as saved now (someone else changed it meanwhile). */
  async function latest() {
    const { data, error } = await current.refetch()
    if (!data) throw error ?? new Error("Couldn't load the project")
    return data
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <DialogHeader>
        <DialogTitle>Edit {project.name}</DialogTitle>
        <DialogDescription>
          The key <span className="font-mono">{project.key}</span> stays the
          same.
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
                version: fresh.version,
              })
              setConflict(null)
            }}
            onSaveMine={async () => {
              form.setValue("version", (await latest()).version)
              await form.handleSubmit(onSubmit)()
            }}
          />
        )}
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="edit-project-name">Name</FieldLabel>
              <Input
                {...field}
                id="edit-project-name"
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
              <FieldLabel htmlFor="edit-project-description">
                Description
              </FieldLabel>
              <Textarea
                {...field}
                id="edit-project-description"
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

export function EditProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        {open && <EditProjectForm onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}
