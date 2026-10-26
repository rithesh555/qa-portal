import { CompassIcon } from "lucide-react"
import { ButtonLink } from "@/components/button-link"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { usePageTitle } from "@/hooks/use-page-title"

export function NotFound() {
  usePageTitle("Page not found")
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
        <ButtonLink to="/">Go to home</ButtonLink>
      </EmptyContent>
    </Empty>
  )
}
