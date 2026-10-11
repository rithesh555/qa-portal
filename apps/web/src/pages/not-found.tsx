import { CompassIcon } from "lucide-react"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export function NotFound() {
  return (
    <Empty className="min-h-svh">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CompassIcon />
        </EmptyMedia>
        <EmptyTitle>
          <h1>Page not found</h1>
        </EmptyTitle>
        <EmptyDescription>
          The address doesn&apos;t match any page. Check it, or start from home.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button nativeButton={false} render={<Link to="/" />}>
          Go to home
        </Button>
      </EmptyContent>
    </Empty>
  )
}
