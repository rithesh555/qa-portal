import { zodResolver } from "@hookform/resolvers/zod"
import { resetPasswordSchema, type User } from "@qa/shared"
import { CircleAlertIcon } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import type { z } from "zod"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { errorMessage } from "@/lib/api"
import { useResetPassword, useSetActive } from "./api"
import { PasswordField } from "./password-field"

type ResetInput = z.infer<typeof resetPasswordSchema>

function ResetPasswordForm({
  user,
  onDone,
}: {
  user: User
  onDone: () => void
}) {
  const reset = useResetPassword()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<ResetInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "" },
  })

  async function onSubmit({ password }: ResetInput) {
    setFormError(null)
    try {
      await reset.mutateAsync({ id: user.id, password })
      toast.add({
        title: `New password set for ${user.name}`,
        description: "They've been signed out everywhere.",
      })
      onDone()
    } catch (err) {
      setFormError(errorMessage(err))
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <DialogHeader>
        <DialogTitle>Reset password for {user.name}</DialogTitle>
        <DialogDescription>
          Their current sessions end straight away, so they&apos;ll need the new
          password to sign back in.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup className="py-4">
        {formError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <PasswordField
          control={form.control}
          name="password"
          label="New password"
        />
      </FieldGroup>
      <DialogFooter>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner data-icon="inline-start" />}
          Set password
        </Button>
      </DialogFooter>
    </form>
  )
}

export function ResetPasswordDialog({
  user,
  onClose,
}: {
  user: User | null
  onClose: () => void
}) {
  return (
    <Dialog open={user !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        {user && (
          <ResetPasswordForm key={user.id} user={user} onDone={onClose} />
        )}
      </DialogContent>
    </Dialog>
  )
}

export function DeactivateDialog({
  user,
  onClose,
}: {
  user: User | null
  onClose: () => void
}) {
  const setActive = useSetActive()

  async function deactivate() {
    if (!user) return
    try {
      await setActive.mutateAsync({ user, active: false })
      toast.add({ title: `${user.name} has been deactivated` })
      onClose()
    } catch (err) {
      toast.add({
        title: `Couldn't deactivate ${user.name}`,
        description: errorMessage(err),
        type: "error",
      })
    }
  }

  return (
    <AlertDialog
      open={user !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate {user?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            They&apos;re signed out right away and can&apos;t sign in until you
            reactivate them. Their test results, defects and history stay as
            they are.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={setActive.isPending}
            onClick={() => void deactivate()}
          >
            {setActive.isPending && <Spinner data-icon="inline-start" />}
            Deactivate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
