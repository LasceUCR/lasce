import { conflict, notFound, reviewRequired } from '@/app/lib/cms/http'
import type { ScientificToolWriteFailure } from '@/app/lib/scientific-tool-writes'

export const NOT_FOUND_MESSAGE = 'La herramienta científica ya no existe.'

export function writeFailure(failure: ScientificToolWriteFailure) {
  if (failure.reason === 'not-found') return notFound(NOT_FOUND_MESSAGE)
  if (failure.reason === 'conflict')
    return conflict(
      'La herramienta científica cambió. Vuelva a abrir el formulario para cargar la versión actual.',
    )
  return reviewRequired(failure.pending)
}
