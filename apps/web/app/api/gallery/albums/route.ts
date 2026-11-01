import { NextResponse } from 'next/server'
import { getLocale } from 'next-intl/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { internalError, invalidBody, ok, readJson } from '@/app/lib/cms/http'
import { albumCreateSchema, createTopLevelGalleryAlbum, getGalleryAlbums } from '@/app/lib/gallery'
import { resolveLocale } from '@/app/lib/i18n/locale'

import { albumWriteFailure } from '../http'

export const dynamic = 'force-dynamic'

/** Public list, in the language of the request's `lasce_locale` cookie. Never editing data. */
export async function GET(): Promise<NextResponse> {
  const albums = await getGalleryAlbums(resolveLocale(await getLocale()))

  return NextResponse.json({ albums }, { headers: { 'Cache-Control': 'no-store' } })
}

/**
 * Creates a top-level album. The body needs `content.es` and `content.en` in full; see
 * `albumCreateSchema`. Answers 201 with the stored album, including its `editing.version`.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const guard = await requireApiPermission('create_components')
  if (!guard.ok) return guard.response

  const json = await readJson(request)
  if (!json.ok) return json.response

  const parsed = albumCreateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)

  try {
    const result = await createTopLevelGalleryAlbum(parsed.data, guard.user)
    if (!result.ok) return albumWriteFailure(result)

    return ok({ album: result.album }, 201)
  } catch (error) {
    return internalError('No se pudo crear el álbum.', error)
  }
}
