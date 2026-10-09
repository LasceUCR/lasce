import { NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * JSON responses for CMS route handlers. Every error body has a Spanish `error` message for
 * people and a stable `code` for the editor to branch on, plus `issues` or `pending` where they
 * apply. Nothing from Prisma or PostgreSQL ever reaches a body: unexpected errors are logged on
 * the server and answered as `internal-error`.
 *
 * Messages that name the entity ("No existe un evento…") stay in each entity's routes; the
 * helpers below take them as arguments. Server-only: it imports `next/server`.
 */

const NO_STORE = { 'Cache-Control': 'no-store' }

/** One validation problem, at the full dotted path of its field (`content.en.title`). */
export type ApiIssue = { path: string; message: string }

/** A field to update or confirm because its counterpart changed in another language. */
export type PendingReview = { locale: string; field: string }

export function errorResponse(
  status: number,
  code: string,
  error: string,
  extra: Record<string, unknown> = {},
): NextResponse {
  return NextResponse.json({ error, code, ...extra }, { status, headers: NO_STORE })
}

export function ok(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE })
}

function dotted(path: readonly PropertyKey[]): string {
  return path.map(String).join('.')
}

/**
 * One entry per problem, with the full path of the field so the editor can point at the language
 * and the field. An unknown key, such as an unsupported language, is reported at its own path
 * (`content.fr`) rather than at its parent's.
 */
export function issuesOf(error: z.ZodError): ApiIssue[] {
  return error.issues.flatMap((issue) =>
    issue.code === 'unrecognized_keys'
      ? issue.keys.map((key) => ({
          path: dotted([...issue.path, key]),
          message: `Campo no permitido: ${key}.`,
        }))
      : [{ path: dotted(issue.path), message: issue.message }],
  )
}

export function invalidJson(): NextResponse {
  return errorResponse(400, 'invalid-json', 'El cuerpo de la solicitud no es JSON válido.')
}

/** The request body, or the `invalid-json` response to answer with when it is not JSON. */
export async function readJson(
  request: Request,
): Promise<{ ok: true; body: unknown } | { ok: false; response: NextResponse }> {
  try {
    return { ok: true, body: await request.json() }
  } catch {
    return { ok: false, response: invalidJson() }
  }
}

export function invalidBody(error: z.ZodError): NextResponse {
  return errorResponse(400, 'invalid-body', 'Faltan campos obligatorios o no son válidos.', {
    issues: issuesOf(error),
  })
}

const uuid = z.uuid()

/** True for an id the database could hold. Check it before querying with it. */
export function isUuid(id: string): boolean {
  return uuid.safeParse(id).success
}

export function invalidId(message: string): NextResponse {
  return errorResponse(400, 'invalid-id', message)
}

export function notFound(message: string): NextResponse {
  return errorResponse(404, 'not-found', message)
}

/** The record changed since the editor loaded it. */
export function conflict(message: string): NextResponse {
  return errorResponse(409, 'conflict', message)
}

/** A unique value already in use. `code` names the field, such as `duplicate-slug`. */
export function duplicate(code: `duplicate-${string}`, message: string): NextResponse {
  return errorResponse(409, code, message)
}

/**
 * A translatable field changed in some languages only, and its counterparts were neither
 * changed nor confirmed. Each pending entry carries its form path, `content.<locale>.<field>`.
 */
export function reviewRequired(pending: readonly PendingReview[]): NextResponse {
  return errorResponse(
    400,
    'review-required',
    'Cambió un campo en un solo idioma. Actualice el campo equivalente en el otro idioma o confirme que sigue siendo correcto.',
    {
      pending: pending.map(({ locale, field }) => ({
        path: `content.${locale}.${field}`,
        locale,
        field,
      })),
    },
  )
}

/** Logs `error` on the server and answers without any of its details. */
export function internalError(message: string, error: unknown): NextResponse {
  console.error(`${message}:`, error)
  return errorResponse(500, 'internal-error', message)
}
