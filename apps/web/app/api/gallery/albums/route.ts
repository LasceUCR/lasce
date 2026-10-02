import { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { createTopLevelGalleryAlbum, galleryTopLevelAlbumInputSchema } from '@/app/lib/gallery'

export const dynamic = 'force-dynamic'

export async function POST(request: Request): Promise<NextResponse> {
  const guard = await requireApiPermission('create_components')
  if (!guard.ok) return guard.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'El cuerpo de la solicitud no es JSON válido.' },
      { status: 400 },
    )
  }

  const parsed = galleryTopLevelAlbumInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Faltan campos obligatorios o no son válidos.',
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    )
  }

  const result = await createTopLevelGalleryAlbum(parsed.data)
  if (!result.ok) {
    if (result.reason === 'section-not-found') {
      return NextResponse.json({ error: 'No existe la sección indicada.' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Ya existe un álbum con este slug.' }, { status: 409 })
  }

  return NextResponse.json(
    { album: result.album },
    { status: 201, headers: { 'Cache-Control': 'no-store' } },
  )
}
