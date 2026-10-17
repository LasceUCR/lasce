import { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { internalError, invalidBody, isUuid, ok, readJson } from '@/app/lib/cms/http'
import {
  albumUpdateSchema,
  createGallerySubAlbum,
  deleteGalleryAlbum,
  subAlbumCreateSchema,
  updateGalleryAlbum,
} from '@/app/lib/gallery'

import { albumNotFound, albumWriteFailure, invalidAlbumId } from '../../http'

export const dynamic = 'force-dynamic'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ albumId: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('delete_components')
  if (!guard.ok) return guard.response

  const { albumId } = await params
  if (!isUuid(albumId)) return invalidAlbumId()

  try {
    const deleted = await deleteGalleryAlbum(albumId)
    if (!deleted) return albumNotFound()
  } catch (error) {
    return internalError('No se pudo eliminar el álbum.', error)
  }

  return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
}

/**
 * Updates an album or sub-album against the `version` the editor loaded. With `content` it is a
 * bilingual content update; without it, only the shared fields present are written. See
 * `albumUpdateSchema`.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ albumId: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('edit_components')
  if (!guard.ok) return guard.response

  const { albumId } = await params
  if (!isUuid(albumId)) return invalidAlbumId()

  const json = await readJson(request)
  if (!json.ok) return json.response

  const parsed = albumUpdateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)

  try {
    const result = await updateGalleryAlbum(albumId, parsed.data)
    if (!result.ok) return albumWriteFailure(result)

    return ok({ album: result.album })
  } catch (error) {
    return internalError('No se pudo guardar el álbum.', error)
  }
}

/** Creates a sub-album under the top-level album in the URL; see `subAlbumCreateSchema`. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ albumId: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('create_components')
  if (!guard.ok) return guard.response

  const { albumId: parentAlbumId } = await params
  if (!isUuid(parentAlbumId)) return invalidAlbumId()

  const json = await readJson(request)
  if (!json.ok) return json.response

  const parsed = subAlbumCreateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)

  try {
    const result = await createGallerySubAlbum(parentAlbumId, parsed.data)
    if (!result.ok) return albumWriteFailure(result)

    return ok({ album: result.album }, 201)
  } catch (error) {
    return internalError('No se pudo crear el subálbum.', error)
  }
}
