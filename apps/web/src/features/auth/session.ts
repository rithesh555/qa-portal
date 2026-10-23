import { type Me, meSchema } from "@qa/shared"
import { queryOptions, useQuery } from "@tanstack/react-query"
import { ApiError, apiGet } from "@/lib/api"

export const sessionQueryKey = ["session"] as const

async function fetchSession({
  signal,
}: {
  signal: AbortSignal
}): Promise<Me | null> {
  try {
    return await apiGet("/me", meSchema, { signal })
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null
    throw err
  }
}

export const sessionQueryOptions = queryOptions({
  queryKey: sessionQueryKey,
  queryFn: fetchSession,
  staleTime: 5 * 60 * 1000,
  retry: false,
})

export function useSession() {
  return useQuery(sessionQueryOptions)
}
