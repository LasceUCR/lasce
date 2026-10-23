import type { NextResponse } from 'next/server'

import {
  conflict,
  invalidId as invalidIdResponse,
  notFound as notFoundResponse,
  reviewRequired,
} from '@/app/lib/cms/http'
import type { RosacWriteFailure } from '@/app/lib/rosac'

export function invalidId(message = 'El identificador no es válido.'): NextResponse {
  return invalidIdResponse(message)
}

export function notFound(entityName: string, id: string): NextResponse {
  return notFoundResponse(`No existe ${entityName} con id "${id}".`)
}

export function writeFailure<F extends string>(
  entityName: string,
  id: string,
  failure: RosacWriteFailure<F>,
): NextResponse {
  switch (failure.reason) {
    case 'not-found':
      return notFound(entityName, id)
    case 'conflict':
      return conflict(
        'El elemento cambió desde que lo abrió. Recárguelo y vuelva a aplicar sus cambios.',
      )
    case 'review-required':
      return reviewRequired(failure.pending)
  }
}
