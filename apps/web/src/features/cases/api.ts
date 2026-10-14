import {
  activityItemSchema,
  type BulkCaseAction,
  type CaseFilter,
  type CaseInput,
  type CaseListQuery,
  caseSchema,
  caseSummarySchema,
  exportableCaseSchema,
  importBatchSchema,
  importCheckSchema,
  type ImportRequest,
  importResultSchema,
  pageSchema,
  type SuiteInput,
  suiteSchema,
  type UpdateCaseInput,
  type UpdateSuiteInput,
} from "@qa/shared"
import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { z } from "zod"
import { projectKeys } from "@/features/projects/api"
import { apiGet, apiSend, toSearch } from "@/lib/api"

const casePage = pageSchema(caseSummarySchema)
const suiteList = z.object({
  items: z.array(suiteSchema),
  noSuiteCount: z.number(),
  archivedCount: z.number(),
})
const labelList = z.object({ items: z.array(z.string()) })
const historyList = z.object({ items: z.array(activityItemSchema) })
const importList = z.object({ items: z.array(importBatchSchema) })
const exportList = z.object({ items: z.array(exportableCaseSchema) })
const counted = z.object({ archivedCases: z.number() })
const restored = z.object({ restoredCases: z.number() })
const updated = z.object({ updated: z.number() })

/** Everything about a project's cases lives under its scoped key, so project changes refresh it too. */
export const caseKeys = {
  all: (key: string) => [...projectKeys.scoped(key), "cases"] as const,
  suites: (key: string) => [...caseKeys.all(key), "suites"] as const,
  list: (key: string, query: object) =>
    [...caseKeys.all(key), "list", query] as const,
  detail: (key: string, ref: string) =>
    [...caseKeys.all(key), "detail", ref.toUpperCase()] as const,
  history: (key: string, ref: string) =>
    [...caseKeys.all(key), "history", ref.toUpperCase()] as const,
  labels: (key: string) => [...caseKeys.all(key), "labels"] as const,
  imports: (key: string) => [...caseKeys.all(key), "imports"] as const,
}

const path = (key: string, rest: string) =>
  `/projects/${encodeURIComponent(key)}${rest}`
const casePath = (key: string, ref: string, rest = "") =>
  path(key, `/cases/${encodeURIComponent(ref)}${rest}`)

export function useSuites(key: string) {
  return useQuery({
    queryKey: caseKeys.suites(key),
    queryFn: ({ signal }) =>
      apiGet(path(key, "/suites"), suiteList, { signal }),
  })
}

export function useCases(key: string, query: CaseListQuery & { q?: string }) {
  return useQuery({
    queryKey: caseKeys.list(key, query),
    queryFn: ({ signal }) =>
      apiGet(path(key, `/cases?${toSearch(query)}`), casePage, { signal }),
    placeholderData: keepPreviousData,
  })
}

export const caseOptions = (key: string, ref: string) =>
  queryOptions({
    queryKey: caseKeys.detail(key, ref),
    queryFn: ({ signal }) => apiGet(casePath(key, ref), caseSchema, { signal }),
  })

export function useCase(key: string, ref: string | null) {
  return useQuery({ ...caseOptions(key, ref ?? ""), enabled: Boolean(ref) })
}

export function useCaseHistory(key: string, ref: string, enabled = true) {
  return useQuery({
    enabled,
    queryKey: caseKeys.history(key, ref),
    queryFn: ({ signal }) =>
      apiGet(casePath(key, ref, "/history"), historyList, { signal }),
    select: (data) => data.items,
  })
}

export function useLabels(key: string) {
  return useQuery({
    queryKey: caseKeys.labels(key),
    queryFn: ({ signal }) =>
      apiGet(path(key, "/case-labels"), labelList, { signal }),
    select: (data) => data.items,
  })
}

export function useImports(key: string) {
  return useQuery({
    queryKey: caseKeys.imports(key),
    queryFn: ({ signal }) =>
      apiGet(path(key, "/imports"), importList, { signal }),
    select: (data) => data.items,
  })
}

export function fetchExport(key: string, filter: Partial<CaseFilter>) {
  return apiGet(path(key, `/cases/export?${toSearch(filter)}`), exportList)
}

/**
 * Case changes ripple into suite counts, labels, other lists and the
 * project's activity, so every mutation refreshes the whole project scope.
 */
function useCaseMutation<TVars, TData>(
  key: string,
  fn: (vars: TVars) => Promise<TData>
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: projectKeys.scoped(key) }),
  })
}

export function useCreateSuite(key: string) {
  return useCaseMutation(key, (input: SuiteInput) =>
    apiSend("POST", path(key, "/suites"), input, suiteSchema)
  )
}

export function useUpdateSuite(key: string) {
  return useCaseMutation(
    key,
    ({ id, ...input }: UpdateSuiteInput & { id: string }) =>
      apiSend("PATCH", path(key, `/suites/${id}`), input, suiteSchema)
  )
}

export function useArchiveSuite(key: string) {
  return useCaseMutation(key, (id: string) =>
    apiSend("POST", path(key, `/suites/${id}/archive`), undefined, counted)
  )
}

export function useCreateCase(key: string) {
  return useCaseMutation(key, (input: CaseInput) =>
    apiSend("POST", path(key, "/cases"), input, caseSchema)
  )
}

export function useUpdateCase(key: string, ref: string) {
  return useCaseMutation(key, (input: UpdateCaseInput) =>
    apiSend("PATCH", casePath(key, ref), input, caseSchema)
  )
}

export function useDuplicateCase(key: string) {
  return useCaseMutation(key, (ref: string) =>
    apiSend("POST", casePath(key, ref, "/duplicate"), undefined, caseSchema)
  )
}

export function useArchiveCase(key: string) {
  return useCaseMutation(
    key,
    ({ ref, reason }: { ref: string; reason: string }) =>
      apiSend("POST", casePath(key, ref, "/archive"), { reason }, caseSchema)
  )
}

export function useRestoreCase(key: string) {
  return useCaseMutation(key, (ref: string) =>
    apiSend("POST", casePath(key, ref, "/restore"), undefined, caseSchema)
  )
}

export function useBulkCases(key: string) {
  return useCaseMutation(key, (input: BulkCaseAction) =>
    apiSend("POST", path(key, "/cases/bulk"), input, updated)
  )
}

export function checkImport(key: string, request: ImportRequest) {
  return apiSend(
    "POST",
    path(key, "/imports/check"),
    request,
    importCheckSchema
  )
}

export function useRunImport(key: string) {
  return useCaseMutation(key, (request: ImportRequest) =>
    apiSend("POST", path(key, "/imports"), request, importResultSchema)
  )
}

export function useRestoreImport(key: string) {
  return useCaseMutation(key, (number: number) =>
    apiSend(
      "POST",
      path(key, `/imports/${number}/restore`),
      undefined,
      restored
    )
  )
}

export function useArchiveImport(key: string) {
  return useCaseMutation(key, (number: number) =>
    apiSend("POST", path(key, `/imports/${number}/archive`), undefined, counted)
  )
}
