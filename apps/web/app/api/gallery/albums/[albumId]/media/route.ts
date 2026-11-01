import type { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { internalError, invalidBody, isUuid, ok, readJson } from '@/app/lib/cms/http'
import { createGalleryMedia, galleryMediaInputSchema } from '@/app/lib/gallery'

import { invalidAlbumId, mediaWriteFailure } from '../../../http'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ albumId: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('create_components')
  if (!guard.ok) return guard.response

  const { albumId } = await params
  if (!isUuid(albumId)) return invalidAlbumId()

  const json = await readJson(request)
  if (!json.ok) return json.response

  const parsed = galleryMediaInputSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)

  try {
    const result = await createGalleryMedia(albumId, parsed.data, guard.user)
    if (!result.ok) return mediaWriteFailure(result)

    return ok({ media: result.media }, 201)
  } catch (error) {
    return internalError('No se pudo agregar el archivo.', error)
  }
}
