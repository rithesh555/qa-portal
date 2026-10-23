import { ArchiveIcon } from "lucide-react"
import { Link } from "react-router"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

/** In an archived project, in place of a page that changes things. */
export function ArchivedNotice({
  title,
  backTo,
  backLabel,
}: {
  /** "You can't start a run here" */
  title: string
  backTo: string
  backLabel: string
}) {
  return (
    <Alert>
      <ArchiveIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        This project is archived, so it&apos;s read-only. An admin can restore
        it.{" "}
        <Link to={backTo} className="underline">
          {backLabel}
        </Link>
      </AlertDescription>
    </Alert>
  )
}
