import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"
import { sessionQueryKey } from "@/features/auth/session"
import { ApiError } from "./api"

/**
 * Retry policy for queries: a 4xx answer (not found, no access, invalid)
 * won't change on a retry, so show it straight away. Network failures,
 * server errors and rate limiting get two more tries.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (
    error instanceof ApiError &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 429
  ) {
    return false
  }
  return failureCount < 2
}

const isSignedOut = (error: unknown) =>
  error instanceof ApiError && error.status === 401

/**
 * The app's query client. Any request answered 401 means the session ended
 * (expired, signed out elsewhere, deactivated): the session is re-checked so
 * the sign-in guard takes over, instead of every page offering a "Try again"
 * that can't succeed.
 */
export function createQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (isSignedOut(error) && query.queryKey !== sessionQueryKey)
          void client.invalidateQueries({ queryKey: sessionQueryKey })
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        if (isSignedOut(error))
          void client.invalidateQueries({ queryKey: sessionQueryKey })
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
      },
    },
  })
  return client
}
