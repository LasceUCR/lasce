import { NextResponse } from 'next/server'
import { getLocale } from 'next-intl/server'

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
import { resolveLocale } from '@/app/lib/i18n/locale'
import { getMessages } from '@/app/lib/i18n/messages'
import { getNosotrosResearcherUpdateSchema } from '@/app/lib/nosotros-researcher-schema'
import {
  deleteResearcher,
  RosacConflictError,
  RosacReviewRequiredError,
  updateResearcher,
} from '@/app/lib/rosac'

/**
 * Updates or deletes one ROSAC researcher profile (LASCE-CON-012-085). PATCH
 * needs `edit_components`; DELETE needs `delete_components`. Hiding the
 * pencil or trash is not enough — this is the write path the public GET
 * sibling deliberately has none of.
 */
export const dynamic = 'force-dynamic'

const INVALID_ID_MESSAGE = 'El identificador del investigador no es válido.'

const RESEARCHER_GONE_MESSAGE =
  'Este investigador ya no existe. Es posible que otra persona lo haya eliminado; recargue la página.'

const CONFLICT_MESSAGE =
  'El investigador cambió desde que lo abrió. Recárguelo y vuelva a aplicar sus cambios.'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('edit_components')
  if (!guard.ok) return guard.response

  const locale = resolveLocale(await getLocale())
  const messages = getMessages(locale)
  const errors = (messages.researchers as { errors?: Record<string, string> }).errors ?? {}

  const { id } = await params
  if (!isUuid(id)) return invalidId(errors.invalidId ?? INVALID_ID_MESSAGE)

  const json = await readJson(request, errors.invalidJson)
  if (!json.ok) return json.response

  const parsed = getNosotrosResearcherUpdateSchema(locale).safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error, errors.invalidBody)

  try {
    const researcher = await updateResearcher(id, parsed.data, guard.user.id)
    if (!researcher) return notFound(errors.notFound ?? RESEARCHER_GONE_MESSAGE)

    return ok({ researcher })
  } catch (error) {
    if (error instanceof RosacConflictError) {
      return conflict(errors.conflict ?? CONFLICT_MESSAGE)
    }
    if (error instanceof RosacReviewRequiredError) return reviewRequired(error.pending)
    return internalError(errors.updateError ?? 'No se pudieron guardar los cambios.', error)
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('delete_components')
  if (!guard.ok) return guard.response

  const locale = resolveLocale(await getLocale())
  const messages = getMessages(locale)
  const errors = (messages.researchers as { errors?: Record<string, string> }).errors ?? {}

  const { id } = await params
  if (!isUuid(id)) return invalidId(errors.invalidId ?? INVALID_ID_MESSAGE)

  try {
    if (!(await deleteResearcher(id, guard.user))) {
      return notFound(errors.notFound ?? RESEARCHER_GONE_MESSAGE)
    }
  } catch (error) {
    return internalError(errors.deleteError ?? 'No se pudo eliminar el investigador.', error)
  }

  return new NextResponse(null, { status: 204 })
}
