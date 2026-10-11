import { useCallback, useSyncExternalStore } from "react"
import { useMatch } from "react-router"
import { useSession } from "@/features/auth/session"

// Per user, so the next person on a shared machine doesn't start in the
// previous person's project.
const storageKey = (userId: string) => `qa-portal:last-project:${userId}`
const listeners = new Set<() => void>()

// Browser storage can be missing or throw (private windows, blocked site
// data); the app works without it, it just won't remember the project.
function read(userId: string | undefined): string | null {
  if (!userId) return null
  try {
    return window.localStorage.getItem(storageKey(userId))
  } catch {
    return null
  }
}

function write(userId: string, key: string | null) {
  try {
    if (key) window.localStorage.setItem(storageKey(userId), key)
    else window.localStorage.removeItem(storageKey(userId))
  } catch {
    // Not remembering the last project is fine.
  }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The last project the signed-in user opened in this browser. */
export function useLastProjectKey() {
  const userId = useSession().data?.id
  const key = useSyncExternalStore(
    subscribe,
    () => read(userId),
    () => null
  )
  const remember = useCallback(
    (next: string | null) => {
      if (userId && next !== read(userId)) write(userId, next)
    },
    [userId]
  )
  return [key, remember] as const
}

/** The key in the URL when inside a project (`/projects/:key/...`). */
export function useRouteProjectKey(): string | null {
  const match = useMatch("/projects/:key/*")
  return match?.params.key?.toUpperCase() ?? null
}
