import { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import {
  deletePublication,
  publicationUpdateSchema,
  updatePublication,
} from '@/app/lib/publications'

import {
  internalError,
  invalidBody,
  invalidId,
  invalidJson,
  isPublicationId,
  notFound,
  ok,
  writeFailure,
} from '../http'

export const dynamic = 'force-dynamic'

/**
 * Updates a publication against the `version` the editor loaded. With `content` it is a
 * bilingual content update; without it, only the shared fields present are written. See
 * `publicationUpdateSchema`.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('edit_components')
  if (!guard.ok) return guard.response

  const { id } = await params
  if (!isPublicationId(id)) return invalidId()

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return invalidJson()
  }

  const parsed = publicationUpdateSchema.safeParse(body)
  if (!parsed.success) return invalidBody(parsed.error)

  try {
    const result = await updatePublication(id, parsed.data)
    if (!result.ok) return writeFailure(id, result)

    return ok({ publication: result.publication })
  } catch (error) {
    return internalError('No se pudo guardar la publicación.', error)
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('delete_components')
  if (!guard.ok) return guard.response

  const { id } = await params
  if (!isPublicationId(id)) return invalidId()

  try {
    const deleted = await deletePublication(id)
    if (!deleted) return notFound(id)
  } catch (error) {
    return internalError('No se pudo eliminar la publicación.', error)
  }

  return new NextResponse(null, { status: 204 })
}
