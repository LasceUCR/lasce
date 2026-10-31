import { conflict, notFound, reviewRequired } from '@/app/lib/cms/http'
import type { InitiativeWriteFailure } from '@/app/lib/initiative-writes'

export function writeFailure(failure: InitiativeWriteFailure) {
  if (failure.reason === 'not-found') return notFound('La iniciativa ya no existe.')
  if (failure.reason === 'conflict')
    return conflict(
      'La iniciativa cambió. Vuelva a abrir el formulario para cargar la versión actual.',
    )
  return reviewRequired(failure.pending)
}
