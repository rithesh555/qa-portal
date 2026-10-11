import { createAuthClient } from "better-auth/react"
import { usernameClient } from "better-auth/client/plugins"

// Same origin as the app (Vite proxies /api in dev), so no baseURL needed.
export const authClient = createAuthClient({
  plugins: [usernameClient()],
})
