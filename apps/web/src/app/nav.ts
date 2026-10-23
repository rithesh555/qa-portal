import { type Action, can, type PortalRole } from "@qa/shared"
import {
  BugIcon,
  ChartColumnIcon,
  FlagIcon,
  FolderKanbanIcon,
  HouseIcon,
  LayersIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  PlayIcon,
  UsersIcon,
  UsersRoundIcon,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  title: string
  path: string
  icon: LucideIcon
  /** Portal-wide action needed to open this module; none = every signed-in user. */
  permission?: Action
  /** Only for people who oversee several projects: admins, and QA Leads of two or more. */
  overseers?: boolean
}

/** Workspace links, above the current project. */
export const NAV: readonly NavItem[] = [
  { title: "Home", path: "/", icon: HouseIcon },
  { title: "Projects", path: "/projects", icon: FolderKanbanIcon },
  {
    title: "All releases",
    path: "/releases",
    icon: LayersIcon,
    overseers: true,
  },
  {
    title: "Users",
    path: "/users",
    icon: UsersIcon,
    permission: "users:manage",
  },
]

/** The workspace links a person sees; `projectsLed` counts the projects they're QA Lead of. */
export function navFor(role: PortalRole, projectsLed = 0): NavItem[] {
  return NAV.filter(
    (item) =>
      (!item.permission || can(item.permission, { portalRole: role })) &&
      (!item.overseers || role === "admin" || projectsLed >= 2)
  )
}

/** Pages inside a project; `path` is relative to `/projects/:key`. */
export const PROJECT_NAV: readonly NavItem[] = [
  { title: "Overview", path: "", icon: LayoutDashboardIcon },
  { title: "Test cases", path: "cases", icon: ListChecksIcon },
  { title: "Test runs", path: "runs", icon: PlayIcon },
  { title: "Defects", path: "defects", icon: BugIcon },
  { title: "Releases", path: "releases", icon: FlagIcon },
  { title: "Reports", path: "reports", icon: ChartColumnIcon },
  { title: "Members", path: "members", icon: UsersRoundIcon },
]

export function projectPath(key: string, page = ""): string {
  return page ? `/projects/${key}/${page}` : `/projects/${key}`
}

const PAGE_WORDS: Record<string, string> = { new: "New", import: "Import" }

/**
 * The document title for a path: the page (led by the item's key on detail
 * pages), then the project, then the portal, so tabs and history read well
 * and screen readers announce where a navigation landed.
 */
export function pageTitle(
  pathname: string,
  project: { key: string; name: string } | null
): string {
  const parts = [] as string[]
  const inProject = /^\/projects\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?/.exec(
    pathname
  )
  if (inProject) {
    if (project?.key !== inProject[1]?.toUpperCase()) parts.push("Projects")
    else {
      const page = PROJECT_NAV.find(
        (item) => item.path === (inProject[2] ?? "")
      )
      if (!page) parts.push("Page not found")
      else {
        const sub = inProject[3]
        if (sub) parts.push(PAGE_WORDS[sub] ?? sub.toUpperCase())
        parts.push(page.title, project.name)
      }
    }
  } else {
    const item = NAV.find((n) =>
      n.path === "/" || n.path === "/projects"
        ? pathname === n.path
        : pathname.startsWith(n.path)
    )
    if (item) parts.push(item.title)
  }
  return [...parts, "QA Portal"].join(" · ")
}
