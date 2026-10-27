import type { Me, Project, ProjectRole } from "@qa/shared"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter, Outlet, Route, Routes } from "react-router"
import { describe, expect, it } from "vitest"
import { sessionQueryKey } from "@/features/auth/session"
import { useCan } from "./use-can"

const admin: Me = {
  id: "u1",
  username: "admin",
  name: "Admin",
  email: "admin@example.test",
  role: "admin",
  mustChangePassword: false,
  projectsLed: 0,
}
const user: Me = { ...admin, id: "u2", username: "user", role: "user" }

function project(myRole: ProjectRole | null, archived = false) {
  return { key: "PAY", myRole, archived } as Project
}

/** Renders useCan as `me`, optionally inside a project route like ProjectLayout's. */
function setup(me: Me | null, inProject?: Project) {
  const client = new QueryClient()
  client.setQueryData(sessionQueryKey, me)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>
        {inProject ? (
          <Routes>
            <Route
              element={
                <Outlet
                  context={{ project: inProject, allowed: () => false }}
                />
              }
            >
              <Route path="*" element={children} />
            </Route>
          </Routes>
        ) : (
          children
        )}
      </MemoryRouter>
    </QueryClientProvider>
  )
  return renderHook(() => useCan(), { wrapper }).result.current
}

describe("useCan", () => {
  it("lets an admin manage projects and not a user", () => {
    expect(setup(admin)("projects:manage")).toBe(true)
    expect(setup(user)("projects:manage")).toBe(false)
  })

  it("answers project actions from the project role", () => {
    expect(setup(user, project("viewer"))("runs:execute")).toBe(false)
    expect(setup(user, project("tester"))("runs:execute")).toBe(true)
    expect(setup(user, project("lead"))("members:manage")).toBe(true)
  })

  it("outside a project, a user has no project actions", () => {
    expect(setup(user)("runs:execute")).toBe(false)
  })

  it("makes an archived project read-only except restoring it", () => {
    expect(setup(user, project("lead", true))("runs:execute")).toBe(false)
    expect(setup(admin, project(null, true))("cases:edit")).toBe(false)
    expect(setup(admin, project(null, true))("projects:manage")).toBe(true)
  })

  it("allows nothing without a session (signed out or deactivated)", () => {
    const can = setup(null, project("lead"))
    expect(can("project:view")).toBe(false)
    expect(can("projects:manage")).toBe(false)
  })
})
