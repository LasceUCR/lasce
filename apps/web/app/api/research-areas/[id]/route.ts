import { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { internalError, invalidBody, isUuid, ok, readJson } from '@/app/lib/cms/http'
import { researchAreaUpdateSchema } from '@/app/lib/research-area-schema'
import { deleteResearchArea, updateResearchArea } from '@/app/lib/research-areas'

import { invalidId, notFound, writeFailure } from '../http'

export const dynamic = 'force-dynamic'

/**
 * Updates a research area against the `version` the editor loaded: its photo, its title and
 * description in every language (`content`), or both. See `researchAreaUpdateSchema`.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('edit_components')
  if (!guard.ok) return guard.response

  const { id } = await params
  if (!isUuid(id)) return invalidId()

  const json = await readJson(request)
  if (!json.ok) return json.response

  const parsed = researchAreaUpdateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)

  try {
    const result = await updateResearchArea(id, parsed.data, guard.user)
    if (!result.ok) return writeFailure(id, result)

    return ok({ area: result.area })
  } catch (error) {
    return internalError('No se pudo guardar el área de investigación.', error)
  }
}

/** Deletes a research area; its translations go with it. Answers 204, or 404. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('delete_components')
  if (!guard.ok) return guard.response

  const { id } = await params
  if (!isUuid(id)) return invalidId()

  try {
    const deleted = await deleteResearchArea(id, guard.user)
    if (!deleted) return notFound(id)
  } catch (error) {
    return internalError('No se pudo eliminar el área de investigación.', error)
  }

  return new NextResponse(null, { status: 204 })
}
