import { zodResolver } from "@hookform/resolvers/zod"
import { type ChangePasswordInput, changePasswordSchema } from "@qa/shared"
import { CircleAlertIcon } from "lucide-react"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
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
import { toast } from "@/components/ui/toast"
import { authClient } from "@/lib/auth-client"
import { useSignOut } from "./use-sign-out"

const FIELDS = [
  {
    name: "currentPassword",
    label: "Current password",
    autoComplete: "current-password",
  },
  { name: "newPassword", label: "New password", autoComplete: "new-password" },
  {
    name: "confirmPassword",
    label: "Confirm new password",
    autoComplete: "new-password",
  },
] as const

function changeErrorMessage(status: number): string {
  if (status === 400 || status === 401) {
    return "Your current password isn't right. Check it and try again."
  }
  if (status === 429) return "Too many attempts. Wait a minute, then try again."
  return "We couldn't reach the server. Try again in a moment."
}

function ChangePasswordForm({
  onDone,
  required,
}: {
  onDone: () => void
  /** An admin chose the current password: the user must pick their own. */
  required: boolean
}) {
  const signOut = useSignOut()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  async function onSubmit(values: ChangePasswordInput) {
    setFormError(null)
    let error: { status: number } | null
    try {
      ;({ error } = await authClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        revokeOtherSessions: true,
      }))
    } catch {
      error = { status: 0 }
    }
    if (error) {
      form.resetField("currentPassword")
      // A wrong password belongs to its field (cleared, marked, focused);
      // anything else is about the whole form.
      if (error.status === 400 || error.status === 401)
        form.setError(
          "currentPassword",
          { message: changeErrorMessage(error.status) },
          { shouldFocus: true }
        )
      else setFormError(changeErrorMessage(error.status))
      return
    }
    toast.add({
      title: required ? "Password saved" : "Password changed",
      description: "You've been signed out on your other devices.",
    })
    onDone()
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <DialogHeader>
        <DialogTitle>
          {required ? "Choose your own password" : "Change password"}
        </DialogTitle>
        <DialogDescription>
          {required
            ? "An admin set your current password. Pick one only you know to continue: at least 12 characters."
            : "Use at least 12 characters. Other devices are signed out."}
        </DialogDescription>
      </DialogHeader>
      <FieldGroup className="py-4">
        {formError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        {FIELDS.map(({ name, label, autoComplete }, index) => (
          <Controller
            key={name}
            name={name}
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`change-${name}`}>{label}</FieldLabel>
                <Input
                  {...field}
                  id={`change-${name}`}
                  type="password"
                  autoComplete={autoComplete}
                  autoFocus={index === 0}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        ))}
      </FieldGroup>
      <DialogFooter>
        {required && (
          <Button
            type="button"
            variant="outline"
            onClick={() => void signOut()}
          >
            Sign out
          </Button>
        )}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner data-icon="inline-start" />}
          {required ? "Save my password" : "Change password"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        {open && (
          <ChangePasswordForm
            required={false}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Over the app while an admin-chosen password is unchanged: it can't be
 * dismissed (the API refuses everything else meanwhile), only completed or
 * left by signing out.
 */
export function ChoosePasswordDialog({ onDone }: { onDone: () => void }) {
  return (
    <Dialog open disablePointerDismissal onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md"
      >
        <ChangePasswordForm required onDone={onDone} />
      </DialogContent>
    </Dialog>
  )
}
