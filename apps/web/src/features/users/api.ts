import {
  type CreateUserInput,
  pageSchema,
  type UpdateUserInput,
  type User,
  type UserListQuery,
  userSchema,
} from "@qa/shared"
import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { apiGet, apiSend } from "@/lib/api"

const userPageSchema = pageSchema(userSchema)

export const usersKeys = {
  all: ["users"] as const,
  list: (query: UserListQuery) => [...usersKeys.all, "list", query] as const,
}

function toSearch(query: UserListQuery): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value))
  }
  return params.toString()
}

export const usersListOptions = (query: UserListQuery) =>
  queryOptions({
    queryKey: usersKeys.list(query),
    queryFn: ({ signal }) =>
      apiGet(`/users?${toSearch(query)}`, userPageSchema, { signal }),
    // Keep the current page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })

export function useUsers(query: UserListQuery) {
  return useQuery(usersListOptions(query))
}

/** Every user mutation refreshes all user lists once it settles. */
function useUserMutation<TVars, TData>(fn: (vars: TVars) => Promise<TData>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: usersKeys.all }),
  })
}

export function useCreateUser() {
  return useUserMutation((input: CreateUserInput) =>
    apiSend("POST", "/users", input, userSchema)
  )
}

export function useUpdateUser() {
  return useUserMutation(
    ({ id, input }: { id: string; input: UpdateUserInput }) =>
      apiSend("PATCH", `/users/${encodeURIComponent(id)}`, input, userSchema)
  )
}

export function useResetPassword() {
  return useUserMutation(({ id, password }: { id: string; password: string }) =>
    apiSend("POST", `/users/${encodeURIComponent(id)}/reset-password`, {
      password,
    })
  )
}

export function useSetActive() {
  return useUserMutation(({ user, active }: { user: User; active: boolean }) =>
    apiSend(
      "POST",
      `/users/${encodeURIComponent(user.id)}/${active ? "reactivate" : "deactivate"}`,
      undefined,
      userSchema
    )
  )
}
