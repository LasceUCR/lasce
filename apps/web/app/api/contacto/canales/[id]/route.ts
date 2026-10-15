import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import {
  conflict,
  internalError,
  invalidBody,
  invalidId,
  isUuid,
  notFound,
  ok,
  readJson,
  reviewRequired,
} from '@/app/lib/cms/http'
import { contactChannelUpdateSchema } from '@/app/lib/contact-channel-schema'
import {
  deleteContactChannel,
  updateContactChannel,
  type ContactChannelWriteFailure,
} from '@/app/lib/contact-channels'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

function badId() {
  return invalidId('El identificador del canal de contacto no es válido.')
}

function missing(id: string) {
  return notFound(`No existe un canal de contacto con id "${id}".`)
}

function writeFailure(id: string, failure: ContactChannelWriteFailure) {
  switch (failure.reason) {
    case 'not-found':
      return missing(id)
    case 'conflict':
      return conflict(
        'El canal cambió desde que lo abrió. Recárguelo y vuelva a aplicar sus cambios.',
      )
    case 'review-required':
      return reviewRequired(failure.pending)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const guard = await requireApiPermission('edit_components')
  if (!guard.ok) return guard.response

  const { id } = await context.params
  if (!isUuid(id)) return badId()

  const json = await readJson(request)
  if (!json.ok) return json.response

  const parsed = contactChannelUpdateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)

  try {
    const result = await updateContactChannel(id, parsed.data)
    if (!result.ok) return writeFailure(id, result)
    return ok({ card: result.card })
  } catch (error) {
    return internalError('No se pudo guardar el canal de contacto.', error)
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const guard = await requireApiPermission('delete_components')
  if (!guard.ok) return guard.response

  const { id } = await context.params
  if (!isUuid(id)) return badId()

  try {
    const deleted = await deleteContactChannel(id)
    if (!deleted) return missing(id)
    return ok({ id })
  } catch (error) {
    return internalError('No se pudo eliminar el canal de contacto.', error)
  }
}
