import { PROJECT_ROLE_LABELS, type ProjectSummary } from "@qa/shared"
import { CheckIcon, ChevronsUpDownIcon, FolderKanbanIcon } from "lucide-react"
import { useDeferredValue, useState } from "react"
import { useLocation, useNavigate } from "react-router"
import { ProjectTile } from "@/components/project-tile"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { SidebarMenuButton } from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import { useProjects } from "./api"
import { InlineError } from "@/components/inline-error"

function roleText(project: Pick<ProjectSummary, "myRole">) {
  return project.myRole ? PROJECT_ROLE_LABELS[project.myRole] : "Admin"
}

/** Admins see every project, so repeating "Admin" on each row is noise. */
function rowRole(project: Pick<ProjectSummary, "myRole">) {
  return project.myRole ? PROJECT_ROLE_LABELS[project.myRole] : null
}

/**
 * Sidebar control showing the current project; opens a searchable list of
 * the user's projects. Switching keeps you on the same kind of page
 * (Members → Members) when you're inside a project.
 */
export function ProjectSwitcher({
  current,
  onNavigate,
}: {
  current: Pick<ProjectSummary, "key" | "name" | "myRole"> | null
  onNavigate?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const q = useDeferredValue(search.trim())
  // Only load the list while the switcher is open.
  const projects = useProjects(
    { q, pageSize: 20, sort: "name" },
    { enabled: open }
  )
  // The highlighted row: Enter opens it. Starts on the current project, then
  // follows the first match while searching.
  const [active, setActive] = useState("")
  const navigate = useNavigate()
  const { pathname } = useLocation()

  function go(to: string) {
    setOpen(false)
    setSearch("")
    onNavigate?.()
    navigate(to)
  }

  function pathFor(key: string) {
    const section = /^\/projects\/[^/]+\/([^/]+)/.exec(pathname)?.[1]
    return section ? `/projects/${key}/${section}` : `/projects/${key}`
  }

  const items = projects.data?.items ?? []
  const keys = items.map((p) => p.key)
  const highlighted = keys.includes(active)
    ? active
    : current && keys.includes(current.key) && !q
      ? current.key
      : (keys[0] ?? "")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <SidebarMenuButton
            size="lg"
            className="border bg-background data-popup-open:bg-sidebar-accent"
            tooltip={current ? `Project: ${current.name}` : "Choose a project"}
          />
        }
      >
        {current ? (
          <ProjectTile projectKey={current.key} />
        ) : (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-dashed">
            <FolderKanbanIcon className="size-4" />
          </span>
        )}
        <span className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-semibold">
            {current?.name ?? "Choose a project"}
          </span>
          {current && (
            <span className="truncate text-xs text-muted-foreground">
              {roleText(current)}
            </span>
          )}
        </span>
        <ChevronsUpDownIcon className="ml-auto" />
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        className="w-80 p-0"
        aria-label="Switch project"
      >
        <Command
          shouldFilter={false}
          value={highlighted}
          onValueChange={setActive}
        >
          <CommandInput
            placeholder="Find a project…"
            value={search}
            onValueChange={(value) => {
              setSearch(value)
              setActive("")
            }}
            aria-label="Find a project"
          />
          <CommandList>
            {projects.isPending ? (
              <div className="flex justify-center p-4">
                <Spinner />
              </div>
            ) : projects.isError ? (
              <InlineError
                what="Couldn't load your projects."
                error={projects.error}
                onRetry={() => void projects.refetch()}
                className="p-3"
              />
            ) : (
              <CommandEmpty>No projects match.</CommandEmpty>
            )}
            {items.length > 0 && (
              <CommandGroup heading={q ? "Matching projects" : "Your projects"}>
                {items.map((project) => (
                  <CommandItem
                    key={project.key}
                    value={project.key}
                    onSelect={() => go(pathFor(project.key))}
                  >
                    <ProjectTile projectKey={project.key} size="sm" />
                    <span className="flex-1 truncate font-medium">
                      {project.name}
                      <span className="sr-only">
                        {` (${project.key})`}
                        {project.key === current?.key && ", current project"}
                      </span>
                    </span>
                    {rowRole(project) && (
                      <span className="text-xs text-muted-foreground">
                        {rowRole(project)}
                      </span>
                    )}
                    <CheckIcon
                      className={
                        project.key === current?.key
                          ? "opacity-100"
                          : "opacity-0"
                      }
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandSeparator />
            <CommandGroup>
              <CommandItem value="__all" onSelect={() => go("/projects")}>
                <FolderKanbanIcon />
                All projects
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
