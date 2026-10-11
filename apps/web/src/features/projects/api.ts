import {
  activityItemSchema,
  type AddMembersInput,
  type CreateProjectInput,
  type MemberListQuery,
  memberSchema,
  pageSchema,
  type ProjectListQuery,
  type ProjectRole,
  projectSchema,
  projectSummarySchema,
  type ReleaseInput,
  releaseSchema,
  type UpdateProjectInput,
  type UpdateReleaseInput,
} from "@qa/shared"
import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { z } from "zod"
import { apiGet, apiSend, toSearch } from "@/lib/api"

const projectPage = pageSchema(projectSummarySchema)
const memberPage = pageSchema(memberSchema)
const releaseList = z.object({ items: z.array(releaseSchema) })
const activityList = z.object({ items: z.array(activityItemSchema) })

export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (query: Partial<ProjectListQuery>) =>
    [...projectKeys.lists(), query] as const,
  detail: (key: string) => [...projectKeys.all, "detail", key] as const,
  scoped: (key: string) => [...projectKeys.all, "scoped", key] as const,
  members: (key: string, query: MemberListQuery) =>
    [...projectKeys.scoped(key), "members", query] as const,
  releases: (key: string) => [...projectKeys.scoped(key), "releases"] as const,
  activity: (key: string) => [...projectKeys.scoped(key), "activity"] as const,
}

const path = (key: string, rest = "") =>
  `/projects/${encodeURIComponent(key)}${rest}`

export function useProjects(
  query: Partial<ProjectListQuery>,
  { enabled = true }: { enabled?: boolean } = {}
) {
  return useQuery({
    enabled,
    queryKey: projectKeys.list(query),
    queryFn: ({ signal }) =>
      apiGet(`/projects?${toSearch(query)}`, projectPage, { signal }),
    placeholderData: keepPreviousData,
  })
}

export const projectOptions = (key: string) =>
  queryOptions({
    queryKey: projectKeys.detail(key),
    queryFn: ({ signal }) => apiGet(path(key), projectSchema, { signal }),
  })

export function useProject(key: string | null) {
  return useQuery({
    ...projectOptions(key ?? ""),
    enabled: Boolean(key),
  })
}

export function useMembers(key: string, query: MemberListQuery) {
  return useQuery({
    queryKey: projectKeys.members(key, query),
    queryFn: ({ signal }) =>
      apiGet(path(key, `/members?${toSearch(query)}`), memberPage, { signal }),
    placeholderData: keepPreviousData,
  })
}

export function useReleases(key: string) {
  return useQuery({
    queryKey: projectKeys.releases(key),
    queryFn: ({ signal }) =>
      apiGet(path(key, "/releases"), releaseList, { signal }),
  })
}

export function useActivity(key: string) {
  return useQuery({
    queryKey: projectKeys.activity(key),
    queryFn: ({ signal }) =>
      apiGet(path(key, "/activity?limit=10"), activityList, { signal }),
  })
}

/**
 * Project mutations change lists, the project's details (counts, leads,
 * current release) and its activity, so they refresh everything under
 * "projects" once they settle.
 */
function useProjectMutation<TVars, TData>(fn: (vars: TVars) => Promise<TData>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  })
}

export function useCreateProject() {
  return useProjectMutation((input: CreateProjectInput) =>
    apiSend("POST", "/projects", input, projectSchema)
  )
}

export function useUpdateProject(key: string) {
  return useProjectMutation((input: UpdateProjectInput) =>
    apiSend("PATCH", path(key), input, projectSchema)
  )
}

export function useSetArchived(key: string) {
  return useProjectMutation((archived: boolean) =>
    apiSend(
      "POST",
      path(key, archived ? "/archive" : "/unarchive"),
      undefined,
      projectSchema
    )
  )
}

export function useAddMembers(key: string) {
  return useProjectMutation((input: AddMembersInput) =>
    apiSend(
      "POST",
      path(key, "/members"),
      input,
      z.object({ added: z.number(), alreadyMembers: z.number() })
    )
  )
}

export function useChangeRole(key: string) {
  return useProjectMutation(
    ({ userId, role }: { userId: string; role: ProjectRole }) =>
      apiSend(
        "PATCH",
        path(key, `/members/${encodeURIComponent(userId)}`),
        { role },
        memberSchema
      )
  )
}

export function useRemoveMember(key: string) {
  return useProjectMutation((userId: string) =>
    apiSend("DELETE", path(key, `/members/${encodeURIComponent(userId)}`))
  )
}

export function useCreateRelease(key: string) {
  return useProjectMutation((input: ReleaseInput) =>
    apiSend("POST", path(key, "/releases"), input, releaseSchema)
  )
}

export function useUpdateRelease(key: string) {
  return useProjectMutation(
    ({ id, input }: { id: string; input: UpdateReleaseInput }) =>
      apiSend(
        "PATCH",
        path(key, `/releases/${encodeURIComponent(id)}`),
        input,
        releaseSchema
      )
  )
}
