/** Postgres int4: the largest key number a project can reach. */
export const MAX_KEY_NUMBER = 2_147_483_647

/**
 * The number from a URL segment: this project's full key with the given
 * infix (PAY-TC-12, PAY-R-3, PAY-D-14; any case) or a bare number. Null for
 * anything else, including another project's key.
 */
export function parseKeyRef(
  projectKey: string,
  infix: string,
  ref: string
): number | null {
  const prefix = `${projectKey}-${infix}-`.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  )
  // The prefix is escaped above; the rest is a fixed pattern.
  // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp
  const match = new RegExp(`^(?:${prefix})?([1-9][0-9]{0,9})$`, "i").exec(
    ref.trim()
  )
  if (!match) return null
  const number = Number(match[1])
  return number <= MAX_KEY_NUMBER ? number : null
}
