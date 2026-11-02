import { zodResolver } from "@hookform/resolvers/zod"
import {
  type CreateProjectInput,
  createProjectSchema,
  type DirectoryUser,
  suggestProjectKey,
} from "@qa/shared"
import { CircleAlertIcon } from "lucide-react"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { useNavigate } from "react-router"
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { PersonPicker } from "@/features/users/person-picker"
import { ApiError, errorMessage } from "@/lib/api"
import { useCreateProject } from "./api"

type FormValues = z.input<typeof createProjectSchema>

function NewProjectForm({ onDone }: { onDone: () => void }) {
  const create = useCreateProject()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const [lead, setLead] = useState<DirectoryUser | null>(null)
  const form = useForm<FormValues, unknown, CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: "", key: "", description: "", leadUserId: "" },
  })

  async function onSubmit(values: CreateProjectInput) {
    setFormError(null)
    try {
      const project = await create.mutateAsync(values)
      toast.add({
        title: `${project.name} created`,
        description: `${lead?.name ?? "The QA Lead"} can now add the team.`,
      })
      onDone()
      navigate(`/projects/${project.key}`)
    } catch (err) {
      // Put the server's answer on the field it's about, and focus it.
      if (err instanceof ApiError && err.status === 409) {
        form.setError(
          "key",
          { message: "Another project already uses this key. Choose another." },
          { shouldFocus: true }
        )
        return
      }
      if (err instanceof ApiError && err.status === 400) {
        form.setError("leadUserId", { message: err.message })
        return
      }
      setFormError(errorMessage(err))
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <DialogHeader>
        <DialogTitle>New project</DialogTitle>
        <DialogDescription>
          The QA Lead you pick can then add the rest of the team.
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
              <FieldLabel htmlFor="project-name">Name</FieldLabel>
              <Input
                {...field}
                id="project-name"
                autoComplete="off"
                autoFocus
                aria-invalid={fieldState.invalid}
                onChange={(event) => {
                  field.onChange(event)
                  // Suggest a key until the admin types one themselves.
                  if (!form.getFieldState("key").isDirty) {
                    form.setValue(
                      "key",
                      suggestProjectKey(event.target.value),
                      {
                        // Re-check once the form has been submitted, so a
                        // suggestion that's now valid clears the old error.
                        shouldValidate: form.formState.isSubmitted,
                      }
                    )
                  }
                }}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="key"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="project-key">Key</FieldLabel>
              <Input
                {...field}
                id="project-key"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={6}
                className="w-36 font-mono tracking-wide uppercase"
                aria-invalid={fieldState.invalid}
                onChange={(event) =>
                  field.onChange(event.target.value.toUpperCase())
                }
              />
              <FieldDescription>
                2 to 6 capital letters or digits, starting with a letter. It
                appears in every ID, like{" "}
                <span className="font-mono text-foreground">
                  {field.value || "PAY"}-TC-12
                </span>
                , so it can&apos;t be changed later.
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="description"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="project-description">
                Description{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </FieldLabel>
              <Textarea
                {...field}
                id="project-description"
                rows={2}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="leadUserId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="project-lead">First QA Lead</FieldLabel>
              <PersonPicker
                id="project-lead"
                value={lead}
                invalid={fieldState.invalid}
                onChange={(person) => {
                  setLead(person)
                  field.onChange(person?.id ?? "")
                }}
              />
              <FieldDescription>
                Every project needs at least one QA Lead.
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
      <DialogFooter>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner data-icon="inline-start" />}
          Create project
        </Button>
      </DialogFooter>
    </form>
  )
}

export function NewProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        {open && <NewProjectForm onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}
