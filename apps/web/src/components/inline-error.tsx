import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { errorMessage } from "@/lib/api"

/** A panel's data couldn't load: what failed, why, and a way to try again. */
export function InlineError({
  what,
  error,
  onRetry,
  className,
}: {
  /** "Couldn't load the history." */
  what: string
  error: unknown
  onRetry: () => void
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-destructive",
        className
      )}
    >
      <span>
        {what} {errorMessage(error)}
      </span>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}
