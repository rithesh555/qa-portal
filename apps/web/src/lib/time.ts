const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })
const shortDate = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
})
export const exactTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
})

/** "just now", "5 minutes ago", "3 hours ago", then "Oct 2". */
export function timeAgo(iso: string): string {
  const minutes = Math.round((Date.parse(iso) - Date.now()) / 60_000)
  if (minutes > -1) return "just now"
  if (minutes > -60) return relative.format(minutes, "minute")
  if (minutes > -24 * 60)
    return relative.format(Math.round(minutes / 60), "hour")
  return shortDate.format(new Date(iso))
}
