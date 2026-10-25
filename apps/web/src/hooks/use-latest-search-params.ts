import { useCallback, useLayoutEffect, useRef } from "react"
import {
  createSearchParams,
  type SetURLSearchParams,
  useSearchParams,
} from "react-router"

/**
 * `useSearchParams`, but a functional update always builds on the latest
 * params. React Router hands the setter the params of the last render, and its
 * navigation re-renders later (in a transition); a second change in between
 * would build on old params and undo the first (F5). Until the URL catches
 * up, changes build on what was last asked for.
 */
export function useLatestSearchParams(): [URLSearchParams, SetURLSearchParams] {
  const [searchParams, setSearchParams] = useSearchParams()
  const asked = useRef<URLSearchParams | null>(null)
  useLayoutEffect(() => {
    asked.current = null
  }, [searchParams])

  const set = useCallback<SetURLSearchParams>(
    (nextInit, options) =>
      setSearchParams((prev) => {
        const next = createSearchParams(
          typeof nextInit === "function"
            ? nextInit(new URLSearchParams(asked.current ?? prev))
            : nextInit
        )
        asked.current = next
        return next
      }, options),
    [setSearchParams]
  )
  return [searchParams, set]
}
