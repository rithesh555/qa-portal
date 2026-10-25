import type { ReactNode } from "react"

// Only http(s) addresses: nothing else (javascript:, data:) becomes a link.
const URL_PATTERN = /https?:\/\/[^\s<>"']+/g
// Punctuation that ends a sentence rather than the address.
const TRAILING = /[.,;:!?)\]]+$/

/** Plain text with its web addresses as links that open in a new tab. */
export function LinkifiedText({ text }: { text: string }) {
  const parts: ReactNode[] = []
  let last = 0
  for (const match of text.matchAll(URL_PATTERN)) {
    const url = match[0].replace(TRAILING, "")
    const start = match.index
    parts.push(text.slice(last, start))
    parts.push(
      <a
        key={start}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-primary underline underline-offset-4"
      >
        {url}
      </a>
    )
    last = start + url.length
  }
  parts.push(text.slice(last))
  return <>{parts}</>
}
