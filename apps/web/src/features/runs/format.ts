/** "Priya Nair" → "PN"; one name → its first letter. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return (
    (parts[0]?.[0] ?? "") + (parts.length > 1 ? parts.at(-1)![0] : "")
  ).toUpperCase()
}
