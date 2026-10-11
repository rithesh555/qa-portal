import { hasRole, type Role } from "@qa/shared"
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
  /** Least privileged role that can open this module. */
  minRole: Role
  /** Phase in which the module gets built (for placeholder pages). */
  phase: number
}

export const NAV: readonly NavItem[] = [
  { title: "Home", path: "/", icon: HouseIcon, minRole: "viewer", phase: 2 },
  {
    title: "Projects",
    path: "/projects",
    icon: FolderKanbanIcon,
    minRole: "viewer",
    phase: 3,
  },
  {
    title: "Test cases",
    path: "/test-cases",
    icon: ListChecksIcon,
    minRole: "viewer",
    phase: 3,
  },
  {
    title: "Test runs",
    path: "/test-runs",
    icon: PlayIcon,
    minRole: "viewer",
    phase: 4,
  },
  {
    title: "Defects",
    path: "/defects",
    icon: BugIcon,
    minRole: "viewer",
    phase: 5,
  },
  {
    title: "Reports",
    path: "/reports",
    icon: ChartColumnIcon,
    minRole: "viewer",
    phase: 6,
  },
  {
    title: "Users",
    path: "/users",
    icon: UsersIcon,
    minRole: "admin",
    phase: 7,
  },
]

export function navFor(role: Role): NavItem[] {
  return NAV.filter((item) => hasRole(role, item.minRole))
}
