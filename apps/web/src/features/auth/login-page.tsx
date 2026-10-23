import { zodResolver } from "@hookform/resolvers/zod"
import { loginSchema, type LoginInput } from "@qa/shared"
import { useQueryClient } from "@tanstack/react-query"
import { CircleAlertIcon } from "lucide-react"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { Navigate, useLocation, useNavigate } from "react-router"
import { BrandMark } from "@/components/brand-mark"
import { FullPageSpinner } from "@/components/full-page-spinner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { authClient } from "@/lib/auth-client"
import { sessionQueryKey, useSession } from "./session"

const NETWORK_ERROR = "We couldn't reach the server. Try again in a moment."

function signInErrorMessage(status: number): string {
  if (status === 429) {
    return "Too many sign-in attempts. Wait a minute, then try again."
  }
  if (status === 401 || status === 400) {
    return "That username and password don't match. Check them and try again."
  }
  if (status === 403) {
    return "This account has been deactivated. Ask an admin to restore access."
  }
  return NETWORK_ERROR
}

export function LoginPage() {
  const session = useSession()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  })

  const from = (location.state as { from?: string } | null)?.from ?? "/"

  if (session.isPending)
    return <FullPageSpinner label="Checking your session" />
  if (session.data) return <Navigate to={from} replace />

  async function onSubmit(values: LoginInput) {
    setFormError(null)
    let error: { status: number } | null
    try {
      ;({ error } = await authClient.signIn.username(values))
    } catch {
      setFormError(NETWORK_ERROR)
      return
    }
    if (error) {
      setFormError(signInErrorMessage(error.status))
      form.resetField("password")
      // Straight back to retyping the password.
      form.setFocus("password")
      return
    }
    await queryClient.invalidateQueries({ queryKey: sessionQueryKey })
    navigate(from, { replace: true })
  }

  const submitting = form.formState.isSubmitting

  return (
    <div className="grid min-h-svh grid-rows-[auto_1fr] lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] lg:grid-rows-1">
      <section className="flex flex-col gap-6 bg-sidebar px-6 py-8 text-sidebar-foreground sm:px-10 lg:justify-between lg:gap-10 lg:px-16 lg:py-14">
        <p className="flex items-center gap-3 font-semibold">
          <BrandMark />
          QA Portal
        </p>
        <div className="flex max-w-xl flex-col gap-6">
          <BrandMark className="hidden h-5 w-full max-w-md rounded-sm lg:flex" />
          <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl lg:text-4xl">
            Plan the tests, run them, and follow every defect to a fix.
          </h1>
          <p className="hidden max-w-prose text-muted-foreground lg:block">
            Your workspace for test cases, test runs, defects, and release
            reports.
          </p>
        </div>
        <p className="hidden text-sm text-muted-foreground lg:block">
          Accounts are created by an admin. Ask yours if you can&apos;t sign in.
        </p>
      </section>

      <main className="flex items-center justify-center px-6 py-10 sm:px-10">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>
              <h2>Sign in</h2>
            </CardTitle>
            <CardDescription>
              Use the username your admin gave you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
              <FieldGroup>
                {formError && (
                  <Alert variant="destructive">
                    <CircleAlertIcon />
                    <AlertTitle>Couldn&apos;t sign in</AlertTitle>
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}
                <Controller
                  name="username"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="login-username">Username</FieldLabel>
                      <Input
                        {...field}
                        id="login-username"
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        autoFocus
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="password"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="login-password">Password</FieldLabel>
                      <Input
                        {...field}
                        id="login-password"
                        type="password"
                        autoComplete="current-password"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Field>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Spinner data-icon="inline-start" />}
                    Sign in
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
