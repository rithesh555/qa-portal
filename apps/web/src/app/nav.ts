import { type Action, can, type PortalRole } from "@qa/shared"
import {
  BugIcon,
  ChartColumnIcon,
  FlagIcon,
  FolderKanbanIcon,
  HouseIcon,
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
  /** Phase in which the page gets built (for placeholder pages). */
  phase: number
}

/** Workspace links, above the current project. */
export const NAV: readonly NavItem[] = [
  { title: "Home", path: "/", icon: HouseIcon, phase: 7 },
  { title: "Projects", path: "/projects", icon: FolderKanbanIcon, phase: 3 },
  {
    title: "Users",
    path: "/users",
    icon: UsersIcon,
    permission: "users:manage",
    phase: 2,
  },
]

export function navFor(role: PortalRole): NavItem[] {
  return NAV.filter(
    (item) => !item.permission || can(item.permission, { portalRole: role })
  )
}

/** Pages inside a project; `path` is relative to `/projects/:key`. */
export const PROJECT_NAV: readonly NavItem[] = [
  { title: "Overview", path: "", icon: LayoutDashboardIcon, phase: 3 },
  { title: "Test cases", path: "cases", icon: ListChecksIcon, phase: 4 },
  { title: "Test runs", path: "runs", icon: PlayIcon, phase: 5 },
  { title: "Defects", path: "defects", icon: BugIcon, phase: 6 },
  { title: "Releases", path: "releases", icon: FlagIcon, phase: 3 },
  { title: "Reports", path: "reports", icon: ChartColumnIcon, phase: 7 },
  { title: "Members", path: "members", icon: UsersRoundIcon, phase: 3 },
]

export function projectPath(key: string, page = ""): string {
  return page ? `/projects/${key}/${page}` : `/projects/${key}`
}
