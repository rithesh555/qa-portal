import { DownloadIcon, TableIcon, ChartLineIcon } from "lucide-react"
import { type ReactNode, useId, useState } from "react"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/**
 * A report section with a chart, a table view of the same numbers, and a CSV
 * of them, so nothing depends on reading the chart.
 */
export function ChartCard({
  id,
  title,
  description,
  chart,
  table,
  onCsv,
  className,
  children,
}: {
  id: string
  title: string
  description?: ReactNode
  chart?: ReactNode
  table?: ReactNode
  onCsv?: () => void
  className?: string
  children?: ReactNode
}) {
  const [asTable, setAsTable] = useState(false)
  const headingId = `h-${id}`
  return (
    <Card
      role="region"
      aria-labelledby={headingId}
      className={cn("min-w-0", className)}
    >
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 id={headingId} className="font-semibold">
              {title}
            </h2>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="flex gap-1.5 print:hidden">
            {chart && table && (
              <Button
                variant="outline"
                size="sm"
                aria-pressed={asTable}
                onClick={() => setAsTable((v) => !v)}
              >
                {asTable ? (
                  <ChartLineIcon data-icon="inline-start" />
                ) : (
                  <TableIcon data-icon="inline-start" />
                )}
                {asTable ? "Chart" : "Table"}{" "}
                <span className="sr-only">for {title.toLowerCase()}</span>
              </Button>
            )}
            {onCsv && (
              <Button variant="outline" size="sm" onClick={onCsv}>
                <DownloadIcon data-icon="inline-start" />
                CSV <span className="sr-only">for {title.toLowerCase()}</span>
              </Button>
            )}
          </div>
        </div>
        {children}
        {chart && table ? (asTable ? table : chart) : (chart ?? table)}
      </CardContent>
    </Card>
  )
}

