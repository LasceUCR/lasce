import { NextResponse } from 'next/server'
import { z } from 'zod'

import type { PublicationWriteFailure, ReviewConfirmation } from '@/app/lib/publications'

/**
 * JSON responses shared by the `/api/publicaciones` route handlers. Every error body carries a
 * Spanish `error` message for people and a stable `code` for the editor to branch on. Nothing
 * from Prisma or PostgreSQL ever reaches a body: unexpected errors are logged and reported as
 * `internal-error`.
 */

const NO_STORE = { 'Cache-Control': 'no-store' }

export type PublicationIssue = { path: string; message: string }

function errorResponse(
  status: number,
  code: string,
  error: string,
  extra: Record<string, unknown> = {},
): NextResponse {
  return NextResponse.json({ error, code, ...extra }, { status, headers: NO_STORE })
}

function dotted(path: readonly PropertyKey[]): string {
  return path.map(String).join('.')
}

/**
 * One entry per problem, with the full path of the field (`content.en.title`) so the editor can
 * point at the language and the field. An unknown key, such as an unsupported language, is
 * reported at its own path (`content.fr`).
 */
export function issuesOf(error: z.ZodError): PublicationIssue[] {
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

export function invalidBody(error: z.ZodError): NextResponse {
  return errorResponse(400, 'invalid-body', 'Faltan campos obligatorios o no son válidos.', {
    issues: issuesOf(error),
  })
}

const publicationId = z.uuid()

export function isPublicationId(id: string): boolean {
  return publicationId.safeParse(id).success
}

export function invalidId(): NextResponse {
  return errorResponse(400, 'invalid-id', 'El identificador de la publicación no es válido.')
}

export function notFound(id: string): NextResponse {
  return errorResponse(404, 'not-found', `No existe una publicación con id "${id}".`)
}

function pendingReview({ locale, field }: ReviewConfirmation) {
  return { path: `content.${locale}.${field}`, locale, field }
}

/** Maps an expected write failure to its response. */
export function writeFailure(id: string | null, failure: PublicationWriteFailure): NextResponse {
  switch (failure.reason) {
    case 'not-found':
      return notFound(id ?? '')
    case 'conflict':
      return errorResponse(
        409,
        'conflict',
        'La publicación cambió desde que la abrió. Recárguela y vuelva a aplicar sus cambios.',
      )
    case 'duplicate':
      return failure.field === 'doi'
        ? errorResponse(409, 'duplicate-doi', 'Ya existe una publicación con este DOI.')
        : errorResponse(
            409,
            'duplicate-external-url',
            'Ya existe una publicación con este enlace externo.',
          )
    case 'review-required':
      return errorResponse(
        400,
        'review-required',
        'Cambió un campo en un solo idioma. Actualice el campo equivalente en el otro idioma o confirme que sigue siendo correcto.',
        { pending: failure.pending.map(pendingReview) },
      )
  }
}

/** Logs `error` on the server and answers without any of its details. */
export function internalError(message: string, error: unknown): NextResponse {
  console.error(`${message}:`, error)
  return errorResponse(500, 'internal-error', message)
}

export function ok(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE })
}
