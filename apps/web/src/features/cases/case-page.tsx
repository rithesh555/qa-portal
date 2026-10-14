import { Link, useParams } from "react-router"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useProjectContext } from "@/features/projects/project-layout"
import { CaseDetails } from "./case-details"

/** /projects/:key/cases/:ref — a test case on its own page, for links from elsewhere. */
export function CasePage() {
  const { project } = useProjectContext()
  const { ref = "" } = useParams()
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              render={<Link to={`/projects/${project.key}/cases`} />}
            >
              Test cases
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{ref.toUpperCase()}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <CaseDetails caseRef={ref} headingLevel={1} />
      </div>
    </div>
  )
}
