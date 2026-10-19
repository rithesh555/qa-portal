import type { ReactNode } from "react"
import { createBrowserRouter } from "react-router"
import { RequireAuth, RequirePermission } from "@/features/auth/guards"
import { LoginPage } from "@/features/auth/login-page"
import { CaseEditorPage } from "@/features/cases/case-editor-page"
import { CasePage } from "@/features/cases/case-page"
import { CasesPage } from "@/features/cases/cases-page"
import { ImportPage } from "@/features/cases/import-page"
import { DefectPage } from "@/features/defects/defect-page"
import { DefectsPage } from "@/features/defects/defects-page"
import { NewDefectPage } from "@/features/defects/new-defect-page"
import { MembersPage } from "@/features/projects/members-page"
import { ProjectOverviewPage } from "@/features/projects/overview-page"
import { ProjectLayout } from "@/features/projects/project-layout"
import { ProjectsPage } from "@/features/projects/projects-page"
import { ReleasesPage } from "@/features/projects/releases-page"
import { HomePage } from "@/features/reports/home-page"
import { PrintReportPage } from "@/features/reports/print-page"
import { ReleasesOverviewPage } from "@/features/reports/releases-overview-page"
import { ReportsPage } from "@/features/reports/reports-page"
import { NewRunPage } from "@/features/runs/new-run-page"
import { RunPage } from "@/features/runs/run-page"
import { RunsPage } from "@/features/runs/runs-page"
import { UsersPage } from "@/features/users/users-page"
import { ModulePlaceholder } from "@/pages/module-placeholder"
import { NotFound } from "@/pages/not-found"
import { AppShell } from "./app-shell"
import { PROJECT_NAV } from "./nav"

const BUILT: Partial<Record<string, ReactNode>> = {
  "": <ProjectOverviewPage />,
  cases: <CasesPage />,
  defects: <DefectsPage />,
  members: <MembersPage />,
  releases: <ReleasesPage />,
  reports: <ReportsPage />,
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

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      // The printable report has no app chrome: it's one A4 page.
      { path: "/projects/:key/reports/print", element: <PrintReportPage /> },
      {
        path: "/",
        element: <AppShell />,
        children: [
          { index: true, element: <HomePage /> },
          { path: "projects", element: <ProjectsPage /> },
          { path: "releases", element: <ReleasesOverviewPage /> },
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
              { path: "defects/new", element: <NewDefectPage /> },
              { path: "defects/:ref", element: <DefectPage /> },
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
