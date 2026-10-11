import { type Action, can } from "@qa/shared"
import { CloudOffIcon } from "lucide-react"
import { Navigate, Outlet, useLocation } from "react-router"
import { FullPageSpinner } from "@/components/full-page-spinner"
import { NoAccess } from "@/components/no-access"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import { useSession } from "./session"

function SessionCheckFailed({
  onRetry,
  retrying,
}: {
  onRetry: () => void
  retrying: boolean
}) {
  return (
    <Empty className="min-h-svh">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CloudOffIcon />
        </EmptyMedia>
        <EmptyTitle>
          <h1>Can&apos;t reach QA Portal</h1>
        </EmptyTitle>
        <EmptyDescription>
          We couldn&apos;t check your session. The server may be restarting.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onRetry} disabled={retrying}>
          {retrying && <Spinner data-icon="inline-start" />}
          Try again
        </Button>
      </EmptyContent>
    </Empty>
  )
}

/** Renders child routes only for a signed-in user. */
export function RequireAuth() {
  const { data: user, isPending, isError, isRefetching, refetch } = useSession()
  const location = useLocation()

  if (isPending) return <FullPageSpinner label="Checking your session" />
  // A failed background check keeps the cached user; only a 401 (null) signs out.
  if (user) return <Outlet />
  if (isError) {
    return (
      <SessionCheckFailed
        onRetry={() => void refetch()}
        retrying={isRefetching}
      />
    )
  }
  const from = location.pathname + location.search + location.hash
  return <Navigate to="/login" replace state={{ from }} />
}

/** Renders child routes only when the portal-wide `action` is allowed. Use inside RequireAuth. */
export function RequirePermission({ action }: { action: Action }) {
  const { data: user } = useSession()
  if (!user || !can(action, { portalRole: user.role })) return <NoAccess />
  return <Outlet />
}
