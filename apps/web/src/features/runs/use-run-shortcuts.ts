import { useCallback, useEffect, useEffectEvent, useState } from "react"

const STORAGE_KEY = "qa.run-shortcuts"

/** Single-key shortcuts can be switched off (e.g. for speech input); remembered per browser. */
export function useShortcutsSetting() {
  const [enabled, setEnabledState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== "off"
    } catch {
      return true
    }
  })
  const setEnabled = useCallback((on: boolean) => {
    setEnabledState(on)
    try {
      localStorage.setItem(STORAGE_KEY, on ? "on" : "off")
    } catch {
      // Not remembered; it still applies on this page.
    }
  }, [])
  return [enabled, setEnabled] as const
}

/** Typing in a field, or any open dialog, menu or sheet, keeps keys for itself. */
function keyIsTaken(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return true
  const target = event.target
  if (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.closest(
        "input, textarea, select, [role=combobox], [role=listbox]"
      ))
  )
    return true
  return Boolean(
    document.querySelector(
      "[role=dialog], [role=alertdialog], [role=menu], [data-slot=popover-content]"
    )
  )
}

export type ShortcutAction =
  | "passed"
  | "failed"
  | "blocked"
  | "skipped"
  | "next"
  | "previous"
  | "undo"
  | "help"

const KEYS: Record<string, ShortcutAction> = {
  p: "passed",
  f: "failed",
  b: "blocked",
  s: "skipped",
  j: "next",
  n: "next",
  k: "previous",
  u: "undo",
  "?": "help",
}

/** Document-level shortcuts for the run screen. */
export function useRunShortcuts(
  enabled: boolean,
  onAction: (action: ShortcutAction) => void
) {
  const handle = useEffectEvent((event: KeyboardEvent) => {
    const action = KEYS[event.key.length === 1 ? event.key.toLowerCase() : ""]
    if (!action || event.repeat || keyIsTaken(event)) return
    event.preventDefault()
    onAction(action)
  })
  useEffect(() => {
    if (!enabled) return
    document.addEventListener("keydown", handle)
    return () => document.removeEventListener("keydown", handle)
  }, [enabled])
}
