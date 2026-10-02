import { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import {
  createGallerySubAlbum,
  galleryIdSchema,
  gallerySubAlbumInputSchema,
} from '@/app/lib/gallery'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ parentAlbumId: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('create_components')
  if (!guard.ok) return guard.response

  const { parentAlbumId } = await params
  if (!galleryIdSchema.safeParse(parentAlbumId).success) {
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

  const parsed = gallerySubAlbumInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Faltan campos obligatorios o no son válidos.',
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    )
  }

  const result = await createGallerySubAlbum(parentAlbumId, parsed.data)
  if (!result.ok) {
    if (result.reason === 'parent-not-found') {
      return NextResponse.json({ error: 'No existe el álbum padre indicado.' }, { status: 404 })
    }
    if (result.reason === 'parent-not-top-level') {
      return NextResponse.json(
        { error: 'No se pueden crear subálbumes dentro de otro subálbum.' },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: 'Ya existe un álbum con este slug.' }, { status: 409 })
  }

  return NextResponse.json(
    { album: result.album },
    { status: 201, headers: { 'Cache-Control': 'no-store' } },
  )
}
