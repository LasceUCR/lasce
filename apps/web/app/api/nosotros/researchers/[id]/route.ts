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
  deleteNosotrosResearcher,
  nosotrosResearcherUpdateSchema,
  updateNosotrosResearcher,
} from '@/app/lib/nosotros'

/**
 * Updates or deletes one Nosotros researcher profile (LASCE-CON-012-086
 * follow-up). PATCH needs `edit_components`; DELETE needs
 * `delete_components`.
 */
export const dynamic = 'force-dynamic'

const INVALID_ID_MESSAGE = 'El identificador del investigador no es válido.'

const RESEARCHER_GONE_MESSAGE =
  'Este investigador ya no existe. Es posible que otra persona lo haya eliminado; recargue la página.'

/**
 * Updates a profile. `version` is required; `content` carries both languages in full, and is
 * left out to change the shared fields alone. See `nosotrosResearcherUpdateSchema`.
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

  const parsed = nosotrosResearcherUpdateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)

  try {
    const result = await updateNosotrosResearcher(id, parsed.data, guard.user.id)
    if (result.ok) return ok({ researcher: result.researcher })

    switch (result.reason) {
      case 'not-found':
        return notFound(RESEARCHER_GONE_MESSAGE)
      case 'conflict':
        return conflict(
          'El investigador cambió desde que lo abrió. Recárguelo y vuelva a aplicar sus cambios.',
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
    if (!(await deleteNosotrosResearcher(id, guard.user))) return notFound(RESEARCHER_GONE_MESSAGE)
  } catch (error) {
    return internalError('No se pudo eliminar el investigador.', error)
  }

  return new NextResponse(null, { status: 204 })
}
