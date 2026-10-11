import type { ReactNode } from "react"
import { createBrowserRouter, type RouteObject } from "react-router"
import { RequireAuth, RequirePermission } from "@/features/auth/guards"
import { LoginPage } from "@/features/auth/login-page"
import { UsersPage } from "@/features/users/users-page"
import { ModulePlaceholder } from "@/pages/module-placeholder"
import { NotFound } from "@/pages/not-found"
import { AppShell } from "./app-shell"
import { NAV, type NavItem } from "./nav"

// Built modules; the rest show a placeholder until their phase.
const PAGES: Partial<Record<string, ReactNode>> = {
  "/users": <UsersPage />,
}

// Admin-only modules sit behind their permission; project data is scoped by the API.
const moduleRoutes: RouteObject[] = NAV.map((item) => ({
  element: item.permission ? (
    <RequirePermission action={item.permission} />
  ) : undefined,
  children: [
    item.path === "/"
      ? { index: true, element: pageFor(item) }
      : { path: item.path.slice(1), element: pageFor(item) },
  ],
}))

function pageFor(item: NavItem) {
  return PAGES[item.path] ?? <ModulePlaceholder item={item} />
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [{ path: "/", element: <AppShell />, children: moduleRoutes }],
  },
  { path: "*", element: <NotFound /> },
])
