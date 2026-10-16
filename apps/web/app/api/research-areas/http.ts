import type { NextResponse } from 'next/server'

import {
  conflict,
  invalidId as invalidIdResponse,
  notFound as notFoundResponse,
  reviewRequired,
} from '@/app/lib/cms/http'
import type { ResearchAreaWriteFailure } from '@/app/lib/research-areas'

/**
 * The responses of `/api/research-areas` that speak about research areas. The envelope, the
 * issue paths and the generic responses (invalid JSON or body, internal error) come from
 * `app/lib/cms/http.ts`; what a conflict or a missing id means here is said here, in Spanish, the
 * API's language.
 */

export function invalidId(): NextResponse {
  return invalidIdResponse('El identificador del área de investigación no es válido.')
}

export function notFound(id: string): NextResponse {
  return notFoundResponse(`No existe un área de investigación con id "${id}".`)
}

/** Maps an expected write failure to its response. */
export function writeFailure(id: string, failure: ResearchAreaWriteFailure): NextResponse {
  switch (failure.reason) {
    case 'not-found':
      return notFound(id)
    case 'conflict':
      return conflict(
        'El área de investigación cambió desde que la abrió. Recárguela y vuelva a aplicar sus cambios.',
      )
    case 'review-required':
      return reviewRequired(failure.pending)
  }
}
