import {
  homeSchema,
  releaseSummarySchema,
  type ReportExportKind,
  reportExportSchema,
  reportSchema,
} from "@qa/shared"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { z } from "zod"
import { projectKeys } from "@/features/projects/api"
import { apiGet, toSearch } from "@/lib/api"

/** Which runs a report covers: a release id, or "none" for runs with no release. */
export type ReportScope = string

export const reportKeys = {
  report: (key: string, release: ReportScope, live: boolean) =>
    [...projectKeys.scoped(key), "report", release, live] as const,
  home: ["home"] as const,
  overview: ["releases-overview"] as const,
}

const path = (key: string, rest: string) =>
  `/projects/${encodeURIComponent(key)}${rest}`

export function useReport(
  key: string,
  release: ReportScope | null,
  live: boolean
) {
  return useQuery({
    enabled: release !== null,
    queryKey: reportKeys.report(key, release ?? "", live),
    queryFn: ({ signal }) =>
      apiGet(
        path(
          key,
          `/reports?${toSearch({ release, live: live ? "true" : undefined })}`
        ),
        reportSchema,
        { signal }
      ),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
  })
}

/** The rows behind a report, fetched when someone asks for a CSV. */
export function fetchReportExport(
  key: string,
  release: ReportScope,
  kind: ReportExportKind
) {
  return apiGet(
    path(key, `/reports/export?${toSearch({ release, kind })}`),
    reportExportSchema
  )
}

export function useHome() {
  return useQuery({
    queryKey: reportKeys.home,
    queryFn: ({ signal }) => apiGet("/home", homeSchema, { signal }),
    // Summarising every active release is costly; refresh on a minute's age, not every focus.
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

const overview = z.object({ items: z.array(releaseSummarySchema) })

export function useReleasesOverview() {
  return useQuery({
    queryKey: reportKeys.overview,
    queryFn: ({ signal }) => apiGet("/releases/overview", overview, { signal }),
  })
}
