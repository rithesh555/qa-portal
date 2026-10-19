import { PROJECT_ROLE_LABELS, RELEASE_STATUS_LABELS } from "@qa/shared"
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  EllipsisIcon,
  PencilIcon,
} from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"
import { ProjectTile } from "@/components/project-tile"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { errorMessage } from "@/lib/api"
import { exactTime, timeAgo } from "@/lib/time"
import { describeActivity } from "./activity-text"
import { useActivity, useReleases, useSetArchived } from "./api"
import { EditProjectDialog } from "./edit-project-dialog"
import { useProjectContext } from "./project-layout"
import { ReleaseStatusBadge, formatDay } from "./release-status"

function CurrentRelease() {
  const { project } = useProjectContext()
  const releases = useReleases(project.key)
  const current = releases.data?.items.find(
    (r) => r.id === project.currentRelease?.id
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Current release</h2>
        </CardTitle>
        <CardAction>
          <Link
            to="releases"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            All releases
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {releases.isPending ? (
          <Skeleton className="h-16" />
        ) : current ? (
          <>
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl font-semibold">{current.name}</span>
              <ReleaseStatusBadge status={current.status} />
            </div>
            {(current.startDate || current.targetDate) && (
              <p className="text-sm text-muted-foreground">
                {formatDay(current.startDate) ?? "No start date"} –{" "}
                {formatDay(current.targetDate) ?? "no target date"}
              </p>
            )}
            {current.description && (
              <p className="text-sm">{current.description}</p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No release is {RELEASE_STATUS_LABELS.in_progress.toLowerCase()}.
          </p>
        )}
        {current && (
          <Link
            to={`reports?release=${current.id}`}
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Can it ship? See the release report
          </Link>
        )}
      </CardContent>
    </Card>
  )
}

function Team() {
  const { project, allowed } = useProjectContext()
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Team</h2>
        </CardTitle>
        <CardAction>
          <Link
            to="members"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            {allowed("members:manage") ? "Manage members" : "See members"}
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm">
          <span className="text-muted-foreground">QA Leads: </span>
          {project.leads.length > 0 ? (
            project.leads.map((lead) => lead.name).join(", ")
          ) : (
            <span className="text-amber-700 dark:text-amber-400">
              No active QA Lead. An admin should assign one.
            </span>
          )}
        </p>
        <dl className="flex gap-8">
          {(["lead", "tester", "viewer"] as const).map((role) => (
            <div key={role} className="flex flex-col-reverse">
              <dt className="text-xs text-muted-foreground">
                {PROJECT_ROLE_LABELS[role]}s
              </dt>
              <dd className="text-2xl font-semibold tabular-nums">
                {project.roleCounts[role]}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

function RecentActivity() {
  const { project } = useProjectContext()
  const activity = useActivity(project.key)
  const items = activity.data?.items ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Recent activity</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activity.isPending ? (
          <Skeleton className="h-24" />
        ) : activity.isError ? (
          <p className="text-sm text-destructive">
            {errorMessage(activity.error)}
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <li key={item.id} className="flex gap-3 py-2.5 text-sm">
                <span className="flex-1">
                  <span className="font-semibold">{item.actor.name}</span>{" "}
                  {describeActivity(item)}
                </span>
                <time
                  dateTime={item.createdAt}
                  title={exactTime.format(new Date(item.createdAt))}
                  className="whitespace-nowrap text-muted-foreground"
                >
                  {timeAgo(item.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function AdminMenu() {
  const { project } = useProjectContext()
  const setArchived = useSetArchived(project.key)
  const [editing, setEditing] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)

  async function apply(archived: boolean) {
    try {
      await setArchived.mutateAsync(archived)
      toast.add({
        title: archived
          ? `${project.name} archived`
          : `${project.name} restored`,
      })
      setConfirmArchive(false)
    } catch (err) {
      toast.add({
        type: "error",
        title: archived ? "Couldn't archive" : "Couldn't restore",
        description: errorMessage(err),
      })
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              aria-label="Project actions"
            />
          }
        >
          <EllipsisIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          {!project.archived && (
            <DropdownMenuItem onClick={() => setEditing(true)}>
              <PencilIcon />
              Edit details
            </DropdownMenuItem>
          )}
          {project.archived ? (
            <DropdownMenuItem onClick={() => void apply(false)}>
              <ArchiveRestoreIcon />
              Restore project
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setConfirmArchive(true)}
            >
              <ArchiveIcon />
              Archive project
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <EditProjectDialog open={editing} onOpenChange={setEditing} />
      <AlertDialog open={confirmArchive} onOpenChange={setConfirmArchive}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {project.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              It becomes read-only for everyone and moves to the Archived tab.
              Nothing is deleted, and you can restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={setArchived.isPending}
              onClick={() => void apply(true)}
            >
              {setArchived.isPending && <Spinner data-icon="inline-start" />}
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function ProjectOverviewPage() {
  const { project, allowed } = useProjectContext()

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-start gap-4">
        <ProjectTile projectKey={project.key} size="xl" />
        <div className="flex min-w-60 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              {project.name}
            </h1>
            <Badge
              variant={project.myRole === "lead" ? "default" : "secondary"}
            >
              You:{" "}
              {project.myRole ? PROJECT_ROLE_LABELS[project.myRole] : "Admin"}
            </Badge>
          </div>
          {project.description && (
            <p className="text-sm text-muted-foreground">
              {project.description}
            </p>
          )}
        </div>
        {allowed("projects:manage") && <AdminMenu />}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <CurrentRelease />
        <Team />
      </div>
      <RecentActivity />
    </div>
  )
}
