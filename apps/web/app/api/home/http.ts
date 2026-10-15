import type { NextResponse } from 'next/server'

import {
  conflict,
  invalidId as invalidIdResponse,
  notFound as notFoundResponse,
  reviewRequired,
} from '@/app/lib/cms/http'
import type { HomeWriteFailure } from '@/app/lib/home'

/**
 * The responses of `/api/home` that speak about the home page's content. The envelope and the
 * generic responses come from `app/lib/cms/http.ts`; what a conflict or a missing record means
 * here is said here, in Spanish, the API's language.
 */

export function invalidIndicatorId(): NextResponse {
  return invalidIdResponse('El identificador del índice geomagnético no es válido.')
}

/** Maps an expected write failure of the banner or of an index to its response. */
export function writeFailure(subject: 'hero' | 'indicator', failure: HomeWriteFailure) {
  switch (failure.reason) {
    case 'not-found':
      return notFoundResponse(
        subject === 'hero'
          ? 'No existe el contenido de la portada.'
          : 'No existe ese índice geomagnético.',
      )
    case 'conflict':
      return conflict(
        subject === 'hero'
          ? 'La portada cambió desde que la abrió. Recárguela y vuelva a aplicar sus cambios.'
          : 'El índice cambió desde que lo abrió. Recárguelo y vuelva a aplicar sus cambios.',
      )
    case 'review-required':
      return reviewRequired(failure.pending)
  }
}

export function orderConflict(): NextResponse {
  return conflict(
    'Los índices geomagnéticos cambiaron desde que cargó la página. Recárguela y vuelva a ordenarlos.',
  )
}
