import type { NextResponse } from 'next/server'

import {
  conflict,
  duplicate,
  invalidId as invalidIdResponse,
  notFound as notFoundResponse,
  reviewRequired,
} from '@/app/lib/cms/http'
import type { PublicationWriteFailure } from '@/app/lib/publications'

/**
 * The responses of `/api/publicaciones` that speak about publications. The envelope, the issue
 * paths and the generic responses (invalid JSON or body, internal error) come from
 * `app/lib/cms/http.ts`; what a conflict, a duplicate DOI or a missing id means here is said here.
 */

export function invalidId(): NextResponse {
  return invalidIdResponse('El identificador de la publicación no es válido.')
}

export function notFound(id: string): NextResponse {
  return notFoundResponse(`No existe una publicación con id "${id}".`)
}

/** Maps an expected write failure to its response. */
export function writeFailure(id: string | null, failure: PublicationWriteFailure): NextResponse {
  switch (failure.reason) {
    case 'not-found':
      return notFound(id ?? '')
    case 'conflict':
      return conflict(
        'La publicación cambió desde que la abrió. Recárguela y vuelva a aplicar sus cambios.',
      )
    case 'duplicate':
      return failure.field === 'doi'
        ? duplicate('duplicate-doi', 'Ya existe una publicación con este DOI.')
        : duplicate('duplicate-external-url', 'Ya existe una publicación con este enlace externo.')
    case 'review-required':
      return reviewRequired(failure.pending)
  }
}
