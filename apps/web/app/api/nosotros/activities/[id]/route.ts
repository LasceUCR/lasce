import { NextResponse } from 'next/server'

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
import {
  deleteNosotrosActivity,
  nosotrosActivityUpdateSchema,
  updateNosotrosActivity,
} from '@/app/lib/nosotros'

/**
 * Updates or deletes one "¿Qué hacemos?" activity flashcard
 * (LASCE-CON-012-086). PATCH needs `edit_components`; DELETE needs
 * `delete_components`. Hiding the pencil or trash is not enough — this is
 * the write path the public GET sibling deliberately has none of.
 */
export const dynamic = 'force-dynamic'

const INVALID_ID_MESSAGE = 'El identificador de la actividad no es válido.'

const ACTIVITY_GONE_MESSAGE =
  'Esta actividad ya no existe. Es posible que otra persona la haya eliminado; recargue la página.'

/**
 * Updates a card. `version` is required; `content` carries both languages in full, and is left
 * out to change the icon alone. See `nosotrosActivityUpdateSchema`.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('edit_components')
  if (!guard.ok) return guard.response

  const { id } = await params
  if (!isUuid(id)) return invalidId(INVALID_ID_MESSAGE)

  const json = await readJson(request)
  if (!json.ok) return json.response

  const parsed = nosotrosActivityUpdateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)

  try {
    const result = await updateNosotrosActivity(id, parsed.data, guard.user.id)
    if (result.ok) return ok({ activity: result.activity })

    switch (result.reason) {
      case 'not-found':
        return notFound(ACTIVITY_GONE_MESSAGE)
      case 'conflict':
        return conflict(
          'La actividad cambió desde que la abrió. Recárguela y vuelva a aplicar sus cambios.',
        )
      case 'review-required':
        return reviewRequired(result.pending)
    }
  } catch (error) {
    return internalError('No se pudieron guardar los cambios.', error)
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('delete_components')
  if (!guard.ok) return guard.response

  const { id } = await params
  if (!isUuid(id)) return invalidId(INVALID_ID_MESSAGE)

  try {
    if (!(await deleteNosotrosActivity(id))) return notFound(ACTIVITY_GONE_MESSAGE)
  } catch (error) {
    return internalError('No se pudo eliminar la actividad.', error)
  }

  return new NextResponse(null, { status: 204 })
}
