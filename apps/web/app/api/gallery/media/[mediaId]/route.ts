import { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { internalError, invalidBody, isUuid, ok, readJson } from '@/app/lib/cms/http'
import { deleteGalleryMedia, galleryMediaUpdateSchema, updateGalleryMedia } from '@/app/lib/gallery'

import { invalidMediaId, mediaNotFound, mediaWriteFailure } from '../../http'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('edit_components')
  if (!guard.ok) return guard.response

  const { mediaId } = await params
  if (!isUuid(mediaId)) return invalidMediaId()

  const json = await readJson(request)
  if (!json.ok) return json.response

  const parsed = galleryMediaUpdateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)

  try {
    const result = await updateGalleryMedia(mediaId, parsed.data, guard.user)
    if (!result.ok) return mediaWriteFailure(result)

    return ok({ media: result.media })
  } catch (error) {
    return internalError('No se pudo guardar el archivo.', error)
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('delete_components')
  if (!guard.ok) return guard.response

  const { mediaId } = await params
  if (!isUuid(mediaId)) return invalidMediaId()

  try {
    const deleted = await deleteGalleryMedia(mediaId, guard.user)
    if (!deleted) return mediaNotFound()
  } catch (error) {
    return internalError('No se pudo eliminar el archivo.', error)
  }

  return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
}
