import { DataError } from "@/components/composites/data-state"
import {
  PROJECT_ROLE_LABELS,
  PROJECT_STATUSES,
  type ProjectSummary,
  projectListQuerySchema,
} from "@qa/shared"
import { FolderKanbanIcon, PlusIcon, TriangleAlertIcon } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"
import { PageHeader } from "@/components/composites/page-header"
import { ListPagination } from "@/components/list-pagination"
import { SearchBox } from "@/components/search-box"
import { ProjectTile } from "@/components/project-tile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCan } from "@/hooks/use-can"
import { useSession } from "@/features/auth/session"
import { useListParams } from "@/hooks/use-list-params"
import { useProjects } from "./api"
import { NewProjectDialog } from "./new-project-dialog"

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" })

function RoleBadge({ project }: { project: ProjectSummary }) {
  if (!project.myRole) return null
  const variant =
    project.myRole === "lead"
      ? "default"
      : project.myRole === "tester"
        ? "secondary"
        : "outline"
  return <Badge variant={variant}>{PROJECT_ROLE_LABELS[project.myRole]}</Badge>
}

function ProjectCards({ projects }: { projects: ProjectSummary[] }) {
  return (
    <ul className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <li key={project.id}>
          <Link
            to={`/projects/${project.key}`}
            className="flex h-full flex-col gap-3.5 rounded-xl border bg-card p-5 transition-colors outline-none hover:border-rule-strong focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <div className="flex items-center gap-3">
              <ProjectTile projectKey={project.key} size="lg" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-semibold">{project.name}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {project.key}
                </span>
              </span>
              <span className="ml-auto">
                <RoleBadge project={project} />
              </span>
            </div>
            {project.description && (
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {project.description}
              </p>
            )}
            <div className="mt-auto flex gap-4 border-t pt-3 text-xs text-muted-foreground">
              <span className="tabular-nums">
                {project.memberCount}{" "}
                {project.memberCount === 1 ? "member" : "members"}
              </span>
              <span>
                {project.currentRelease
                  ? `Release: ${project.currentRelease.name}`
                  : "No active release"}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function ProjectTable({ projects }: { projects: ProjectSummary[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead>QA Leads</TableHead>
            <TableHead className="hidden sm:table-cell">Members</TableHead>
            <TableHead className="hidden md:table-cell">
              Current release
            </TableHead>
            <TableHead className="hidden lg:table-cell">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id}>
              <TableCell>
                <Link
                  to={`/projects/${project.key}`}
                  className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <ProjectTile projectKey={project.key} />
                  <span className="flex flex-col">
                    <span className="font-medium">{project.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {project.key}
                    </span>
                  </span>
                </Link>
              </TableCell>
              <TableCell>
                {project.leads.length > 0 ? (
                  project.leads.map((lead) => lead.name).join(", ")
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-warning-ink">
                    <TriangleAlertIcon className="size-3.5" />
                    No active lead
                  </span>
                )}
              </TableCell>
              <TableCell className="hidden tabular-nums sm:table-cell">
                {project.memberCount}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {project.currentRelease?.name ?? (
                  <span className="text-muted-foreground">None</span>
                )}
              </TableCell>
              <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">
                {dateFormat.format(new Date(project.createdAt))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function ProjectsPage() {
  const [query, setQuery] = useListParams(projectListQuerySchema)
  const projects = useProjects(query)
  const { data: user } = useSession()
  const isAdmin = useCan()("projects:manage")
  const [creating, setCreating] = useState(false)

  const page = projects.data
  const filtered = Boolean(query.q) || query.status !== "active"

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHeader
        title="Projects"
        description={
          isAdmin
            ? "As an admin you see every project. Each project's QA Leads manage its members."
            : "The projects you're a member of. An admin or a project's QA Lead can add you to others."
        }
        actions={
          isAdmin && (
            <Button onClick={() => setCreating(true)}>
              <PlusIcon data-icon="inline-start" />
              New project
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={query.status}
          onValueChange={(status) => setQuery({ status: status as string })}
        >
          <TabsList>
            {PROJECT_STATUSES.map((status) => (
              <TabsTrigger key={status} value={status}>
                {status === "active" ? "Active" : "Archived"}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <SearchBox
          value={query.q ?? ""}
          onChange={(q) => setQuery({ q })}
          label={isAdmin ? "Search name or key" : "Search projects"}
        />
      </div>

      {projects.isError ? (
        <DataError
          title="Couldn't load projects"
          error={projects.error}
          onRetry={() => void projects.refetch()}
        />
      ) : !page ? (
        // Placeholders shaped like the result: table rows for admins, cards
        // for members, so nothing jumps when the data arrives.
        isAdmin ? (
          <div className="flex flex-col gap-2 rounded-xl border bg-card p-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        )
      ) : page.total === 0 ? (
        <Empty role="status" className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderKanbanIcon />
            </EmptyMedia>
            <EmptyTitle>
              {filtered
                ? "No projects match"
                : isAdmin
                  ? "No projects yet"
                  : "You're not on any project yet"}
            </EmptyTitle>
            <EmptyDescription>
              {filtered ? (
                "Try another search, or check the other tab."
              ) : isAdmin ? (
                "Create the first one with New project."
              ) : (
                <>
                  Projects appear here once an admin or a project&apos;s QA Lead
                  adds you. Ask them, and share your username:{" "}
                  <span className="font-mono text-foreground">
                    {user?.username}
                  </span>
                </>
              )}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {isAdmin ? (
            <ProjectTable projects={page.items} />
          ) : (
            <ProjectCards projects={page.items} />
          )}
          <ListPagination
            page={page.page}
            pageSize={page.pageSize}
            total={page.total}
            noun={["project", "projects"]}
            onPageChange={(next) => setQuery({ page: next })}
          />
        </div>
      )}

      {isAdmin && (
        <NewProjectDialog open={creating} onOpenChange={setCreating} />
      )}
    </div>
  )
}
