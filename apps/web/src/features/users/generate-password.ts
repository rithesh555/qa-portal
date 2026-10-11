// No look-alike characters (0/O, 1/l/I), so a password read aloud or copied
// by hand survives.
const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"

/** A random 16-character password from the browser's CSPRNG. */
export function generatePassword(length = 16): string {
  // Rejection sampling keeps every character equally likely.
  const limit = 256 - (256 % ALPHABET.length)
  let out = ""
  while (out.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length * 2))
    for (const byte of bytes) {
      if (byte < limit && out.length < length) {
        out += ALPHABET[byte % ALPHABET.length]
      }
    }
  }
  return out
}
