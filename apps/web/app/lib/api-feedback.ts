/**
 * The reason a JSON route handler gave for a failed request, as one sentence an error toast can
 * show. Route handlers here answer a failure with `{ error }`, and a validation failure adds
 * `issues` (Zod's `flatten().fieldErrors`). The field messages are what actually tell the admin
 * what to fix, so they are appended to `error` instead of being dropped.
 *
 * Returns `null` when the body says nothing usable (not JSON, an HTML error page, no `error`).
 * The caller then falls back to its own translated message: this helper has no copy of its own.
 */
export async function readFailureReason(response: Pick<Response, 'json'>): Promise<string | null> {
  let body: unknown
  try {
    body = await response.json()
  } catch {
    return null
  }

  if (typeof body !== 'object' || body === null) return null

  const { error, issues } = body as { error?: unknown; issues?: unknown }
  const message = typeof error === 'string' && error.trim() !== '' ? error.trim() : null
  const details = issueMessages(issues)

  if (details.length === 0) return message
  if (!message) return details.join(' ')
  return `${message.replace(/[.:]$/, '')}: ${details.join(' ')}`
}

/** Every field message in `issues`, in field order, without repeats. */
function issueMessages(issues: unknown): string[] {
  if (typeof issues !== 'object' || issues === null) return []

  const messages = Object.values(issues).flatMap((value: unknown) =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
      : [],
  )
  return [...new Set(messages.map((item) => item.trim()))]
}
