import { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { createGalleryMedia, galleryIdSchema, galleryMediaInputSchema } from '@/app/lib/gallery'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ albumId: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('create_components')
  if (!guard.ok) return guard.response

  const { albumId } = await params
  if (!galleryIdSchema.safeParse(albumId).success) {
    return NextResponse.json({ error: 'El id del álbum no es válido.' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'El cuerpo de la solicitud no es JSON válido.' },
      { status: 400 },
    )
  }

  const parsed = galleryMediaInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Faltan campos obligatorios o no son válidos.',
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    )
  }

  const result = await createGalleryMedia(albumId, parsed.data)
  if (!result.ok) {
    if (result.reason === 'album-not-found') {
      return NextResponse.json({ error: 'No existe el álbum indicado.' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'El archivo ya existe o se modificó el álbum. Inténtelo de nuevo.' },
      { status: 409 },
    )
  }

  return NextResponse.json(
    { media: result.media },
    { status: 201, headers: { 'Cache-Control': 'no-store' } },
  )
}
