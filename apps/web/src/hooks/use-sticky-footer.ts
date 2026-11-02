import { useCallback } from "react"

/**
 * A ref for a sticky action bar at the bottom of the page. While it's mounted
 * the room it takes at the bottom of the viewport is the toast area's bottom
 * offset (`--sticky-footer-height`), so confirmations never cover the buttons
 * people click next (F16). That room is the bar's height while it is stuck,
 * and more once the page is scrolled to its end and the bar sits above the
 * page's bottom padding.
 */
export function useStickyFooter<T extends HTMLElement>() {
  return useCallback((el: T | null) => {
    if (!el) return
    const root = document.documentElement
    let frame = 0
    const set = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const below = window.innerHeight - el.getBoundingClientRect().top
        // Capped, so a bar scrolled out of view never lifts toasts off-screen.
        const room = Math.min(
          Math.max(el.offsetHeight, Math.ceil(below)),
          Math.round(window.innerHeight / 2)
        )
        root.style.setProperty("--sticky-footer-height", `${room}px`)
      })
    }
    set()
    const observer = new ResizeObserver(set)
    observer.observe(el)
    // Capture, so scrolling inside any container counts too.
    document.addEventListener("scroll", set, { capture: true, passive: true })
    window.addEventListener("resize", set)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      document.removeEventListener("scroll", set, { capture: true })
      window.removeEventListener("resize", set)
      root.style.removeProperty("--sticky-footer-height")
    }
  }, [])
}
