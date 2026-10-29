import { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import {
  conflict,
  internalError,
  invalidBody,
  isUuid,
  notFound as notFoundResponse,
  ok,
  readJson,
  reviewRequired,
} from '@/app/lib/cms/http'
import { deleteResearcher, rosacResearcherUpdateSchema, updateResearcher } from '@/app/lib/rosac'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('edit_components')
  if (!guard.ok) return guard.response

  const { id } = await params
  if (!isUuid(id)) {
    return notFoundResponse(`No existe un investigador con id "${id}".`)
  }

  const json = await readJson(request)
  if (!json.ok) return json.response

  const parsed = rosacResearcherUpdateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)

  try {
    const result = await updateResearcher(id, parsed.data, guard.user.id)
    if (!result.ok) {
      switch (result.reason) {
        case 'not-found':
          return notFoundResponse(`No existe un investigador con id "${id}".`)
        case 'conflict':
          return conflict(
            'El perfil del investigador cambió desde que lo abrió. Recárguelo y vuelva a aplicar sus cambios.',
          )
        case 'review-required':
          return reviewRequired(result.pending)
      }
    }

    return ok({ researcher: result.researcher })
  } catch (error) {
    return internalError('No se pudo guardar el investigador.', error)
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('delete_components')
  if (!guard.ok) return guard.response

  const { id } = await params
  if (!isUuid(id)) {
    return notFoundResponse(`No existe un investigador con id "${id}".`)
  }

  try {
    const deleted = await deleteResearcher(id, guard.user)
    if (!deleted) {
      return notFoundResponse(`No existe un investigador con id "${id}".`)
    }
  } catch (error) {
    return internalError('No se pudo eliminar el investigador.', error)
  }

  return new NextResponse(null, { status: 204 })
}
