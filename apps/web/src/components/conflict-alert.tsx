import { CircleAlertIcon } from "lucide-react"
import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ApiError, errorMessage } from "@/lib/api"

/**
 * True for the 409 an edit gets when someone saved the same item meanwhile —
 * not other 409s (run closed, project archived, name taken), which reloading
 * and saving again wouldn't fix.
 */
export const isEditConflict = (err: unknown) =>
  err instanceof ApiError && err.status === 409 && err.reason === "stale"

/**
 * For a form saved from an out-of-date version: says who changed it (the
 * API's message), then lets the person load their version or save theirs
 * over it. Either way the form gets the current version, so the next save
 * can't fail the same way.
 */
export function ConflictAlert({
  message,
  onLoadTheirs,
  onSaveMine,
}: {
  message: string
  /** Fetch the current item and reset the form to it. */
  onLoadTheirs: () => Promise<void>
  /** Fetch the current version, then save the form's values over it. */
  onSaveMine: () => Promise<void>
}) {
  const [busy, setBusy] = useState<"theirs" | "mine" | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const run = async (which: "theirs" | "mine", action: () => Promise<void>) => {
    setBusy(which)
    setFailed(null)
    try {
      await action()
    } catch (err) {
      setFailed(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }
  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertDescription className="flex flex-col gap-2">
        <span>{failed ?? message}</span>
        <span className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy !== null}
            onClick={() => void run("theirs", onLoadTheirs)}
          >
            {busy === "theirs" && <Spinner data-icon="inline-start" />}
            Load their version
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy !== null}
            onClick={() => void run("mine", onSaveMine)}
          >
            {busy === "mine" && <Spinner data-icon="inline-start" />}
            Save mine anyway
          </Button>
        </span>
      </AlertDescription>
    </Alert>
  )
}
