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
    // Fills the space it's given: the whole screen outside the app, the page
    // area inside it, without scrolling.
    <Empty className="flex-1">
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
