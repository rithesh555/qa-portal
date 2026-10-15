import {
  type CreateDefectInput,
  defectActivitySchema,
  type DefectListQuery,
  defectRefSchema,
  defectSchema,
  defectSummarySchema,
  type LogDefectInput,
  pageSchema,
  type TransitionInput,
  type UpdateDefectInput,
} from "@qa/shared"
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { z } from "zod"
import { projectKeys } from "@/features/projects/api"
import { runKeys } from "@/features/runs/api"
import { apiGet, apiSend, toSearch } from "@/lib/api"

const defectPage = pageSchema(defectSummarySchema)
const activityList = z.object({ items: z.array(defectActivitySchema) })
const refList = z.object({ items: z.array(defectRefSchema) })

export const defectKeys = {
  all: (key: string) => [...projectKeys.scoped(key), "defects"] as const,
  list: (key: string, query: object) =>
    [...defectKeys.all(key), "list", query] as const,
  detail: (key: string, ref: string) =>
    [...defectKeys.all(key), "detail", ref.toUpperCase()] as const,
  activity: (key: string, ref: string) =>
    [...defectKeys.detail(key, ref), "activity"] as const,
  known: (key: string, runCaseId: string) =>
    [...defectKeys.all(key), "known", runCaseId] as const,
}

const path = (key: string, rest: string) =>
  `/projects/${encodeURIComponent(key)}${rest}`
const defectPath = (key: string, ref: string, rest = "") =>
  path(key, `/defects/${encodeURIComponent(ref)}${rest}`)

export function useDefects(key: string, query: Partial<DefectListQuery>) {
  return useQuery({
    queryKey: defectKeys.list(key, query),
    queryFn: ({ signal }) =>
      apiGet(path(key, `/defects?${toSearch(query)}`), defectPage, { signal }),
    placeholderData: keepPreviousData,
  })
}

export function useDefect(key: string, ref: string) {
  return useQuery({
    queryKey: defectKeys.detail(key, ref),
    queryFn: ({ signal }) =>
      apiGet(defectPath(key, ref), defectSchema, { signal }),
  })
}

export function useDefectActivity(key: string, ref: string) {
  return useQuery({
    queryKey: defectKeys.activity(key, ref),
    queryFn: ({ signal }) =>
      apiGet(defectPath(key, ref, "/activity"), activityList, { signal }),
    select: (data) => data.items,
  })
}

/** Active defects on a run case's test case (and similar ones), for the run screen. */
export function useKnownDefects(key: string, runCaseId: string | null) {
  return useQuery({
    enabled: Boolean(runCaseId),
    queryKey: defectKeys.known(key, runCaseId ?? ""),
    queryFn: ({ signal }) =>
      apiGet(path(key, `/defects/known?${toSearch({ runCaseId })}`), refList, {
        signal,
      }),
    select: (data) => data.items,
  })
}

/**
 * Defect changes show in defect lists, the project feed and, for links, on
 * run screens: refresh those.
 */
function useDefectMutation<TVars, TData>(
  key: string,
  fn: (vars: TVars) => Promise<TData>
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    // A defect in the answer is the latest: show it at once, so the next
    // edit is made against its version rather than a stale one.
    onSuccess: (data) => {
      const parsed = defectSchema.safeParse(data)
      if (parsed.success)
        queryClient.setQueryData(
          defectKeys.detail(key, parsed.data.key),
          parsed.data
        )
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: defectKeys.all(key) }),
        queryClient.invalidateQueries({
          queryKey: projectKeys.activity(key),
        }),
        queryClient.invalidateQueries({ queryKey: runKeys.all(key) }),
      ]),
  })
}

export function useCreateDefect(key: string) {
  return useDefectMutation(key, (input: CreateDefectInput) =>
    apiSend("POST", path(key, "/defects"), input, defectSchema)
  )
}

export function useLogDefect(key: string) {
  return useDefectMutation(key, (input: LogDefectInput) =>
    apiSend("POST", path(key, "/defects/log"), input, defectSchema)
  )
}

export function useUpdateDefect(key: string, ref: string) {
  return useDefectMutation(key, (input: UpdateDefectInput) =>
    apiSend("PATCH", defectPath(key, ref), input, defectSchema)
  )
}

export function useTransition(key: string, ref: string) {
  return useDefectMutation(key, (input: TransitionInput) =>
    apiSend("POST", defectPath(key, ref, "/transition"), input, defectSchema)
  )
}

export function useAddComment(key: string, ref: string) {
  return useDefectMutation(key, (body: string) =>
    apiSend(
      "POST",
      defectPath(key, ref, "/comments"),
      { body },
      defectActivitySchema
    )
  )
}

export function useLinkResult(key: string, ref: string) {
  return useDefectMutation(key, (resultId: string) =>
    apiSend("POST", defectPath(key, ref, "/links"), { resultId }, defectSchema)
  )
}

export function useUnlink(key: string, ref: string) {
  return useDefectMutation(key, (linkId: string) =>
    apiSend(
      "DELETE",
      defectPath(key, ref, `/links/${linkId}`),
      undefined,
      defectSchema
    )
  )
}
