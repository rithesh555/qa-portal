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
    <div className="flex flex-col gap-5">
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
      <CaseDetails caseRef={ref} headingLevel={1} />
    </div>
  )
}
