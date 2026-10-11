import { zodResolver } from "@hookform/resolvers/zod"
import {
  type CreateUserInput,
  createUserSchema,
  PORTAL_ROLE_LABELS,
  PORTAL_ROLES,
  type UpdateUserInput,
  updateUserSchema,
  type User,
} from "@qa/shared"
import { CircleAlertIcon } from "lucide-react"
import { useState } from "react"
import {
  type Control,
  Controller,
  type FieldPath,
  type FieldValues,
  useForm,
} from "react-hook-form"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { errorMessage } from "@/lib/api"
import { useCreateUser, useUpdateUser } from "./api"
import { PasswordField } from "./password-field"

const ROLE_ITEMS = PORTAL_ROLES.map((value) => ({
  value,
  label: PORTAL_ROLE_LABELS[value],
}))

function TextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  ...input
}: {
  control: Control<T>
  name: FieldPath<T>
  label: string
  description?: string
} & Omit<React.ComponentProps<typeof Input>, "name">) {
  const id = `user-${name}`
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Input
            {...input}
            {...field}
            id={id}
            aria-invalid={fieldState.invalid}
          />
          {description && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}

function RoleField<T extends FieldValues>({
  control,
  name,
}: {
  control: Control<T>
  name: FieldPath<T>
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Field>
          <FieldLabel htmlFor="user-role">Portal role</FieldLabel>
          <Select
            items={ROLE_ITEMS}
            value={field.value}
            onValueChange={field.onChange}
          >
            <SelectTrigger id="user-role" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            Admins manage users and every project. Members only see projects
            they&apos;re added to.
          </FieldDescription>
        </Field>
      )}
    />
  )
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

function CreateUserForm({ onDone }: { onDone: () => void }) {
  const createUser = useCreateUser()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      role: "user",
    },
  })

  async function onSubmit(values: CreateUserInput) {
    setFormError(null)
    try {
      const user = await createUser.mutateAsync(values)
      toast.add({
        title: `${user.name} can now sign in`,
        description: `Username: ${user.username}. Share the temporary password with them securely.`,
      })
      onDone()
    } catch (err) {
      setFormError(errorMessage(err))
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <DialogHeader>
        <DialogTitle>New user</DialogTitle>
        <DialogDescription>
          They sign in with the username and temporary password you set here.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup className="py-4">
        <FormError message={formError} />
        <TextField
          control={form.control}
          name="name"
          label="Full name"
          autoComplete="off"
          autoFocus
        />
        <TextField
          control={form.control}
          name="username"
          label="Username"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          description="Letters, digits, dots and underscores. Can't be changed later."
        />
        <TextField
          control={form.control}
          name="email"
          label="Email"
          type="email"
          autoComplete="off"
          spellCheck={false}
        />
        <PasswordField
          control={form.control}
          name="password"
          label="Temporary password"
        />
        <RoleField control={form.control} name="role" />
      </FieldGroup>
      <DialogFooter>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner data-icon="inline-start" />}
          Create user
        </Button>
      </DialogFooter>
    </form>
  )
}

function EditUserForm({ user, onDone }: { user: User; onDone: () => void }) {
  const updateUser = useUpdateUser()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      role: user.role,
      updatedAt: user.updatedAt,
    },
  })

  async function onSubmit(values: UpdateUserInput) {
    setFormError(null)
    try {
      const saved = await updateUser.mutateAsync({ id: user.id, input: values })
      toast.add({ title: `Saved changes to ${saved.name}` })
      onDone()
    } catch (err) {
      setFormError(errorMessage(err))
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <DialogHeader>
        <DialogTitle>Edit {user.name}</DialogTitle>
        <DialogDescription>@{user.username}</DialogDescription>
      </DialogHeader>
      <FieldGroup className="py-4">
        <FormError message={formError} />
        <TextField
          control={form.control}
          name="name"
          label="Full name"
          autoComplete="off"
          autoFocus
        />
        <TextField
          control={form.control}
          name="email"
          label="Email"
          type="email"
          autoComplete="off"
          spellCheck={false}
        />
        <RoleField control={form.control} name="role" />
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

/** Create a user (no `user`) or edit one. The form remounts each time it opens. */
export function UserFormDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: User | null
}) {
  const close = () => onOpenChange(false)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        {open &&
          (user ? (
            <EditUserForm key={user.id} user={user} onDone={close} />
          ) : (
            <CreateUserForm onDone={close} />
          ))}
      </DialogContent>
    </Dialog>
  )
}
