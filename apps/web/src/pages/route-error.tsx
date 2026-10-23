import { CircleAlertIcon, RefreshCwIcon } from "lucide-react"
import { Link, useRouteError } from "react-router"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { hardRedirect } from "@/lib/navigation"

/** A page's code chunk couldn't be fetched: usually the app was updated meanwhile. */
function isChunkLoadError(error: unknown) {
  return (
    error instanceof Error &&
    /dynamically imported module|Importing a module script failed|error loading dynamically/i.test(
      error.message
    )
  )
}

/**
 * Shown in place of a page that failed to load or crashed while rendering.
 * Never shows the error itself (that's for the console and logs).
 */
export function RouteError() {
  const error = useRouteError()
  const chunk = isChunkLoadError(error)
  return (
    <Empty className="flex-1">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CircleAlertIcon />
        </EmptyMedia>
        <EmptyTitle>
          <h1>{chunk ? "This page couldn't load" : "Something went wrong"}</h1>
        </EmptyTitle>
        <EmptyDescription>
          {chunk
            ? "A new version of the QA Portal is probably out. Reload to get it; nothing you saved is lost."
            : "This page hit a problem. Reload to try again, or go back to home."}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center">
        <Button onClick={() => hardRedirect(window.location.href)}>
          <RefreshCwIcon data-icon="inline-start" />
          Reload
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link to="/" />}>
          Go to home
        </Button>
      </EmptyContent>
    </Empty>
  )
}
