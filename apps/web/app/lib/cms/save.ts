/**
 * The browser side of a CMS save: sending JSON and reading the API's error envelope
 * (`app/lib/cms/http.ts`) into what an editor shows. Each entity composes these with its own
 * messages: what a conflict, a missing record or a duplicate value means is entity-specific, and
 * so is which paths its form can show an error under. Free of React and of server imports.
 */

export interface SaveFailure {
  /** Shown above the form. */
  message: string
  /** Shown under the fields, keyed by path. */
  fieldErrors: Record<string, string>
  /** True when the form can no longer be saved as is and must be reopened. */
  reopen: boolean
}

export const SAVE_ERROR_MESSAGE = 'No se pudo guardar el cambio. Inténtelo de nuevo.'

/** Above the form when the problems are shown under the fields. */
export const FIELDS_MESSAGE = 'Revise los campos marcados.'

/** The texts of a failed save that do not depend on the entity, in one interface language. */
export interface SaveMessages {
  /** Any failure with nothing more specific to say, a network error included. */
  readonly generic: string
  /** Above the form when the problems are shown under the fields. */
  readonly fields: string
  readonly notSignedIn: string
  /** After `notSignedIn` (or the server's own message): what to do about it. */
  readonly signInAgain: string
  readonly forbidden: string
}

/** The same texts in Spanish, the API's language: the default of every helper below. */
export const SPANISH_SAVE_MESSAGES: SaveMessages = {
  generic: SAVE_ERROR_MESSAGE,
  fields: FIELDS_MESSAGE,
  notSignedIn: 'No ha iniciado sesión.',
  signInAgain: 'Inicie sesión de nuevo para guardar; sus cambios siguen en el formulario.',
  forbidden: 'No tiene permisos para modificar este contenido.',
}

/**
 * How a request ended. `status` is `0` when it never got an answer (offline, DNS, CORS), and
 * `body` is `null` when there was none or it was not JSON.
 */
export type JsonResult =
  { ok: true; status: number; body: unknown } | { ok: false; status: number; body: unknown }

/** Sends `body` as JSON (or nothing, without a body) and reads the answer as JSON when it can. */
export async function sendJson(
  url: string,
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  body?: unknown,
): Promise<JsonResult> {
  let response: Response

  try {
    response = await fetch(
      url,
      body === undefined
        ? { method }
        : {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
    )
  } catch {
    return { ok: false, status: 0, body: null }
  }

  const json: unknown = await response.json().catch(() => null)
  return { ok: response.ok, status: response.status, body: json }
}

/** An error body, with every field checked rather than trusted. */
export interface ApiError {
  /** The Spanish `error` message, when there is one. */
  message: string | null
  code: string | null
  /** From `invalid-body`. A path that is not text is `''`; a missing message is `null`. */
  issues: { path: string; message: string | null }[]
  /** From `review-required`: the paths to update or confirm. */
  pending: string[]
}

function objects(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> => typeof item === 'object' && item !== null,
      )
    : []
}

export function parseApiError(body: unknown): ApiError {
  const fields = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}

  return {
    message: typeof fields.error === 'string' ? fields.error : null,
    code: typeof fields.code === 'string' ? fields.code : null,
    issues: objects(fields.issues).map((issue) => ({
      path: typeof issue.path === 'string' ? issue.path : '',
      message: typeof issue.message === 'string' ? issue.message : null,
    })),
    pending: objects(fields.pending)
      .map((entry) => entry.path)
      .filter((path): path is string => typeof path === 'string'),
  }
}

/**
 * `error` without the server's texts, which are in Spanish, for an editor shown in another
 * language: every helper below then falls back to that editor's own `SaveMessages`.
 */
export function withoutServerText(error: ApiError): ApiError {
  return {
    ...error,
    message: null,
    issues: error.issues.map((issue) => ({ ...issue, message: null })),
  }
}

/**
 * An `invalid-body` answer: each issue under its field when the form shows that field, the rest
 * (such as `version` or the body itself) above the form, or they would be counted but never seen.
 */
export function invalidBodyFailure(
  error: ApiError,
  isFormField: (path: string) => boolean,
  messages: SaveMessages = SPANISH_SAVE_MESSAGES,
): SaveFailure {
  const fieldErrors: Record<string, string> = {}
  const general: string[] = []

  for (const issue of error.issues) {
    const message = issue.message ?? messages.fields
    if (isFormField(issue.path)) fieldErrors[issue.path] ??= message
    else general.push(message)
  }

  return {
    message: general.length > 0 ? general.join(' ') : messages.fields,
    fieldErrors,
    reopen: false,
  }
}

/** A `review-required` answer: `fieldMessage` under every field still to update or confirm. */
export function reviewRequiredFailure(
  error: ApiError,
  fieldMessage: string,
  messages: SaveMessages = SPANISH_SAVE_MESSAGES,
): SaveFailure {
  return {
    message: error.message ?? messages.fields,
    fieldErrors: Object.fromEntries(error.pending.map((path) => [path, fieldMessage])),
    reopen: false,
  }
}

/**
 * A 401 or 403, from the API's permission guard; `null` for any other status. The form keeps what
 * was typed, so signing in again in another tab and saving again loses nothing.
 */
export function accessFailure(
  status: number,
  error: ApiError,
  messages: SaveMessages = SPANISH_SAVE_MESSAGES,
): SaveFailure | null {
  if (status === 401) {
    return {
      message: `${error.message ?? messages.notSignedIn} ${messages.signInAgain}`,
      fieldErrors: {},
      reopen: false,
    }
  }

  if (status === 403) {
    return {
      message: error.message ?? messages.forbidden,
      fieldErrors: {},
      reopen: false,
    }
  }

  return null
}

/** Any other failure, a network error included: the server's message, or a generic one. */
export function unexpectedFailure(
  error: ApiError,
  messages: SaveMessages = SPANISH_SAVE_MESSAGES,
): SaveFailure {
  return { message: error.message ?? messages.generic, fieldErrors: {}, reopen: false }
}
