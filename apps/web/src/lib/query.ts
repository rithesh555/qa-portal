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
