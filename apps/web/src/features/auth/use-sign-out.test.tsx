import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "@/components/ui/toast"
import { authClient } from "@/lib/auth-client"
import { hardRedirect } from "@/lib/navigation"
import { sessionQueryKey } from "./session"
import { useSignOut } from "./use-sign-out"

vi.mock("@/lib/auth-client", () => ({
  authClient: { signOut: vi.fn() },
}))
vi.mock("@/lib/navigation", () => ({ hardRedirect: vi.fn() }))

const signOutMock = vi.mocked(authClient.signOut)
const redirectMock = vi.mocked(hardRedirect)
const signedIn = {
  id: "u1",
  username: "sam",
  name: "Sam",
  email: "sam@test.local",
  role: "viewer" as const,
}

function setup() {
  const queryClient = new QueryClient()
  queryClient.setQueryData(sessionQueryKey, signedIn)
  let signOut: (() => Promise<void>) | undefined
  function Probe() {
    signOut = useSignOut()
    return null
  }
  render(
    <QueryClientProvider client={queryClient}>
      <Probe />
    </QueryClientProvider>
  )
  return { queryClient, signOut: () => signOut!() }
}

describe("useSignOut", () => {
  beforeEach(() => {
    signOutMock.mockReset()
    redirectMock.mockReset()
    vi.spyOn(toast, "add").mockReturnValue("t1")
  })

  it("does a full page load to the login page, with no return path", async () => {
    // A full load drops everything the previous user had in memory, and
    // avoids the guard redirecting with `from` = this user's page.
    signOutMock.mockResolvedValue({ data: { success: true }, error: null })
    const { signOut } = setup()
    await act(signOut)
    expect(redirectMock).toHaveBeenCalledExactlyOnceWith("/login")
  })

  it("stays signed in and says so when the server refuses", async () => {
    signOutMock.mockResolvedValue({
      data: null,
      error: { status: 500, statusText: "Internal Server Error" },
    } as never)
    const { queryClient, signOut } = setup()
    await act(signOut)
    expect(redirectMock).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(sessionQueryKey)).toEqual(signedIn)
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error", title: "Couldn't sign out" })
    )
  })

  it("stays signed in and says so when the request fails", async () => {
    signOutMock.mockRejectedValue(new TypeError("Failed to fetch"))
    const { signOut } = setup()
    await act(signOut)
    expect(redirectMock).not.toHaveBeenCalled()
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error", title: "Couldn't sign out" })
    )
  })
})
