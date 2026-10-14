import {
  type CopyRunInput,
  type CreateRunInput,
  pageSchema,
  type RecordResultInput,
  type RunListQuery,
  type RunCaseDetail,
  runCaseDetailSchema,
  runCaseSchema,
  runPreviewResultSchema,
  runSchema,
  runSummarySchema,
  type RunSelection,
  type UpdateRunInput,
} from "@qa/shared"
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { z } from "zod"
import { projectKeys } from "@/features/projects/api"
import { apiGet, apiSend, toSearch } from "@/lib/api"

const runPage = pageSchema(runSummarySchema)
const runCaseList = z.object({ items: z.array(runCaseSchema) })

export const runKeys = {
  all: (key: string) => [...projectKeys.scoped(key), "runs"] as const,
  list: (key: string, query: object) =>
    [...runKeys.all(key), "list", query] as const,
  detail: (key: string, ref: string) =>
    [...runKeys.all(key), "detail", ref.toUpperCase()] as const,
  cases: (key: string, ref: string) =>
    [...runKeys.detail(key, ref), "cases"] as const,
  runCase: (key: string, ref: string, id: string) =>
    [...runKeys.detail(key, ref), "case", id] as const,
}

const path = (key: string, rest: string) =>
  `/projects/${encodeURIComponent(key)}${rest}`
const runPath = (key: string, ref: string, rest = "") =>
  path(key, `/runs/${encodeURIComponent(ref)}${rest}`)

export function useRuns(key: string, query: Partial<RunListQuery>) {
  return useQuery({
    queryKey: runKeys.list(key, query),
    queryFn: ({ signal }) =>
      apiGet(path(key, `/runs?${toSearch(query)}`), runPage, { signal }),
    placeholderData: keepPreviousData,
  })
}

/** What a selection would take; refetched as the choice changes, keeping the last answer meanwhile. */
export function useRunPreview(key: string, selection: RunSelection | null) {
  return useQuery({
    enabled: selection !== null,
    queryKey: [...runKeys.all(key), "preview", selection] as const,
    queryFn: ({ signal }) =>
      apiSend(
        "POST",
        path(key, "/runs/preview"),
        { selection },
        runPreviewResultSchema,
        { signal }
      ),
    placeholderData: keepPreviousData,
  })
}

export function useRun(key: string, ref: string) {
  return useQuery({
    queryKey: runKeys.detail(key, ref),
    queryFn: ({ signal }) => apiGet(runPath(key, ref), runSchema, { signal }),
    refetchOnWindowFocus: true,
  })
}

export function useRunCases(key: string, ref: string) {
  return useQuery({
    queryKey: runKeys.cases(key, ref),
    queryFn: ({ signal }) =>
      apiGet(runPath(key, ref, "/cases"), runCaseList, { signal }),
    select: (data) => data.items,
  })
}

export function useRunCase(key: string, ref: string, id: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryKey: runKeys.runCase(key, ref, id ?? ""),
    queryFn: ({ signal }) =>
      apiGet(runPath(key, ref, `/cases/${id}`), runCaseDetailSchema, {
        signal,
      }),
  })
}

/** Run changes affect the project's runs and its activity feed; nothing else. */
function useRunMutation<TVars, TData>(
  key: string,
  fn: (vars: TVars) => Promise<TData>
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: runKeys.all(key) }),
        queryClient.invalidateQueries({
          queryKey: projectKeys.activity(key),
        }),
      ]),
  })
}

export function useCreateRun(key: string) {
  return useRunMutation(key, (input: CreateRunInput) =>
    apiSend("POST", path(key, "/runs"), input, runSchema)
  )
}

export function useUpdateRun(key: string, ref: string) {
  return useRunMutation(key, (input: UpdateRunInput) =>
    apiSend("PATCH", runPath(key, ref), input, runSchema)
  )
}

export function useCopyRun(key: string, ref: string) {
  return useRunMutation(key, (input: CopyRunInput) =>
    apiSend("POST", runPath(key, ref, "/copy"), input, runSchema)
  )
}

export function useCloseRun(key: string, ref: string) {
  return useRunMutation(key, () =>
    apiSend("POST", runPath(key, ref, "/close"), undefined, runSchema)
  )
}

export function useReopenRun(key: string, ref: string) {
  return useRunMutation(key, () =>
    apiSend("POST", runPath(key, ref, "/reopen"), undefined, runSchema)
  )
}

/**
 * Recording happens case after case, so the answer is written into the cache
 * (the case, its row in the list) and only the run's counts are refetched:
 * not the whole list, which can hold thousands of cases.
 */
function useRunCaseMutation<TVars>(
  key: string,
  ref: string,
  fn: (vars: TVars) => Promise<RunCaseDetail>
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (detail) => {
      queryClient.setQueryData(runKeys.runCase(key, ref, detail.id), detail)
      queryClient.setQueryData<z.infer<typeof runCaseList>>(
        runKeys.cases(key, ref),
        (list) =>
          list && {
            items: list.items.map((c) =>
              c.id === detail.id ? runCaseSchema.parse(detail) : c
            ),
          }
      )
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: runKeys.detail(key, ref),
          exact: true,
        }),
        // Lists and the project feed show counts too; refresh them when next seen.
        queryClient.invalidateQueries({
          queryKey: runKeys.all(key),
          predicate: (q) => q.queryKey[runKeys.all(key).length] === "list",
          refetchType: "none",
        }),
      ]),
  })
}

export function useRecordResult(key: string, ref: string) {
  return useRunCaseMutation(
    key,
    ref,
    ({ id, ...input }: RecordResultInput & { id: string }) =>
      apiSend(
        "POST",
        runPath(key, ref, `/cases/${id}/results`),
        input,
        runCaseDetailSchema
      )
  )
}

export function useRefreshCase(key: string, ref: string) {
  return useRunCaseMutation(
    key,
    ref,
    ({ id, expectedVersion }: { id: string; expectedVersion: number }) =>
      apiSend(
        "POST",
        runPath(key, ref, `/cases/${id}/refresh`),
        { expectedVersion },
        runCaseDetailSchema
      )
  )
}

export function useBulkResults(key: string, ref: string) {
  return useRunMutation(
    key,
    (input: { runCaseIds: string[]; status: string; note: string }) =>
      apiSend(
        "POST",
        runPath(key, ref, "/results/bulk"),
        input,
        z.object({ recorded: z.number() })
      )
  )
}

export function useAssign(key: string, ref: string) {
  return useRunMutation(
    key,
    (input: { runCaseIds: string[]; assigneeId: string | null }) =>
      apiSend(
        "POST",
        runPath(key, ref, "/assign"),
        input,
        z.object({ assigned: z.number() })
      )
  )
}

export function useAddCases(key: string, ref: string) {
  return useRunMutation(key, (selection: RunSelection) =>
    apiSend(
      "POST",
      runPath(key, ref, "/cases"),
      { selection },
      z.object({ added: z.number() })
    )
  )
}

export function useRemoveCases(key: string, ref: string) {
  return useRunMutation(key, (runCaseIds: string[]) =>
    apiSend(
      "POST",
      runPath(key, ref, "/cases/remove"),
      { runCaseIds },
      z.object({ removed: z.number(), kept: z.number() })
    )
  )
}
