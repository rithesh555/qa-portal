/** Full page load (not a client-side route change); clears all in-memory state. */
export function hardRedirect(path: string): void {
  window.location.replace(path)
}
