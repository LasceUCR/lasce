import { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { internalError, invalidBody, isUuid, ok, readJson } from '@/app/lib/cms/http'
import { deleteNews, newsUpdateSchema, updateNews } from '@/app/lib/news'

import { invalidId, notFound, writeFailure } from '../http'

export const dynamic = 'force-dynamic'

/**
 * Updates a news item against the `version` the editor loaded. Requires `edit_components`. With
 * `content` it is a bilingual content update; without it, only the shared fields present are
 * written. See `newsUpdateSchema`.
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

  const parsed = newsUpdateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)

  try {
    const result = await updateNews(id, parsed.data, guard.user)
    if (!result.ok) return writeFailure(result)

    return ok({ article: result.article })
  } catch (error) {
    return internalError('No se pudieron guardar los cambios de la noticia.', error)
  }
}

/** Deletes a news item and its translations. Requires `delete_components`. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('delete_components')
  if (!guard.ok) return guard.response

  const { id } = await params
  if (!isUuid(id)) return invalidId()

  try {
    const deleted = await deleteNews(id, guard.user)
    if (!deleted) return notFound()
  } catch (error) {
    return internalError('No se pudo eliminar la noticia.', error)
  }

  return new NextResponse(null, { status: 204 })
}
