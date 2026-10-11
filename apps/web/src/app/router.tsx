import { createBrowserRouter, type RouteObject } from "react-router"
import { RequireAuth, RequireRole } from "@/features/auth/guards"
import { LoginPage } from "@/features/auth/login-page"
import { ModulePlaceholder } from "@/pages/module-placeholder"
import { NotFound } from "@/pages/not-found"
import { AppShell } from "./app-shell"
import { NAV } from "./nav"

// Every module is a placeholder until its phase; each sits behind its role.
const moduleRoutes: RouteObject[] = NAV.map((item) => ({
  element: <RequireRole minimum={item.minRole} />,
  children: [
    item.path === "/"
      ? { index: true, element: <ModulePlaceholder item={item} /> }
      : {
          path: item.path.slice(1),
          element: <ModulePlaceholder item={item} />,
        },
  ],
}))

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [{ path: "/", element: <AppShell />, children: moduleRoutes }],
  },
  { path: "*", element: <NotFound /> },
])
