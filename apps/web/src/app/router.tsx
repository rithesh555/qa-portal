import type { ComponentType } from "react"
import { createBrowserRouter } from "react-router"
import { FullPageSpinner } from "@/components/full-page-spinner"
import { RequireAuth, RequirePermission } from "@/features/auth/guards"
import { LoginPage } from "@/features/auth/login-page"
import { ProjectLayout } from "@/features/projects/project-layout"
import { NotFound } from "@/pages/not-found"
import { RouteError } from "@/pages/route-error"
import { AppShell } from "./app-shell"

/**
 * A page whose code downloads the first time someone opens it, so the first
 * load carries only the shell, sign-in and the page in the address bar.
 * Function-form `lazy`: if the download fails (say, after an update), the
 * error reaches the route's error page; the object form swallows it and
 * leaves a blank page.
 */
function page<M>(load: () => Promise<M>, pick: (m: M) => ComponentType) {
  return { lazy: async () => ({ Component: pick(await load()) }) }
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <RequireAuth />,
    // Outside the shell (print view) or the shell itself failing.
    errorElement: <RouteError />,
    // Shown on a first visit while the opened page's code arrives.
    hydrateFallbackElement: <FullPageSpinner label="Loading…" />,
    children: [
      // The printable report has no app chrome: it's one A4 page.
      {
        path: "/projects/:key/reports/print",
        ...page(
          () => import("@/features/reports/print-page"),
          (m) => m.PrintReportPage
        ),
      },
      {
        path: "/",
        element: <AppShell />,
        children: [
          {
            // A page that fails to load or crashes: an error page in the shell.
            errorElement: <RouteError />,
            children: [
              {
                index: true,
                ...page(
                  () => import("@/features/reports/home-page"),
                  (m) => m.HomePage
                ),
              },
              {
                path: "projects",
                ...page(
                  () => import("@/features/projects/projects-page"),
                  (m) => m.ProjectsPage
                ),
              },
              {
                path: "releases",
                ...page(
                  () => import("@/features/reports/releases-overview-page"),
                  (m) => m.ReleasesOverviewPage
                ),
              },
              {
                path: "projects/:key",
                element: <ProjectLayout />,
                children: [
                  {
                    index: true,
                    ...page(
                      () => import("@/features/projects/overview-page"),
                      (m) => m.ProjectOverviewPage
                    ),
                  },
                  {
                    path: "cases",
                    ...page(
                      () => import("@/features/cases/cases-page"),
                      (m) => m.CasesPage
                    ),
                  },
                  {
                    path: "cases/new",
                    ...page(
                      () => import("@/features/cases/case-editor-page"),
                      (m) => m.CaseEditorPage
                    ),
                  },
                  {
                    path: "cases/import",
                    ...page(
                      () => import("@/features/cases/import-page"),
                      (m) => m.ImportPage
                    ),
                  },
                  {
                    path: "cases/:ref",
                    ...page(
                      () => import("@/features/cases/case-page"),
                      (m) => m.CasePage
                    ),
                  },
                  {
                    path: "cases/:ref/edit",
                    ...page(
                      () => import("@/features/cases/case-editor-page"),
                      (m) => m.CaseEditorPage
                    ),
                  },
                  {
                    path: "runs",
                    ...page(
                      () => import("@/features/runs/runs-page"),
                      (m) => m.RunsPage
                    ),
                  },
                  {
                    path: "runs/new",
                    ...page(
                      () => import("@/features/runs/new-run-page"),
                      (m) => m.NewRunPage
                    ),
                  },
                  {
                    path: "runs/:ref",
                    ...page(
                      () => import("@/features/runs/run-page"),
                      (m) => m.RunPage
                    ),
                  },
                  {
                    path: "defects",
                    ...page(
                      () => import("@/features/defects/defects-page"),
                      (m) => m.DefectsPage
                    ),
                  },
                  {
                    path: "defects/new",
                    ...page(
                      () => import("@/features/defects/new-defect-page"),
                      (m) => m.NewDefectPage
                    ),
                  },
                  {
                    path: "defects/:ref",
                    ...page(
                      () => import("@/features/defects/defect-page"),
                      (m) => m.DefectPage
                    ),
                  },
                  {
                    path: "releases",
                    ...page(
                      () => import("@/features/projects/releases-page"),
                      (m) => m.ReleasesPage
                    ),
                  },
                  {
                    path: "reports",
                    ...page(
                      () => import("@/features/reports/reports-page"),
                      (m) => m.ReportsPage
                    ),
                  },
                  {
                    path: "members",
                    ...page(
                      () => import("@/features/projects/members-page"),
                      (m) => m.MembersPage
                    ),
                  },
                  { path: "*", element: <NotFound /> },
                ],
              },
              {
                element: <RequirePermission action="users:manage" />,
                children: [
                  {
                    path: "users",
                    ...page(
                      () => import("@/features/users/users-page"),
                      (m) => m.UsersPage
                    ),
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: (
      <div className="flex min-h-svh flex-col">
        <NotFound />
      </div>
    ),
  },
])
