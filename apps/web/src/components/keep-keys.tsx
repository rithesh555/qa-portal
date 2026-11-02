/** Case, run and defect IDs such as PAY-TC-12, PAY-R-4 or PAY-D-7. */
const KEY = /\b([A-Z][A-Z0-9]{1,5}-(?:TC|R|D)-\d+)\b/

/** Text with each ID kept on one line, so narrow screens never break it at a hyphen. */
export function KeepKeys({ text }: { text: string }) {
  return text.split(KEY).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="whitespace-nowrap">
        {part}
      </span>
    ) : (
      part
    )
  )
}
