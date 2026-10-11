import { useCallback } from "react"
import { toast } from "@/components/ui/toast"
import { authClient } from "@/lib/auth-client"
import { hardRedirect } from "@/lib/navigation"

/**
 * Signs out, then does a full page load to the login page. The reload drops
 * everything the previous user had in memory, and the next person to sign in
 * starts from home rather than this user's last page. If the server doesn't
 * confirm, the user is told they're still signed in.
 */
export function useSignOut() {
  return useCallback(async () => {
    const ok = await authClient.signOut().then(
      ({ error }) => !error,
      () => false
    )
    if (!ok) {
      toast.add({
        type: "error",
        title: "Couldn't sign out",
        description:
          "You're still signed in. Check your connection and try again.",
      })
      return
    }
    hardRedirect("/login")
  }, [])
}
