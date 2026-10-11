import { type Action, can, type PortalRole } from "@qa/shared"
import {
  BugIcon,
  ChartColumnIcon,
  FolderKanbanIcon,
  HouseIcon,
  ListChecksIcon,
  PlayIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  title: string
  path: string
  icon: LucideIcon
  /** Portal-wide action needed to open this module; none = every signed-in user. */
  permission?: Action
  /** Phase in which the module gets built (for placeholder pages). */
  phase: number
}

export const NAV: readonly NavItem[] = [
  { title: "Home", path: "/", icon: HouseIcon, phase: 7 },
  {
    title: "Projects",
    path: "/projects",
    icon: FolderKanbanIcon,
    phase: 3,
  },
  {
    title: "Test cases",
    path: "/test-cases",
    icon: ListChecksIcon,
    phase: 4,
  },
  {
    title: "Test runs",
    path: "/test-runs",
    icon: PlayIcon,
    phase: 5,
  },
  {
    title: "Defects",
    path: "/defects",
    icon: BugIcon,
    phase: 6,
  },
  {
    title: "Reports",
    path: "/reports",
    icon: ChartColumnIcon,
    phase: 7,
  },
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
