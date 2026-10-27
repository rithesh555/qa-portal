import { CircleAlertIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { errorMessage } from "@/lib/api"

/** A list or page that failed to load: what failed, why, and a retry. */
export function DataError({
  title,
  error,
  onRetry,
  className,
}: {
  /** "Couldn't load defects" */
  title: string
  error: unknown
  onRetry: () => void
  className?: string
}) {
  return (
    <Alert variant="destructive" className={className}>
      <CircleAlertIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {errorMessage(error)}{" "}
        <Button variant="link" className="h-auto p-0" onClick={onRetry}>
          Try again
        </Button>
      </AlertDescription>
    </Alert>
  )
}
