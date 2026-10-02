import { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import {
  deleteGalleryMedia,
  galleryIdSchema,
  galleryMediaUpdateSchema,
  updateGalleryMedia,
} from '@/app/lib/gallery'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('edit_components')
  if (!guard.ok) return guard.response

  const { mediaId } = await params
  if (!galleryIdSchema.safeParse(mediaId).success) {
    return NextResponse.json({ error: 'El id del archivo no es válido.' }, { status: 400 })
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

  const parsed = galleryMediaUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Faltan campos obligatorios o no son válidos.',
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    )
  }

  const result = await updateGalleryMedia(mediaId, parsed.data)
  if (!result.ok) {
    if (result.reason === 'not-found') {
      return NextResponse.json({ error: 'No existe el archivo indicado.' }, { status: 404 })
    }
    return NextResponse.json({ error: 'La clave del archivo ya está en uso.' }, { status: 409 })
  }

  return NextResponse.json({ media: result.media }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('delete_components')
  if (!guard.ok) return guard.response

  const { mediaId } = await params
  if (!galleryIdSchema.safeParse(mediaId).success) {
    return NextResponse.json({ error: 'El id del archivo no es válido.' }, { status: 400 })
  }

  const deleted = await deleteGalleryMedia(mediaId)
  if (!deleted) {
    return NextResponse.json({ error: 'No existe el archivo indicado.' }, { status: 404 })
  }

  return new NextResponse(null, {
    status: 204,
    headers: { 'Cache-Control': 'no-store' },
  })
}
