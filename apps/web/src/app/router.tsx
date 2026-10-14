import type { ReactNode } from "react"
import { createBrowserRouter } from "react-router"
import { RequireAuth, RequirePermission } from "@/features/auth/guards"
import { LoginPage } from "@/features/auth/login-page"
import { CaseEditorPage } from "@/features/cases/case-editor-page"
import { CasePage } from "@/features/cases/case-page"
import { CasesPage } from "@/features/cases/cases-page"
import { ImportPage } from "@/features/cases/import-page"
import { MembersPage } from "@/features/projects/members-page"
import { ProjectOverviewPage } from "@/features/projects/overview-page"
import { ProjectLayout } from "@/features/projects/project-layout"
import { ProjectsPage } from "@/features/projects/projects-page"
import { ReleasesPage } from "@/features/projects/releases-page"
import { NewRunPage } from "@/features/runs/new-run-page"
import { RunPage } from "@/features/runs/run-page"
import { RunsPage } from "@/features/runs/runs-page"
import { UsersPage } from "@/features/users/users-page"
import { ModulePlaceholder } from "@/pages/module-placeholder"
import { NotFound } from "@/pages/not-found"
import { AppShell } from "./app-shell"
import { NAV, PROJECT_NAV } from "./nav"

const BUILT: Partial<Record<string, ReactNode>> = {
  "": <ProjectOverviewPage />,
  cases: <CasesPage />,
  members: <MembersPage />,
  releases: <ReleasesPage />,
  runs: <RunsPage />,
}

// Project pages from later phases show a placeholder until they're built.
const projectPages = PROJECT_NAV.map((item) =>
  item.path
    ? {
        path: item.path,
        element: BUILT[item.path] ?? <ModulePlaceholder item={item} />,
      }
    : { index: true, element: BUILT[""] }
)

const home = NAV.find((item) => item.path === "/")!

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        path: "/",
        element: <AppShell />,
        children: [
          { index: true, element: <ModulePlaceholder item={home} /> },
          { path: "projects", element: <ProjectsPage /> },
          {
            path: "projects/:key",
            element: <ProjectLayout />,
            children: [
              ...projectPages,
              { path: "cases/new", element: <CaseEditorPage /> },
              { path: "cases/import", element: <ImportPage /> },
              { path: "cases/:ref", element: <CasePage /> },
              { path: "cases/:ref/edit", element: <CaseEditorPage /> },
              { path: "runs/new", element: <NewRunPage /> },
              { path: "runs/:ref", element: <RunPage /> },
              { path: "*", element: <NotFound /> },
            ],
          },
          {
            element: <RequirePermission action="users:manage" />,
            children: [{ path: "users", element: <UsersPage /> }],
          },
        ],
      },
    ],
  },
  { path: "*", element: <NotFound /> },
])
