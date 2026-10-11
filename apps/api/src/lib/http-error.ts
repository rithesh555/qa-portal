/** An Error carrying an HTTP status; the error handler turns it into the standard body. */
export function httpError(statusCode: number, message: string) {
  return Object.assign(new Error(message), { statusCode })
}
