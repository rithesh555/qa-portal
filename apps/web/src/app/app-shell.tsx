import { PORTAL_ROLE_LABELS, type ProjectSummary } from "@qa/shared"
import { ChevronsUpDownIcon, KeyRoundIcon, LogOutIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { NavLink, Outlet, useLocation } from "react-router"
import { BrandMark } from "@/components/brand-mark"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { ChangePasswordDialog } from "@/features/auth/change-password-dialog"
import { useSession } from "@/features/auth/session"
import { useSignOut } from "@/features/auth/use-sign-out"
import { useProject } from "@/features/projects/api"
import {
  useLastProjectKey,
  useRouteProjectKey,
} from "@/features/projects/current-project"
import { ProjectSwitcher } from "@/features/projects/project-switcher"
import { ApiError } from "@/lib/api"
import { NAV, type NavItem, navFor, PROJECT_NAV, projectPath } from "./nav"

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

function isActive(itemPath: string, pathname: string): boolean {
  // "/" and "/projects" are exact: inside a project the project's own
  // pages are highlighted instead.
  if (itemPath === "/" || itemPath === "/projects") return pathname === itemPath
  return pathname.startsWith(itemPath)
}

function UserMenu() {
  const { data: user } = useSession()
  const signOut = useSignOut()
  const [changingPassword, setChangingPassword] = useState(false)
  if (!user) return null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <SidebarMenuButton
              size="lg"
              className="data-popup-open:bg-sidebar-accent"
            />
          }
        >
          <Avatar className="size-8 rounded-md">
            <AvatarFallback className="rounded-md">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {PORTAL_ROLE_LABELS[user.role]}
            </span>
          </span>
          <ChevronsUpDownIcon className="ml-auto" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <span className="block font-medium text-foreground">
                {user.name}
              </span>
              <span className="block truncate font-normal">
                @{user.username}
              </span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setChangingPassword(true)}>
              <KeyRoundIcon />
              Change password
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void signOut()}>
              <LogOutIcon />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <ChangePasswordDialog
        open={changingPassword}
        onOpenChange={setChangingPassword}
      />
    </>
  )
}

function AppSidebar({
  items,
  pathname,
  project,
}: {
  items: NavItem[]
  pathname: string
  project: CurrentProject | null
}) {
  const { isMobile, setOpenMobile } = useSidebar()
  // On phones the sidebar is a sheet over the page; close it once a link is chosen.
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<NavLink to="/" onClick={closeOnMobile} />}
            >
              <span className="flex size-8 shrink-0 items-center justify-center">
                <BrandMark className="w-7" />
              </span>
              <span className="truncate font-semibold">QA Portal</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={isActive(item.path, pathname)}
                    tooltip={item.title}
                    render={
                      <NavLink
                        to={item.path}
                        end={item.path === "/" || item.path === "/projects"}
                        onClick={closeOnMobile}
                      />
                    }
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Current project</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <ProjectSwitcher current={project} onNavigate={closeOnMobile} />
              </SidebarMenuItem>
              {project &&
                PROJECT_NAV.map((item) => {
                  const to = projectPath(project.key, item.path)
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        isActive={
                          item.path ? pathname.startsWith(to) : pathname === to
                        }
                        tooltip={item.title}
                        render={<NavLink to={to} end onClick={closeOnMobile} />}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <UserMenu />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

type CurrentProject = Pick<ProjectSummary, "key" | "name" | "myRole">

/**
 * The project shown in the sidebar: the one in the URL, else the last one
 * opened. A remembered project that's gone (removed from it, or it no longer
 * exists) is forgotten.
 */
function useSidebarProject(): CurrentProject | null {
  const routeKey = useRouteProjectKey()
  const [lastKey, rememberKey] = useLastProjectKey()
  const route = useProject(routeKey)
  // On a project page that fails (not found), keep showing the last project.
  const useLast = !routeKey || route.isError
  const last = useProject(useLast && lastKey !== routeKey ? lastKey : null)
  const lastMissing =
    last.error instanceof ApiError && last.error.status === 404

  useEffect(() => {
    if (routeKey && route.data) rememberKey(routeKey)
    if (lastMissing) rememberKey(null)
  }, [routeKey, route.data, lastMissing, rememberKey])

  const resolved = route.data ?? (useLast ? (last.data ?? null) : null)
  // While a newly chosen project loads, keep showing the previous one rather
  // than flashing "Choose a project".
  const [shown, setShown] = useState<CurrentProject | null>(resolved)
  if (resolved && resolved !== shown) setShown(resolved)
  return routeKey && route.isPending ? shown : resolved
}

/** "Payments / Members" inside a project, else the module title. */
function headerTitle(pathname: string, project: CurrentProject | null) {
  const inProject = /^\/projects\/([^/]+)(?:\/([^/]+))?/.exec(pathname)
  if (inProject && project?.key === inProject[1]?.toUpperCase()) {
    const page = PROJECT_NAV.find((item) => item.path === (inProject[2] ?? ""))
    if (!page) return "Page not found"
    return (
      <>
        <span className="text-muted-foreground">{project.name}</span>
        <span aria-hidden="true" className="text-muted-foreground">
          /
        </span>
        <span>{page.title}</span>
      </>
    )
  }
  if (inProject) return "Projects"
  return NAV.find((item) => isActive(item.path, pathname))?.title ?? "QA Portal"
}

export function AppShell() {
  const { data: user } = useSession()
  const { pathname } = useLocation()
  const items = user ? navFor(user.role) : []
  const project = useSidebarProject()

  return (
    <SidebarProvider>
      <AppSidebar items={items} pathname={pathname} project={project} />
      {/* min-w-0: wide tables scroll inside the page instead of widening it. */}
      <SidebarInset className="min-w-0">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-center"
          />
          <span className="flex min-w-0 items-center gap-2 truncate text-sm font-medium">
            {headerTitle(pathname, project)}
          </span>
        </header>
        <div className="flex flex-1 flex-col p-4 md:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