/** A compact table for a chart's table view. */
export function DataTable({
  head,
  rows,
  numeric = [],
}: {
  head: string[]
  rows: (ReactNode[] & { key?: string })[]
  /** Column indexes to right-align. */
  numeric?: number[]
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            {head.map((h, i) => (
              <th
                key={h}
                scope="col"
                className={cn(
                  "px-2 py-2 text-left text-xs font-semibold whitespace-nowrap text-muted-foreground",
                  numeric.includes(i) && "text-right"
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b last:border-0">
              {r.map((c, i) => (
                <td
                  key={i}
                  className={cn(
                    "px-2 py-2 tabular-nums",
                    numeric.includes(i) && "text-right"
                  )}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Horizontal bars in one hue, value at the end; each row can link to the list behind it. */
export function BarList({
  items,
  label,
}: {
  items: { label: string; value: number; to?: string }[]
  /** What the bars count, for screen readers: "defects". */
  label: string
}) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => {
        const body = (
          <>
            <span className="truncate">{item.label}</span>
            <span
              aria-hidden
              className="h-2.5 overflow-hidden rounded-r-[4px] bg-transparent"
            >
              <span
                className="block h-full rounded-r-[4px] bg-chart-bar"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </span>
            <span className="text-right font-medium tabular-nums">
              {item.value} <span className="sr-only">{label}</span>
            </span>
          </>
        )
        const cls =
          "grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)_3rem] items-center gap-2.5 py-1 text-sm"
        return (
          <li key={item.label}>
            {item.to && item.value > 0 ? (
              <Link
                to={item.to}
                className={cn(
                  cls,
                  "rounded-sm hover:[&>span:first-child]:underline"
                )}
              >
                {body}
              </Link>
            ) : (
              <span className={cls}>{body}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

const W = 600
const LEFT = 48
const RIGHT = 16
const TOP = 12

interface Tip {
  x: number
  y: number
  title: string
  text: string
}

function Tooltip({ tip, height }: { tip: Tip | null; height: number }) {
  if (!tip) return null
  const left = (tip.x / W) * 100
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-none absolute z-10 rounded-md bg-tip px-2.5 py-1.5 text-xs whitespace-nowrap text-tip-foreground shadow-lg",
        left < 20
          ? "-translate-x-[12%]"
          : left > 80
            ? "-translate-x-[88%]"
            : "-translate-x-1/2",
        "-translate-y-[calc(100%+8px)]"
      )}
      style={{ left: `${left}%`, top: `${(tip.y / height) * 100}%` }}
    >
      <strong className="font-semibold">{tip.title}</strong>
      <br />
      {tip.text}
    </div>
  )
}

/** Nice round ticks from `floor` to `ceil`. */
function ticks(floor: number, ceil: number, count = 4) {
  const step = (ceil - floor) / count
  return Array.from({ length: count + 1 }, (_, i) => floor + i * step)
}

/**
 * Pass rate per run, in order. Closed runs are a solid line, the open run a
 * dashed last stretch with a hollow point. The axis starts where the data
 * needs it (labelled), not at an arbitrary 0 or a flattering 90.
 */
export function PassRateChart({
  points,
}: {
  points: {
    key: string
    label: string
    rate: number
    open: boolean
    detail: string
  }[]
}) {
  const H = 240
  const BOTTOM = 30
  const [tip, setTip] = useState<Tip | null>(null)
  const titleId = useId()
  const min = Math.min(...points.map((p) => p.rate))
  const floor = Math.max(0, Math.floor((min * 100 - 5) / 10) * 10) / 100
  const ys = ticks(floor, 1)
  const x = (i: number) =>
    points.length === 1
      ? (LEFT + W - RIGHT) / 2
      : LEFT + (i / (points.length - 1)) * (W - LEFT - RIGHT)
  const y = (v: number) =>
    TOP + (1 - (v - floor) / (1 - floor || 1)) * (H - TOP - BOTTOM)
  const closed = points.filter((p) => !p.open)
  const lastClosed = closed.length - 1
  const solid = closed.map((p, i) => `${x(i)},${y(p.rate)}`).join(" ")
  const dashed = points
    .map((p, i) => ({ p, i }))
    .slice(Math.max(0, lastClosed))
    .map(({ p, i }) => `${x(i)},${y(p.rate)}`)
    .join(" ")
  const slot = (W - LEFT - RIGHT) / Math.max(1, points.length - 1)

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full overflow-visible text-[11px]"
        role="img"
        aria-labelledby={titleId}
        onMouseLeave={() => setTip(null)}
      >
        <title id={titleId}>
          {`Pass rate by run: ${points.map((p) => `${p.key} ${Math.round(p.rate * 100)}%`).join(", ")}`}
        </title>
        {ys.map((v) => (
          <g key={v}>
            <line
              x1={LEFT}
              x2={W - RIGHT}
              y1={y(v)}
              y2={y(v)}
              className="stroke-chart-grid"
            />
            <text
              x={LEFT - 8}
              y={y(v) + 4}
              textAnchor="end"
              className="fill-muted-foreground"
            >
              {Math.round(v * 100)}%
            </text>
          </g>
        ))}
        <line
          x1={LEFT}
          x2={W - RIGHT}
          y1={H - BOTTOM}
          y2={H - BOTTOM}
          className="stroke-chart-axis"
        />
        {closed.length > 1 && (
          <polyline
            points={solid}
            fill="none"
            strokeWidth={2}
            strokeLinejoin="round"
            className="stroke-chart-line"
          />
        )}
        {points.some((p) => p.open) && points.length > 1 && (
          <polyline
            points={dashed}
            fill="none"
            strokeWidth={2}
            strokeDasharray="5 4"
            className="stroke-chart-line"
          />
        )}
        {points.map((p, i) => (
          <g key={p.key}>
            <circle
              cx={x(i)}
              cy={y(p.rate)}
              r={4.5}
              strokeWidth={2}
              className={cn(
                "stroke-chart-line",
                p.open ? "fill-card" : "fill-chart-line"
              )}
            />
            <text
              x={x(i)}
              y={H - 10}
              textAnchor="middle"
              className="fill-muted-foreground"
            >
              {p.label}
            </text>
            <rect
              x={x(i) - slot / 2}
              y={TOP}
              width={slot}
              height={H - TOP - BOTTOM}
              fill="transparent"
              tabIndex={0}
              aria-label={`${p.key}: ${Math.round(p.rate * 100)}%, ${p.detail}`}
              className="outline-none focus-visible:stroke-ring"
              onMouseEnter={() =>
                setTip({
                  x: x(i),
                  y: y(p.rate),
                  title: `${p.key}${p.open ? " (open)" : ""}`,
                  text: `${Math.round(p.rate * 100)}% · ${p.detail}`,
                })
              }
              onFocus={() =>
                setTip({
                  x: x(i),
                  y: y(p.rate),
                  title: `${p.key}${p.open ? " (open)" : ""}`,
                  text: `${Math.round(p.rate * 100)}% · ${p.detail}`,
                })
              }
              onBlur={() => setTip(null)}
            />
          </g>
        ))}
      </svg>
      <Tooltip tip={tip} height={H} />
    </div>
  )
}

/** Defects found vs closed per week: found solid, closed dashed and muted, both labelled at the end. */
export function FlowChart({
  weeks,
}: {
  weeks: { label: string; found: number; closed: number }[]
}) {
  const H = 210
  const BOTTOM = 26
  const END = 60
  const [tip, setTip] = useState<Tip | null>(null)
  const titleId = useId()
  const top = Math.max(4, ...weeks.flatMap((w) => [w.found, w.closed]))
  const ceil = Math.ceil(top / 4) * 4
  const ys = ticks(0, ceil)
  const x = (i: number) =>
    LEFT + (i / Math.max(1, weeks.length - 1)) * (W - LEFT - END)
  const y = (v: number) => TOP + (1 - v / ceil) * (H - TOP - BOTTOM)
  const line = (k: "found" | "closed") =>
    weeks.map((w, i) => `${x(i)},${y(w[k])}`).join(" ")
  const last = weeks[weeks.length - 1]
  const slot = (W - LEFT - END) / Math.max(1, weeks.length - 1)
  // Keep the end labels apart when the two lines finish close together.
  let foundY = last ? y(last.found) + 4 : 0
  let closedY = last ? y(last.closed) + 4 : 0
  if (Math.abs(foundY - closedY) < 14) {
    const mid = (foundY + closedY) / 2
    const up = (last?.found ?? 0) >= (last?.closed ?? 0)
    foundY = mid + (up ? -7 : 7)
    closedY = mid + (up ? 7 : -7)
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full overflow-visible text-[11px]"
        role="img"
        aria-labelledby={titleId}
        onMouseLeave={() => setTip(null)}
      >
        <title id={titleId}>
          {`Defects found and closed per week: ${weeks.map((w) => `${w.label} ${w.found} found, ${w.closed} closed`).join("; ")}`}
        </title>
        {ys.map((v) => (
          <g key={v}>
            <line
              x1={LEFT}
              x2={W - END}
              y1={y(v)}
              y2={y(v)}
              className="stroke-chart-grid"
            />
            <text
              x={LEFT - 8}
              y={y(v) + 4}
              textAnchor="end"
              className="fill-muted-foreground"
            >
              {v}
            </text>
          </g>
        ))}
        <polyline
          points={line("closed")}
          fill="none"
          strokeWidth={2}
          strokeDasharray="5 4"
          className="stroke-chart-deemph"
        />
        <polyline
          points={line("found")}
          fill="none"
          strokeWidth={2}
          strokeLinejoin="round"
          className="stroke-chart-line"
        />
        {last && (
          <>
            <text
              x={W - END + 8}
              y={foundY}
              className="fill-foreground text-xs"
            >
              Found
            </text>
            <text
              x={W - END + 8}
              y={closedY}
              className="fill-muted-foreground text-xs"
            >
              Closed
            </text>
          </>
        )}
        {weeks.map((w, i) => (
          <g key={w.label}>
            <text
              x={x(i)}
              y={H - 6}
              textAnchor="middle"
              className="fill-muted-foreground"
            >
              {w.label}
            </text>
            <rect
              x={x(i) - slot / 2}
              y={TOP}
              width={slot}
              height={H - TOP - BOTTOM}
              fill="transparent"
              tabIndex={0}
              aria-label={`Week of ${w.label}: ${w.found} found, ${w.closed} closed`}
              className="outline-none"
              onMouseEnter={() =>
                setTip({
                  x: x(i),
                  y: y(Math.max(w.found, w.closed)),
                  title: `Week of ${w.label}`,
                  text: `${w.found} found · ${w.closed} closed`,
                })
              }
              onFocus={() =>
                setTip({
                  x: x(i),
                  y: y(Math.max(w.found, w.closed)),
                  title: `Week of ${w.label}`,
                  text: `${w.found} found · ${w.closed} closed`,
                })
              }
              onBlur={() => setTip(null)}
            />
          </g>
        ))}
      </svg>
      <Tooltip tip={tip} height={H} />
    </div>
  )
}

/** Legend for the found/closed chart (lines, not colour alone). */
export function FlowLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <li className="flex items-center gap-1.5">
        <svg aria-hidden width="18" height="6">
          <line
            x1="0"
            x2="18"
            y1="3"
            y2="3"
            strokeWidth="2"
            className="stroke-chart-line"
          />
        </svg>
        Found
      </li>
      <li className="flex items-center gap-1.5">
        <svg aria-hidden width="18" height="6">
          <line
            x1="0"
            x2="18"
            y1="3"
            y2="3"
            strokeWidth="2"
            strokeDasharray="5 3"
            className="stroke-chart-deemph"
          />
        </svg>
        Closed or rejected
      </li>
    </ul>
  )
}
