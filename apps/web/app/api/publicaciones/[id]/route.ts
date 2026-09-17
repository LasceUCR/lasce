import { NextResponse } from 'next/server'

import { requireAdmin } from '@/app/lib/auth/apiGuard'
import {
  deletePublication,
  publicationInputSchema,
  updatePublication,
} from '@/app/lib/publications'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireAdmin()
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

  const parsed = publicationInputSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Faltan campos obligatorios o no son válidos.',
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    )
  }

  const { id } = await params

  const publication = await updatePublication(
    id,
    parsed.data,
  )

  if (!publication) {
    return NextResponse.json(
      { error: `No existe una publicación con id "${id}".` },
      { status: 404 },
    )
  }

  return NextResponse.json(
    { publication },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const { id } = await params

  const deleted = await deletePublication(id)

  if (!deleted) {
    return NextResponse.json(
      { error: `No existe una publicación con id "${id}".` },
      { status: 404 },
    )
  }

  return new NextResponse(null, { status: 204 })
}