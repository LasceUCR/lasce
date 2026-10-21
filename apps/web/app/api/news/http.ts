import type { NextResponse } from 'next/server'

import {
  conflict,
  duplicate,
  invalidId as invalidIdResponse,
  notFound as notFoundResponse,
  reviewRequired,
} from '@/app/lib/cms/http'
import type { NewsWriteFailure } from '@/app/lib/news'

/**
 * The responses of `/api/news` that speak about news items. The envelope, the issue paths and the
 * generic responses (invalid JSON or body, internal error) come from `app/lib/cms/http.ts`; what a
 * conflict, a duplicate link or a missing id means here is said here.
 */

export function invalidId(): NextResponse {
  return invalidIdResponse('El identificador de la noticia no es válido.')
}

export function notFound(): NextResponse {
  return notFoundResponse(
    'Esta noticia ya no existe. Es posible que otra persona la haya eliminado; recargue la página.',
  )
}

/** Maps an expected write failure to its response. */
export function writeFailure(failure: NewsWriteFailure): NextResponse {
  switch (failure.reason) {
    case 'not-found':
      return notFound()
    case 'conflict':
      return conflict(
        'La noticia cambió desde que la abrió. Recárguela y vuelva a aplicar sus cambios.',
      )
    case 'duplicate-link':
      return duplicate(
        'duplicate-external-url',
        'Ya existe una noticia con este enlace. Use otro enlace o edite la noticia existente.',
      )
    case 'review-required':
      return reviewRequired(failure.pending)
  }
}
