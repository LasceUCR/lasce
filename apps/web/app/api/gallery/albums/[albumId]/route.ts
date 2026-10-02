import { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import {
  createGallerySubAlbum,
  deleteGalleryAlbum,
  galleryIdSchema,
  galleryAlbumUpdateSchema,
  gallerySubAlbumInputSchema,
  updateGalleryAlbum,
} from '@/app/lib/gallery'

export const dynamic = 'force-dynamic'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ albumId: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('delete_components')
  if (!guard.ok) return guard.response

  const { albumId } = await params
  if (!galleryIdSchema.safeParse(albumId).success) {
    return NextResponse.json({ error: 'El id del álbum no es válido.' }, { status: 400 })
  }

  const deleted = await deleteGalleryAlbum(albumId)
  if (!deleted) {
    return NextResponse.json({ error: 'No existe el álbum indicado.' }, { status: 404 })
  }

  return new NextResponse(null, {
    status: 204,
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ albumId: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('edit_components')
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

  const parsed = galleryAlbumUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Faltan campos obligatorios o no son válidos.',
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    )
  }

  const result = await updateGalleryAlbum(albumId, parsed.data)
  if (!result.ok) {
    if (result.reason === 'not-found') {
      return NextResponse.json({ error: 'No existe el álbum indicado.' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Ya existe un álbum con este slug.' }, { status: 409 })
  }

  return NextResponse.json({ album: result.album }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ albumId: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('create_components')
  if (!guard.ok) return guard.response

  const { albumId: parentAlbumId } = await params
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
