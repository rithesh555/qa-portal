import { ROLE_LABELS } from "@qa/shared"
import { ChevronsUpDownIcon, LogOutIcon } from "lucide-react"
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
import { useSession } from "@/features/auth/session"
import { useSignOut } from "@/features/auth/use-sign-out"
import { NAV, type NavItem, navFor } from "./nav"

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

function isActive(itemPath: string, pathname: string): boolean {
  return itemPath === "/" ? pathname === "/" : pathname.startsWith(itemPath)
}

function UserMenu() {
  const { data: user } = useSession()
  const signOut = useSignOut()
  if (!user) return null

  return (
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
            {ROLE_LABELS[user.role]}
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
            <span className="block truncate font-normal">@{user.username}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => void signOut()}>
            <LogOutIcon />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function AppSidebar({
  items,
  pathname,
}: {
  items: NavItem[]
  pathname: string
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
                        end={item.path === "/"}
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

export function AppShell() {
  const { data: user } = useSession()
  const { pathname } = useLocation()
  const items = user ? navFor(user.role) : []
  const current = NAV.find((item) => isActive(item.path, pathname))

  return (
    <SidebarProvider>
      <AppSidebar items={items} pathname={pathname} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-center"
          />
          <span className="text-sm font-medium">
            {current?.title ?? "QA Portal"}
          </span>
        </header>
        <div className="flex flex-1 flex-col p-4 md:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
