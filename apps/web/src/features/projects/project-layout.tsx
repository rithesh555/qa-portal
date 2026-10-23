import { type Action, can, type Project } from "@qa/shared"
import { ArchiveIcon, CircleAlertIcon, FolderXIcon } from "lucide-react"
import {
  Link,
  Navigate,
  Outlet,
  useLocation,
  useOutletContext,
  useParams,
} from "react-router"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { useSession } from "@/features/auth/session"
import { ApiError, errorMessage } from "@/lib/api"
import { useProject } from "./api"
import { PageLoading } from "@/components/page-loading"

export interface ProjectContext {
  project: Project
  /** Whether the signed-in user may do `action` in this project right now. */
  allowed: (action: Action) => boolean
}

/** The project of the current `/projects/:key/...` page. */
export function useProjectContext() {
  return useOutletContext<ProjectContext>()
}

function ProjectNotFound({ isAdmin }: { isAdmin: boolean }) {
  return (
    <Empty className="flex-1">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderXIcon />
        </EmptyMedia>
        <EmptyTitle>
          <h1>Project not found</h1>
        </EmptyTitle>
        <EmptyDescription>
          {isAdmin
            ? "No project has this key. Check the address, or find it in the projects list."
            : "It doesn't exist, or you're not a member. A project's QA Lead or an admin can add you."}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link to="/projects" />}
        >
          Go to your projects
        </Button>
      </EmptyContent>
    </Empty>
  )
}

export function ProjectLayout() {
  const { key = "" } = useParams()
  const location = useLocation()
  const project = useProject(key.toUpperCase())
  const { data: user } = useSession()

  // One canonical address per project: /projects/pay → /projects/PAY.
  if (key !== key.toUpperCase()) {
    const rest = location.pathname.slice(`/projects/${key}`.length)
    return (
      <Navigate
        replace
        to={`/projects/${key.toUpperCase()}${rest}${location.search}`}
      />
    )
  }

  if (project.isPending) {
    return (
      <PageLoading label="Loading the project…" className="flex flex-col gap-4">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-40 w-full" />
      </PageLoading>
    )
  }
  if (project.error instanceof ApiError && project.error.status === 404) {
    return <ProjectNotFound isAdmin={user?.role === "admin"} />
  }
  if (project.isError || !user) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>Couldn&apos;t load this project</AlertTitle>
        <AlertDescription>
          {errorMessage(project.error)}{" "}
          <Button
            variant="link"
            className="h-auto p-0"
            onClick={() => void project.refetch()}
          >
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  const data = project.data
  const context: ProjectContext = {
    project: data,
    allowed: (action) =>
      // Archived projects are read-only for everyone except restoring them.
      (!data.archived || action === "projects:manage") &&
      can(action, { portalRole: user.role, projectRole: data.myRole }),
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {data.archived && (
        <Alert>
          <ArchiveIcon />
          <AlertTitle>This project is archived</AlertTitle>
          <AlertDescription>
            {user.role === "admin"
              ? "It's read-only. Restore it from Project actions on the overview."
              : "It's read-only. An admin can restore it."}
          </AlertDescription>
        </Alert>
      )}
      <Outlet context={context} />
    </div>
  )
}
