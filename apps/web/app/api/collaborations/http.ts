import { conflict, notFound, reviewRequired } from '@/app/lib/cms/http'
import type { CollaborationWriteFailure } from '@/app/lib/collaboration-writes'

export function writeFailure(failure: CollaborationWriteFailure) {
  if (failure.reason === 'not-found') return notFound('La colaboración ya no existe.')
  if (failure.reason === 'conflict')
    return conflict(
      'La colaboración cambió. Vuelva a abrir el formulario para cargar la versión actual.',
    )
  return reviewRequired(failure.pending)
}
