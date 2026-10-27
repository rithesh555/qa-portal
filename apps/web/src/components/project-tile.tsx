import { cn } from "cn"

const TILE_COUNT = 8

/** One of the --project-tile-N tokens, picked from the key so it's stable. */
function colorFor(key: string): string {
  let hash = 0
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return `var(--project-tile-${(hash % TILE_COUNT) + 1})`
}

const SIZES = {
  sm: "size-7 rounded-md",
  md: "size-8 rounded-lg",
  lg: "size-10 rounded-[10px]",
  xl: "size-13 rounded-xl",
}

// Font size in px by tile size, for keys of up to 3, 4 and 5–6 characters,
// so even a 6-character key fits inside the tile.
const FONT: Record<keyof typeof SIZES, [number, number, number]> = {
  sm: [10, 8, 6.5],
  md: [11, 9, 7],
  lg: [12, 10, 8.5],
  xl: [14, 12, 10],
}

/** The project's key on a colour picked from the key, so it's stable. */
export function ProjectTile({
  projectKey,
  size = "md",
  className,
}: {
  projectKey: string
  size?: keyof typeof SIZES
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden font-mono leading-none font-semibold tracking-tight text-project-tile-foreground",
        SIZES[size],
        className
      )}
      style={{
        backgroundColor: colorFor(projectKey),
        fontSize: FONT[size][Math.min(2, Math.max(0, projectKey.length - 3))],
      }}
    >
      {projectKey}
    </span>
  )
}
