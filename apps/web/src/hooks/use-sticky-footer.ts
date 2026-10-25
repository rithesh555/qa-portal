import { useCallback } from "react"

/**
 * A ref for a sticky action bar at the bottom of the page. While it's mounted
 * its height is the toast area's bottom offset (`--sticky-footer-height`), so
 * confirmations never cover the buttons people click next (F16).
 */
export function useStickyFooter<T extends HTMLElement>() {
  return useCallback((el: T | null) => {
    if (!el) return
    const root = document.documentElement
    const set = () =>
      root.style.setProperty("--sticky-footer-height", `${el.offsetHeight}px`)
    set()
    const observer = new ResizeObserver(set)
    observer.observe(el)
    return () => {
      observer.disconnect()
      root.style.removeProperty("--sticky-footer-height")
    }
  }, [])
}
